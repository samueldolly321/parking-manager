/**
 * Authentication: password hashing (scrypt), signed session cookie, user lookup.
 * Server-side only.
 */
import crypto from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from './index.ts';
import { getFullState } from './repository.ts';
import type { User } from '../types/index.ts';

export const SESSION_COOKIE = 'pm_session';
const SESSION_DAYS = 7;
const SCRYPT_N = 16384;
const KEY_LEN = 64;

// ---------------- Passwords ----------------

/** "scrypt$16384$<salt hex>$<hash hex>" */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, n, saltHex, hashHex] = stored.split('$');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: Number(n) });
  return crypto.timingSafeEqual(expected, actual);
}

export const isUsableHash = (h: string | null | undefined) => !!h && h.startsWith('scrypt$');

/** Rules shown to the user when choosing a password. */
export function passwordProblem(pw: string): string | null {
  if (typeof pw !== 'string' || pw.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Le mot de passe doit contenir des lettres et des chiffres.';
  return null;
}

// ---------------- Session cookie ----------------

function secret(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    // Without a configured secret, sessions are valid until the server restarts
    if (!(globalThis as any).__pmEphemeralSecret) {
      (globalThis as any).__pmEphemeralSecret = crypto.randomBytes(32);
      console.warn('[auth] SESSION_SECRET absent du .env : les sessions seront perdues au redémarrage.');
    }
    return (globalThis as any).__pmEphemeralSecret;
  }
  return Buffer.from(s);
}

const sign = (payload: string) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

/** "<userId>.<expiry ms>.<signature>" */
export function createSessionToken(userId: string): { token: string; maxAgeMs: number } {
  const maxAgeMs = SESSION_DAYS * 24 * 3600 * 1000;
  const payload = `${Buffer.from(userId).toString('base64url')}.${Date.now() + maxAgeMs}`;
  return { token: `${payload}.${sign(payload)}`, maxAgeMs };
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  if (Number(parts[1]) < Date.now()) return null;
  return Buffer.from(parts[0], 'base64url').toString();
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  (header || '').split(';').forEach((c) => {
    const i = c.indexOf('=');
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}

export function sessionCookie(token: string, maxAgeMs: number, secure: boolean): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure ? '; Secure' : ''}`;
}
export const clearSessionCookie = (secure: boolean) =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;

// ---------------- Login attempts (anti brute force) ----------------

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

/** Minutes left before a new try is allowed, or 0. */
export function lockedMinutes(key: string): number {
  const a = attempts.get(key);
  if (!a || a.count < MAX_ATTEMPTS) return 0;
  if (a.until < Date.now()) { attempts.delete(key); return 0; }
  return Math.ceil((a.until - Date.now()) / 60000);
}
export function recordFailure(key: string) {
  const a = attempts.get(key) || { count: 0, until: 0 };
  a.count += 1;
  a.until = Date.now() + LOCK_MS;
  attempts.set(key, a);
}
export const clearFailures = (key: string) => attempts.delete(key);

// ---------------- Users ----------------

type UserRow = typeof schema.users.$inferSelect;

const toUser = (u: UserRow): User => ({
  id: u.id,
  username: u.username,
  fullName: u.fullName,
  email: u.email,
  role: u.role as User['role'],
  siteId: u.siteId ?? undefined,
  phone: u.phone,
  avatarUrl: u.avatarUrl ?? undefined,
  isActive: u.isActive,
  lastLogin: u.lastLogin ?? undefined
});

// Local mode (no PostgreSQL, e.g. tests): passwords kept in memory, the super admin gets ADMIN_INITIAL_PASSWORD
const localHashes = new Map<string, string>();
async function localUsers(): Promise<{ user: User; passwordHash: string }[]> {
  const state = await getFullState();
  const users = state.users.length ? state.users : [state.currentUser];
  return users.map((u, i) => {
    if (!localHashes.has(u.id) && (u.role === 'super_admin' || i === 0) && process.env.ADMIN_INITIAL_PASSWORD) {
      localHashes.set(u.id, hashPassword(process.env.ADMIN_INITIAL_PASSWORD));
    }
    const email = i === 0 && process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase() : u.email;
    return { user: { ...u, email }, passwordHash: localHashes.get(u.id) || '' };
  });
}

export async function findUserByEmail(email: string): Promise<{ user: User; passwordHash: string } | null> {
  const db = getDb();
  if (!db) return (await localUsers()).find((x) => x.user.email.toLowerCase() === email.trim().toLowerCase()) || null;
  const [row] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${email.trim().toLowerCase()}`);
  return row ? { user: toUser(row), passwordHash: row.passwordHash } : null;
}

export async function findUserById(id: string): Promise<{ user: User; passwordHash: string } | null> {
  const db = getDb();
  if (!db) return (await localUsers()).find((x) => x.user.id === id) || null;
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return row ? { user: toUser(row), passwordHash: row.passwordHash } : null;
}

export async function setUserPassword(id: string, password: string): Promise<void> {
  const db = getDb();
  if (!db) { localHashes.set(id, hashPassword(password)); return; }
  await db.update(schema.users).set({ passwordHash: hashPassword(password) }).where(eq(schema.users.id, id));
}

export async function setUserEmail(id: string, email: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.update(schema.users).set({ email: email.trim().toLowerCase() }).where(eq(schema.users.id, id));
}

export async function touchLastLogin(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' });
  await db.update(schema.users).set({ lastLogin: now }).where(eq(schema.users.id, id));
}

/**
 * First start: if no account has a real password yet, give the super admin the password
 * of ADMIN_INITIAL_PASSWORD (and ADMIN_EMAIL if set) from the .env file.
 */
export async function ensureAdminCredentials(): Promise<void> {
  const db = getDb();
  if (!db) return;
  const rows = await db.select().from(schema.users);
  if (rows.some((r) => isUsableHash(r.passwordHash))) return;
  const admin = rows.find((r) => r.role === 'super_admin') || rows[0];
  const initial = process.env.ADMIN_INITIAL_PASSWORD;
  if (!admin) return;
  if (!initial || passwordProblem(initial)) {
    console.warn('[auth] Aucun mot de passe défini : ajoutez ADMIN_INITIAL_PASSWORD (8 caractères min., lettres et chiffres) dans le .env puis redémarrez.');
    return;
  }
  await db.update(schema.users).set({
    passwordHash: hashPassword(initial),
    ...(process.env.ADMIN_EMAIL ? { email: process.env.ADMIN_EMAIL.trim().toLowerCase() } : {})
  }).where(eq(schema.users.id, admin.id));
  console.log(`[auth] Mot de passe initial appliqué au compte ${process.env.ADMIN_EMAIL || admin.email}.`);
}

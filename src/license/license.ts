/**
 * Licences of the desktop version (server side only).
 *
 * - Machine code: 16 characters derived from the PC's identifier, shown to the customer.
 * - Licence key: "PM1-<payload>.<signature>", signed with the vendor's Ed25519 private key
 *   (kept by the vendor, never shipped). The application only holds the public key.
 *   A key is valid for one machine code; lifetime licence.
 * - Trial: 7 days from the first launch. Turning the PC clock back does not extend it.
 */
import crypto from 'crypto';

export const TRIAL_DAYS = 7;
const DAY_MS = 86_400_000;
/** Crockford base32, without I, L, O, U (no confusion when typed). */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** "ABCD-EFGH-JKMN-PQRS" from the raw machine identifier. */
export function machineCodeFrom(rawMachineId: string): string {
  const digest = crypto.createHash('sha256').update(`parking-manager:${rawMachineId.trim().toLowerCase()}`).digest();
  const code = base32(digest.subarray(0, 10)).slice(0, 16);
  return code.match(/.{4}/g)!.join('-');
}

/** Upper case, no spaces, standard dashes (what the customer may type or paste). */
export const normalizeMachineCode = (code: string) =>
  code.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/(.{4})(?=.)/g, '$1-');

export interface LicensePayload {
  v: 1;
  /** Machine code the key is valid for */
  m: string;
  /** Customer name */
  c: string;
  /** Kind of licence */
  k: 'lifetime';
  /** Issue date (AAAA-MM-JJ) */
  d: string;
}

const b64u = (buf: Buffer) => buf.toString('base64url');

/** Vendor side: signs a licence for a machine code. */
export function signLicense(payload: Omit<LicensePayload, 'v' | 'k'> & Partial<Pick<LicensePayload, 'k'>>, privateKeyPem: string): string {
  const full: LicensePayload = { v: 1, k: 'lifetime', ...payload, m: normalizeMachineCode(payload.m) };
  const data = Buffer.from(JSON.stringify(full), 'utf8');
  const signature = crypto.sign(null, data, crypto.createPrivateKey(privateKeyPem));
  return `PM1-${b64u(data)}.${b64u(signature)}`;
}

export type LicenseCheck = { ok: true; payload: LicensePayload } | { ok: false; error: string };

/** Application side: is this key genuine and made for this machine? */
export function verifyLicense(key: string, machineCode: string, publicKeyPem: string): LicenseCheck {
  const m = /^PM1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(key.trim().replace(/\s+/g, ''));
  if (!m) return { ok: false, error: 'Format de clé invalide.' };
  const data = Buffer.from(m[1], 'base64url');
  const signature = Buffer.from(m[2], 'base64url');
  let genuine = false;
  try {
    genuine = crypto.verify(null, data, crypto.createPublicKey(publicKeyPem), signature);
  } catch {
    genuine = false;
  }
  if (!genuine) return { ok: false, error: 'Clé non reconnue (signature invalide).' };
  let payload: LicensePayload;
  try {
    payload = JSON.parse(data.toString('utf8'));
  } catch {
    return { ok: false, error: 'Clé illisible.' };
  }
  if (payload.v !== 1 || payload.k !== 'lifetime') return { ok: false, error: 'Type de licence non pris en charge.' };
  if (normalizeMachineCode(payload.m) !== normalizeMachineCode(machineCode)) {
    return { ok: false, error: 'Cette clé a été créée pour un autre ordinateur.' };
  }
  return { ok: true, payload };
}

export type LicenseState =
  | { state: 'active'; customer: string; issued: string }
  | { state: 'trial'; daysLeft: number; endsAt: number }
  | { state: 'expired'; reason: 'trial_over' | 'clock' };

/**
 * State from what is stored: an activated licence wins; otherwise the trial runs for
 * TRIAL_DAYS from `trialStart`. If the clock is more than one day behind `lastSeen`
 * (clock turned back), the trial is considered over.
 */
export function computeLicenseState(input: {
  now: number;
  trialStart: number;
  lastSeen: number;
  license?: LicensePayload | null;
}): LicenseState {
  if (input.license) return { state: 'active', customer: input.license.c, issued: input.license.d };
  if (input.now < input.lastSeen - DAY_MS) return { state: 'expired', reason: 'clock' };
  const endsAt = input.trialStart + TRIAL_DAYS * DAY_MS;
  const reference = Math.max(input.now, input.lastSeen);
  if (reference >= endsAt) return { state: 'expired', reason: 'trial_over' };
  return { state: 'trial', daysLeft: Math.ceil((endsAt - reference) / DAY_MS), endsAt };
}

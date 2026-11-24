/**
 * Server entry point for Parking Manager Madagascar
 * Express REST API (/api/v1/*) backed by Drizzle ORM (PostgreSQL) with local JSON persistence fallback
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  getStorageMode,
  getFullState,
  addAuditLogEntry,
  createSiteRecord,
  createMemberRecord,
  createVehicleRecord,
  updateSpotRecord,
  createSpotRecords,
  createEquipmentRecord,
  updateZoneSpots,
  deleteZoneSpots,
  createReceiptRecord,
  toggleCardStatus,
  createPayrollRecord,
  updatePayrollRecordStatus,
  broadcastGuardOrders,
  updateEntityAvatar,
  createExpenseRecord,
  decideExpenseRecord,
  createIncidentRecord,
  updateIncidentRecordStatus,
  createCommitteeMemberRecord,
  createMeetingRecord,
  updateRecord,
  deleteRecord,
  isEditableCollection,
  RecordInUseError,
  resetOperationalData,
  ensureSchemaUpgrades,
  collectionStateKey,
  nextExpenseNumber,
  nextGuardMatricule,
  createGuardRecord,
  getAppSettings,
  setAppSettings
} from './src/db/repository.ts';
import type { Equipment, GuardPersonnel, ParkingSpot, Vehicle } from './src/types/index.ts';
import { VEHICLE_CATEGORIES } from './src/types/index.ts';
import { AsyncLocalStorage } from 'async_hooks';
import { seedDatabaseIfEmpty } from './src/db/seed.ts';
import {
  SESSION_COOKIE,
  clearFailures,
  clearSessionCookie,
  createSessionToken,
  ensureAdminCredentials,
  findUserByEmail,
  findUserById,
  lockedMinutes,
  parseCookies,
  passwordProblem,
  readSessionToken,
  recordFailure,
  sessionCookie,
  setUserEmail,
  setUserPassword,
  touchLastLogin,
  verifyPassword,
  AccountError,
  listUsers,
  createAccount,
  updateAccount,
  deleteAccount
} from './src/db/auth.ts';
import { USER_ROLES, ADMIN_ROLES } from './src/types/index.ts';
import { pickYearlyNumber, currentYear } from './src/services/numbering.ts';
import { SPOT_TYPE_LABELS, formatEntryTime } from './src/services/spots.ts';
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUS_LABELS, applyEquipmentEvent, isoToFr, nextInventoryCode, type EquipmentEvent } from './src/services/equipment.ts';
import { forbiddenMessage, recordSiteId, roleCan, scopeState, userSite, writeRule } from './src/services/permissions.ts';

/** User of the request being handled (for the audit log). */
const requestContext = new AsyncLocalStorage<{ id: string; name: string; ip: string }>();

type GuardPersonnelShiftDays = GuardPersonnel['shiftDays'];

/** Word the client must send to confirm a data reset. */
const RESET_CONFIRMATION_WORD = 'REINITIALISER';

/** Keeps only string ids from a request field that should be a list of ids. */
const toIdList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.length > 0) : [];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  // Add columns introduced after the database was created (idempotent, keeps existing data)
  await ensureSchemaUpgrades();
  // Demo data on an empty database, then the admin password from .env (ADMIN_INITIAL_PASSWORD)
  await seedDatabaseIfEmpty();
  await ensureAdminCredentials();

  app.disable('x-powered-by');
  // Behind Render's proxy: real client IP and HTTPS detection
  if (isProd) app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  const clientIp = (req: express.Request) => (req.ip || req.socket.remoteAddress || '').replace(/^::ffff:/, '') || 'inconnue';

  /** Writes to the audit log, signed with the user of the current request. */
  const recordAudit = async (action: string, module: string, details: string, siteCode = 'GLOBAL', who?: { id: string; name: string; ip: string }) => {
    const ctx = who || requestContext.getStore();
    await addAuditLogEntry({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' }),
      userId: ctx?.id || 'systeme',
      userName: ctx?.name || 'Système',
      action,
      siteCode,
      module,
      details,
      ipAddress: ctx?.ip || '127.0.0.1'
    });
  };

  // ===================== RÈGLE : PAS DE MEMBRE SANS VÉHICULE =====================
  /** A vehicle still counts unless it is struck off. */
  const countsAsVehicle = (v: Vehicle) => v.status !== 'radie';

  /**
   * A member without vehicle is struck off ("radié"); history (receipts, card) is kept.
   * With `reactivate`, a struck-off member who now has a vehicle becomes active again
   * (used when a vehicle is added, not by the start-up check, so a manual striking-off is kept).
   */
  const applyVehicleRule = async (memberIds: string[], opts: { reactivate: boolean }) => {
    const ids = [...new Set(memberIds.filter(Boolean))];
    if (ids.length === 0) return;
    const state = await getFullState();
    for (const id of ids) {
      const member = state.members.find((m) => m.id === id);
      if (!member) continue;
      const hasVehicle = state.vehicles.some((v) => v.memberId === id && countsAsVehicle(v));
      if (!hasVehicle && member.status !== 'radie') {
        await updateRecord('members', id, { status: 'radie' });
        await recordAudit('RADIATION_AUTO_MEMBRE', 'Membres', `${member.fullName} (${member.memberNumber}) radié : aucun véhicule`, member.primarySiteId);
      } else if (hasVehicle && member.status === 'radie' && opts.reactivate) {
        await updateRecord('members', id, { status: 'actif' });
        await recordAudit('REACTIVATION_MEMBRE', 'Membres', `${member.fullName} (${member.memberNumber}) réactivé : véhicule enregistré`, member.primarySiteId);
      }
    }
  };

  const normPlate = (p: unknown) => (typeof p === 'string' ? p.replace(/\s+/g, ' ').trim().toUpperCase() : '');
  const plateTaken = (vehicles: Vehicle[], plate: string, exceptId?: string) =>
    vehicles.some((v) => v.id !== exceptId && normPlate(v.licensePlate).replace(/ /g, '') === plate.replace(/ /g, ''));

  // ===================== AUTHENTIFICATION =====================
  const secureCookie = isProd;
  const PUBLIC_API = new Set(['/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/health']);

  /** Every /api route needs a valid session, except login/logout/health. */
  app.use('/api', async (req, res, next) => {
    const fullPath = req.path === '/' ? req.baseUrl : `${req.baseUrl}${req.path}`;
    if (PUBLIC_API.has(fullPath)) return next();
    // Name and logo are readable before sign-in (sign-in page); changing them needs a session
    if (req.method === 'GET' && fullPath === '/api/v1/settings/branding') return next();
    const userId = readSessionToken(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
    const found = userId ? await findUserById(userId).catch(() => null) : null;
    if (!found || !found.user.isActive) {
      return res.status(401).json({ error: 'Session expirée ou absente : veuillez vous connecter.' });
    }
    res.locals.user = found.user;
    requestContext.run({ id: found.user.id, name: found.user.fullName, ip: clientIp(req) }, () => next());
  });

  // ===================== DROITS (rôle + site) =====================
  // Rules are in src/services/permissions.ts. Every write is checked here, before reaching its route.
  const OTHER_SITE = 'Votre compte est rattaché à un autre site : action refusée.';
  const SHARED_RECORD = 'Cet enregistrement concerne tous les sites : il est réservé aux rôles généraux.';
  app.use('/api/v1', async (req, res, next) => {
    const user = res.locals.user;
    if (!user) return next();
    const rule = writeRule(req.method, req.path, collectionStateKey);
    if (!rule) return next();
    const deny = (message: string) => res.status(403).json({ error: message });
    try {
      const site = userSite(user);
      const body = (req.body && typeof req.body === 'object' ? req.body : (req.body = {})) as Record<string, any>;

      if (rule.action === 'avatar') {
        if (body.type === 'user') {
          return body.id === user.id || ADMIN_ROLES.includes(user.role) ? next() : deny('Vous ne pouvez changer que votre propre photo.');
        }
        if (body.type === 'committee') return roleCan(user.role, 'governance') ? next() : deny(forbiddenMessage('governance'));
        if (!roleCan(user.role, 'write')) return deny(forbiddenMessage('write'));
        if (site) {
          const guard = (await getFullState()).guards.find((g) => g.id === body.id);
          if (!guard || guard.siteId !== site) return deny(OTHER_SITE);
        }
        return next();
      }

      if (!roleCan(user.role, rule.action)) return deny(forbiddenMessage(rule.action));
      if ('also' in rule && rule.also && !roleCan(user.role, rule.also)) return deny(forbiddenMessage(rule.also));
      if (!site) return next();

      if ('site' in rule && rule.site) {
        // Site-bound account: records are created on its own site
        const field = rule.site.body;
        if (body[field] === undefined || body[field] === '') body[field] = site;
        return body[field] === site ? next() : deny(OTHER_SITE);
      }
      if ('record' in rule) {
        const state = await getFullState();
        const list = (state as any)[rule.record.stateKey] as Record<string, unknown>[] | undefined;
        const record = list?.find((x) => x.id === rule.record.id);
        if (!record) return next(); // the route answers 404
        const recordSite = recordSiteId(rule.record.stateKey, record);
        if (recordSite === null) return deny(SHARED_RECORD);
        if (recordSite !== site) return deny(OTHER_SITE);
        // A record cannot be moved to another site
        if (['siteId', 'primarySiteId'].some((f) => body[f] !== undefined && body[f] !== site)) return deny(OTHER_SITE);
        return next();
      }
      if ('teamId' in rule) {
        const guard = (await getFullState()).guards.find((g) => g.teamId === body.teamId);
        return guard && guard.siteId === site ? next() : deny(OTHER_SITE);
      }
      return next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Vérification des droits impossible.' });
    }
  });

  /** Data the signed-in user may see (only their site for a site-bound role). */
  const scopedState = async (res: express.Response) => scopeState(await getFullState(), res.locals.user);

  app.post('/api/v1/auth/login', async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const key = `${clientIp(req)}|${email}`;
      const wait = lockedMinutes(key);
      if (wait > 0) {
        return res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${wait} minute${wait > 1 ? 's' : ''}.` });
      }
      if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe obligatoires.' });

      const found = await findUserByEmail(email);
      if (!found || !found.user.isActive || !verifyPassword(password, found.passwordHash)) {
        recordFailure(key);
        await recordAudit('CONNEXION_ECHOUEE', 'Authentification', `Échec de connexion pour ${email}`, 'GLOBAL', { id: 'inconnu', name: email, ip: clientIp(req) });
        return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      }
      clearFailures(key);
      const { token, maxAgeMs } = createSessionToken(found.user.id);
      res.setHeader('Set-Cookie', sessionCookie(token, maxAgeMs, secureCookie));
      await touchLastLogin(found.user.id);
      await recordAudit('CONNEXION_REUSSIE', 'Authentification', `Connexion de ${found.user.fullName}`, 'GLOBAL', { id: found.user.id, name: found.user.fullName, ip: clientIp(req) });
      return res.json({ user: found.user });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/v1/auth/logout', async (req, res) => {
    const userId = readSessionToken(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
    res.setHeader('Set-Cookie', clearSessionCookie(secureCookie));
    if (userId) {
      const found = await findUserById(userId).catch(() => null);
      if (found) await recordAudit('DECONNEXION', 'Authentification', `Déconnexion de ${found.user.fullName}`, 'GLOBAL', { id: found.user.id, name: found.user.fullName, ip: clientIp(req) });
    }
    return res.json({ ok: true });
  });

  app.get('/api/v1/auth/me', (_req, res) => res.json(res.locals.user));

  // ===================== IDENTITÉ DE L'APPLICATION (nom, logo) =====================
  const DEFAULT_APP_NAME = 'Parking Mada';
  const MAX_LOGO_CHARS = 400_000; // ≈ 300 Ko d'image

  /** Public: the sign-in page shows the name and logo before any login. */
  app.get('/api/v1/settings/branding', async (_req, res) => {
    try {
      const s = await getAppSettings(['branding.name', 'branding.logo']);
      res.setHeader('Cache-Control', 'no-cache');
      res.json({ appName: s['branding.name'] || DEFAULT_APP_NAME, logoUrl: s['branding.logo'] || null });
    } catch (error) {
      console.error('Branding read error:', error);
      res.json({ appName: DEFAULT_APP_NAME, logoUrl: null });
    }
  });

  app.put('/api/v1/settings/branding', async (req, res) => {
    try {
      const user = res.locals.user;
      if (!ADMIN_ROLES.includes(user?.role)) {
        return res.status(403).json({ error: 'Seul un administrateur peut modifier le nom et le logo.' });
      }
      const name = typeof req.body?.appName === 'string' ? req.body.appName.trim().replace(/\s+/g, ' ') : '';
      if (!name || name.length > 40) return res.status(400).json({ error: 'Le nom doit contenir entre 1 et 40 caractères.' });
      const logo = req.body?.logoUrl;
      if (logo !== null && logo !== undefined) {
        if (typeof logo !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo)) {
          return res.status(400).json({ error: 'Le logo doit être une image PNG, JPEG ou WebP.' });
        }
        if (logo.length > MAX_LOGO_CHARS) return res.status(400).json({ error: 'Le logo est trop lourd (300 Ko maximum).' });
      }
      await setAppSettings({
        'branding.name': name === DEFAULT_APP_NAME ? null : name,
        ...(logo === undefined ? {} : { 'branding.logo': logo })
      });
      await recordAudit('MODIFICATION_IDENTITE', 'Paramètres', `Nom de l'application : « ${name} »${logo === undefined ? '' : logo === null ? ', logo par défaut rétabli' : ', nouveau logo'}`);
      const s = await getAppSettings(['branding.name', 'branding.logo']);
      return res.json({ appName: s['branding.name'] || DEFAULT_APP_NAME, logoUrl: s['branding.logo'] || null });
    } catch (error) {
      console.error('Branding write error:', error);
      return res.status(500).json({ error: 'Enregistrement impossible.' });
    }
  });

  // ===================== GESTION DES UTILISATEURS (administrateurs) =====================
  const requireAdmin = (req: express.Request, res: express.Response): boolean => {
    if (!ADMIN_ROLES.includes(res.locals.user?.role)) {
      res.status(403).json({ error: 'Réservé aux administrateurs (Super Admin, Président Général).' });
      return false;
    }
    return true;
  };
  const accountCtx = async () => {
    const state = await getFullState();
    return { validRoles: USER_ROLES, siteIds: state.sites.map((s) => s.id), adminRoles: ADMIN_ROLES as string[] };
  };
  const sendAccountError = (res: express.Response, error: unknown, fallback: string) => {
    if (error instanceof AccountError) return res.status(error.status).json({ error: error.message });
    console.error(fallback, error);
    return res.status(500).json({ error: fallback });
  };
  const roleLabel = (role: string) => USER_ROLES.find((r) => r.role === role)?.label || role;

  app.get('/api/v1/users', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      return res.json(await listUsers());
    } catch (error) {
      return sendAccountError(res, error, 'Impossible de charger les utilisateurs.');
    }
  });

  app.post('/api/v1/users', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const user = await createAccount(req.body || {}, await accountCtx());
      await recordAudit('CREATION_UTILISATEUR', 'Utilisateurs', `Compte créé : ${user.fullName} (${user.email}) — ${roleLabel(user.role)}`);
      return res.status(201).json(user);
    } catch (error) {
      return sendAccountError(res, error, 'Impossible de créer le compte.');
    }
  });

  app.put('/api/v1/users/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { password: _ignored, ...fields } = req.body || {};
      const user = await updateAccount(req.params.id, fields, { ...(await accountCtx()), actorId: res.locals.user.id });
      await recordAudit('MODIFICATION_UTILISATEUR', 'Utilisateurs', `Compte modifié : ${user.fullName} (${user.email}) — ${roleLabel(user.role)}${user.isActive ? '' : ', désactivé'}`);
      return res.json(user);
    } catch (error) {
      return sendAccountError(res, error, 'Impossible de modifier le compte.');
    }
  });

  app.post('/api/v1/users/:id/password', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const found = await findUserById(req.params.id);
      if (!found) return res.status(404).json({ error: 'Compte introuvable.' });
      const problem = passwordProblem(String(req.body?.password || ''));
      if (problem) return res.status(400).json({ error: problem });
      await setUserPassword(found.user.id, String(req.body.password));
      await recordAudit('REINITIALISATION_MOT_DE_PASSE', 'Utilisateurs', `Nouveau mot de passe défini pour ${found.user.fullName} (${found.user.email})`);
      return res.json({ ok: true });
    } catch (error) {
      return sendAccountError(res, error, 'Impossible de changer le mot de passe.');
    }
  });

  app.delete('/api/v1/users/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const user = await deleteAccount(req.params.id, { adminRoles: ADMIN_ROLES as string[], actorId: res.locals.user.id });
      await recordAudit('SUPPRESSION_UTILISATEUR', 'Utilisateurs', `Compte supprimé : ${user.fullName} (${user.email})`);
      return res.json({ ok: true });
    } catch (error) {
      return sendAccountError(res, error, 'Impossible de supprimer le compte.');
    }
  });

  app.post('/api/v1/auth/change-password', async (req, res) => {
    try {
      const user = res.locals.user;
      const found = await findUserById(user.id);
      const { currentPassword, newPassword, newEmail } = req.body || {};
      if (!found || !verifyPassword(String(currentPassword || ''), found.passwordHash)) {
        return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
      }
      if (newPassword) {
        const problem = passwordProblem(String(newPassword));
        if (problem) return res.status(400).json({ error: problem });
        await setUserPassword(user.id, String(newPassword));
      }
      if (newEmail && String(newEmail).trim().toLowerCase() !== user.email.toLowerCase()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(newEmail))) return res.status(400).json({ error: 'Adresse email invalide.' });
        const taken = await findUserByEmail(String(newEmail));
        if (taken && taken.user.id !== user.id) return res.status(400).json({ error: 'Cette adresse email est déjà utilisée.' });
        await setUserEmail(user.id, String(newEmail));
      }
      await recordAudit('MODIFICATION_IDENTIFIANTS', 'Authentification', `${user.fullName} a modifié ${[newPassword && 'son mot de passe', newEmail && 'son email'].filter(Boolean).join(' et ') || 'ses identifiants'}`);
      const updated = await findUserById(user.id);
      return res.json({ user: updated?.user || user });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // ===================== REST API v1 ROUTES =====================

  // System Health & Info
  app.get('/api/v1/health', async (_req, res) => {
    try {
      const state = await getFullState();
      const mode = await getStorageMode();
      res.json({
        status: 'UP',
        system: 'Parking Manager Madagascar - Multi-sites',
        storageMode: mode,
        timezone: 'Indian/Antananarivo (GMT+3)',
        sitesCount: state.sites.length,
        membersCount: state.members.length,
        receiptsCount: state.receipts.length,
        payrollsCount: state.payrolls.length
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  });

  // Full Application State Bootstrap (Hydration)
  app.get('/api/v1/bootstrap', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state);
    } catch (error) {
      console.error('Bootstrap error:', error);
      res.status(500).json({ error: 'Impossible de charger les données' });
    }
  });

  // Auth
  // Sites
  app.get('/api/v1/sites', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.sites);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des sites' });
    }
  });

  app.post('/api/v1/sites', async (req, res) => {
    try {
      const b = req.body || {};
      const text = (v: unknown, max = 150) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      const name = text(b.name);
      const capacity = Number(b.totalCapacity);
      if (!name) return res.status(400).json({ error: 'Le nom du site est obligatoire.' });
      if (!Number.isInteger(capacity) || capacity <= 0) return res.status(400).json({ error: 'La capacité doit être un nombre entier supérieur à 0.' });
      const state = await getFullState();
      // Next free number: S4, S5… (never reuses an id or a code, even after a deletion)
      const nums = state.sites.map((s) => Number(/^S(\d+)$/.exec(s.id)?.[1] || 0));
      const nextNum = Math.max(0, ...nums) + 1;
      const id = `S${nextNum}`;
      const code = (text(b.code, 30) || `S${nextNum}-${name.split(/\s+/)[0]}`).toUpperCase().replace(/[^A-Z0-9-]+/g, '-');
      if (state.sites.some((s) => s.code.toUpperCase() === code)) {
        return res.status(400).json({ error: `Le code ${code} est déjà utilisé par un autre site.` });
      }
      const STATUSES = new Set(['actif', 'maintenance', 'inactif']);
      const newSite = await createSiteRecord({
        id,
        code,
        name: name.startsWith('Site ') ? name : `Site ${String(nextNum).padStart(2, '0')} - ${name}`,
        address: text(b.address, 300),
        city: text(b.city, 100) || 'Antananarivo',
        totalCapacity: capacity,
        presidentName: text(b.presidentName) || 'À désigner',
        presidentPhone: text(b.presidentPhone, 30),
        tresorierName: text(b.tresorierName) || 'À désigner',
        guardCount: Math.max(0, Number(b.guardCount) || 0),
        status: STATUSES.has(b.status) ? b.status : 'actif'
      });
      await recordAudit('CREATION_SITE', 'Sites', `Nouveau site créé : ${newSite.name} (${newSite.code})`, newSite.code);
      res.status(201).json(newSite);
    } catch (error) {
      console.error('Create site error:', error);
      res.status(500).json({ error: 'Impossible de créer le site' });
    }
  });

  // Members
  app.get('/api/v1/members', async (req, res) => {
    try {
      const state = await scopedState(res);
      const { siteId, q } = req.query;
      let result = state.members;
      if (siteId && siteId !== 'all') {
        result = result.filter((m) => m.primarySiteId === siteId);
      }
      if (q) {
        const term = String(q).toLowerCase();
        result = result.filter(
          (m) =>
            m.fullName.toLowerCase().includes(term) ||
            m.memberNumber.toLowerCase().includes(term) ||
            m.phone.includes(term) ||
            m.cin.includes(term)
        );
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des membres' });
    }
  });

  app.post('/api/v1/members', async (req, res) => {
    try {
      const state = await getFullState();
      // Only owners of a vehicle are members: the vehicle is created with the member
      const vb = req.body?.vehicle || {};
      const plate = normPlate(vb.licensePlate);
      const brand = typeof vb.brand === 'string' ? vb.brand.trim().slice(0, 100) : '';
      const model = typeof vb.model === 'string' ? vb.model.trim().slice(0, 100) : '';
      if (!plate || !brand || !model) {
        return res.status(400).json({ error: 'Un membre doit avoir un véhicule : immatriculation, marque et modèle sont obligatoires.' });
      }
      if (plateTaken(state.vehicles, plate)) {
        return res.status(400).json({ error: `L’immatriculation ${plate} est déjà enregistrée.` });
      }
      const vehicleCategory = VEHICLE_CATEGORIES.includes(vb.category) ? vb.category : 'Voiture Légère (VL)';
      const nextNum = pickYearlyNumber(req.body.memberNumber, state.members.map((m) => m.memberNumber), 'MBR');
      const newMember = await createMemberRecord({
        id: req.body.id || `mbr-${Date.now()}`,
        memberNumber: nextNum,
        fullName: req.body.fullName,
        category: req.body.category || 'standard',
        cin: req.body.cin || '101 000 000 000',
        cinIssuedDate: req.body.cinIssuedDate,
        cinIssuedLocation: req.body.cinIssuedLocation,
        phone: req.body.phone,
        mobileMoneyProvider: req.body.mobileMoneyProvider || 'MVola',
        emergencyContactName: req.body.emergencyContactName,
        emergencyContactPhone: req.body.emergencyContactPhone,
        address: req.body.address || 'Antananarivo',
        primarySiteId: req.body.primarySiteId || 'S1',
        joinedDate: req.body.joinedDate || new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' }),
        approvedByPresident: req.body.approvedByPresident,
        status: req.body.status === 'radie' ? 'actif' : req.body.status || 'actif',
        currentBalanceAr: Number(req.body.currentBalanceAr || 0),
        avatarUrl: req.body.avatarUrl,
        notes: req.body.notes || ''
      });
      const newVehicle = await createVehicleRecord({
        id: typeof vb.id === 'string' && vb.id ? vb.id : `veh-${Date.now()}`,
        licensePlate: plate,
        category: vehicleCategory,
        brand,
        model,
        color: typeof vb.color === 'string' && vb.color.trim() ? vb.color.trim().slice(0, 50) : 'Non précisée',
        memberId: newMember.id,
        siteId: newMember.primarySiteId,
        rfidTag: `#TAG-${Math.floor(1000 + Math.random() * 9000)}-PMM`,
        barcode: `#BAR-${Math.floor(1000 + Math.random() * 9000)}`,
        registeredAt: newMember.joinedDate,
        photoUrl: typeof vb.photoUrl === 'string' && vb.photoUrl.startsWith('data:image/') ? vb.photoUrl : undefined,
        status: 'actif',
        assignedSpotType: vehicleCategory.includes('Deux-Roues') ? 'deux_roues' : vehicleCategory.includes('Poids Lourd') ? 'poids_lourd' : 'placement_libre_interieur'
      });
      await recordAudit(
        'CREATION_MEMBRE',
        'Membres',
        `Nouveau membre : ${newMember.fullName} (${newMember.memberNumber}), véhicule ${newVehicle.licensePlate}` +
          (newMember.approvedByPresident ? `, adhésion acceptée par ${newMember.approvedByPresident}` : '')
      );
      res.status(201).json({ ...newMember, vehicle: newVehicle });
    } catch (error) {
      console.error('Create member error:', error);
      res.status(500).json({ error: 'Impossible de créer le membre' });
    }
  });

  // Vehicles
  app.get('/api/v1/vehicles', async (req, res) => {
    try {
      const state = await scopedState(res);
      const { memberId, siteId } = req.query;
      let list = state.vehicles;
      if (memberId) list = list.filter((v) => v.memberId === memberId);
      if (siteId && siteId !== 'all') list = list.filter((v) => v.siteId === siteId);
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des véhicules' });
    }
  });

  app.post('/api/v1/vehicles', async (req, res) => {
    try {
      const state = await getFullState();
      const plate = normPlate(req.body.licensePlate);
      if (!plate) return res.status(400).json({ error: 'L’immatriculation est obligatoire.' });
      if (!state.members.some((m) => m.id === req.body.memberId)) return res.status(400).json({ error: 'Propriétaire inconnu.' });
      if (plateTaken(state.vehicles, plate)) return res.status(400).json({ error: `L’immatriculation ${plate} est déjà enregistrée.` });
      const newVeh = await createVehicleRecord({
        id: req.body.id || `veh-${Date.now()}`,
        licensePlate: String(req.body.licensePlate || '').toUpperCase().trim(),
        category: req.body.category || 'Voiture Légère (VL)',
        brand: req.body.brand,
        model: req.body.model,
        color: req.body.color || 'Noir',
        memberId: req.body.memberId,
        siteId: req.body.siteId || 'S1',
        spotId: req.body.spotId,
        rfidTag: req.body.rfidTag || `#TAG-${Math.floor(1000 + Math.random() * 9000)}-PMM`,
        barcode: req.body.barcode || `#BAR-${Math.floor(1000 + Math.random() * 9000)}`,
        registeredAt: req.body.registeredAt || new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' }),
        photoUrl: typeof req.body.photoUrl === 'string' && req.body.photoUrl.startsWith('data:image/') ? req.body.photoUrl : undefined,
        status: req.body.status || 'actif',
        assignedSpotType: req.body.assignedSpotType || 'placement_libre_interieur'
      });
      await recordAudit('AJOUT_VEHICULE', 'Véhicules', `Plaque ${newVeh.licensePlate} (${newVeh.brand} ${newVeh.model})`);
      // A struck-off owner becomes a member again
      await applyVehicleRule([newVeh.memberId], { reactivate: true });
      res.status(201).json(newVeh);
    } catch (error) {
      console.error('Create vehicle error:', error);
      res.status(500).json({ error: 'Impossible d\'ajouter le véhicule' });
    }
  });

  // Parking spots
  app.get('/api/v1/spots', async (req, res) => {
    try {
      const state = await scopedState(res);
      const { siteId } = req.query;
      let list = state.spots;
      if (siteId && siteId !== 'all') list = list.filter((s) => s.siteId === siteId);
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des emplacements' });
    }
  });

  // New spots on a site: one or several codes at once (e.g. "A-09" … "A-14")
  app.post('/api/v1/spots', async (req, res) => {
    try {
      const b = req.body || {};
      const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      const siteId = text(b.siteId, 100);
      const zone = text(b.zone, 100);
      const type = text(b.type, 50);
      const codes: string[] = Array.isArray(b.codes)
        ? b.codes.map((c: unknown) => text(c, 30).toUpperCase()).filter(Boolean)
        : [];
      const state = await getFullState();
      if (!state.sites.some((x) => x.id === siteId)) return res.status(400).json({ error: 'Site inconnu.' });
      if (!zone) return res.status(400).json({ error: 'La zone est obligatoire.' });
      if (!(type in SPOT_TYPE_LABELS)) return res.status(400).json({ error: 'Type d’emplacement inconnu.' });
      if (codes.length === 0 || codes.length > 200) return res.status(400).json({ error: 'Indiquez entre 1 et 200 codes d’emplacement.' });
      if (new Set(codes).size !== codes.length) return res.status(400).json({ error: 'Le même code apparaît deux fois.' });
      const taken = codes.filter((c) => state.spots.some((x) => x.siteId === siteId && x.code.toUpperCase() === c));
      if (taken.length) return res.status(400).json({ error: `Code(s) déjà utilisé(s) sur ce site : ${taken.join(', ')}.` });

      const stamp = Date.now().toString(36);
      const created = await createSpotRecords(
        codes.map((code, i) => ({
          id: `spot-${siteId}-${code.replace(/[^A-Z0-9]+/g, '')}-${stamp}${i}`,
          code,
          siteId,
          zone,
          type: type as ParkingSpot['type'],
          status: 'libre' as const
        }))
      );
      const siteCode = state.sites.find((x) => x.id === siteId)?.code || siteId;
      await recordAudit(
        'CREATION_EMPLACEMENT',
        'Emplacements',
        `${created.length} emplacement(s) créé(s) — ${zone} : ${codes.length > 6 ? `${codes[0]} … ${codes[codes.length - 1]}` : codes.join(', ')}`,
        siteCode
      );
      return res.status(201).json(created);
    } catch (error) {
      console.error('Create spots error:', error);
      return res.status(500).json({ error: 'Impossible de créer les emplacements.' });
    }
  });

  // A zone = the spots of a site sharing the same zone name: rename it / change its type in one go
  app.post('/api/v1/zones/update', async (req, res) => {
    try {
      const b = req.body || {};
      const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      const siteId = text(b.siteId, 100);
      const zone = typeof b.zone === 'string' ? b.zone : '';
      const newZone = text(b.newZone, 100);
      const type = text(b.type, 50);
      const state = await getFullState();
      const site = state.sites.find((x) => x.id === siteId);
      if (!site) return res.status(400).json({ error: 'Site inconnu.' });
      const inZone = state.spots.filter((x) => x.siteId === siteId && x.zone === zone);
      if (inZone.length === 0) return res.status(404).json({ error: 'Zone introuvable sur ce site.' });
      if (b.newZone !== undefined && !newZone) return res.status(400).json({ error: 'Le nom de la zone ne peut pas être vide.' });
      if (type && !(type in SPOT_TYPE_LABELS)) return res.status(400).json({ error: 'Type d’emplacement inconnu.' });

      const changes: { zone?: string; type?: ParkingSpot['type'] } = {};
      if (newZone && newZone !== zone) changes.zone = newZone;
      if (type) changes.type = type as ParkingSpot['type'];
      if (!changes.zone && !changes.type) return res.status(400).json({ error: 'Aucune modification demandée.' });

      // Renaming onto an existing zone merges the two: refuse if spot codes would collide
      const target = changes.zone ? state.spots.filter((x) => x.siteId === siteId && x.zone === changes.zone) : [];
      const clash = inZone.filter((x) => target.some((t) => t.code.toUpperCase() === x.code.toUpperCase())).map((x) => x.code);
      if (clash.length) return res.status(400).json({ error: `Fusion impossible : code(s) en double ${clash.join(', ')}.` });

      const count = await updateZoneSpots(siteId, zone, changes);
      const parts = [
        changes.zone ? `renommée « ${changes.zone} »${target.length ? ' (fusionnée)' : ''}` : '',
        changes.type ? `type : ${SPOT_TYPE_LABELS[changes.type]}` : ''
      ].filter(Boolean);
      await recordAudit('MODIFICATION_ZONE', 'Emplacements', `Zone « ${zone} » ${parts.join(', ')} — ${count} place(s)`, site.code);
      return res.json({ ok: true, count });
    } catch (error) {
      console.error('Update zone error:', error);
      return res.status(500).json({ error: 'Impossible de modifier la zone.' });
    }
  });

  app.post('/api/v1/zones/delete', async (req, res) => {
    try {
      const b = req.body || {};
      const siteId = typeof b.siteId === 'string' ? b.siteId : '';
      const zone = typeof b.zone === 'string' ? b.zone : '';
      const state = await getFullState();
      const site = state.sites.find((x) => x.id === siteId);
      if (!site) return res.status(400).json({ error: 'Site inconnu.' });
      const inZone = state.spots.filter((x) => x.siteId === siteId && x.zone === zone);
      if (inZone.length === 0) return res.status(404).json({ error: 'Zone introuvable sur ce site.' });
      const occupied = inZone.filter((x) => x.status === 'occupe').map((x) => x.code);
      if (occupied.length) {
        return res.status(409).json({ error: `Suppression impossible : place(s) occupée(s) ${occupied.join(', ')}. Libérez-les d’abord.` });
      }
      const count = await deleteZoneSpots(siteId, zone);
      await recordAudit('SUPPRESSION_ZONE', 'Emplacements', `Zone « ${zone} » supprimée avec ses ${count} place(s)`, site.code);
      return res.json({ ok: true, count });
    } catch (error) {
      console.error('Delete zone error:', error);
      return res.status(500).json({ error: 'Impossible de supprimer la zone.' });
    }
  });

  app.patch('/api/v1/spots/:id', async (req, res) => {
    try {
      const spot = await updateSpotRecord(req.params.id, req.body);
      if (!spot) return res.status(404).json({ error: 'Emplacement introuvable' });
      await recordAudit('MODIF_EMPLACEMENT', 'Occupation', `Place ${spot.code} changée en ${spot.status}`);
      return res.json(spot);
    } catch (error) {
      console.error('Update spot error:', error);
      return res.status(500).json({ error: 'Impossible de mettre à jour la place' });
    }
  });

  // Payments and Receipts
  app.get('/api/v1/receipts', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.receipts);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des reçus' });
    }
  });

  app.post('/api/v1/receipts', async (req, res) => {
    try {
      const state = await getFullState();
      const receiptNum = pickYearlyNumber(req.body.receiptNumber, state.receipts.map((r) => r.receiptNumber), 'REC');
      const amountDueAr = Number(req.body.amountDueAr || 0);
      const amountPaidAr = Number(req.body.amountPaidAr || 0);
      const remaining = req.body.remainingBalanceAr ?? Math.max(0, amountDueAr - amountPaidAr);
      const paymentMethod = req.body.paymentMethod || 'Espèces';

      const receipt = await createReceiptRecord({
        id: req.body.id || `rec-${Date.now()}`,
        receiptNumber: receiptNum,
        dateTime:
          req.body.dateTime ||
          `${new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' })} ${new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Indian/Antananarivo'
          })}`,
        memberId: req.body.memberId,
        memberName: req.body.memberName || 'Client Stationnement',
        vehiclePlate: req.body.vehiclePlate,
        siteId: req.body.siteId || 'S1',
        siteName: req.body.siteName || state.sites.find((s) => s.id === req.body.siteId)?.name || '',
        purpose: req.body.purpose || 'Encaissement Stationnement',
        period: req.body.period || new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Indian/Antananarivo' }),
        amountDueAr,
        amountPaidAr,
        remainingBalanceAr: remaining,
        paymentMethod,
        cashierName: req.body.cashierName || res.locals.user?.fullName || '',
        transactionRef:
          req.body.transactionRef ||
          `TRX-${Math.floor(10000 + Math.random() * 90000)}-${String(paymentMethod).replace(/\s+/g, '').toUpperCase()}`,
        status: req.body.status || 'confirme'
      });

      await recordAudit(
        'ENCAISSEMENT_ENREGISTRE',
        'Finances',
        `Reçu ${receipt.receiptNumber} : ${receipt.amountPaidAr} Ar par ${receipt.paymentMethod} pour ${receipt.memberName}`,
        receipt.siteId
      );
      res.status(201).json(receipt);
    } catch (error) {
      console.error('Create receipt error:', error);
      res.status(500).json({ error: 'Impossible d\'enregistrer le paiement' });
    }
  });

  // Cards
  app.get('/api/v1/cards', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.cards);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des cartes' });
    }
  });

  app.post('/api/v1/cards/:id/toggle-block', async (req, res) => {
    try {
      const card = await toggleCardStatus(req.params.id);
      if (!card) return res.status(404).json({ error: 'Carte introuvable' });
      await recordAudit('STATUT_CARTE_MODIFIE', 'Cartes', `Carte ${card.cardNumber} passée au statut ${card.status}`);
      return res.json(card);
    } catch (error) {
      return res.status(500).json({ error: 'Impossible de modifier le statut de la carte' });
    }
  });

  app.post('/api/v1/cards/verify-qr', async (req, res) => {
    try {
      const { qrToken } = req.body;
      const state = await getFullState();
      const card = state.cards.find((c) => c.qrToken === qrToken);
      if (!card) {
        return res.status(404).json({ valid: false, message: 'Jeton QR inconnu ou non signé' });
      }
      const member = state.members.find((m) => m.id === card.memberId);
      return res.json({
        valid: card.status === 'actif',
        status: card.status,
        card,
        member,
        message:
          card.status === 'actif'
            ? "Signature cryptographique vérifiée. Droits d'accès valides."
            : 'CARTE BLOQUÉE / EN OPPOSITION'
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur vérification QR' });
    }
  });

  // Guards & Brigade Hierarchy
  app.get('/api/v1/guards', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.guards);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des gardiens' });
    }
  });

  // New staff member: team leader (new brigade) or guard placed under an existing leader
  app.post('/api/v1/guards', async (req, res) => {
    try {
      const b = req.body || {};
      const text = (v: unknown, max = 150) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      const fullName = text(b.fullName);
      const cin = text(b.cin, 30);
      const phoneFlotte = text(b.phoneFlotte, 30);
      const title = text(b.title);
      const siteId = text(b.siteId, 100);
      const isTeamLeader = b.isTeamLeader === true;
      if (!fullName || !cin || !phoneFlotte || !title || !siteId) {
        return res.status(400).json({ error: 'Nom, CIN, téléphone, poste et site sont obligatoires.' });
      }
      const state = await getFullState();
      if (!state.sites.some((s) => s.id === siteId)) {
        return res.status(400).json({ error: 'Site inconnu.' });
      }

      let teamId: string;
      let teamName: string;
      let teamLeaderId: string | undefined;
      let teamLeaderName: string | undefined;
      let rankOrder = 1;
      if (isTeamLeader) {
        teamName = text(b.teamName) || `Brigade ${fullName}`;
        teamId = `team-${siteId.toLowerCase()}-${Date.now().toString(36)}`;
      } else {
        const leader = state.guards.find((g) => g.id === b.teamLeaderId && g.isTeamLeader);
        if (!leader) return res.status(400).json({ error: 'Choisissez le chef de brigade de ce gardien.' });
        teamId = leader.teamId;
        teamName = leader.teamName;
        teamLeaderId = leader.id;
        teamLeaderName = leader.fullName;
        rankOrder = state.guards.filter((g) => g.teamId === leader.teamId).length + 1;
      }

      const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
      const CODES = new Set(['GARDE', 'REPOS', 'CONGE', 'ABSENT']);
      const shiftDays = Object.fromEntries(
        DAYS.map((d) => [d, CODES.has(b.shiftDays?.[d]) ? b.shiftDays[d] : 'REPOS'])
      ) as GuardPersonnelShiftDays;

      const matricule = nextGuardMatricule(state.guards);
      const STATUSES = new Set(['en_poste', 'de_repos', 'en_conge', 'absent']);
      const guard = await createGuardRecord({
        id: `grd-${Date.now()}`,
        matricule,
        fullName,
        title,
        grade: text(b.grade, 100) || 'Agent de sécurité',
        siteId,
        teamId,
        teamName,
        isTeamLeader,
        teamLeaderId,
        teamLeaderName,
        rankOrder,
        ordersOfTheDay: [],
        shiftHours: '06h → 06h (J+1)',
        shiftName: 'Matin',
        status: STATUSES.has(b.status) ? b.status : 'en_poste',
        phoneFlotte,
        cin,
        residenceLot: text(b.residenceLot, 300) || '—',
        recruitmentDate: text(b.recruitmentDate, 30) || new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' }),
        badgeRfid: text(b.badgeRfid, 80) || `#TAG-${matricule}`,
        avatarUrl: typeof b.avatarUrl === 'string' && b.avatarUrl.startsWith('data:image/') ? b.avatarUrl : undefined,
        assignedEquipments: [],
        shiftDays,
        todayLog: []
      });
      await recordAudit(
        'CREATION_PERSONNEL',
        'Sécurité & Gardiennage',
        `${isTeamLeader ? 'Chef de brigade' : 'Gardien'} ${fullName} (${matricule}) ajouté — ${teamName}${teamLeaderName ? `, sous les ordres de ${teamLeaderName}` : ''}`,
        siteId
      );
      return res.status(201).json(guard);
    } catch (error) {
      console.error('Create guard error:', error);
      return res.status(500).json({ error: 'Impossible d’enregistrer ce membre du personnel.' });
    }
  });

  app.post('/api/v1/guards/orders', async (req, res) => {
    try {
      const { teamId, orderText } = req.body;
      if (!teamId || !orderText) {
        return res.status(400).json({ error: 'teamId et orderText requis' });
      }
      const updatedCount = await broadcastGuardOrders(teamId, orderText);
      await recordAudit('ORDRE_DE_SERVICE_GARDIENS', 'Sécurité & Gardiennage', `Ordre diffusé à ${teamId}: "${orderText}"`);
      return res.json({ updatedCount });
    } catch (error) {
      return res.status(500).json({ error: 'Impossible de diffuser l\'ordre' });
    }
  });

  // Profile Avatars
  app.patch('/api/v1/profile/avatar', async (req, res) => {
    try {
      const { type, id, avatarUrl } = req.body;
      if (!type || !id || !avatarUrl) {
        return res.status(400).json({ error: 'type, id et avatarUrl requis' });
      }
      await updateEntityAvatar(type, id, avatarUrl);
      await recordAudit('PHOTO_PROFIL_MODIFIEE', 'Administration', `Photo mise à jour pour ${type} #${id}`);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: 'Impossible de modifier la photo' });
    }
  });

  // Equipments
  app.get('/api/v1/equipments', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.equipments);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des équipements' });
    }
  });

  const imageOrUndefined = (v: unknown) => (typeof v === 'string' && v.startsWith('data:image/') ? v : undefined);

  // New equipment in the inventory
  app.post('/api/v1/equipments', async (req, res) => {
    try {
      const b = req.body || {};
      const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      const designation = text(b.designation, 200);
      const category = EQUIPMENT_CATEGORIES.some((c) => c.id === b.category) ? (b.category as Equipment['category']) : null;
      const siteId = text(b.siteId, 100);
      const quantity = Math.floor(Number(b.quantity));
      const value = Math.max(0, Math.round(Number(b.estimatedValueAr) || 0));
      const state = await getFullState();
      if (!designation) return res.status(400).json({ error: 'La désignation est obligatoire.' });
      if (!category) return res.status(400).json({ error: 'Catégorie inconnue.' });
      if (!state.sites.some((s) => s.id === siteId)) return res.status(400).json({ error: 'Site inconnu.' });
      if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'La quantité doit être un nombre entier d’au moins 1.' });
      const status = b.status in EQUIPMENT_STATUS_LABELS ? (b.status as Equipment['status']) : 'operationnel';
      const now = formatEntryTime();
      const by = res.locals.user?.fullName || '';
      const item = await createEquipmentRecord({
        id: `eq-${Date.now().toString(36)}`,
        inventoryCode: nextInventoryCode(state.equipments, category),
        designation,
        category,
        modelSpecs: text(b.modelSpecs, 500),
        siteId,
        location: text(b.location, 150) || '—',
        status,
        quantity,
        responsibleName: text(b.responsibleName, 150) || by,
        commissioningDate: isoToFr(text(b.commissioningDate, 30)) || now.slice(0, 10),
        estimatedValueAr: value,
        totalCycles: text(b.totalCycles, 100) || undefined,
        lastAuditDate: now.slice(0, 10),
        photoUrl: imageOrUndefined(b.photoUrl),
        maintenanceHistory: [
          { date: now, kind: 'creation', title: 'Entrée en inventaire', description: `${quantity} unité(s)${by ? ` — ${by}` : ''}` }
        ]
      });
      const siteCode = state.sites.find((s) => s.id === siteId)?.code || siteId;
      await recordAudit('AJOUT_EQUIPEMENT', 'Matériel', `${item.inventoryCode} — ${item.designation} (${quantity} unité(s))`, siteCode);
      return res.status(201).json(item);
    } catch (error) {
      console.error('Create equipment error:', error);
      return res.status(500).json({ error: 'Impossible d’ajouter l’équipement.' });
    }
  });

  // Event on an equipment: planned intervention, breakdown, back in service, transfer, inventory count
  app.post('/api/v1/equipments/:id/events', async (req, res) => {
    try {
      const state = await getFullState();
      const eq = state.equipments.find((x) => x.id === req.params.id);
      if (!eq) return res.status(404).json({ error: 'Équipement introuvable.' });
      const b = req.body || {};
      const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      const siteName = (id: string) => state.sites.find((s) => s.id === id)?.name || id;
      let ev: EquipmentEvent;
      switch (b.kind) {
        case 'intervention': {
          const plannedDate = isoToFr(text(b.plannedDate, 30));
          const title = text(b.title, 150);
          if (!plannedDate || !title) return res.status(400).json({ error: 'Date et objet de l’intervention sont obligatoires.' });
          ev = { kind: 'intervention', plannedDate, title, description: text(b.description, 500), provider: text(b.provider, 150) };
          break;
        }
        case 'panne': {
          const description = text(b.description, 500);
          if (!description) return res.status(400).json({ error: 'Décrivez la panne.' });
          ev = { kind: 'panne', description, critical: b.critical === true };
          break;
        }
        case 'remise_service':
          ev = { kind: 'remise_service', description: text(b.description, 500) };
          break;
        case 'transfert': {
          const siteId = text(b.siteId, 100);
          if (!state.sites.some((s) => s.id === siteId)) return res.status(400).json({ error: 'Site de destination inconnu.' });
          if (siteId === eq.siteId) return res.status(400).json({ error: 'Le matériel est déjà sur ce site.' });
          ev = { kind: 'transfert', siteId, location: text(b.location, 150) || '—', siteName: siteName(siteId), fromSiteName: siteName(eq.siteId), reason: text(b.reason, 300) };
          break;
        }
        case 'audit': {
          const quantityFound = Math.floor(Number(b.quantityFound));
          if (!Number.isInteger(quantityFound) || quantityFound < 0) return res.status(400).json({ error: 'Quantité constatée invalide.' });
          ev = { kind: 'audit', quantityFound, note: text(b.note, 300) };
          break;
        }
        default:
          return res.status(400).json({ error: 'Type d’événement inconnu.' });
      }
      const by = res.locals.user?.fullName || '';
      const { patch, entry } = applyEquipmentEvent(eq, ev, formatEntryTime(), by);
      const maintenanceHistory = [entry, ...(eq.maintenanceHistory || [])].slice(0, 200);
      await updateRecord('equipments', eq.id, { ...patch, maintenanceHistory });

      // A declared breakdown is also an incident (it then appears in the alerts)
      let incident = null;
      if (ev.kind === 'panne') {
        incident = await createIncidentRecord({
          id: `inc-${Date.now()}`,
          ticketCode: pickYearlyNumber(undefined, state.incidents.map((i) => i.ticketCode), 'INC'),
          date: formatEntryTime(),
          siteId: eq.siteId,
          reporterName: by,
          type: 'materiel',
          severity: ev.critical ? 'critique' : 'eleve',
          title: `Panne : ${eq.designation} (${eq.inventoryCode})`,
          description: ev.description,
          resolutionStatus: 'ouvert',
          memberIds: [],
          vehicleIds: []
        });
      }
      const siteCode = state.sites.find((s) => s.id === (patch.siteId || eq.siteId))?.code || eq.siteId;
      await recordAudit('MOUVEMENT_EQUIPEMENT', 'Matériel', `${eq.inventoryCode} — ${entry.title}`, siteCode);
      return res.json({ equipment: { ...eq, ...patch, maintenanceHistory }, incident });
    } catch (error) {
      console.error('Equipment event error:', error);
      return res.status(500).json({ error: 'Impossible d’enregistrer cet événement.' });
    }
  });

  // Cash Registers & Expenses
  app.get('/api/v1/cash-registers', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.cashRegisters);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des caisses' });
    }
  });

  app.get('/api/v1/expenses', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.expenses);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des dépenses' });
    }
  });

  app.post('/api/v1/expenses', async (req, res) => {
    try {
      const state = await getFullState();
      // Never reuse an existing number (the column is unique): fall back to the next free one
      const requested = typeof req.body.expenseNumber === 'string' ? req.body.expenseNumber : '';
      const expNum = requested && !state.expenses.some((e) => e.expenseNumber === requested)
        ? requested
        : nextExpenseNumber(state.expenses);
      const invoicePhotoUrl =
        typeof req.body.invoicePhotoUrl === 'string' && req.body.invoicePhotoUrl.startsWith('data:image/')
          ? req.body.invoicePhotoUrl
          : undefined;
      const rawQuantity = Number(req.body.quantity);
      const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : undefined;
      const unit =
        quantity !== undefined && typeof req.body.unit === 'string' && req.body.unit.trim()
          ? req.body.unit.trim().slice(0, 30)
          : undefined;
      const newExp = await createExpenseRecord({
        id: req.body.id || `exp-${Date.now()}`,
        expenseNumber: expNum,
        date:
          req.body.date ||
          `${new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' })} ${new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Indian/Antananarivo'
          })}`,
        siteId: req.body.siteId || 'S1',
        category: req.body.category || 'Autre',
        description: req.body.description || 'Dépense exploitation',
        beneficiary: req.body.beneficiary || 'Prestataire',
        amountAr: Number(req.body.amountAr || 50000),
        paymentMethod: req.body.paymentMethod || 'Espèces',
        requesterName: req.body.requesterName || res.locals.user?.fullName || state.currentUser.fullName,
        status: 'en_attente',
        justificatifRef: req.body.justificatifRef,
        invoicePhotoUrl,
        quantity,
        unit
      });
      await recordAudit(
        'DEMANDE_ENGAGEMENT_DEPENSE',
        'Finances',
        `Demande #${expNum} créée (${newExp.amountAr} Ar)` +
          `${quantity !== undefined ? ` — ${quantity} ${unit || ''}`.trimEnd() : ''}` +
          `${invoicePhotoUrl ? ' avec photo de facture' : ''}`
      );
      res.status(201).json(newExp);
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json({ error: 'Impossible de créer la dépense' });
    }
  });

  app.post('/api/v1/expenses/:id/approve', async (req, res) => {
    try {
      const approver = req.body?.approverName || res.locals.user?.fullName || '';
      const exp = await decideExpenseRecord(req.params.id, 'approuve', approver);
      if (!exp) return res.status(404).json({ error: 'Dépense introuvable' });
      await recordAudit('APPROBATION_DEPENSE', 'Trésorerie', `Dépense ${exp.expenseNumber} approuvée (${exp.amountAr} Ar)`);
      return res.json(exp);
    } catch (error) {
      return res.status(500).json({ error: 'Impossible d\'approuver la dépense' });
    }
  });

  app.post('/api/v1/expenses/:id/reject', async (req, res) => {
    try {
      const approver = req.body?.approverName || res.locals.user?.fullName || '';
      const exp = await decideExpenseRecord(req.params.id, 'rejete', approver);
      if (!exp) return res.status(404).json({ error: 'Dépense introuvable' });
      await recordAudit('REJET_DEPENSE', 'Trésorerie', `Dépense ${exp.expenseNumber} rejetée`);
      return res.json(exp);
    } catch (error) {
      return res.status(500).json({ error: 'Impossible de rejeter la dépense' });
    }
  });

  // Incidents
  app.get('/api/v1/incidents', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.incidents);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des incidents' });
    }
  });

  app.post('/api/v1/incidents', async (req, res) => {
    try {
      const state = await getFullState();
      const ticketCode = pickYearlyNumber(req.body.ticketCode, state.incidents.map((i) => i.ticketCode), 'INC');
      const newInc = await createIncidentRecord({
        id: req.body.id || `inc-${Date.now()}`,
        ticketCode,
        date:
          req.body.date ||
          `${new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' })} ${new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Indian/Antananarivo'
          })}`,
        siteId: req.body.siteId || 'S1',
        reporterName: req.body.reporterName || res.locals.user?.fullName || state.currentUser.fullName,
        type: req.body.type || 'autre',
        severity: req.body.severity || 'moyen',
        title: req.body.title,
        description: req.body.description,
        assignedTo: req.body.assignedTo,
        resolutionStatus: req.body.resolutionStatus || 'ouvert',
        resolutionNotes: req.body.resolutionNotes,
        memberIds: toIdList(req.body.memberIds),
        vehicleIds: toIdList(req.body.vehicleIds)
      });
      await recordAudit('CREATION_INCIDENT', 'Sécurité', `Ticket ${ticketCode} ouvert: ${newInc.title}`, newInc.siteId);
      res.status(201).json(newInc);
    } catch (error) {
      res.status(500).json({ error: 'Impossible de créer l\'incident' });
    }
  });

  app.patch('/api/v1/incidents/:id', async (req, res) => {
    try {
      const updated = await updateIncidentRecordStatus(req.params.id, req.body.resolutionStatus, req.body.resolutionNotes);
      if (!updated) return res.status(404).json({ error: 'Incident introuvable' });
      await recordAudit('MISE_A_JOUR_INCIDENT', 'Sécurité', `Ticket ${updated.ticketCode} passé à ${updated.resolutionStatus}`, updated.siteId);
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ error: 'Impossible de mettre à jour l\'incident' });
    }
  });

  // Governance (Committee & Meetings)
  app.get('/api/v1/committee', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.committeeMembers);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement du comité' });
    }
  });

  app.post('/api/v1/committee', async (req, res) => {
    try {
      const created = await createCommitteeMemberRecord({
        id: req.body.id || `com-${Date.now()}`,
        role: req.body.role,
        fullName: req.body.fullName,
        siteId: req.body.siteId,
        phone: req.body.phone,
        email: req.body.email,
        avatarUrl: req.body.avatarUrl,
        monthlyIndemnityAr: Number(req.body.monthlyIndemnityAr || 0),
        mandateStart: req.body.mandateStart,
        mandateEnd: req.body.mandateEnd,
        status: req.body.status || 'actif'
      });
      await recordAudit('NOUVEAU_MEMBRE_COMITE', 'Gouvernance', `${created.role} nommé: ${created.fullName}`);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: 'Impossible d\'ajouter le membre du comité' });
    }
  });

  app.get('/api/v1/meetings', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.meetings);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des réunions' });
    }
  });

  app.post('/api/v1/meetings', async (req, res) => {
    try {
      const created = await createMeetingRecord({
        id: req.body.id || `meet-${Date.now()}`,
        date: req.body.date,
        title: req.body.title,
        location: req.body.location,
        agenda: req.body.agenda,
        summaryPV: req.body.summaryPV,
        resolutionsCount: Number(req.body.resolutionsCount || 1),
        documentPdfUrl: req.body.documentPdfUrl
      });
      await recordAudit('REUNION_GOUVERNANCE_AJOUTEE', 'Gouvernance', `PV Réunion enregistré: ${created.title}`);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: 'Impossible d\'enregistrer la réunion' });
    }
  });

  // Payrolls (Personnel & Bureau)
  app.get('/api/v1/payrolls', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.payrolls);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement de la paie' });
    }
  });

  app.post('/api/v1/payrolls', async (req, res) => {
    try {
      const state = await getFullState();
      const slipNumber = pickYearlyNumber(req.body.slipNumber, state.payrolls.map((p) => p.slipNumber), 'PAY', currentYear(), 3);
      const created = await createPayrollRecord({
        ...req.body,
        id: req.body.id || `pay-${Date.now()}`,
        slipNumber,
        generatedDate: req.body.generatedDate || new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' })
      });
      await recordAudit(
        'EMISSION_BULLETIN_PAIE',
        'Paie & Rémunérations',
        `Bulletin #${slipNumber} émis pour ${created.beneficiaryName} (${created.netSalaryAr} Ar)`,
        created.siteId
      );
      res.status(201).json(created);
    } catch (error) {
      console.error('Create payroll error:', error);
      res.status(500).json({ error: 'Impossible de créer le bulletin de paie' });
    }
  });

  app.patch('/api/v1/payrolls/:id/status', async (req, res) => {
    try {
      const { status, approverName, transactionRef } = req.body;
      const updated = await updatePayrollRecordStatus(req.params.id, status, approverName, transactionRef);
      if (!updated) return res.status(404).json({ error: 'Bulletin introuvable' });
      await recordAudit(
        'STATUT_PAIE_MIS_A_JOUR',
        'Paie & Rémunérations',
        `Bulletin #${updated.slipNumber} (${updated.beneficiaryName}) passé à statut: ${status}`,
        updated.siteId
      );
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ error: 'Impossible de mettre à jour le bulletin' });
    }
  });

  // Generic edit / delete for every managed collection
  app.put('/api/v1/:collection/:id', async (req, res) => {
    const { collection, id } = req.params;
    if (!isEditableCollection(collection)) {
      return res.status(404).json({ error: 'Collection inconnue' });
    }
    try {
      const before = await getFullState();
      if (collection === 'members' && req.body?.status !== undefined && req.body.status !== 'radie') {
        const hasVehicle = before.vehicles.some((v) => v.memberId === id && countsAsVehicle(v));
        if (!hasVehicle) {
          return res.status(400).json({ error: 'Ce membre n’a aucun véhicule : il reste « Radié ». Ajoutez-lui d’abord un véhicule.' });
        }
      }
      const oldVehicle = collection === 'vehicles' ? before.vehicles.find((v) => v.id === id) : undefined;
      if (collection === 'vehicles' && req.body?.licensePlate !== undefined) {
        const plate = normPlate(req.body.licensePlate);
        if (!plate) return res.status(400).json({ error: 'L’immatriculation est obligatoire.' });
        if (plateTaken(before.vehicles, plate, id)) return res.status(400).json({ error: `L’immatriculation ${plate} est déjà enregistrée.` });
        req.body.licensePlate = plate;
      }
      const ok = await updateRecord(collection, id, req.body || {});
      if (!ok) return res.status(404).json({ error: 'Enregistrement introuvable' });
      await recordAudit('MODIFICATION', collection, `Modification de ${collection} / ${id}`);
      if (oldVehicle) {
        // Owner changed or vehicle struck off: check the former and the new owner
        await applyVehicleRule([oldVehicle.memberId], { reactivate: false });
        if (req.body?.memberId && req.body.memberId !== oldVehicle.memberId) await applyVehicleRule([req.body.memberId], { reactivate: true });
        else if (req.body?.status && req.body.status !== 'radie') await applyVehicleRule([oldVehicle.memberId], { reactivate: true });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error(`Update ${collection} error:`, error);
      return res.status(500).json({ error: 'Impossible d’enregistrer la modification' });
    }
  });

  app.delete('/api/v1/:collection/:id', async (req, res) => {
    const { collection, id } = req.params;
    if (!isEditableCollection(collection)) {
      return res.status(404).json({ error: 'Collection inconnue' });
    }
    try {
      const ownerId = collection === 'vehicles' ? (await getFullState()).vehicles.find((v) => v.id === id)?.memberId : undefined;
      const ok = await deleteRecord(collection, id);
      if (!ok) return res.status(404).json({ error: 'Enregistrement introuvable' });
      await recordAudit('SUPPRESSION', collection, `Suppression de ${collection} / ${id}`);
      // Last vehicle removed: the owner is struck off
      if (ownerId) await applyVehicleRule([ownerId], { reactivate: false });
      return res.json({ ok: true });
    } catch (error) {
      if (error instanceof RecordInUseError) {
        return res.status(409).json({ error: error.message });
      }
      console.error(`Delete ${collection} error:`, error);
      return res.status(500).json({ error: 'Impossible de supprimer cet enregistrement' });
    }
  });

  // Data reset: wipes operational data, keeps configuration (sites, spots, tariffs, staff, equipment)
  app.post('/api/v1/admin/reset', async (req, res) => {
    if (req.body?.confirmation !== RESET_CONFIRMATION_WORD) {
      return res.status(400).json({ error: `Confirmation invalide : tapez ${RESET_CONFIRMATION_WORD}` });
    }
    try {
      const summary = await resetOperationalData();
      await recordAudit(
        'REINITIALISATION_DONNEES',
        'Système',
        `Remise à zéro : ${summary.members} membres, ${summary.vehicles} véhicules, ${summary.receipts} reçus, ` +
          `${summary.expenses} dépenses, ${summary.payrolls} paies, ${summary.incidents} incidents supprimés ; ` +
          `${summary.spotsFreed} places libérées, ${summary.cashRegistersZeroed} caisse(s) remise(s) à 0 Ar.`
      );
      return res.json({ ok: true, summary });
    } catch (error) {
      console.error('Reset error:', error);
      return res.status(500).json({ error: 'La remise à zéro a échoué, aucune donnée n’a été modifiée.' });
    }
  });

  // Audit logs
  app.get('/api/v1/audit-logs', async (_req, res) => {
    try {
      const state = await scopedState(res);
      res.json(state.auditLogs);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement du journal d\'audit' });
    }
  });

  // Mount Vite middleware in development
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Start-up check: members without vehicle are struck off (manual strikings-off are never undone here)
  try {
    const state = await getFullState();
    await applyVehicleRule(state.members.map((m) => m.id), { reactivate: false });
  } catch (error) {
    console.error('Member/vehicle check error:', error);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Parking Manager Madagascar] Full-Stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

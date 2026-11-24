/**
 * Who may do what (shared by the server, which enforces it, and the interface, which adapts to it).
 *
 * Two rules:
 *  1. Site: a role attached to a site (Président de site, Trésorier de site, gardiens, caisse…)
 *     only sees and changes the data of its own site.
 *  2. Action: each role may only perform the kinds of actions listed in ROLE_ACTIONS.
 */
import type { AppState, User, UserRole } from '../types';
import { USER_ROLES } from '../types';

export type Action =
  | 'write' // create / edit day-to-day records (members, vehicles, spots, incidents, staff…)
  | 'delete' // delete a record
  | 'finance' // cash in payments, request expenses
  | 'expense_approve' // approve / reject an expense
  | 'payroll' // pay slips
  | 'tariffs' // prices
  | 'governance' // committee & meetings
  | 'sites' // create / edit / delete sites
  | 'spots' // create parking spots on a site
  | 'admin'; // data reset (accounts and branding have their own check)

export const ACTION_LABELS: Record<Action, string> = {
  write: 'modifier les données',
  delete: 'supprimer des enregistrements',
  finance: 'encaisser ou engager des dépenses',
  expense_approve: 'approuver ou rejeter des dépenses',
  payroll: 'gérer la paie',
  tariffs: 'modifier les tarifs',
  governance: 'gérer le comité et les réunions',
  sites: 'gérer les sites',
  spots: 'créer ou modifier des emplacements et des zones',
  admin: 'réinitialiser les données'
};

const ALL: Action[] = ['write', 'delete', 'finance', 'expense_approve', 'payroll', 'tariffs', 'governance', 'sites', 'spots', 'admin'];

export const ROLE_ACTIONS: Record<UserRole, Action[]> = {
  super_admin: ALL,
  president_general: ALL,
  tresorier_general: ['write', 'delete', 'finance', 'expense_approve', 'payroll', 'tariffs', 'spots'],
  secretaire: ['write', 'governance'],
  membre_comite: ['write'],
  gestionnaire_materiel: ['write'],
  auditeur: [], // read only
  president_site: ['write', 'delete', 'finance', 'expense_approve', 'spots'],
  tresorier_site: ['write', 'finance', 'expense_approve'],
  chef_poste_gardien: ['write'],
  gardien: ['write'],
  agent_caisse: ['write', 'finance'],
  proprietaire_membre: [] // read only
};

export function roleCan(role: string | undefined, action: Action): boolean {
  return !!role && (ROLE_ACTIONS[role as UserRole] ?? []).includes(action);
}

export function forbiddenMessage(action: Action): string {
  return `Votre rôle ne permet pas de ${ACTION_LABELS[action]}.`;
}

/** Site the user is limited to, or null when the role covers every site. */
export function userSite(user: Pick<User, 'role' | 'siteId'> | undefined | null): string | null {
  if (!user) return null;
  const def = USER_ROLES.find((r) => r.role === user.role);
  return def?.needsSite && user.siteId ? user.siteId : null;
}

/** Site a record belongs to (null = shared by every site). */
export function recordSiteId(stateKey: string, record: Record<string, unknown> | undefined | null): string | null {
  if (!record) return null;
  if (stateKey === 'sites') return String(record.id);
  const site = record.siteId ?? record.primarySiteId;
  return typeof site === 'string' && site && site !== 'GLOBAL' ? site : null;
}

/** Action needed to change a record of a collection (generic edit / delete routes). */
export function collectionAction(stateKey: string): Action {
  switch (stateKey) {
    case 'sites':
      return 'sites';
    case 'committeeMembers':
    case 'meetings':
      return 'governance';
    case 'payrolls':
      return 'payroll';
    case 'tariffs':
      return 'tariffs';
    case 'receipts':
    case 'expenses':
    case 'cashRegisters':
      return 'finance';
    default:
      return 'write';
  }
}

/** Data visible to the user: everything, or only their site for a site-bound role. */
export function scopeState(state: AppState, user: Pick<User, 'id' | 'role' | 'siteId'> | undefined | null): AppState {
  const site = userSite(user);
  if (!site) return state;
  const siteCode = state.sites.find((s) => s.id === site)?.code;
  const mine = <T>(list: T[], key: string = 'siteId') =>
    list.filter((item) => (item as Record<string, unknown>)[key] === site);
  const mineOrShared = <T>(list: T[]) =>
    list.filter((item) => {
      const s = (item as Record<string, unknown>).siteId;
      return !s || s === site;
    });
  return {
    ...state,
    selectedSiteId: site,
    sites: state.sites.filter((s) => s.id === site),
    users: state.users.filter((u) => u.id === user?.id || u.siteId === site),
    members: mine(state.members, 'primarySiteId'),
    vehicles: mine(state.vehicles),
    spots: mine(state.spots),
    tariffs: mineOrShared(state.tariffs),
    subscriptions: mine(state.subscriptions),
    receipts: mine(state.receipts),
    cards: mine(state.cards),
    guards: mine(state.guards),
    equipments: mine(state.equipments),
    cashRegisters: mine(state.cashRegisters),
    expenses: mine(state.expenses),
    incidents: mine(state.incidents),
    committeeMembers: mineOrShared(state.committeeMembers),
    meetings: state.meetings,
    payrolls: mine(state.payrolls),
    auditLogs: state.auditLogs.filter((l) => l.siteCode === siteCode || l.siteCode === site)
  };
}

/** What a write request needs: the action, and where to read the site it touches. */
export type WriteRule =
  | { action: Action; site?: { body: string } } // creation: site given in the request body
  | { action: Action; also?: Action; record: { stateKey: string; id: string } } // change of an existing record
  | { action: Action; teamId: string } // order sent to a guard team
  | { action: 'avatar' };

const RECORD_ROUTES: { re: RegExp; action: Action; stateKey: string }[] = [
  { re: /^\/spots\/([^/]+)$/, action: 'write', stateKey: 'spots' },
  { re: /^\/cards\/([^/]+)\/toggle-block$/, action: 'write', stateKey: 'cards' },
  { re: /^\/expenses\/([^/]+)\/(approve|reject)$/, action: 'expense_approve', stateKey: 'expenses' },
  { re: /^\/incidents\/([^/]+)$/, action: 'write', stateKey: 'incidents' },
  { re: /^\/payrolls\/([^/]+)\/status$/, action: 'payroll', stateKey: 'payrolls' },
  { re: /^\/equipments\/([^/]+)\/events$/, action: 'write', stateKey: 'equipments' }
];

const CREATE_ROUTES: Record<string, { action: Action; siteField?: string }> = {
  '/sites': { action: 'sites' },
  '/members': { action: 'write', siteField: 'primarySiteId' },
  '/vehicles': { action: 'write', siteField: 'siteId' },
  '/spots': { action: 'spots', siteField: 'siteId' },
  '/zones/update': { action: 'spots', siteField: 'siteId' },
  '/zones/delete': { action: 'spots', siteField: 'siteId' },
  '/receipts': { action: 'finance', siteField: 'siteId' },
  '/guards': { action: 'write', siteField: 'siteId' },
  '/equipments': { action: 'write', siteField: 'siteId' },
  '/expenses': { action: 'finance', siteField: 'siteId' },
  '/incidents': { action: 'write', siteField: 'siteId' },
  '/committee': { action: 'governance' },
  '/meetings': { action: 'governance' },
  '/payrolls': { action: 'payroll', siteField: 'siteId' },
  '/admin/reset': { action: 'admin' }
};

/**
 * Rule for a write request on /api/v1 (path without the /api/v1 prefix).
 * Returns null for requests that are not checked here (sign-in, accounts, branding, QR check…).
 */
export function writeRule(
  method: string,
  path: string,
  stateKeyOf: (collection: string) => string | null
): WriteRule | null {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;
  if (/^\/(auth|users|settings)(\/|$)/.test(path) || path === '/cards/verify-qr') return null;
  if (path === '/profile/avatar') return { action: 'avatar' };
  if (method === 'POST' && path === '/guards/orders') return { action: 'write', teamId: '' };

  for (const r of RECORD_ROUTES) {
    const m = r.re.exec(path);
    if (m) return { action: r.action, record: { stateKey: r.stateKey, id: decodeURIComponent(m[1]) } };
  }
  if (method === 'POST' && CREATE_ROUTES[path]) {
    const c = CREATE_ROUTES[path];
    return c.siteField ? { action: c.action, site: { body: c.siteField } } : { action: c.action };
  }
  const generic = /^\/([^/]+)\/([^/]+)$/.exec(path);
  if (generic && (method === 'PUT' || method === 'DELETE')) {
    const stateKey = stateKeyOf(generic[1]);
    if (stateKey) {
      const action = collectionAction(stateKey);
      const record = { stateKey, id: decodeURIComponent(generic[2]) };
      // Deleting needs the right to delete AND the right on that kind of record (e.g. payroll)
      return method === 'DELETE' ? { action: 'delete', also: action === 'write' ? undefined : action, record } : { action, record };
    }
  }
  // Unknown write route: needs at least the right to change data
  return { action: 'write' };
}

/** Committee members who may accept memberships and preside a site (shared by the pages and the server). */
import type { CommitteeMember, Site } from '../types';

export const COMMITTEE_ROLE_LABELS: Record<CommitteeMember['role'], string> = {
  'President General': 'Président Général',
  'Vice President': 'Vice-Président',
  'President Site': 'Président de site',
  'Tresorier General': 'Trésorier Général',
  'Tresorier Site': 'Trésorier de site',
  'Secretaire General': 'Secrétaire Général',
  'Controleur de Gestion': 'Contrôleur de gestion'
};

export const isPresident = (c: Pick<CommitteeMember, 'role'>) => c.role === 'President General' || c.role === 'President Site';

/** Active president of a site in the committee (role "Président de site" attached to that site). */
export function sitePresidentOf(committee: CommitteeMember[], siteId: string): CommitteeMember | undefined {
  return committee.find((c) => c.role === 'President Site' && c.siteId === siteId && c.status === 'actif');
}

/** Presidents who can accept a membership: Président Général and presidents of site (active members of the committee). */
export function membershipApprovers(committee: CommitteeMember[], sites: Site[]): { value: string; label: string; siteId?: string }[] {
  const siteName = (id?: string) => sites.find((s) => s.id === id)?.name || id || '';
  return committee
    .filter((c) => c.status === 'actif' && isPresident(c))
    .sort((a, b) => (a.role === b.role ? a.fullName.localeCompare(b.fullName) : a.role === 'President General' ? -1 : 1))
    .map((c) =>
      c.role === 'President General'
        ? { value: `${c.fullName} (Président Général)`, label: `${c.fullName} — Président Général` }
        : { value: `${c.fullName} (Président du site ${siteName(c.siteId)})`, label: `${c.fullName} — Président du site ${siteName(c.siteId)}`, siteId: c.siteId }
    );
}

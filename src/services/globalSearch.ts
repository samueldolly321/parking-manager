/** Global search of the header: finds members, vehicles, receipts, cards, expenses, staff, equipment, incidents. */
import type { AppState } from '../types';

export type SearchKind = 'membre' | 'vehicule' | 'recu' | 'carte' | 'depense' | 'gardien' | 'materiel' | 'incident';

/** Where a result leads: the page, and what to select or filter there. */
export interface SearchTarget {
  path: string;
  /** Record to open on arrival (member id, card id, guard matricule, equipment code) */
  selectId?: string;
  /** Text to pre-fill in the page's own search field */
  query?: string;
}

export interface SearchResult {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  target: SearchTarget;
}

export const KIND_LABEL: Record<SearchKind, { label: string; icon: string }> = {
  membre: { label: 'Membre', icon: 'person' },
  vehicule: { label: 'Véhicule', icon: 'directions_car' },
  recu: { label: 'Reçu', icon: 'receipt_long' },
  carte: { label: 'Carte', icon: 'badge' },
  depense: { label: 'Dépense', icon: 'payments' },
  gardien: { label: 'Personnel', icon: 'security' },
  materiel: { label: 'Matériel', icon: 'build' },
  incident: { label: 'Incident', icon: 'warning' }
};

/** Lowercase, no accents, no spaces/dashes: "6543 TBD" and "6543tbd" give the same key. */
export function normalize(text: string | undefined | null): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s\-_.\/]+/g, '');
}

const fmtAr = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/[  ,]/g, ' ')} Ar`;

/** Results for `query` (at least 2 characters), best matches first, at most `limit`. */
export function globalSearch(state: AppState, query: string, limit = 12): SearchResult[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  const scored: { r: SearchResult; score: number }[] = [];
  /** Score: 3 = a field equals the query, 2 = starts with it, 1 = contains it. */
  const add = (r: SearchResult, fields: (string | undefined | null)[]) => {
    let best = 0;
    for (const f of fields) {
      const n = normalize(f);
      if (!n) continue;
      if (n === q) best = Math.max(best, 3);
      else if (n.startsWith(q)) best = Math.max(best, 2);
      else if (n.includes(q)) best = Math.max(best, 1);
    }
    if (best > 0) scored.push({ r, score: best });
  };

  for (const m of state.members) {
    add(
      { id: `m-${m.id}`, kind: 'membre', title: m.fullName, subtitle: `${m.memberNumber} · ${m.phone}`,
        target: { path: 'membres-et-proprietaires', selectId: m.id } },
      [m.fullName, m.memberNumber, m.phone, m.cin]
    );
  }
  for (const v of state.vehicles) {
    const owner = state.members.find((m) => m.id === v.memberId)?.fullName;
    add(
      { id: `v-${v.id}`, kind: 'vehicule', title: v.licensePlate, subtitle: `${v.brand} ${v.model}${owner ? ` · ${owner}` : ''}`,
        target: { path: 'vehicules', query: v.licensePlate } },
      [v.licensePlate, v.rfidTag, v.barcode, `${v.brand} ${v.model}`]
    );
  }
  for (const r of state.receipts) {
    add(
      { id: `r-${r.id}`, kind: 'recu', title: r.receiptNumber, subtitle: `${r.memberName} · ${fmtAr(r.amountPaidAr)} · ${r.dateTime}`,
        target: { path: 'encaissements-et-recus', query: r.receiptNumber } },
      [r.receiptNumber, r.memberName, r.vehiclePlate, r.transactionRef]
    );
  }
  for (const c of state.cards) {
    add(
      { id: `c-${c.id}`, kind: 'carte', title: c.cardNumber, subtitle: `${c.memberName} · ${c.primaryPlate}`,
        target: { path: 'cartes-de-membres', selectId: c.id } },
      [c.cardNumber, c.memberName, c.primaryPlate, c.secondaryPlate, c.rfidTag]
    );
  }
  for (const e of state.expenses) {
    add(
      { id: `e-${e.id}`, kind: 'depense', title: e.expenseNumber, subtitle: `${e.description} · ${e.beneficiary} · ${fmtAr(e.amountAr)}`,
        target: { path: 'tresorerie-et-caisses' } },
      [e.expenseNumber, e.description, e.beneficiary]
    );
  }
  for (const g of state.guards) {
    add(
      { id: `g-${g.id}`, kind: 'gardien', title: g.fullName, subtitle: `${g.matricule} · ${g.title}`,
        target: { path: 'personnel-et-gardiens', selectId: g.matricule, query: g.fullName } },
      [g.fullName, g.matricule, g.phoneFlotte, g.badgeRfid]
    );
  }
  for (const eq of state.equipments) {
    add(
      { id: `q-${eq.id}`, kind: 'materiel', title: eq.designation, subtitle: `${eq.inventoryCode} · ${eq.location}`,
        target: { path: 'materiels-et-equipements', selectId: eq.inventoryCode } },
      [eq.inventoryCode, eq.designation]
    );
  }
  for (const i of state.incidents) {
    add(
      { id: `i-${i.id}`, kind: 'incident', title: i.title, subtitle: `${i.ticketCode} · ${i.date}`,
        target: { path: 'incidents-et-registre', query: i.ticketCode } },
      [i.ticketCode, i.title]
    );
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.r);
}

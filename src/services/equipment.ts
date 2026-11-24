/** Equipment inventory: labels, inventory codes and history entries (shared by the server, the page and the tests). */
import type { Equipment, EquipmentHistoryEntry } from '../types';

export const EQUIPMENT_CATEGORIES: { id: Equipment['category']; label: string; code: string; icon: string }[] = [
  { id: 'barriers', label: 'Barrières & bornes', code: 'BAR', icon: 'gate' },
  { id: 'telecom', label: 'Télécoms & réseau', code: 'TEL', icon: 'router' },
  { id: 'security', label: 'Sécurité & extincteurs', code: 'SEC', icon: 'fire_extinguisher' },
  { id: 'monetique', label: 'Monétique', code: 'MON', icon: 'point_of_sale' },
  { id: 'furniture', label: 'Mobilier & locaux', code: 'MOB', icon: 'chair' },
  { id: 'assigned', label: 'Confiés aux gardiens', code: 'AFF', icon: 'assignment_ind' }
];

export const EQUIPMENT_STATUS_LABELS: Record<Equipment['status'], string> = {
  operationnel: 'Opérationnel',
  maintenance: 'Maintenance',
  critique: 'Critique',
  controle_requis: 'Contrôle requis'
};

export const HISTORY_KIND_LABELS: Record<NonNullable<EquipmentHistoryEntry['kind']>, string> = {
  creation: 'Entrée en inventaire',
  intervention: 'Intervention',
  panne: 'Panne',
  remise_service: 'Remise en service',
  transfert: 'Transfert',
  audit: 'Inventaire',
  affectation: 'Remise à un gardien',
  restitution: 'Restitution'
};

export const categoryLabel = (id: string) => EQUIPMENT_CATEGORIES.find((c) => c.id === id)?.label || id;

/** Next free inventory code of a category: MAT-BAR-001, MAT-BAR-002… (never reuses a code, even after a deletion). */
export function nextInventoryCode(existing: { inventoryCode: string }[], category: Equipment['category']): string {
  const code = EQUIPMENT_CATEGORIES.find((c) => c.id === category)?.code || 'DIV';
  const head = `MAT-${code}-`;
  const max = existing
    .map((e) => (e.inventoryCode.startsWith(head) ? Number(e.inventoryCode.slice(head.length)) : 0))
    .filter((n) => Number.isInteger(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${head}${String(max + 1).padStart(3, '0')}`;
}

/** "JJ/MM/AAAA" or "JJ/MM/AAAA HH:MM" -> sortable number (0 when unreadable). */
export function historySortKey(date: string): number {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})[:h](\d{2}))?/.exec((date || '').trim());
  if (!m) return 0;
  return Date.UTC(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}

/** "AAAA-MM-JJ" (date input) -> "JJ/MM/AAAA". */
export const isoToFr = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

export type EquipmentEvent =
  | { kind: 'intervention'; plannedDate: string; title: string; description?: string; provider?: string }
  | { kind: 'panne'; description: string; critical: boolean }
  | { kind: 'remise_service'; description?: string }
  | { kind: 'transfert'; siteId: string; location: string; siteName: string; fromSiteName: string; reason?: string }
  | { kind: 'audit'; quantityFound: number; note?: string }
  | { kind: 'affectation'; guardName: string; note?: string }
  | { kind: 'restitution'; responsibleName: string; note?: string };

/**
 * Applies an event to an equipment: returns the changed fields (status, quantity, site…)
 * and the history entry to add at the top. `now` is "JJ/MM/AAAA HH:MM".
 */
export function applyEquipmentEvent(
  eq: Equipment,
  ev: EquipmentEvent,
  now: string,
  by: string
): { patch: Partial<Equipment>; entry: EquipmentHistoryEntry } {
  const sign = by ? ` — ${by}` : '';
  switch (ev.kind) {
    case 'intervention':
      return {
        patch: {},
        entry: {
          date: now,
          kind: 'intervention',
          title: `Intervention planifiée le ${ev.plannedDate} : ${ev.title}`,
          description: [ev.provider ? `Prestataire : ${ev.provider}` : '', ev.description || ''].filter(Boolean).join(' · ') + sign
        }
      };
    case 'panne':
      return {
        patch: { status: ev.critical ? 'critique' : 'maintenance' },
        entry: { date: now, kind: 'panne', title: ev.critical ? 'Panne critique déclarée' : 'Panne déclarée', description: ev.description + sign, isCritical: ev.critical }
      };
    case 'remise_service':
      return {
        patch: { status: 'operationnel' },
        entry: { date: now, kind: 'remise_service', title: 'Remis en service', description: (ev.description || 'Matériel de nouveau opérationnel') + sign }
      };
    case 'transfert':
      return {
        patch: { siteId: ev.siteId, location: ev.location },
        entry: {
          date: now,
          kind: 'transfert',
          title: `Transfert : ${ev.fromSiteName} → ${ev.siteName}`,
          description: `Nouvel emplacement : ${ev.location}${ev.reason ? ` · ${ev.reason}` : ''}${sign}`
        }
      };
    case 'affectation':
      return {
        // Handed to a guard: it appears in the guards' log book and on the guard's file
        patch: { category: 'assigned', responsibleName: ev.guardName },
        entry: {
          date: now,
          kind: 'affectation',
          title: `Remis à ${ev.guardName}`,
          description: [eq.responsibleName && eq.responsibleName !== ev.guardName ? `Précédent détenteur : ${eq.responsibleName}` : '', ev.note || '']
            .filter(Boolean)
            .join(' · ') + sign
        }
      };
    case 'restitution':
      return {
        patch: { responsibleName: ev.responsibleName },
        entry: {
          date: now,
          kind: 'restitution',
          title: `Rendu par ${eq.responsibleName || '—'}`,
          description: `Désormais sous la responsabilité de ${ev.responsibleName}${ev.note ? ` · ${ev.note}` : ''}${sign}`
        }
      };
    case 'audit': {
      const diff = ev.quantityFound - (eq.quantity || 0);
      return {
        patch: { lastAuditDate: now.slice(0, 10), quantity: ev.quantityFound },
        entry: {
          date: now,
          kind: 'audit',
          title: diff === 0 ? 'Inventaire : conforme' : `Inventaire : écart de ${diff > 0 ? '+' : ''}${diff} (${eq.quantity} → ${ev.quantityFound})`,
          description: (ev.note || (diff === 0 ? `${ev.quantityFound} unité(s) constatée(s)` : 'Quantité corrigée')) + sign,
          isCritical: diff < 0
        }
      };
    }
  }
}

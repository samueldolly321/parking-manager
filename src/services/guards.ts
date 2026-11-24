/** Guard staff: statuses, who is on duty now, equipment entrusted, duty log (shared by the page, the server and the tests). */
import type { Equipment, GuardPersonnel, WeekDayKey } from '../types';

export const GUARD_STATUS: Record<GuardPersonnel['status'], { label: string; cls: string }> = {
  en_poste: { label: 'En poste', cls: 'bg-emerald-100 text-emerald-800' },
  de_repos: { label: 'Repos', cls: 'bg-slate-100 text-slate-600' },
  en_conge: { label: 'Congé', cls: 'bg-amber-100 text-amber-800' },
  absent: { label: 'Absent', cls: 'bg-rose-100 text-rose-700' }
};

export const LOG_TYPES: { id: GuardPersonnel['todayLog'][number]['type']; label: string }[] = [
  { id: 'prise_service', label: 'Prise de service' },
  { id: 'ronde', label: 'Ronde' },
  { id: 'incident_resolu', label: 'Incident traité' },
  { id: 'releve', label: 'Relève' }
];
export const logTypeLabel = (id: string) => LOG_TYPES.find((t) => t.id === id)?.label || id;

const KEYS: WeekDayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const TANA_OFFSET_MS = 3 * 3_600_000; // GMT+3, no daylight saving

/**
 * Guard day running now. A guard lasts 24 h from 06:00 to 06:00 the next day,
 * so before 06:00 we are still in the previous day's guard.
 */
export function currentGuardDay(now: Date = new Date()): { key: WeekDayKey; date: string } {
  const tana = new Date(now.getTime() + TANA_OFFSET_MS);
  if (tana.getUTCHours() < 6) tana.setUTCDate(tana.getUTCDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return { key: KEYS[tana.getUTCDay()], date: `${p(tana.getUTCDate())}/${p(tana.getUTCMonth() + 1)}/${tana.getUTCFullYear()}` };
}

/** Guards whose planning says "GARDE" for the guard day running now. */
export function onDutyNow(guards: GuardPersonnel[], now: Date = new Date()): GuardPersonnel[] {
  const { key } = currentGuardDay(now);
  return guards.filter((g) => g.shiftDays?.[key] === 'GARDE');
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Equipment of the inventory entrusted to this guard (category "Confiés aux gardiens", guard named as responsible). */
export function equipmentOf(equipments: Equipment[], guard: Pick<GuardPersonnel, 'fullName'>): Equipment[] {
  const name = norm(guard.fullName || '');
  return name ? equipments.filter((e) => e.category === 'assigned' && norm(e.responsibleName || '') === name) : [];
}

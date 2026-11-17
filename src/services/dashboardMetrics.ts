/** Figures and alerts computed from the real data, shared by the dashboard and the header. */
import type {
  ExpenseRecord,
  IncidentRecord,
  Subscription,
  PaymentReceipt
} from '../types';
import { MONTH_NAMES, MONTH_SHORT, monthKey } from './months';

const TIME_ZONE = 'Indian/Antananarivo';
const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Today's calendar date in Antananarivo (GMT+3), whatever the computer's time zone. */
export function todayInTana(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short'
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const year = Number(get('year'));
  const monthIndex = Number(get('month')) - 1;
  const day = Number(get('day'));
  const weekdayIndex = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  return { year, monthIndex, day, weekday: WEEKDAYS[weekdayIndex] };
}

/** "17 Novembre 2026" */
export function formatLongDate(d: { year: number; monthIndex: number; day: number }) {
  return `${d.day} ${MONTH_NAMES[d.monthIndex]} ${d.year}`;
}

/** Reads the date part of "JJ/MM/AAAA" or "JJ/MM/AAAA HH:MM". Returns null if unreadable. */
export function parseFrDate(value: string | undefined) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec((value || '').trim());
  if (!m) return null;
  return { day: Number(m[1]), monthIndex: Number(m[2]) - 1, year: Number(m[3]) };
}

/** "YYYY-MM" of a "JJ/MM/AAAA..." date, or null. */
export function monthKeyOf(value: string | undefined) {
  const d = parseFrDate(value);
  return d ? monthKey(d.year, d.monthIndex) : null;
}

/** The `count` months ending with the current one, oldest first. */
export function lastMonths(count: number, today = todayInTana()) {
  const out: { key: string; short: string; long: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const total = today.year * 12 + today.monthIndex - i;
    const year = Math.floor(total / 12);
    const monthIndex = total % 12;
    out.push({ key: monthKey(year, monthIndex), short: MONTH_SHORT[monthIndex], long: `${MONTH_NAMES[monthIndex]} ${year}` });
  }
  return out;
}

/** Sum of confirmed receipts, optionally limited to one month ("YYYY-MM"). */
export function confirmedTotal(receipts: PaymentReceipt[], month?: string) {
  return receipts
    .filter((r) => r.status === 'confirme' && (!month || monthKeyOf(r.dateTime) === month))
    .reduce((sum, r) => sum + r.amountPaidAr, 0);
}

export type AlertKind = 'echeance' | 'incident' | 'depense';

export interface DashboardAlert {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  /** Short tag on the right: date, severity or amount. */
  tag: string;
  urgent: boolean;
}

const SEVERITY_RANK: Record<IncidentRecord['severity'], number> = { critique: 0, eleve: 1, moyen: 2, faible: 3 };
const SEVERITY_LABEL: Record<IncidentRecord['severity'], string> = {
  critique: 'CRITIQUE', eleve: 'URGENT', moyen: 'MOYEN', faible: 'FAIBLE'
};

const fmtAr = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/[  ,]/g, ' ');

/** Alerts that need an action: subscriptions about to expire, open incidents, expenses awaiting approval. */
export function computeAlerts(input: {
  subscriptions: Subscription[];
  incidents: IncidentRecord[];
  expenses: ExpenseRecord[];
  siteNames: Record<string, string>;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  const dueSoon = input.subscriptions.filter((s) => s.status === 'proche_echeance' || s.status === 'en_retard');
  if (dueSoon.length > 0) {
    const late = dueSoon.filter((s) => s.status === 'en_retard').length;
    const names = dueSoon.slice(0, 3).map((s) => s.memberName).join(', ');
    alerts.push({
      id: 'echeances',
      kind: 'echeance',
      title: `${dueSoon.length} abonnement${dueSoon.length > 1 ? 's' : ''} à renouveler`,
      detail: `${names}${dueSoon.length > 3 ? '…' : ''}`,
      tag: late > 0 ? `${late} en retard` : 'Échéance proche',
      urgent: late > 0
    });
  }

  input.incidents
    .filter((i) => i.resolutionStatus === 'ouvert' || i.resolutionStatus === 'en_cours')
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .forEach((i) => alerts.push({
      id: `inc-${i.id}`,
      kind: 'incident',
      title: i.title,
      detail: `${input.siteNames[i.siteId] || i.siteId} — ${i.description}`,
      tag: SEVERITY_LABEL[i.severity],
      urgent: i.severity === 'critique' || i.severity === 'eleve'
    }));

  input.expenses
    .filter((e) => e.status === 'en_attente')
    .forEach((e) => alerts.push({
      id: `dep-${e.id}`,
      kind: 'depense',
      title: `Dépense en attente : ${e.expenseNumber}`,
      detail: `${e.description} (${input.siteNames[e.siteId] || e.siteId})`,
      tag: `${fmtAr(e.amountAr)} Ar`,
      urgent: false
    }));

  return alerts;
}

/** Computations of the "Rapports & Statistiques" page. Everything comes from the data, nothing is hard-coded. */
import type { AppState, Member, PaymentReceipt, ExpenseRecord, PayrollRecord } from '../types';
import { MONTH_NAMES, MONTH_SHORT, monthKey, splitKey } from './months';
import { monthKeyOf, todayInTana } from './dashboardMetrics';
import { subscriptionHealth } from './subscriptionCalendar';

export type Granularity = 'mois' | 'trimestre' | 'annee';

export interface Period {
  granularity: Granularity;
  /** "2026-11" (mois), "2026-T4" (trimestre) or "2026" (année) */
  value: string;
}

const MEMBER_CATEGORY_LABEL: Record<Member['category'], string> = {
  privilege: 'Privilège',
  standard: 'Standard',
  resident: 'Résident',
  corporate: 'Entreprise / B2B'
};

/** "Mai 2024" (payroll period) -> "2024-05" */
export function payrollMonthKey(periodMonth: string): string | null {
  const m = /^\s*([A-Za-zÀ-ÿ]+)\s+(\d{4})\s*$/.exec(periodMonth || '');
  if (!m) return null;
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const idx = MONTH_NAMES.findIndex((n) => norm(n) === norm(m[1]));
  return idx < 0 ? null : monthKey(Number(m[2]), idx);
}

/** Month keys covered by a period, oldest first. */
export function monthsOf(period: Period): string[] {
  if (period.granularity === 'mois') return [period.value];
  if (period.granularity === 'trimestre') {
    const [y, q] = period.value.split('-T').map(Number);
    return [0, 1, 2].map((i) => monthKey(y, (q - 1) * 3 + i));
  }
  const y = Number(period.value);
  return Array.from({ length: 12 }, (_, i) => monthKey(y, i));
}

export function periodLabel(period: Period): string {
  if (period.granularity === 'mois') {
    const { year, monthIndex } = splitKey(period.value);
    return `${MONTH_NAMES[monthIndex]} ${year}`;
  }
  if (period.granularity === 'trimestre') {
    const [y, q] = period.value.split('-T');
    return `${q}${q === '1' ? 'er' : 'e'} trimestre ${y}`;
  }
  return `Année ${period.value}`;
}

/** The period just before (same length). */
export function previousPeriod(period: Period): Period {
  if (period.granularity === 'mois') {
    const { year, monthIndex } = splitKey(period.value);
    const t = year * 12 + monthIndex - 1;
    return { granularity: 'mois', value: monthKey(Math.floor(t / 12), t % 12) };
  }
  if (period.granularity === 'trimestre') {
    const [y, q] = period.value.split('-T').map(Number);
    return { granularity: 'trimestre', value: q === 1 ? `${y - 1}-T4` : `${y}-T${q - 1}` };
  }
  return { granularity: 'annee', value: String(Number(period.value) - 1) };
}

export function periodOf(month: string, granularity: Granularity): Period {
  const { year, monthIndex } = splitKey(month);
  if (granularity === 'mois') return { granularity, value: month };
  if (granularity === 'trimestre') return { granularity, value: `${year}-T${Math.floor(monthIndex / 3) + 1}` };
  return { granularity, value: String(year) };
}

/** Months that have data (receipts, expenses, payrolls), plus the current month, newest first. */
export function monthsWithData(state: AppState): string[] {
  const t = todayInTana();
  const set = new Set<string>([monthKey(t.year, t.monthIndex)]);
  state.receipts.forEach((r) => { const k = monthKeyOf(r.dateTime); if (k) set.add(k); });
  state.expenses.forEach((e) => { const k = monthKeyOf(e.date); if (k) set.add(k); });
  state.payrolls.forEach((p) => { const k = payrollMonthKey(p.periodMonth); if (k) set.add(k); });
  return Array.from(set).sort().reverse();
}

/** Periods to offer in the selector for a granularity, newest first. */
export function periodOptions(state: AppState, granularity: Granularity): Period[] {
  const seen = new Set<string>();
  const out: Period[] = [];
  for (const m of monthsWithData(state)) {
    const p = periodOf(m, granularity);
    if (!seen.has(p.value)) { seen.add(p.value); out.push(p); }
  }
  return out;
}

/** Last `count` months ending with `endMonth`, oldest first. */
export function monthsEndingWith(endMonth: string, count: number): string[] {
  const { year, monthIndex } = splitKey(endMonth);
  const end = year * 12 + monthIndex;
  return Array.from({ length: count }, (_, i) => {
    const t = end - (count - 1) + i;
    return monthKey(Math.floor(t / 12), t % 12);
  });
}

export const monthShortLabel = (key: string) => {
  const { year, monthIndex } = splitKey(key);
  return `${MONTH_SHORT[monthIndex]} ${String(year).slice(2)}`;
};

// ---------------------------------------------------------------------------

export interface MonthFigures {
  month: string;
  recettesAr: number;
  depensesAr: number;
  salairesAr: number;
  resultatAr: number;
}

export interface Breakdown {
  label: string;
  valueAr: number;
  count: number;
}

export interface ReportData {
  period: Period;
  months: string[];
  siteId: string;
  // Totals of the period
  recettesAr: number;
  receiptsCount: number;
  ticketMoyenAr: number;
  depensesAr: number;
  depensesEnAttenteAr: number;
  salairesCoutAr: number;
  salairesNetAr: number;
  retenuesAr: number;
  bulletinsCount: number;
  resultatAr: number;
  // Same totals for the previous period (comparison)
  previous: { recettesAr: number; depensesAr: number; salairesCoutAr: number; resultatAr: number };
  trend: MonthFigures[];
  byPaymentMethod: Breakdown[];
  bySite: Breakdown[];
  byMemberCategory: Breakdown[];
  expensesByCategory: Breakdown[];
  payrollByType: Breakdown[];
  // Snapshots (state today, not tied to the period)
  unpaid: { totalAr: number; months: number; members: { name: string; number: string; balanceAr: number; months: number; site: string }[] };
  subscriptions: { aJour: number; procheEcheance: number; enRetard: number; expire: number; revenuMensuelAr: number };
  /** capacity = spots configured (same basis as the dashboard), declared = capacity written on the site file */
  occupancy: { site: string; capacity: number; declared: number; occupied: number; reserved: number; maintenance: number; rate: number }[];
  activity: { newMembers: number; incidents: number; incidentsOpen: number; incidentsBySeverity: Breakdown[] };
}

const inSite = (siteId: string, recordSite: string | undefined) => siteId === 'all' || recordSite === siteId;

function group<T>(items: T[], key: (x: T) => string, value: (x: T) => number): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const it of items) {
    const k = key(it);
    const b = map.get(k) || { label: k, valueAr: 0, count: 0 };
    b.valueAr += value(it);
    b.count += 1;
    map.set(k, b);
  }
  return Array.from(map.values()).sort((a, b) => b.valueAr - a.valueAr);
}

function totals(state: AppState, months: string[], siteId: string) {
  const inPeriod = (m: string | null) => m !== null && months.includes(m);
  const receipts: PaymentReceipt[] = state.receipts.filter(
    (r) => r.status === 'confirme' && inSite(siteId, r.siteId) && inPeriod(monthKeyOf(r.dateTime))
  );
  const expenses: ExpenseRecord[] = state.expenses.filter((e) => inSite(siteId, e.siteId) && inPeriod(monthKeyOf(e.date)));
  const approved = expenses.filter((e) => e.status === 'approuve');
  // Payslips of the "GLOBAL" office only count when all sites are shown
  const payrolls: PayrollRecord[] = state.payrolls.filter(
    (p) => inSite(siteId, p.siteId) && inPeriod(payrollMonthKey(p.periodMonth))
  );
  const recettesAr = receipts.reduce((s, r) => s + r.amountPaidAr, 0);
  const depensesAr = approved.reduce((s, e) => s + e.amountAr, 0);
  const salairesCoutAr = payrolls.reduce((s, p) => s + p.grossSalaryAr, 0);
  return {
    receipts,
    expenses,
    approved,
    payrolls,
    recettesAr,
    depensesAr,
    salairesCoutAr,
    resultatAr: recettesAr - depensesAr - salairesCoutAr
  };
}

export function buildReport(state: AppState, period: Period, siteId: string): ReportData {
  const months = monthsOf(period);
  const cur = totals(state, months, siteId);
  const prev = totals(state, monthsOf(previousPeriod(period)), siteId);
  const siteName = (id: string) => (state.sites.find((s) => s.id === id)?.name || (id === 'GLOBAL' ? 'Direction générale' : id)).replace(/^Site \d+\s*-\s*/, '');
  const memberById = new Map(state.members.map((m) => [m.id, m]));

  const trend = monthsEndingWith(months[months.length - 1], 12).map((m) => {
    const t = totals(state, [m], siteId);
    return { month: m, recettesAr: t.recettesAr, depensesAr: t.depensesAr, salairesAr: t.salairesCoutAr, resultatAr: t.resultatAr };
  });

  const members = state.members.filter((m) => inSite(siteId, m.primarySiteId));
  const subs = state.subscriptions.filter((s) => inSite(siteId, s.siteId));
  // Subscriptions state and arrears: same computation as the dashboard and the payment calendar
  const today = todayInTana();
  const health = subs.map((s) => ({ s, h: subscriptionHealth(s, state.receipts, today) }));
  const owed = new Map<string, { balanceAr: number; months: number; siteId: string }>();
  for (const { s, h } of health) {
    if (h.arrearsAr <= 0) continue;
    const cur = owed.get(s.memberId) || { balanceAr: 0, months: 0, siteId: s.siteId };
    cur.balanceAr += h.arrearsAr;
    cur.months += h.unpaid.length;
    owed.set(s.memberId, cur);
  }
  const unpaidMembers = Array.from(owed.entries())
    .map(([memberId, o]) => {
      const m = memberById.get(memberId);
      return { name: m?.fullName || 'Membre supprimé', number: m?.memberNumber || '—', balanceAr: o.balanceAr, months: o.months, site: siteName(m?.primarySiteId || o.siteId) };
    })
    .sort((a, b) => b.balanceAr - a.balanceAr);
  const countState = (st: string) => health.filter((x) => x.h.state === st).length;
  const incidents = state.incidents.filter((i) => inSite(siteId, i.siteId) && months.includes(monthKeyOf(i.date) || ''));
  const SEVERITY: Record<string, string> = { critique: 'Critique', eleve: 'Élevée', moyen: 'Moyenne', faible: 'Faible' };

  return {
    period,
    months,
    siteId,
    recettesAr: cur.recettesAr,
    receiptsCount: cur.receipts.length,
    ticketMoyenAr: cur.receipts.length ? Math.round(cur.recettesAr / cur.receipts.length) : 0,
    depensesAr: cur.depensesAr,
    depensesEnAttenteAr: cur.expenses.filter((e) => e.status === 'en_attente').reduce((s, e) => s + e.amountAr, 0),
    salairesCoutAr: cur.salairesCoutAr,
    salairesNetAr: cur.payrolls.reduce((s, p) => s + p.netSalaryAr, 0),
    retenuesAr: cur.payrolls.reduce((s, p) => s + p.totalDeductionsAr, 0),
    bulletinsCount: cur.payrolls.length,
    resultatAr: cur.resultatAr,
    previous: { recettesAr: prev.recettesAr, depensesAr: prev.depensesAr, salairesCoutAr: prev.salairesCoutAr, resultatAr: prev.resultatAr },
    trend,
    byPaymentMethod: group(cur.receipts, (r) => r.paymentMethod, (r) => r.amountPaidAr),
    bySite: group(cur.receipts, (r) => siteName(r.siteId), (r) => r.amountPaidAr),
    byMemberCategory: group(
      cur.receipts,
      (r) => { const m = memberById.get(r.memberId); return m ? MEMBER_CATEGORY_LABEL[m.category] : 'Membre supprimé'; },
      (r) => r.amountPaidAr
    ),
    expensesByCategory: group(cur.approved, (e) => e.category, (e) => e.amountAr),
    payrollByType: group(cur.payrolls, (p) => (p.beneficiaryType === 'bureau' ? 'Membres du bureau' : 'Personnel terrain'), (p) => p.grossSalaryAr),
    unpaid: {
      totalAr: unpaidMembers.reduce((s, m) => s + m.balanceAr, 0),
      months: unpaidMembers.reduce((s, m) => s + m.months, 0),
      members: unpaidMembers
    },
    subscriptions: {
      aJour: countState('a_jour'),
      procheEcheance: countState('proche_echeance'),
      enRetard: countState('en_retard'),
      expire: countState('expire'),
      revenuMensuelAr: health.filter((x) => x.h.state !== 'expire').reduce((sum, x) => sum + x.s.monthlyAmountAr, 0)
    },
    occupancy: state.sites
      .filter((s) => inSite(siteId, s.id))
      .map((s) => {
        const spots = state.spots.filter((sp) => sp.siteId === s.id);
        const occupied = spots.filter((sp) => sp.status === 'occupe').length;
        return {
          site: siteName(s.id),
          capacity: spots.length,
          declared: Number(s.totalCapacity) || 0,
          occupied,
          reserved: spots.filter((sp) => sp.status === 'reserve').length,
          maintenance: spots.filter((sp) => sp.status === 'maintenance').length,
          rate: spots.length > 0 ? occupied / spots.length : 0
        };
      }),
    activity: {
      newMembers: members.filter((m) => months.includes(monthKeyOf(m.joinedDate) || '')).length,
      incidents: incidents.length,
      incidentsOpen: incidents.filter((i) => i.resolutionStatus === 'ouvert' || i.resolutionStatus === 'en_cours').length,
      incidentsBySeverity: group(incidents, (i) => SEVERITY[i.severity] || i.severity, () => 1)
    }
  };
}

/** Change in %, or null when there is nothing to compare with. */
export function changePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

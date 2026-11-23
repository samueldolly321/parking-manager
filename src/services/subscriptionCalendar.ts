/**
 * Payment calendar of a subscription: for each month of a year, is it paid, partly paid, unpaid…?
 * Months come from the receipts' "period" (the same reading as the payment window).
 */
import type { PaymentReceipt, Subscription } from '../types';
import { monthKey, parseMonthsPeriod } from './months';

export type MonthState = 'paye' | 'partiel' | 'impaye' | 'a_venir' | 'hors_contrat';

/**
 * First month that can be due ("AAAA-MM"). Earlier months are never counted as unpaid,
 * whatever the start date of the contract (history before the app was put into service).
 */
export const BILLING_START_KEY = '2026-01';

/** Start of what is due for a subscription: its first month, but never before BILLING_START_KEY. */
function dueStartKey(sub: Subscription): string | null {
  const start = dateToMonthKey(sub.startDate);
  if (!start) return null;
  return start < BILLING_START_KEY ? BILLING_START_KEY : start;
}

export const MONTH_STATE_LABELS: Record<MonthState, string> = {
  paye: 'Payé',
  partiel: 'Paiement partiel',
  impaye: 'Impayé',
  a_venir: 'À venir',
  hors_contrat: 'Hors contrat'
};

/** "JJ/MM/AAAA" -> "AAAA-MM" (null if not a date). */
export function dateToMonthKey(value: string | undefined): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec((value || '').trim());
  return m ? monthKey(Number(m[3]), Number(m[2]) - 1) : null;
}

const normPlate = (p: string) => p.replace(/\s+/g, '').toUpperCase();

/** Receipts that pay this subscription's months: same member, same vehicle (or no vehicle), monthly payment. */
export function subscriptionReceipts(sub: Subscription, receipts: PaymentReceipt[]): PaymentReceipt[] {
  const plate = normPlate(sub.vehiclePlate || '');
  return receipts.filter((r) => {
    if (r.memberId !== sub.memberId || r.status === 'annule' || r.status === 'rembourse') return false;
    // A receipt may list several plates ("6543 TBD / 1209 TBH")
    if (plate && r.vehiclePlate && !r.vehiclePlate.split(/[/,;]+/).some((p) => normPlate(p) === plate)) return false;
    // Not a monthly subscription: day pass (single date), card, yearly fee
    if (/^\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/.test(r.period || '')) return false;
    if (/carte|cotisation|journalier/i.test(r.purpose || '')) return false;
    return true;
  });
}

/** Months paid in full / partly, for a subscription. */
export function paidMonths(sub: Subscription, receipts: PaymentReceipt[]): { paid: Set<string>; partial: Set<string> } {
  const paid = new Set<string>();
  const partial = new Set<string>();
  for (const r of subscriptionReceipts(sub, receipts)) {
    const target = r.remainingBalanceAr > 0 ? partial : paid;
    parseMonthsPeriod(r.period).forEach((k) => target.add(k));
  }
  paid.forEach((k) => partial.delete(k));
  return { paid, partial };
}

/**
 * State of the 12 months of `year`. A subscription runs from its start month;
 * an expired one stops at its end month. Months up to the current one must be paid.
 */
export function yearCalendar(
  sub: Subscription,
  receipts: PaymentReceipt[],
  year: number,
  currentKey: string
): { key: string; state: MonthState }[] {
  const { paid, partial } = paidMonths(sub, receipts);
  const start = dueStartKey(sub);
  const end = sub.status === 'expire' ? dateToMonthKey(sub.endDate) : null;
  return Array.from({ length: 12 }, (_, i) => {
    const key = monthKey(year, i);
    let state: MonthState;
    if (paid.has(key)) state = 'paye';
    else if (partial.has(key)) state = 'partiel';
    else if ((start && key < start) || (end && key > end)) state = 'hors_contrat';
    else if (key > currentKey) state = 'a_venir';
    else state = 'impaye';
    return { key, state };
  });
}

/** Unpaid months (start of the contract, never before BILLING_START_KEY -> current month), oldest first. */
export function unpaidMonths(sub: Subscription, receipts: PaymentReceipt[], currentKey: string): string[] {
  const start = dueStartKey(sub);
  if (!start) return [];
  const end = sub.status === 'expire' ? dateToMonthKey(sub.endDate) : null;
  const last = end && end < currentKey ? end : currentKey;
  const { paid, partial } = paidMonths(sub, receipts);
  const out: string[] = [];
  let [y, m] = start.split('-').map(Number);
  for (let guard = 0; guard < 600; guard++) {
    const key = monthKey(y, m - 1);
    if (key > last) break;
    if (!paid.has(key) && !partial.has(key)) out.push(key);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export type SubscriptionState = 'a_jour' | 'proche_echeance' | 'en_retard' | 'expire';

export interface SubscriptionHealth {
  state: SubscriptionState;
  /** Months due and not paid at all, oldest first */
  unpaid: string[];
  /** Amount owed: unpaid months × monthly price + balances left on partial payments */
  arrearsAr: number;
}

/**
 * State of a subscription computed from its receipts (the stored status is not trusted, it never updates itself):
 * - en_retard: at least one month due and unpaid (or partly paid);
 * - proche_echeance: up to date, but next month is not paid and the month ends within 7 days;
 * - a_jour otherwise; expire when the contract is marked as expired.
 */
export function subscriptionHealth(
  sub: Subscription,
  receipts: PaymentReceipt[],
  today: { year: number; monthIndex: number; day: number }
): SubscriptionHealth {
  const currentKey = monthKey(today.year, today.monthIndex);
  const unpaid = unpaidMonths(sub, receipts, currentKey);
  // Balances left on partial payments, for months from the billing start only
  const partialBalance = subscriptionReceipts(sub, receipts)
    .filter((r) => parseMonthsPeriod(r.period).some((k) => k >= BILLING_START_KEY))
    .reduce((sum, r) => sum + Math.max(0, r.remainingBalanceAr || 0), 0);
  const arrearsAr = unpaid.length * (sub.monthlyAmountAr || 0) + partialBalance;
  if (sub.status === 'expire') return { state: 'expire', unpaid, arrearsAr };
  if (arrearsAr > 0) return { state: 'en_retard', unpaid, arrearsAr };
  const nextKey = today.monthIndex === 11 ? monthKey(today.year + 1, 0) : monthKey(today.year, today.monthIndex + 1);
  const { paid } = paidMonths(sub, receipts);
  const daysInMonth = new Date(Date.UTC(today.year, today.monthIndex + 1, 0)).getUTCDate();
  const state = !paid.has(nextKey) && daysInMonth - today.day < 7 ? 'proche_echeance' : 'a_jour';
  return { state, unpaid, arrearsAr };
}

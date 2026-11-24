/** Prices used at the cash desk: tariffs stored in the database + the annual payment promotion. */
import type { Tariff } from '../types';


export const TARIFF_FORMULA_LABELS: Record<Tariff['typeFormula'], string> = {
  placement_libre_interieur: 'Placement libre intérieur',
  emplacement_privatif_dedie: 'Emplacement privatif dédié',
  deux_roues: 'Deux-roues',
  adhesion_annuelle: 'Cotisation annuelle',
  carte_pvc: 'Carte PVC',
  droit_adhesion: 'Droit d’adhésion',
  autre: 'Autre'
};

export const TARIFF_DURATION_LABELS: Record<Tariff['duration'], string> = {
  mois: 'Par mois',
  an: 'Par an',
  unique: 'Une seule fois (adhésion)',
  jour: 'Par jour',
  semaine: 'Par semaine'
};

/** A choice of the payment window, built from a tariff. */
export interface PaymentFormula {
  id: string;
  label: string;
  price: number;
  /** mensuel: months are chosen; annuel: a year; unique: once per member; ponctuel: one payment */
  billing: 'mensuel' | 'annuel' | 'unique' | 'ponctuel';
  /** Text written on the receipt */
  purpose: string;
  typeFormula: Tariff['typeFormula'];
}

const billingOf = (d: Tariff['duration']): PaymentFormula['billing'] =>
  d === 'mois' ? 'mensuel' : d === 'an' ? 'annuel' : d === 'unique' ? 'unique' : 'ponctuel';

/**
 * Formulas offered at the cash desk for a site: the active tariffs of that site and those for
 * all sites. A tariff of the site replaces the general tariff of the same kind and frequency
 * (kind "Autre" is never replaced). Monthly ones first.
 */
export function paymentFormulas(tariffs: Tariff[], siteId: string): PaymentFormula[] {
  const active = tariffs.filter((t) => t.isActive && (!t.siteId || t.siteId === siteId));
  const own = active.filter((t) => t.siteId === siteId);
  const kept = active.filter(
    (t) => t.siteId === siteId || t.typeFormula === 'autre' || !own.some((o) => o.typeFormula === t.typeFormula && o.duration === t.duration)
  );
  const order: PaymentFormula['billing'][] = ['mensuel', 'unique', 'annuel', 'ponctuel'];
  return kept
    .map((t) => ({ id: t.id, label: t.name, price: t.amountAr, billing: billingOf(t.duration), purpose: t.name, typeFormula: t.typeFormula }))
    .sort((a, b) => order.indexOf(a.billing) - order.indexOf(b.billing) || a.label.localeCompare(b.label, 'fr'));
}

/** A one-time fee (e.g. membership fee) already paid by the member: its receipt, if any. */
export function oneTimeAlreadyPaid<R extends { memberId: string; purpose: string; status: string }>(
  receipts: R[],
  memberId: string,
  purpose: string
): R | undefined {
  return receipts.find(
    (r) => r.memberId === memberId && r.status !== 'annule' && r.status !== 'rembourse' && (r.purpose === purpose || r.purpose.startsWith(`${purpose} — `))
  );
}

/** Active tariff of a formula for a site: the site's own tariff first, then the one for all sites. */
export function tariffFor(tariffs: Tariff[], formula: Tariff['typeFormula'], siteId?: string): Tariff | undefined {
  const active = tariffs.filter((t) => t.isActive && t.typeFormula === formula);
  return active.find((t) => siteId && t.siteId === siteId) || active.find((t) => !t.siteId);
}

/** "Pay N months at once, get X % off". */
export interface AnnualPromo {
  enabled: boolean;
  /** Discount in % (0–100) */
  percent: number;
  /** Months to pay in one receipt to get the discount */
  minMonths: number;
}

export const DEFAULT_PROMO: AnnualPromo = { enabled: true, percent: 10, minMonths: 12 };

/** Keeps a promotion within sensible bounds. */
export function cleanPromo(p: Partial<AnnualPromo> | undefined): AnnualPromo {
  const percent = Number(p?.percent);
  const minMonths = Math.floor(Number(p?.minMonths));
  return {
    enabled: p?.enabled === undefined ? DEFAULT_PROMO.enabled : !!p.enabled,
    percent: Number.isFinite(percent) ? Math.min(100, Math.max(0, Math.round(percent * 100) / 100)) : DEFAULT_PROMO.percent,
    minMonths: Number.isInteger(minMonths) && minMonths >= 2 && minMonths <= 60 ? minMonths : DEFAULT_PROMO.minMonths
  };
}

/** Amount of a monthly payment: months × price, minus the promotion when enough months are paid at once. */
export function monthlyAmount(unitPriceAr: number, months: number, promo: AnnualPromo) {
  const grossAr = Math.max(0, Math.round(unitPriceAr)) * Math.max(0, months);
  const applied = promo.enabled && promo.percent > 0 && months >= promo.minMonths;
  // Rounded to 100 Ar (no coins below)
  const discountAr = applied ? Math.round((grossAr * promo.percent) / 100 / 100) * 100 : 0;
  return { grossAr, discountAr, netAr: grossAr - discountAr, applied };
}

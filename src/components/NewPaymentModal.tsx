import React, { useMemo, useState } from 'react';
import { AnnualPromo, DEFAULT_PROMO, PaymentFormula, monthlyAmount, oneTimeAlreadyPaid, paymentFormulas } from '../services/pricing';
import type { Tariff } from '../types';
import { Member, Vehicle, PaymentMethod, Site, PaymentReceipt } from '../types';
import { MONTH_SHORT, formatMonthsPeriod, monthKey, monthLabel, parseMonthsPeriod } from '../services/months';

interface NewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  vehicles: Vehicle[];
  sites: Site[];
  /** Existing receipts, used to show which months the member has already paid */
  receipts: PaymentReceipt[];
  /** Opened from a subscription: member, vehicle, formula, price and months pre-filled */
  prefill?: PaymentPrefill | null;
  /** Tariffs of the database (prices of the formulas) */
  tariffs?: Tariff[];
  /** Promotion when several months are paid at once */
  pricing?: AnnualPromo;
  onSubmitPayment: (data: {
    memberId: string;
    memberName: string;
    vehiclePlate?: string;
    siteId: string;
    siteName: string;
    purpose: string;
    period: string;
    amountDueAr: number;
    amountPaidAr: number;
    paymentMethod: PaymentMethod;
    cashierName: string;
  }) => void;
}

export interface PaymentPrefill {
  memberId: string;
  plate?: string;
  /** Kind of tariff to pre-select (e.g. the subscription's) */
  formula?: Tariff['typeFormula'];
  monthlyAmountAr?: number;
  months?: string[];
}

/** Kind of tariff matching a subscription's tariff. */
export function formulaForTariff(tariffType: string): Tariff['typeFormula'] {
  const t = tariffType.toLowerCase();
  if (/deux|2r|moto/.test(t)) return 'deux_roues';
  if (/privatif|dédié|dedie/.test(t)) return 'emplacement_privatif_dedie';
  return 'placement_libre_interieur';
}

/** Used only when no tariff is recorded yet (the real prices are set in « Tarifs & promotions »). */
const DEFAULT_FORMULAS: PaymentFormula[] = [
  { id: 'builtin-standard', label: 'Placement libre intérieur', price: 120000, billing: 'mensuel', purpose: 'Abonnement Standard VL (Placement Libre Intérieur)', typeFormula: 'placement_libre_interieur' },
  { id: 'builtin-privatif', label: 'Privatif dédié', price: 180000, billing: 'mensuel', purpose: 'Abonnement Privatif Dédié (Voirie Extérieure)', typeFormula: 'emplacement_privatif_dedie' },
  { id: 'builtin-moto', label: 'Deux-roues', price: 40000, billing: 'mensuel', purpose: 'Abonnement Deux-Roues Moto (Zone C)', typeFormula: 'deux_roues' }
];

const formatAr = (v: number) => new Intl.NumberFormat('fr-MG').format(v).replace(/,/g, ' ');

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH_KEY = monthKey(CURRENT_YEAR, now.getMonth());

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  isOpen,
  onClose,
  members,
  vehicles,
  sites,
  receipts,
  prefill,
  tariffs = [],
  pricing = DEFAULT_PROMO,
  onSubmitPayment
}) => {
  const startMember = members.find((m) => m.id === prefill?.memberId) || members[0];
  const [selectedMemberId, setSelectedMemberId] = useState<string>(startMember?.id || '');
  const [selectedSiteId, setSelectedSiteId] = useState<string>(startMember?.primarySiteId || 'S1');
  const [selectedPlate, setSelectedPlate] = useState<string>(
    () => prefill?.plate || vehicles.find((v) => v.memberId === startMember?.id)?.licensePlate || ''
  );

  /** Formulas of the site, built from the tariffs (Paramètres → Tarifs & promotions) */
  const formulasOf = (siteId: string) => {
    const list = paymentFormulas(tariffs, siteId);
    return list.length ? list : DEFAULT_FORMULAS;
  };
  const formulas = formulasOf(selectedSiteId);
  /** Formula of the same kind on another site (when the site changes), otherwise the first monthly one */
  const pickFormula = (list: PaymentFormula[], kind?: Tariff['typeFormula'], billing?: PaymentFormula['billing']) =>
    list.find((f) => f.typeFormula === kind && (!billing || f.billing === billing)) || list.find((f) => f.billing === 'mensuel') || list[0];

  const [formulaType, setFormulaType] = useState<string>(() => pickFormula(formulasOf(startMember?.primarySiteId || 'S1'), prefill?.formula, 'mensuel')?.id || '');
  const formula = formulas.find((f) => f.id === formulaType) || pickFormula(formulas);
  const [unitPrice, setUnitPrice] = useState<number>(
    () => prefill?.monthlyAmountAr || pickFormula(formulasOf(startMember?.primarySiteId || 'S1'), prefill?.formula, 'mensuel')?.price || 0
  );
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => [...(prefill?.months || [])].sort());
  const [viewYear, setViewYear] = useState<number>(() => Number(prefill?.months?.[0]?.slice(0, 4)) || CURRENT_YEAR);
  const [annualYear, setAnnualYear] = useState<number>(CURRENT_YEAR);
  const [amountPaidOverride, setAmountPaidOverride] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MVola');
  const [error, setError] = useState('');

  const isMonthly = formula?.billing === 'mensuel';
  const currentMember = members.find((m) => m.id === selectedMemberId);
  const memberVehicles = vehicles.filter((v) => v.memberId === selectedMemberId);
  // One-time fee (membership fee) already paid by this member
  const alreadyPaidOnce = formula?.billing === 'unique' ? oneTimeAlreadyPaid(receipts, selectedMemberId, formula.purpose) : undefined;

  /** Months already covered by this member's receipts for the same formula (and vehicle). */
  const { paidMonths, partialMonths } = useMemo(() => {
    const paid = new Set<string>();
    const partial = new Set<string>();
    receipts
      .filter(
        (r) =>
          r.memberId === selectedMemberId &&
          r.status !== 'annule' &&
          r.status !== 'rembourse' &&
          // Day pass (a single date) is not a monthly payment
          !/^\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/.test(r.period || '') &&
          (!selectedPlate || !r.vehiclePlate || r.vehiclePlate.split(/[/,;]+/).some((p) => p.trim() === selectedPlate))
      )
      .forEach((r) => {
        const target = r.remainingBalanceAr > 0 ? partial : paid;
        parseMonthsPeriod(r.period).forEach((k) => target.add(k));
      });
    paid.forEach((k) => partial.delete(k));
    return { paidMonths: paid, partialMonths: partial };
  }, [receipts, selectedMemberId, selectedPlate]);

  const monthsCount = selectedMonths.length;
  // Monthly formulas: months × price, minus the promotion when enough months are paid at once
  const calc = isMonthly ? monthlyAmount(unitPrice, monthsCount, pricing) : { grossAr: unitPrice, discountAr: 0, netAr: unitPrice, applied: false };
  const amountDue = calc.netAr;
  const amountPaid = amountPaidOverride ?? amountDue;
  const remaining = Math.max(0, amountDue - amountPaid);

  if (!isOpen) return null;

  const resetMonths = () => {
    setSelectedMonths([]);
    setAmountPaidOverride(null);
  };

  const toggleMonth = (key: string) => {
    if (paidMonths.has(key)) return;
    setSelectedMonths((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort()));
    setAmountPaidOverride(null);
    setError('');
  };

  /** Selects the next N unpaid months starting from the current month. */
  const selectNextUnpaid = (n: number) => {
    const out: string[] = [];
    let y = CURRENT_YEAR;
    let m = now.getMonth();
    for (let guard = 0; out.length < n && guard < 60; guard++) {
      const k = monthKey(y, m);
      if (!paidMonths.has(k)) out.push(k);
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    setSelectedMonths(out);
    setViewYear(Number(out[0]?.slice(0, 4)) || CURRENT_YEAR);
    setAmountPaidOverride(null);
    setError('');
  };

  const handleFormulaChange = (id: string) => {
    setFormulaType(id);
    setUnitPrice(formulas.find((f) => f.id === id)?.price || 0);
    resetMonths();
  };

  /** New site: the same kind of formula on that site (its own price) */
  const followSite = (siteId: string) => {
    const next = pickFormula(formulasOf(siteId), formula?.typeFormula, formula?.billing);
    if (next) {
      setFormulaType(next.id);
      if (!prefill?.monthlyAmountAr) setUnitPrice(next.price);
    }
  };

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
    const member = members.find((m) => m.id === memberId);
    if (member?.primarySiteId) {
      setSelectedSiteId(member.primarySiteId);
      followSite(member.primarySiteId);
    }
    setSelectedPlate(vehicles.find((v) => v.memberId === memberId)?.licensePlate || '');
    resetMonths();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formula) {
      setError('Aucun tarif disponible : ajoutez-en dans Paramètres → Tarifs & promotions.');
      return;
    }
    if (alreadyPaidOnce) {
      setError(`${formula.label} déjà payé par ce membre (reçu ${(alreadyPaidOnce as PaymentReceipt).receiptNumber}). Il ne se paie qu’une fois.`);
      return;
    }
    if (isMonthly && monthsCount === 0) {
      setError('Sélectionnez au moins un mois à payer.');
      return;
    }
    const siteObj = sites.find((s) => s.id === selectedSiteId) || sites[0];
    const period = isMonthly
      ? formatMonthsPeriod(selectedMonths)
      : formula.billing === 'annuel'
      ? `Année ${annualYear}`
      : formula.billing === 'unique'
      ? 'Paiement unique'
      : new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' });

    // The period must list every month exactly (it is read back to mark months as paid)
    if (isMonthly && parseMonthsPeriod(period).length !== monthsCount) {
      setError('Trop de mois non consécutifs pour un seul reçu. Faites deux encaissements séparés.');
      return;
    }

    onSubmitPayment({
      memberId: selectedMemberId,
      memberName: currentMember?.fullName || 'Client Stationnement',
      vehiclePlate: selectedPlate || undefined,
      siteId: selectedSiteId,
      siteName: siteObj?.name || selectedSiteId,
      purpose: calc.applied ? `${formula.purpose} — remise ${pricing.percent} % (${monthsCount} mois)` : formula.purpose,
      period,
      amountDueAr: amountDue,
      amountPaidAr: amountPaid,
      paymentMethod,
      cashierName: '' // set to the signed-in user by the app
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/15 text-[#06B6D4] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
            <div>
              <h3 className="font-headline text-lg font-bold text-[#0F172A]">Nouvel Encaissement de Caisse</h3>
              <p className="text-xs text-slate-500">Émission instantanée du reçu officiel avec transaction sécurisée</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="p-1 rounded text-slate-400 hover:text-[#0F172A]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Member Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Membre &amp; Propriétaire *</label>
            <select
              value={selectedMemberId}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-medium text-[#0F172A]"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberNumber} — {m.fullName} ({m.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Site & Vehicle Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Site Opérationnel</label>
              <select
                value={selectedSiteId}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value);
                  followSite(e.target.value);
                  setAmountPaidOverride(null);
                }}
                className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[#0F172A]"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Véhicule Assigné</label>
              <select
                value={selectedPlate}
                onChange={(e) => {
                  setSelectedPlate(e.target.value);
                  resetMonths();
                }}
                className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-plate font-bold text-[#0F172A]"
              >
                {memberVehicles.length === 0 && <option value="">Aucun véhicule</option>}
                {memberVehicles.map((v) => (
                  <option key={v.id} value={v.licensePlate}>
                    {v.licensePlate} ({v.brand} {v.model})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Formula Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Formule / Objet du Paiement</label>
            <div className="grid grid-cols-3 gap-2">
              {formulas.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFormulaChange(f.id)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    formulaType === f.id
                      ? 'border-[#06B6D4] bg-[#06B6D4]/10 text-[#0F172A] font-bold shadow-sm'
                      : 'border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block truncate text-[11px]">{f.label}</span>
                  <span className="font-mono-data text-[10px] text-[#06B6D4] font-bold">
                    {formatAr(f.price)} Ar{f.billing === 'mensuel' ? ' / mois' : f.billing === 'annuel' ? ' / an' : f.billing === 'unique' ? ' · une fois' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {formula?.billing === 'unique' && (
            <div className={`p-2.5 rounded-lg border text-[11px] ${alreadyPaidOnce ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-cyan-50 border-cyan-200 text-cyan-900'}`}>
              {alreadyPaidOnce
                ? `Déjà payé par ce membre le ${(alreadyPaidOnce as PaymentReceipt).dateTime} (reçu ${(alreadyPaidOnce as PaymentReceipt).receiptNumber}) : il ne se paie qu’une fois.`
                : 'Se paie une seule fois par membre.'}
            </div>
          )}

          {/* Months to pay */}
          {isMonthly && (
            <div className="p-3 rounded-xl border border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-500">Mois à payer *</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewYear((y) => y - 1)}
                    className="p-1 rounded hover:bg-slate-100"
                    title="Année précédente"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="font-mono-data font-bold text-sm text-[#0F172A] w-12 text-center">{viewYear}</span>
                  <button
                    type="button"
                    onClick={() => setViewYear((y) => y + 1)}
                    className="p-1 rounded hover:bg-slate-100"
                    title="Année suivante"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {MONTH_SHORT.map((name, i) => {
                  const key = monthKey(viewYear, i);
                  const paid = paidMonths.has(key);
                  const partial = partialMonths.has(key);
                  const selected = selectedMonths.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={paid}
                      onClick={() => toggleMonth(key)}
                      title={paid ? 'Déjà payé' : partial ? 'Payé partiellement' : monthLabel(key)}
                      className={`relative py-2 rounded-lg border text-[11px] font-semibold transition-colors ${
                        paid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed'
                          : selected
                          ? 'bg-[#06B6D4] border-[#06B6D4] text-[#0F172A] font-bold shadow-sm'
                          : partial
                          ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                          : 'bg-white border-[#E2E8F0] text-slate-700 hover:bg-slate-50'
                      } ${key === CURRENT_MONTH_KEY && !selected ? 'ring-1 ring-[#0F172A]/40' : ''}`}
                    >
                      {name}
                      {paid && <span className="material-symbols-outlined absolute top-0 right-0.5 text-[12px]">check</span>}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 mr-1">Raccourcis :</span>
                {[1, 3, 6, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => selectNextUnpaid(n)}
                    className="px-2 py-1 rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[10px] font-semibold"
                  >
                    {n === 1 ? 'Prochain mois' : `${n} prochains mois`}
                  </button>
                ))}
                {monthsCount > 0 && (
                  <button
                    type="button"
                    onClick={resetMonths}
                    className="px-2 py-1 rounded border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 text-[10px] font-semibold"
                  >
                    Effacer
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#06B6D4]" /> Sélectionné</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-200" /> Déjà payé</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-200" /> Payé partiellement</span>
              </div>

              <div className="text-[11px] pt-2 border-t border-[#E2E8F0]">
                {monthsCount === 0 ? (
                  <span className="text-slate-400">Aucun mois sélectionné</span>
                ) : (
                  <span className="text-[#0F172A]">
                    <strong>{monthsCount} mois</strong> : {formatMonthsPeriod(selectedMonths)}
                  </span>
                )}
              </div>
            </div>
          )}

          {formula.billing === 'annuel' && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0]">
              <label className="text-[11px] font-semibold text-slate-500">Année de cotisation</label>
              <select
                value={annualYear}
                onChange={(e) => setAnnualYear(Number(e.target.value))}
                className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-data font-bold"
              >
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Amounts (partial payments allowed) */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                {isMonthly ? 'Prix mensuel (Ar)' : 'Montant Dû (Ar)'}
              </label>
              <input
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => {
                  setUnitPrice(Number(e.target.value));
                  setAmountPaidOverride(null);
                }}
                className="w-full p-2 bg-white rounded border border-[#E2E8F0] font-mono-data font-bold text-sm text-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Montant Encaissé (Ar)</label>
              <input
                type="number"
                min={0}
                value={amountPaid}
                onChange={(e) => setAmountPaidOverride(Number(e.target.value))}
                className="w-full p-2 bg-white rounded border border-[#E2E8F0] font-mono-data font-bold text-sm text-[#16A34A]"
              />
            </div>

            {isMonthly && (
              <div className="col-span-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {formatAr(unitPrice)} Ar × {monthsCount} mois :
                </span>
                <span className="font-mono-data font-bold text-[#0F172A]">{formatAr(calc.grossAr)} Ar</span>
              </div>
            )}
            {isMonthly && calc.applied && (
              <div className="col-span-2 flex items-center justify-between text-xs text-emerald-700 font-semibold">
                <span>Remise paiement annuel ({pricing.percent} %) :</span>
                <span className="font-mono-data">− {formatAr(calc.discountAr)} Ar</span>
              </div>
            )}
            {isMonthly && (
              <div className="col-span-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Total dû :</span>
                <span className="font-mono-data font-bold text-[#0F172A]">{formatAr(amountDue)} Ar</span>
              </div>
            )}
            {isMonthly && pricing.enabled && pricing.percent > 0 && !calc.applied && monthsCount > 0 && (
              <p className="col-span-2 text-[11px] text-emerald-700">
                Astuce : {pricing.percent} % de remise en réglant {pricing.minMonths} mois d’un coup.
              </p>
            )}

            <div className="col-span-2 flex items-center justify-between text-xs pt-1 border-t border-[#E2E8F0]">
              <span className="text-slate-500">Reste à payer :</span>
              <span className={`font-mono-data font-bold ${remaining > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                {formatAr(remaining)} Ar {remaining === 0 ? '(Soldé)' : '(Arriéré partiel)'}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Moyen de Règlement</label>
            <div className="grid grid-cols-3 gap-2">
              {(['MVola', 'Orange Money', 'Airtel Money', 'Espèces', 'Virement BNI', 'Chèque'] as PaymentMethod[]).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`p-2 rounded-lg border text-center font-mono-data text-xs transition-colors ${
                    paymentMethod === pm
                      ? 'border-[#06B6D4] bg-[#06B6D4] text-[#0F172A] font-bold'
                      : 'border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
              Annuler
            </button>
            <button
              type="submit"
              disabled={!!alreadyPaidOnce || !formula}
              className="px-5 py-2.5 rounded-lg bg-[#06B6D4] text-[#0F172A] font-headline font-bold text-xs hover:bg-[#0891B2] hover:text-white transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Confirmer l'Encaissement{isMonthly && monthsCount > 0 ? ` (${monthsCount} mois)` : ''}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

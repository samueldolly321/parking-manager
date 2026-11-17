import React, { useState } from 'react';
import { EntityActions } from './EntityActions';
import { AppState, PayrollRecord, PayrollBeneficiaryType } from '../types';
import { addPayrollRecord, updatePayrollStatus, updatePayrollDeductions } from '../services/storage';
import confetti from 'canvas-confetti';
import { MONTH_NAMES, monthKey } from '../services/months';
import { todayInTana } from '../services/dashboardMetrics';
import { payrollMonthKey } from '../services/reports';

/** "Novembre 2026": the format stored in PayrollRecord.periodMonth */
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

interface PayrollViewProps {
  state: AppState;
}

type DeductionKey = 'cnaps' | 'ostie' | 'irsa';

/**
 * Proposed amount of each deduction, computed on the net salary. Only a starting value:
 * every amount stays editable (official rates and ceilings may differ).
 */
const DEDUCTIONS: { key: DeductionKey; label: string; hint: string; suggest: (net: number) => number }[] = [
  { key: 'cnaps', label: 'CNaPS', hint: 'part salariale, proposé à 1 %', suggest: (net) => roundAr(net * 0.01) },
  { key: 'ostie', label: 'OSTIE', hint: 'part salariale, proposé à 1 %', suggest: (net) => roundAr(net * 0.01) },
  { key: 'irsa', label: 'IRSA', hint: 'barème progressif indicatif', suggest: (net) => roundAr(irsaIndicative(net)) }
];

const roundAr = (v: number) => Math.round(v / 100) * 100;

/** IRSA progressive scale (0 % up to 350 000, then 5 / 10 / 15 / 20 %), used only as a suggestion. */
function irsaIndicative(base: number) {
  const brackets: [number, number, number][] = [
    [350_000, 400_000, 0.05],
    [400_000, 500_000, 0.10],
    [500_000, 600_000, 0.15],
    [600_000, Infinity, 0.20]
  ];
  return brackets.reduce((tax, [from, to, rate]) => tax + Math.max(0, Math.min(base, to) - from) * rate, 0);
}

/** New slips store the NET in the salary lines; older slips stored the gross. */
const isNetSlip = (p: PayrollRecord) =>
  p.baseSalaryAr + p.responsibilityBonusAr + p.nightShiftBonusAr + p.transportBonusAr + p.performanceBonusAr === p.netSalaryAr;

export const PayrollView: React.FC<PayrollViewProps> = ({ state }) => {
  // Months offered: the 12 last months + any month that already has payslips (newest first)
  const today = todayInTana();
  const currentMonthLabel = monthLabel(monthKey(today.year, today.monthIndex));
  const periodChoices = (() => {
    const keys = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const t = today.year * 12 + today.monthIndex - i;
      keys.add(monthKey(Math.floor(t / 12), t % 12));
    }
    state.payrolls.forEach((p) => { const k = payrollMonthKey(p.periodMonth); if (k) keys.add(k); });
    return Array.from(keys).sort().reverse().map((k) => ({
      label: monthLabel(k),
      count: state.payrolls.filter((p) => payrollMonthKey(p.periodMonth) === k).length
    }));
  })();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthLabel);
  /** Month of the payslip being created (never "all") */
  const [formPeriod, setFormPeriod] = useState<string>(currentMonthLabel);
  const [beneficiaryTypeFilter, setBeneficiaryTypeFilter] = useState<'all' | 'personnel' | 'bureau'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedSlip, setSelectedSlip] = useState<PayrollRecord | null>(null);
  const [showNewSlipModal, setShowNewSlipModal] = useState<boolean>(false);
  const [showPaymentExecutionModal, setShowPaymentExecutionModal] = useState<PayrollRecord | null>(null);
  const [executionTxRef, setExecutionTxRef] = useState<string>('');

  // Form states for new slip
  const [formBeneficiaryType, setFormBeneficiaryType] = useState<PayrollBeneficiaryType>('personnel');
  const [formBeneficiaryId, setFormBeneficiaryId] = useState<string>('');
  const [formBaseSalary, setFormBaseSalary] = useState<number>(450000);
  const [formRespBonus, setFormRespBonus] = useState<number>(0);
  const [formNightBonus, setFormNightBonus] = useState<number>(0);
  const [formTransportBonus, setFormTransportBonus] = useState<number>(40000);
  const [formPerfBonus, setFormPerfBonus] = useState<number>(0);
  const [formPaymentMethod, setFormPaymentMethod] = useState<PayrollRecord['paymentMethod']>('Virement BNI');
  const [formBankOrPhone, setFormBankOrPhone] = useState<string>('');
  // Optional deductions: off by default, amount editable once ticked
  const [formDeductionOn, setFormDeductionOn] = useState<Record<DeductionKey, boolean>>({ cnaps: false, ostie: false, irsa: false });
  const [formDeductionAr, setFormDeductionAr] = useState<Record<DeductionKey, number>>({ cnaps: 0, ostie: 0, irsa: 0 });

  // Deductions editor inside the slip view
  const [editDeductions, setEditDeductions] = useState<{ on: Record<DeductionKey, boolean>; ar: Record<DeductionKey, number> } | null>(null);

  const formatAr = (val: number) => {
    return new Intl.NumberFormat('fr-MG').format(val).replace(/,/g, ' ') + ' Ar';
  };

  const filteredPayrolls = state.payrolls.filter((p: PayrollRecord) => {
    if (selectedPeriod !== 'all' && p.periodMonth !== selectedPeriod) return false;
    if (beneficiaryTypeFilter !== 'all' && p.beneficiaryType !== beneficiaryTypeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (siteFilter !== 'all' && p.siteId !== siteFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.beneficiaryName.toLowerCase().includes(q) ||
        p.slipNumber.toLowerCase().includes(q) ||
        p.roleTitle.toLowerCase().includes(q) ||
        p.cin.includes(q)
      );
    }
    return true;
  });

  // Calculs financiers consolidés
  const totalDeductionsAr = filteredPayrolls.reduce((sum, p) => sum + p.totalDeductionsAr, 0);
  const totalNetAr = filteredPayrolls.reduce((sum, p) => sum + p.netSalaryAr, 0);
  const totalPersonnelNetAr = filteredPayrolls
    .filter(p => p.beneficiaryType === 'personnel')
    .reduce((sum, p) => sum + p.netSalaryAr, 0);
  const totalBureauNetAr = filteredPayrolls
    .filter(p => p.beneficiaryType === 'bureau')
    .reduce((sum, p) => sum + p.netSalaryAr, 0);
  const paidCount = filteredPayrolls.filter(p => p.status === 'paye').length;
  const pendingCount = filteredPayrolls.filter(p => p.status === 'en_attente').length;
  const approvedCount = filteredPayrolls.filter(p => p.status === 'valide_tresorier').length;

  // Formulaire : les montants saisis sont NETS (ce que la personne touche).
  // Les retenues cochées s'ajoutent au-dessus : brut = net + retenues, le net à payer ne change pas.
  const currentNet = Number(formBaseSalary) + Number(formRespBonus) + Number(formNightBonus) + Number(formTransportBonus) + Number(formPerfBonus);
  const deductionAmount = (key: DeductionKey) => (formDeductionOn[key] ? Math.max(0, Number(formDeductionAr[key]) || 0) : 0);
  const currentCnaps = deductionAmount('cnaps');
  const currentOstie = deductionAmount('ostie');
  const currentIrsa = deductionAmount('irsa');
  const currentTotalDeductions = currentCnaps + currentOstie + currentIrsa;
  const currentGross = currentNet + currentTotalDeductions;

  const toggleFormDeduction = (key: DeductionKey, on: boolean) => {
    setFormDeductionOn((prev) => ({ ...prev, [key]: on }));
    // Propose an amount the first time it is ticked
    if (on && !formDeductionAr[key]) {
      const d = DEDUCTIONS.find((x) => x.key === key)!;
      setFormDeductionAr((prev) => ({ ...prev, [key]: d.suggest(currentNet) }));
    }
  };

  const openSlip = (slip: PayrollRecord | null) => {
    setSelectedSlip(slip);
    setEditDeductions(null);
  };

  const startEditDeductions = (slip: PayrollRecord) => {
    setEditDeductions({
      on: { cnaps: slip.cnapsDeductionAr > 0, ostie: slip.ostieDeductionAr > 0, irsa: slip.irsaDeductionAr > 0 },
      ar: { cnaps: slip.cnapsDeductionAr, ostie: slip.ostieDeductionAr, irsa: slip.irsaDeductionAr }
    });
  };

  const saveEditDeductions = () => {
    if (!selectedSlip || !editDeductions) return;
    const amount = (k: DeductionKey) => (editDeductions.on[k] ? Math.max(0, Number(editDeductions.ar[k]) || 0) : 0);
    const updated = updatePayrollDeductions(selectedSlip.id, {
      cnapsDeductionAr: amount('cnaps'),
      ostieDeductionAr: amount('ostie'),
      irsaDeductionAr: amount('irsa')
    });
    if (updated) setSelectedSlip(updated);
    setEditDeductions(null);
  };

  const handleValidateSlip = (id: string) => {
    updatePayrollStatus(id, 'valide_tresorier', state.currentUser.fullName);
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentExecutionModal) return;
    const ref = executionTxRef.trim() || `VIR-${Date.now().toString().slice(-6)}`;
    updatePayrollStatus(showPaymentExecutionModal.id, 'paye', state.currentUser.fullName, ref);
    setShowPaymentExecutionModal(null);
    setExecutionTxRef('');
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }
  };

  const handleCreateSlip = (e: React.FormEvent) => {
    e.preventDefault();
    let name = '';
    let role = '';
    let siteId = 'S1';
    let siteName = 'Site 01 - Analakely Central';
    let cin = '101 000 000 000';
    let avatarUrl = '';

    if (formBeneficiaryType === 'personnel') {
      const guard = state.guards.find(g => g.id === formBeneficiaryId) || state.guards[0];
      name = guard.fullName;
      role = guard.title;
      siteId = guard.siteId;
      const s = state.sites.find(st => st.id === siteId);
      siteName = s ? s.name : siteId;
      cin = guard.cin;
      avatarUrl = guard.avatarUrl || '';
    } else {
      const member = state.committeeMembers.find(m => m.id === formBeneficiaryId) || state.committeeMembers[0];
      name = member.fullName;
      role = member.role;
      siteId = member.siteId || 'GLOBAL';
      const s = state.sites.find(st => st.id === siteId);
      siteName = s ? s.name : 'Direction Générale';
      avatarUrl = member.avatarUrl || '';
    }

    const newRecord = addPayrollRecord({
      periodMonth: formPeriod,
      beneficiaryType: formBeneficiaryType,
      beneficiaryId: formBeneficiaryId || 'beneficiary-new',
      beneficiaryName: name,
      roleTitle: role,
      siteId,
      siteName,
      cin,
      avatarUrl,
      paymentMethod: formPaymentMethod,
      bankAccountOrPhone: formBankOrPhone || '+261 34 00 000 00',
      baseSalaryAr: Number(formBaseSalary),
      responsibilityBonusAr: Number(formRespBonus),
      nightShiftBonusAr: Number(formNightBonus),
      transportBonusAr: Number(formTransportBonus),
      performanceBonusAr: Number(formPerfBonus),
      grossSalaryAr: currentGross,
      cnapsDeductionAr: currentCnaps,
      ostieDeductionAr: currentOstie,
      irsaDeductionAr: currentIrsa,
      advanceDeductionAr: 0,
      totalDeductionsAr: currentTotalDeductions,
      netSalaryAr: currentNet,
      status: 'en_attente'
    });

    setShowNewSlipModal(false);
    setFormDeductionOn({ cnaps: false, ostie: false, irsa: false });
    setFormDeductionAr({ cnaps: 0, ostie: 0, irsa: 0 });
    openSlip(newRecord);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <span className="material-symbols-outlined text-[30px]">payments</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-xl sm:text-2xl font-bold font-title">Gestion de la Paie &amp; Rémunérations</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {selectedPeriod === 'all' ? 'Tous les mois' : `Période ${selectedPeriod}`}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1 max-w-2xl">
              Salaires du personnel opérationnel (Chefs de brigade, gardiens, opératrices de caisse) et indemnités statutaires des membres du bureau (Présidents, Trésoriers, Secrétaire).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.print()}
            type="button"
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-cyan-400">print</span>
            <span>Imprimer Livre de Paie</span>
          </button>
          <button
            onClick={() => { setFormPeriod(selectedPeriod === 'all' ? currentMonthLabel : selectedPeriod); setShowNewSlipModal(true); }}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Émettre un Bulletin de Paie</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Total Net consolidé */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Masse Salariale Totale Net</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800">
              {filteredPayrolls.length} bulletins
            </span>
          </div>
          <h3 className="text-2xl font-black font-title text-slate-900 mt-1">
            {formatAr(totalNetAr)}
          </h3>
          <p className="text-xs text-slate-500">Retenues CNaPS / OSTIE / IRSA : {formatAr(totalDeductionsAr)}</p>
        </div>

        {/* KPI 2 : Part Personnel opérationnel */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Personnel Opérationnel</span>
            <span className="material-symbols-outlined text-cyan-600 text-[18px]">security</span>
          </div>
          <h3 className="text-2xl font-black font-title text-cyan-700 mt-1">
            {formatAr(totalPersonnelNetAr)}
          </h3>
          <p className="text-xs text-slate-500">Gardiens, chefs de brigade &amp; caisse</p>
        </div>

        {/* KPI 3 : Part Membres du Bureau */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Membres du Bureau / Comité</span>
            <span className="material-symbols-outlined text-amber-500 text-[18px]">military_tech</span>
          </div>
          <h3 className="text-2xl font-black font-title text-amber-600 mt-1">
            {formatAr(totalBureauNetAr)}
          </h3>
          <p className="text-xs text-slate-500">Présidents, trésoriers &amp; secrétaire</p>
        </div>

        {/* KPI 4 : Statut d'exécution */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Règlements &amp; Virements</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {paidCount} Payés
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black font-title text-emerald-600">
              {Math.round((paidCount / (filteredPayrolls.length || 1)) * 100)}%
            </span>
            <span className="text-xs text-slate-400">exécutés</span>
          </div>
          <p className="text-xs text-slate-500">{approvedCount} validés Trésorier, {pendingCount} en attente</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Sélecteur de mois */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Mois :</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-cyan-500"
            >
              {periodChoices.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}{c.label === currentMonthLabel ? ' (en cours)' : ''}{c.count > 0 ? ` — ${c.count} bulletin${c.count > 1 ? 's' : ''}` : ''}
                </option>
              ))}
              <option value="all">Tous les mois</option>
            </select>
          </div>

          {/* Filtre bénéficiaire : Personnel vs Bureau */}
          <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setBeneficiaryTypeFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                beneficiaryTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({state.payrolls.length})
            </button>
            <button
              onClick={() => setBeneficiaryTypeFilter('personnel')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                beneficiaryTypeFilter === 'personnel' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Personnel Gardiens ({state.payrolls.filter(p => p.beneficiaryType === 'personnel').length})
            </button>
            <button
              onClick={() => setBeneficiaryTypeFilter('bureau')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                beneficiaryTypeFilter === 'bureau' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bureau &amp; Dirigeants ({state.payrolls.filter(p => p.beneficiaryType === 'bureau').length})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filtre statut */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">Tous statuts</option>
            <option value="en_attente">En attente</option>
            <option value="valide_tresorier">Validé Trésorier</option>
            <option value="paye">Payé</option>
          </select>

          {/* Recherche */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher bénéficiaire..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none font-medium w-48"
            />
          </div>
        </div>
      </div>

      {/* Table des Bulletins de Paie */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-4">N° Bulletin</th>
                <th className="py-3 px-4">Bénéficiaire / Photo</th>
                <th className="py-3 px-4">Rôle &amp; Catégorie</th>
                <th className="py-3 px-4">Site / Affectation</th>
                <th className="py-3 px-4 text-right">Salaire net / Forfait</th>
                <th className="py-3 px-4 text-right">Primes</th>
                <th className="py-3 px-4 text-right">Retenues (option)</th>
                <th className="py-3 px-4 text-right">Net à Payer</th>
                <th className="py-3 px-4">Règlement</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Aucun bulletin de paie correspondant aux filtres.
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((slip) => {
                  const totalPrimes = slip.responsibilityBonusAr + slip.nightShiftBonusAr + slip.transportBonusAr + slip.performanceBonusAr;
                  return (
                    <tr key={slip.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {slip.slipNumber}
                        <div className="mt-1"><EntityActions compact collection="payrolls" record={slip} label={`Bulletin ${slip.slipNumber}`} /></div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={slip.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'}
                            alt={slip.beneficiaryName}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">{slip.beneficiaryName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">CIN: {slip.cin}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 text-[11px] block">{slip.roleTitle}</span>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            slip.beneficiaryType === 'bureau'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-cyan-100 text-cyan-800'
                          }`}>
                            {slip.beneficiaryType === 'bureau' ? 'Membre Bureau' : 'Personnel Terrain'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {slip.siteName}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        {formatAr(slip.baseSalaryAr)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-cyan-700 font-semibold">
                        +{formatAr(totalPrimes)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-600">
                        {slip.totalDeductionsAr > 0 ? (
                          <>
                            {isNetSlip(slip) ? '' : '-'}{formatAr(slip.totalDeductionsAr)}
                            <span className="block text-[9px] font-sans text-slate-400">
                              {[
                                slip.cnapsDeductionAr > 0 && 'CNaPS',
                                slip.ostieDeductionAr > 0 && 'OSTIE',
                                slip.irsaDeductionAr > 0 && 'IRSA'
                              ].filter(Boolean).join(' · ')}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-300">Aucune</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                        {formatAr(slip.netSalaryAr)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 text-[11px] block">{slip.paymentMethod}</span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px] block">
                            {slip.transactionRef || slip.bankAccountOrPhone}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          slip.status === 'paye'
                            ? 'bg-emerald-100 text-emerald-800'
                            : slip.status === 'valide_tresorier'
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {slip.status === 'paye' && <span className="material-symbols-outlined text-[12px]">check_circle</span>}
                          {slip.status === 'valide_tresorier' && <span className="material-symbols-outlined text-[12px]">verified</span>}
                          {slip.status === 'en_attente' && <span className="material-symbols-outlined text-[12px]">schedule</span>}
                          <span>
                            {slip.status === 'paye' ? 'Payé' : slip.status === 'valide_tresorier' ? 'Validé' : 'En attente'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openSlip(slip)}
                            title="Consulter Bulletin Officiel"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                          </button>

                          {slip.status === 'en_attente' && (
                            <button
                              onClick={() => handleValidateSlip(slip.id)}
                              title="Valider par le Trésorier"
                              className="px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] transition-colors"
                            >
                              Valider
                            </button>
                          )}

                          {slip.status === 'valide_tresorier' && (
                            <button
                              onClick={() => setShowPaymentExecutionModal(slip)}
                              title="Exécuter le paiement"
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Payer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: BULLETIN DE SALAIRE / FICHE OFFICIELLE D'INDEMNITÉ IMPRIMABLE */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Action Bar (Print + Close) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 no-print">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Bulletin Officiel • {selectedSlip.periodMonth}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Imprimer le Bulletin</span>
                </button>
                <button
                  onClick={() => openSlip(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* EN-TÊTE BULLETIN DE PAIE OFFICIEL */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500 text-slate-950 font-black flex items-center justify-center font-title">
                  PM
                </div>
                <h2 className="text-xl font-bold font-title text-slate-900">
                  PARKING MANAGER MADAGASCAR
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Organisation Centrale des Parkings Multi-Sites d'Antananarivo (CUA / Régie Municipale)
              </p>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 pt-2 font-mono">
                {selectedSlip.beneficiaryType === 'bureau'
                  ? 'ÉTAT DES INDEMNITÉS FORFAITAIRES STATUTAIRES'
                  : 'BULLETIN DE PAIE DU PERSONNEL'}
              </h3>
              <p className="font-mono text-xs text-cyan-700 font-bold">
                Période : {selectedSlip.periodMonth} • Réf : {selectedSlip.slipNumber}
              </p>
            </div>

            {/* IDENTITÉ DU BÉNÉFICIAIRE */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <img
                  src={selectedSlip.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'}
                  alt={selectedSlip.beneficiaryName}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-300"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{selectedSlip.beneficiaryName}</h4>
                  <p className="text-slate-600 font-medium">{selectedSlip.roleTitle}</p>
                  <p className="text-slate-500 font-mono mt-0.5">CIN : {selectedSlip.cin} • Affectation : {selectedSlip.siteName}</p>
                </div>
              </div>
              <div className="text-right space-y-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  selectedSlip.status === 'paye' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedSlip.status === 'paye' ? 'Acquitté / Payé' : 'En cours'}
                </span>
                <p className="text-[11px] text-slate-400 font-mono">Date émission : {selectedSlip.generatedDate}</p>
              </div>
            </div>

            {/* DÉCOMPTE DÉTAILLÉ DE LA PAIE */}
            <div className="space-y-4 text-xs">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[11px] uppercase font-bold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4">Rubrique / Désignation</th>
                      <th className="py-2.5 px-4 text-right">Gains (Ar)</th>
                      <th className="py-2.5 px-4 text-right">Retenues (Ar)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="py-2 px-4 font-sans text-slate-800">
                        {selectedSlip.beneficiaryType === 'bureau'
                          ? 'Indemnité forfaitaire de fonction statutaire'
                          : 'Salaire de base conventionnel'}
                        {isNetSlip(selectedSlip) && ' (net)'}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-900 font-bold">
                        {formatAr(selectedSlip.baseSalaryAr)}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-400">-</td>
                    </tr>

                    {selectedSlip.responsibilityBonusAr > 0 && (
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-800">
                          Prime de responsabilité &amp; commandement d'équipe
                        </td>
                        <td className="py-2 px-4 text-right text-slate-900">
                          {formatAr(selectedSlip.responsibilityBonusAr)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">-</td>
                      </tr>
                    )}

                    {selectedSlip.nightShiftBonusAr > 0 && (
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-800">
                          Prime de travail de nuit &amp; astreinte horaire
                        </td>
                        <td className="py-2 px-4 text-right text-slate-900">
                          {formatAr(selectedSlip.nightShiftBonusAr)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">-</td>
                      </tr>
                    )}

                    {selectedSlip.transportBonusAr > 0 && (
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-800">
                          Indemnité de transport &amp; panier repas
                        </td>
                        <td className="py-2 px-4 text-right text-slate-900">
                          {formatAr(selectedSlip.transportBonusAr)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">-</td>
                      </tr>
                    )}

                    {selectedSlip.performanceBonusAr > 0 && (
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-800">
                          Prime d'assiduité et de qualité de service
                        </td>
                        <td className="py-2 px-4 text-right text-slate-900">
                          {formatAr(selectedSlip.performanceBonusAr)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">-</td>
                      </tr>
                    )}

                    {/* Ligne TOTAL : net pour les nouveaux bulletins, brut pour les anciens */}
                    <tr className="bg-slate-50 font-bold font-sans">
                      <td className="py-2.5 px-4 text-slate-900 uppercase text-[11px]">
                        {isNetSlip(selectedSlip) ? 'TOTAL NET (salaire + primes)' : 'TOTAL BRUT IMPOSABLE'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-black">
                        {formatAr(isNetSlip(selectedSlip) ? selectedSlip.netSalaryAr : selectedSlip.grossSalaryAr)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                    </tr>

                    {/* DÉDUCTIONS (anciens bulletins calculés depuis le brut uniquement) */}
                    {!isNetSlip(selectedSlip) && selectedSlip.cnapsDeductionAr > 0 && (
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-700">Cotisation CNaPS part salariale</td>
                        <td className="py-2 px-4 text-right text-slate-400">-</td>
                        <td className="py-2 px-4 text-right text-rose-600 font-semibold">
                          {formatAr(selectedSlip.cnapsDeductionAr)}
                        </td>
                      </tr>
                    )}

                    {!isNetSlip(selectedSlip) && selectedSlip.ostieDeductionAr > 0 && (
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-700">Service médical interentreprises OSTIE</td>
                        <td className="py-2 px-4 text-right text-slate-400">-</td>
                        <td className="py-2 px-4 text-right text-rose-600 font-semibold">
                          {formatAr(selectedSlip.ostieDeductionAr)}
                        </td>
                      </tr>
                    )}

                    {!isNetSlip(selectedSlip) && selectedSlip.irsaDeductionAr > 0 && (
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-700">Retenue à la source IRSA (Impôt sur les revenus)</td>
                        <td className="py-2 px-4 text-right text-slate-400">-</td>
                        <td className="py-2 px-4 text-right text-rose-600 font-semibold">
                          {formatAr(selectedSlip.irsaDeductionAr)}
                        </td>
                      </tr>
                    )}

                    {selectedSlip.advanceDeductionAr > 0 && (
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-700">Acompte sur salaire perçu</td>
                        <td className="py-2 px-4 text-right text-slate-400">-</td>
                        <td className="py-2 px-4 text-right text-rose-600 font-semibold">
                          {formatAr(selectedSlip.advanceDeductionAr)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* RETENUES FACULTATIVES (nouveaux bulletins : ajoutées au net, le net ne change pas) */}
              {isNetSlip(selectedSlip) && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-100 flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-slate-600">
                      Retenues sociales &amp; fiscales (en plus du net)
                    </span>
                    {selectedSlip.status !== 'paye' && !editDeductions && (
                      <button
                        type="button"
                        onClick={() => startEditDeductions(selectedSlip)}
                        className="no-print px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        Modifier
                      </button>
                    )}
                  </div>

                  {editDeductions ? (
                    <div className="p-4 space-y-2.5">
                      {DEDUCTIONS.map((d) => (
                        <div key={d.key} className="flex items-center gap-3">
                          <label className="flex items-center gap-2 w-40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editDeductions.on[d.key]}
                              onChange={(e) => {
                                const on = e.target.checked;
                                setEditDeductions((prev) => prev && ({
                                  on: { ...prev.on, [d.key]: on },
                                  ar: { ...prev.ar, [d.key]: on && !prev.ar[d.key] ? d.suggest(selectedSlip.netSalaryAr) : prev.ar[d.key] }
                                }));
                              }}
                              className="w-4 h-4 accent-cyan-600"
                            />
                            <span className="font-semibold text-slate-800">{d.label}</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            aria-label={`Montant ${d.label}`}
                            disabled={!editDeductions.on[d.key]}
                            value={editDeductions.on[d.key] ? editDeductions.ar[d.key] : 0}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setEditDeductions((prev) => prev && ({ ...prev, ar: { ...prev.ar, [d.key]: v } }));
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-right disabled:bg-slate-50 disabled:text-slate-300"
                          />
                          <span className="text-[10px] text-slate-400 w-40">{d.hint}</span>
                        </div>
                      ))}
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setEditDeductions(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium">
                          Annuler
                        </button>
                        <button type="button" onClick={saveEditDeductions} className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">
                          Enregistrer les retenues
                        </button>
                      </div>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {DEDUCTIONS.map((d) => {
                          const amount =
                            d.key === 'cnaps' ? selectedSlip.cnapsDeductionAr : d.key === 'ostie' ? selectedSlip.ostieDeductionAr : selectedSlip.irsaDeductionAr;
                          return (
                            <tr key={d.key}>
                              <td className="py-2 px-4 font-sans text-slate-700">{d.label}</td>
                              <td className="py-2 px-4 text-right">
                                {amount > 0 ? (
                                  <span className="text-rose-600 font-semibold">{formatAr(amount)}</span>
                                ) : (
                                  <span className="font-sans text-slate-400">Non appliquée</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {selectedSlip.totalDeductionsAr > 0 && (
                          <tr className="bg-slate-50 font-sans text-slate-500">
                            <td className="py-2 px-4 text-[11px]">Brut reconstitué (net + retenues)</td>
                            <td className="py-2 px-4 text-right font-mono">{formatAr(selectedSlip.grossSalaryAr)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* NET À PAYER ENCADRÉ */}
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
                    NET À PAYER EN ARIARY
                  </span>
                  <span className="text-xs text-emerald-700">
                    Règlement par {selectedSlip.paymentMethod}
                    {selectedSlip.transactionRef ? ` • Réf: ${selectedSlip.transactionRef}` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-title text-emerald-700 font-mono">
                    {formatAr(selectedSlip.netSalaryAr)}
                  </span>
                </div>
              </div>
            </div>

            {/* SIGNATURES OFFICIELLES & MENTIONS LÉGALES */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
              <div className="text-center p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-6">
                <span className="font-bold uppercase text-[10px] text-slate-400 block">
                  Le Titulaire / Bénéficiaire
                </span>
                <p className="font-medium text-slate-800">{selectedSlip.beneficiaryName}</p>
              </div>

              <div className="text-center p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-6">
                <span className="font-bold uppercase text-[10px] text-slate-400 block">
                  Visé par la Trésorerie Générale
                </span>
                <p className="font-bold text-slate-900">
                  {selectedSlip.approverName || 'Rasoanaivo Mirana (Trésorière)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOUVEAU BULLETIN DE PAIE */}
      {showNewSlipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold font-title text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-600 text-[20px]">add_circle</span>
                Émettre un Bulletin de Paie ou d'Indemnité
              </h3>
              <button onClick={() => setShowNewSlipModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlip} className="space-y-4 text-xs">
              {/* Type de bénéficiaire */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setFormBeneficiaryType('personnel'); setFormBaseSalary(350000); }}
                  className={`p-3 rounded-xl border text-left font-bold transition-all ${
                    formBeneficiaryType === 'personnel'
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Personnel Terrain
                  <span className="block text-[10px] font-normal text-slate-500">Gardien, Chef poste, Caisse</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setFormBeneficiaryType('bureau'); setFormBaseSalary(500000); }}
                  className={`p-3 rounded-xl border text-left font-bold transition-all ${
                    formBeneficiaryType === 'bureau'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Membre du Bureau
                  <span className="block text-[10px] font-normal text-slate-500">Présidents, Trésoriers, Secrétaire</span>
                </button>
              </div>

              {/* Mois de paie */}
              <div>
                <label htmlFor="slip-period" className="block text-xs font-semibold text-slate-700 mb-1">Mois de paie :</label>
                <select
                  id="slip-period"
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-cyan-500"
                >
                  {periodChoices.map((c) => (
                    <option key={c.label} value={c.label}>{c.label}{c.label === currentMonthLabel ? ' (en cours)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Sélection du salarié / dirigeant */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bénéficiaire :
                </label>
                {formBeneficiaryType === 'personnel' ? (
                  <select
                    value={formBeneficiaryId}
                    onChange={(e) => setFormBeneficiaryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Sélectionner un agent...</option>
                    {state.guards.map(g => (
                      <option key={g.id} value={g.id}>{g.fullName} ({g.title})</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={formBeneficiaryId}
                    onChange={(e) => setFormBeneficiaryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Sélectionner un membre du bureau...</option>
                    {state.committeeMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.fullName} ({m.role})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Montants */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Salaire NET / Forfait (Ar) :</label>
                  <input
                    type="number"
                    step="5000"
                    required
                    value={formBaseSalary}
                    onChange={(e) => setFormBaseSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prime Responsabilité (Ar) :</label>
                  <input
                    type="number"
                    step="5000"
                    value={formRespBonus}
                    onChange={(e) => setFormRespBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prime Nuit (Ar) :</label>
                  <input
                    type="number"
                    step="5000"
                    value={formNightBonus}
                    onChange={(e) => setFormNightBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Transport (Ar) :</label>
                  <input
                    type="number"
                    step="5000"
                    value={formTransportBonus}
                    onChange={(e) => setFormTransportBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Rendement (Ar) :</label>
                  <input
                    type="number"
                    step="5000"
                    value={formPerfBonus}
                    onChange={(e) => setFormPerfBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <p className="-mt-2 text-[11px] text-slate-500">
                Tous les montants sont <strong>nets</strong> : c'est ce que la personne touchera.
              </p>

              {/* Retenues facultatives et modifiables */}
              <fieldset className="p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <legend className="px-1 text-slate-700 font-semibold">Retenues (facultatives)</legend>
                <p className="text-[11px] text-slate-500 -mt-1">
                  Cochez celles à appliquer. Le montant proposé est modifiable. Elles s'ajoutent au net, qui ne change pas.
                </p>
                {DEDUCTIONS.map((d) => (
                  <div key={d.key} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 w-28 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formDeductionOn[d.key]}
                        onChange={(e) => toggleFormDeduction(d.key, e.target.checked)}
                        className="w-4 h-4 accent-cyan-600"
                      />
                      <span className="font-semibold text-slate-800">{d.label}</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      aria-label={`Montant ${d.label}`}
                      disabled={!formDeductionOn[d.key]}
                      value={formDeductionOn[d.key] ? formDeductionAr[d.key] : 0}
                      onChange={(e) => setFormDeductionAr((prev) => ({ ...prev, [d.key]: Number(e.target.value) }))}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-right disabled:bg-slate-50 disabled:text-slate-300"
                    />
                    <span className="text-[10px] text-slate-400 w-32 leading-tight">{d.hint}</span>
                  </div>
                ))}
              </fieldset>

              {/* Mode de règlement */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mode de Paiement :</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="Virement BNI">Virement BNI</option>
                    <option value="Virement BMOI">Virement BMOI</option>
                    <option value="Virement BOA">Virement BOA</option>
                    <option value="MVola">MVola</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Espèces">Espèces</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Compte RIB ou Tél :</label>
                  <input
                    type="text"
                    value={formBankOrPhone}
                    onChange={(e) => setFormBankOrPhone(e.target.value)}
                    placeholder="ex: +261 34... ou RIB"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              {/* Résumé calculé */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-slate-600">
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Net à payer en Ariary :</span>
                  <span className="font-mono text-sm">{formatAr(currentNet)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>
                    Retenues ajoutées
                    {currentTotalDeductions > 0
                      ? ` (${DEDUCTIONS.filter((d) => formDeductionOn[d.key]).map((d) => d.label).join(', ')})`
                      : ''} :
                  </span>
                  <span className="font-mono">{currentTotalDeductions > 0 ? `+${formatAr(currentTotalDeductions)}` : 'Aucune'}</span>
                </div>
                {currentTotalDeductions > 0 && (
                  <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200">
                    <span>Brut reconstitué (net + retenues) :</span>
                    <span className="font-mono">{formatAr(currentGross)}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewSlipModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md"
                >
                  Émettre et Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXÉCUTER LE VIREMENT / PAIEMENT DE SALAIRE */}
      {showPaymentExecutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold font-title text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                Exécuter le Paiement de Salaire
              </h3>
              <button onClick={() => setShowPaymentExecutionModal(null)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Vous vous apprêtez à acquitter le bulletin <strong>{showPaymentExecutionModal.slipNumber}</strong> d'un montant de <strong>{formatAr(showPaymentExecutionModal.netSalaryAr)}</strong> en faveur de <strong>{showPaymentExecutionModal.beneficiaryName}</strong>.
            </p>

            <form onSubmit={handleExecutePayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Référence du Virement bancaire / Transaction Mobile Money :
                </label>
                <input
                  type="text"
                  required
                  value={executionTxRef}
                  onChange={(e) => setExecutionTxRef(e.target.value)}
                  placeholder="ex: VIR-BNI-2024-05-9982 ou TRX-88419-MVOLA"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentExecutionModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md"
                >
                  Confirmer Virement Exécuté
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

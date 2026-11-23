import React from 'react';
import {
  Site,
  ParkingSpot,
  PaymentReceipt,
  Vehicle,
  Member,
  GuardPersonnel,
  IncidentRecord,
  ExpenseRecord,
  Subscription,
  CashRegister,
  VehicleCategory
} from '../types';
import {
  computeAlerts,
  confirmedTotal,
  lastMonths,
  monthKeyOf,
  parseFrDate,
  todayInTana,
  DashboardAlert
} from '../services/dashboardMetrics';
import { subscriptionHealth } from '../services/subscriptionCalendar';

interface DashboardViewProps {
  sites: Site[];
  spots: ParkingSpot[];
  receipts: PaymentReceipt[];
  vehicles: Vehicle[];
  members: Member[];
  guards: GuardPersonnel[];
  incidents: IncidentRecord[];
  expenses: ExpenseRecord[];
  subscriptions: Subscription[];
  cashRegisters: CashRegister[];
  selectedSiteId: string;
  onOpenNewPayment: () => void;
  onSelectReceipt: (receipt: PaymentReceipt) => void;
  onNavigate: (path: any) => void;
}

/** Bar colours for sites, in order. */
const SITE_COLORS = ['#0F172A', '#00687a', '#06B6D4', '#94A3B8', '#F59E0B', '#16A34A'];

/** Groups the vehicle categories into the 4 slices of the donut. */
const VEHICLE_GROUPS: { label: string; unit: string; color: string; categories: VehicleCategory[] }[] = [
  { label: 'Légères', unit: 'véh.', color: '#0F172A', categories: ['Voiture Légère (VL)'] },
  { label: 'SUV / 4x4', unit: 'véh.', color: '#00687a', categories: ['SUV / 4x4'] },
  { label: '2-Roues', unit: 'moto', color: '#06B6D4', categories: ['Deux-Roues (2R)'] },
  { label: 'Utilitaires & autres', unit: 'véh.', color: '#94A3B8', categories: ['Utilitaire / Fourgon', 'Taxi-Ville / Minibus', 'Camionnette', 'Poids Lourd (PL)', 'Autre'] }
];

const RECEIPT_STATUS: Record<PaymentReceipt['status'], { label: string; cls: string }> = {
  confirme: { label: 'Confirmé', cls: 'bg-emerald-100 text-[#16A34A]' },
  en_attente: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  annule: { label: 'Annulé', cls: 'bg-slate-100 text-slate-500' },
  rembourse: { label: 'Remboursé', cls: 'bg-blue-100 text-blue-700' }
};

const formatAr = (val: number) => new Intl.NumberFormat('fr-FR').format(val).replace(/[  ,]/g, ' ');

/** 14 200 000 -> "14.20M", 850 000 -> "0.85M" */
const formatMillions = (val: number) => `${(val / 1_000_000).toFixed(2)}M`;

/** Picks a "round" top value for the chart axis. */
function niceMax(value: number) {
  if (value <= 0) return 1_000_000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) || 10;
  return step * magnitude;
}

const alertStyle = (a: DashboardAlert) => {
  if (a.kind === 'incident') {
    return a.urgent
      ? { box: 'bg-red-50/50 border-red-200', icon: 'bg-red-100 text-[#DC2626]', title: 'text-[#DC2626]', symbol: 'build' }
      : { box: 'bg-[#F8FAFC] border-[#E2E8F0]', icon: 'bg-amber-100 text-amber-700', title: 'text-[#0F172A]', symbol: 'build' };
  }
  if (a.kind === 'echeance') {
    return { box: 'bg-[#F8FAFC] border-[#E2E8F0]', icon: 'bg-amber-100 text-amber-700', title: 'text-[#0F172A]', symbol: 'schedule' };
  }
  return { box: 'bg-[#F8FAFC] border-[#E2E8F0]', icon: 'bg-blue-100 text-blue-700', title: 'text-[#0F172A]', symbol: 'account_balance' };
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  sites,
  spots,
  receipts,
  vehicles,
  members,
  guards,
  incidents,
  expenses,
  subscriptions,
  cashRegisters,
  selectedSiteId,
  onOpenNewPayment,
  onSelectReceipt,
  onNavigate
}) => {
  const bySite = <T,>(list: T[], key: (x: T) => string) =>
    selectedSiteId === 'all' ? list : list.filter((x) => key(x) === selectedSiteId);

  const filteredSites = bySite(sites, (s) => s.id);
  const filteredSpots = bySite(spots, (s) => s.siteId);
  const filteredReceipts = bySite(receipts, (r) => r.siteId);
  const filteredMembers = bySite(members, (m) => m.primarySiteId);
  const filteredVehicles = bySite(vehicles, (v) => v.siteId);
  const filteredGuards = bySite(guards, (g) => g.siteId);
  const filteredIncidents = bySite(incidents, (i) => i.siteId);
  const filteredExpenses = bySite(expenses, (e) => e.siteId);
  const filteredSubscriptions = bySite(subscriptions, (s) => s.siteId);
  const filteredRegisters = bySite(cashRegisters, (r) => r.siteId);

  // Period
  const today = todayInTana();
  const months = lastMonths(5, today);
  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];

  // Card 1: receipts of the month vs previous month
  const totalReceiptsMonthAr = confirmedTotal(filteredReceipts, currentMonth.key);
  const totalReceiptsPrevAr = confirmedTotal(filteredReceipts, previousMonth.key);
  const receiptsTrend = totalReceiptsPrevAr > 0
    ? ((totalReceiptsMonthAr - totalReceiptsPrevAr) / totalReceiptsPrevAr) * 100
    : null;

  // Card 2: occupancy of the spots actually configured (same figures as "Emplacements & occupation")
  const totalSpots = filteredSpots.length;
  const declaredCapacity = filteredSites.reduce((sum, s) => sum + (Number(s.totalCapacity) || 0), 0);
  const occupiedSpotsCount = filteredSpots.filter((s) => s.status === 'occupe').length;
  const freeSpotsCount = filteredSpots.filter((s) => s.status === 'libre').length;
  const occupancyPercent = totalSpots > 0 ? Math.round((occupiedSpotsCount / totalSpots) * 100) : 0;

  // Card 3: members
  const activeMembers = filteredMembers.filter((m) => m.status === 'actif').length;
  const newMembersThisMonth = filteredMembers.filter((m) => monthKeyOf(m.joinedDate) === currentMonth.key).length;

  // Card 4: cash available in the registers
  const treasuryAr = filteredRegisters.reduce((sum, r) => sum + r.currentCashInHandAr, 0);

  // Card 5: unpaid, computed from the subscriptions and their receipts (same rule as the payment calendar)
  const arrears = filteredSubscriptions
    .map((s) => ({ s, h: subscriptionHealth(s, receipts, today) }))
    .filter((x) => x.h.arrearsAr > 0);
  const unpaidMembers = [...new Set(arrears.map((x) => x.s.memberId))];
  const totalUnpaidAr = arrears.reduce((sum, x) => sum + x.h.arrearsAr, 0);
  const unpaidMonthsCount = arrears.reduce((sum, x) => sum + x.h.unpaid.length, 0);

  // Chart: confirmed receipts per site for the last 5 months
  const chartSites = filteredSites.slice(0, SITE_COLORS.length);
  const chartData = months.map((m) => ({
    ...m,
    values: chartSites.map((s) => confirmedTotal(receipts.filter((r) => r.siteId === s.id), m.key))
  }));
  const chartMax = niceMax(Math.max(0, ...chartData.flatMap((m) => m.values)));
  const CHART_TOP = 20;
  const CHART_BOTTOM = 190;
  const yFor = (v: number) => CHART_BOTTOM - (v / chartMax) * (CHART_BOTTOM - CHART_TOP);
  const groupWidth = 60;
  const barWidth = Math.max(4, Math.min(14, Math.floor((groupWidth - 2 * (chartSites.length - 1)) / Math.max(1, chartSites.length))));

  // Site table
  const todayKey = `${today.year}-${today.monthIndex}-${today.day}`;
  const isToday = (dateTime: string) => {
    const d = parseFrDate(dateTime);
    return d !== null && `${d.year}-${d.monthIndex}-${d.day}` === todayKey;
  };
  const openIncidents = (siteId: string) =>
    incidents.filter((i) => i.siteId === siteId && (i.resolutionStatus === 'ouvert' || i.resolutionStatus === 'en_cours'));
  const guardsOnDuty = filteredGuards.filter((g) => g.status === 'en_poste').length;

  // Alerts
  const siteNames = Object.fromEntries(sites.map((s) => [s.id, s.name.replace(/^Site \d+\s*-\s*/, '')]));
  const alerts = computeAlerts({
    subscriptions: filteredSubscriptions,
    receipts,
    incidents: filteredIncidents,
    expenses: filteredExpenses,
    siteNames
  });

  // Donut: registered vehicles by category
  const vehicleSlices = VEHICLE_GROUPS.map((g) => ({
    ...g,
    count: filteredVehicles.filter((v) => g.categories.includes(v.category)).length
  }));
  const vehicleTotal = vehicleSlices.reduce((sum, s) => sum + s.count, 0);
  let donutOffset = 0;

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Operational Context Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono-data text-xs text-slate-500">
            <span>CONSOLE CENTRALE</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#0F172A] font-semibold uppercase tracking-wider">
              {selectedSiteId === 'all' ? `Tous les sites (${sites.length})` : filteredSites[0]?.name || selectedSiteId}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
              Tableau de bord consolidé
            </h1>
          </div>
        </div>

        {/* Actions & Export Controls */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center bg-white rounded-xl shadow-sm px-3 py-2 border border-[#E2E8F0] text-xs">
            <span className="material-symbols-outlined text-[18px] text-slate-400 mr-2">calendar_today</span>
            <span className="font-medium text-[#0F172A]">Exercice {currentMonth.long} (Mois en cours)</span>
          </div>
          <button
            onClick={() => onNavigate('rapports-et-statistiques')}
            type="button"
            title="Exports PDF et Excel dans « Rapports & Statistiques »"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-[#0F172A] hover:bg-slate-50 transition-colors shadow-sm border border-[#E2E8F0] text-xs font-medium"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-500">download</span>
            <span>Exporter un rapport (PDF / Excel)</span>
          </button>
          <button
            onClick={onOpenNewPayment}
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F172A] text-white hover:bg-slate-800 transition-all shadow-md text-xs font-headline font-bold"
          >
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">add_circle</span>
            <span>+ Encaisser</span>
          </button>
        </div>
      </div>

      {/* 5 Principal Metric KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Card 1: Recettes du mois */}
        <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm border border-[#E2E8F0] hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Recettes du mois</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#0F172A]">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
                {formatAr(totalReceiptsMonthAr)}
              </span>
              <span className="font-mono-data text-xs text-slate-500 font-semibold">Ar</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-xs">
            {receiptsTrend === null ? (
              <span className="text-slate-400">Aucune recette en {previousMonth.long}</span>
            ) : (
              <>
                <span className={`inline-flex items-center font-mono-data text-xs font-bold ${receiptsTrend >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  <span className="material-symbols-outlined text-[14px]">{receiptsTrend >= 0 ? 'trending_up' : 'trending_down'}</span>
                  {receiptsTrend >= 0 ? '+' : ''}{receiptsTrend.toFixed(1)}%
                </span>
                <span className="text-slate-400">vs {previousMonth.long} (M-1)</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Taux d'occupation global */}
        <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm border border-[#E2E8F0] hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Occupation globale</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#0F172A]">
              <span className="material-symbols-outlined text-[18px]">local_parking</span>
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
                {occupancyPercent}%
              </span>
              <span className="font-mono-data text-xs text-slate-500">
                {occupiedSpotsCount} / {totalSpots} places
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[#06B6D4] rounded-full transition-all duration-500"
                style={{ width: `${occupancyPercent}%` }}
              ></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-mono-data text-slate-500 pt-1">
            <span title="Capacité déclarée sur la fiche du site">
              {declaredCapacity && declaredCapacity !== totalSpots ? `Capacité déclarée : ${declaredCapacity}` : 'Seuil alerte : 90 %'}
            </span>
            <span className="text-[#0F172A] font-semibold">{freeSpotsCount} libres</span>
          </div>
        </div>

        {/* Card 3: Membres actifs */}
        <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm border border-[#E2E8F0] hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Membres actifs</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#0F172A]">
              <span className="material-symbols-outlined text-[18px]">badge</span>
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
                {activeMembers}
              </span>
              <span className="text-xs text-slate-500 font-medium">abonnés</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-xs">
            <span className="inline-flex items-center text-[#06B6D4] font-mono-data text-xs font-bold">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>+{newMembersThisMonth}
            </span>
            <span className="text-slate-400">nouveaux ce mois</span>
          </div>
        </div>

        {/* Card 4: Trésorerie disponible */}
        <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm border border-[#E2E8F0] hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Trésorerie dispo</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#0F172A]">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
                {formatAr(treasuryAr)}
              </span>
              <span className="font-mono-data text-xs text-slate-500 font-semibold">Ar</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-xs text-slate-400">
            Espèces en caisse ({filteredRegisters.length} caisse{filteredRegisters.length > 1 ? 's' : ''})
          </div>
        </div>

        {/* Card 5: Impayés & Arriérés */}
        <div className="bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm border border-[#DC2626]/20 bg-red-50/20 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-[11px] text-[#DC2626] uppercase tracking-wider font-bold">Impayés &amp; Arriérés</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-[#DC2626]">
              <span className="material-symbols-outlined text-[18px]">report_problem</span>
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-2xl font-bold text-[#DC2626] tracking-tight">
                {formatAr(totalUnpaidAr)}
              </span>
              <span className="font-mono-data text-xs text-[#DC2626] font-semibold">Ar</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#DC2626] font-mono-data text-xs font-bold">
              {unpaidMembers.length} membre{unpaidMembers.length > 1 ? 's' : ''} · {unpaidMonthsCount} mois
            </span>
            <button
              onClick={() => onNavigate('abonnements-et-tarifs')}
              type="button"
              className="font-medium text-[#DC2626] hover:underline flex items-center gap-0.5"
            >
              Relancer <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section Graphique & Comparatif Multi-sites */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Chart Column (5 cols): Monthly Bar Histogram */}
        <div className="xl:col-span-5 bg-white rounded-xl p-5 shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-headline text-base font-bold text-[#0F172A]">Recettes Mensuelles Consolidées</h2>
                <p className="text-xs text-slate-500">
                  Ventilation par site opérationnel ({months[0].long} - {currentMonth.long})
                </p>
              </div>
              <span className="font-mono-data text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                Unités: Millions Ar
              </span>
            </div>

            <div className="w-full pt-4">
              <svg aria-label="Graphique des recettes multi-sites" className="w-full h-48 overflow-visible" viewBox="0 0 460 220">
                {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                  const y = yFor(chartMax * f);
                  return (
                    <g key={f}>
                      <line
                        className={f === 0 ? 'text-slate-300' : 'text-slate-200'}
                        stroke="currentColor"
                        strokeWidth={f === 0 ? 1.5 : 1}
                        strokeDasharray={f === 0 ? undefined : '3 3'}
                        x1="30" x2="440" y1={y} y2={y}
                      />
                      <text className="font-mono-data text-[10px] fill-current text-slate-400" x="0" y={y + 4}>
                        {f === 0 ? '0' : `${+((chartMax * f) / 1_000_000).toFixed(2)}M`}
                      </text>
                    </g>
                  );
                })}

                {chartData.map((m, mi) => (
                  <g key={m.key} transform={`translate(${45 + mi * 80}, 0)`}>
                    {m.values.map((v, si) => (
                      <rect
                        key={chartSites[si].id}
                        fill={SITE_COLORS[si]}
                        height={CHART_BOTTOM - yFor(v)}
                        rx="2"
                        width={barWidth}
                        x={si * (barWidth + 2)}
                        y={yFor(v)}
                      >
                        <title>{`${chartSites[si].name} — ${m.long} : ${formatAr(v)} Ar`}</title>
                      </rect>
                    ))}
                    <text
                      className={`font-mono-data text-[11px] fill-current ${mi === chartData.length - 1 ? 'font-bold text-[#0F172A]' : 'text-slate-400'}`}
                      textAnchor="middle"
                      x={groupWidth / 2 - 7}
                      y="206"
                    >
                      {m.short}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Chart Legend & current month per site */}
          <div className="pt-4 grid grid-cols-3 gap-2 border-t border-[#E2E8F0] mt-4">
            {chartSites.map((s, si) => (
              <div key={s.id} className="bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: SITE_COLORS[si] }}></span>
                  <span className="text-[11px] text-[#0F172A] font-semibold truncate">{siteNames[s.id]}</span>
                </div>
                <span className="font-mono-data text-xs font-bold text-[#0F172A]">
                  {formatMillions(chartData[chartData.length - 1].values[si])}
                </span>
                <span className="font-mono-data text-[9px] text-slate-500 block">Ar / {currentMonth.short}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Multi-Sites Comparison Table (7 cols) */}
        <div className="xl:col-span-7 bg-white rounded-xl p-5 shadow-sm border border-[#E2E8F0] flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="font-headline text-base font-bold text-[#0F172A]">
                  État Opérationnel {filteredSites.length > 1 ? `des ${filteredSites.length} Sites` : 'du Site'}
                </h2>
              </div>
              <button
                onClick={() => onNavigate('emplacements-et-occupation')}
                type="button"
                className="text-xs text-[#06B6D4] hover:underline flex items-center gap-0.5 font-medium"
              >
                Plan interactif <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-slate-500 uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
                    <th className="py-2.5 px-3 rounded-l-lg">Site / Emplacement</th>
                    <th className="py-2.5 px-3">Capacité</th>
                    <th className="py-2.5 px-3 w-44">Occupation</th>
                    <th className="py-2.5 px-3 text-right">Recette Jour</th>
                    <th className="py-2.5 px-3 text-center">Gardiens</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-center">Alertes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredSites.map((site) => {
                    const siteSpots = spots.filter((s) => s.siteId === site.id);
                    const occ = siteSpots.filter((s) => s.status === 'occupe').length;
                    const pct = siteSpots.length > 0 ? Math.round((occ / siteSpots.length) * 100) : 0;
                    const barColor = pct >= 90 ? '#DC2626' : pct >= 75 ? '#F59E0B' : '#06B6D4';
                    const dayTotal = receipts
                      .filter((r) => r.siteId === site.id && r.status === 'confirme' && isToday(r.dateTime))
                      .reduce((sum, r) => sum + r.amountPaidAr, 0);
                    const siteGuards = guards.filter((g) => g.siteId === site.id);
                    const onDuty = siteGuards.filter((g) => g.status === 'en_poste').length;
                    const open = openIncidents(site.id);
                    return (
                      <tr key={site.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-headline text-xs font-bold text-[#0F172A]">{siteNames[site.id]}</div>
                          <div className="text-[11px] text-slate-400">{site.address}</div>
                        </td>
                        <td className="py-3 px-3 font-mono-data font-medium" title={`Capacité déclarée : ${site.totalCapacity} places`}>
                          {siteSpots.length} pl.
                          {site.totalCapacity !== siteSpots.length && (
                            <span className="block text-[10px] text-slate-400 font-normal">sur {site.totalCapacity} déclarées</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-between font-mono-data text-[10px] mb-1">
                            <span className="font-semibold text-[#0F172A]">{occ} occ.</span>
                            <span className="font-bold" style={{ color: barColor }}>{pct}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }}></div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono-data font-bold text-[#0F172A]">
                          {formatAr(dayTotal)} <span className="text-slate-400 text-[10px] font-normal">Ar</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono-data text-[10px] font-semibold text-[#0F172A]">
                            {onDuty} / {siteGuards.length}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {open.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-[#DC2626] font-mono-data text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span> {open.length} incident{open.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono-data text-[10px] font-semibold">
                              RAS
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs text-[#0F172A]">
              <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">verified_user</span>
              <span>
                Sur le terrain : <strong>{guardsOnDuty} gardien{guardsOnDuty > 1 ? 's' : ''} en poste</strong> sur {filteredGuards.length}.
              </span>
            </div>
            <button
              onClick={() => onNavigate('personnel-et-gardiens')}
              type="button"
              className="text-xs text-[#06B6D4] font-semibold hover:underline"
            >
              Pointage &amp; Planning
            </button>
          </div>
        </div>
      </div>

      {/* Bottom 2-Column Section (7 cols / 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Live Receipts Stream */}
        <div className="lg:col-span-7 bg-white rounded-xl p-5 shadow-sm border border-[#E2E8F0] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-headline text-base font-bold text-[#0F172A]">Derniers encaissements</h2>
                <p className="text-xs text-slate-500">Transactions de caisse et passerelles mobiles</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-slate-500 uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
                    <th className="py-2.5 px-2 rounded-l-lg">Réf Reçu</th>
                    <th className="py-2.5 px-2">Date &amp; heure</th>
                    <th className="py-2.5 px-2">Véhicule / Membre</th>
                    <th className="py-2.5 px-2">Site</th>
                    <th className="py-2.5 px-2">Mode</th>
                    <th className="py-2.5 px-2 text-right">Montant</th>
                    <th className="py-2.5 px-2 text-center">Statut</th>
                    <th className="py-2.5 px-2 rounded-r-lg text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredReceipts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">Aucun encaissement enregistré.</td>
                    </tr>
                  )}
                  {filteredReceipts.slice(0, 6).map((receipt) => {
                    const status = RECEIPT_STATUS[receipt.status] || RECEIPT_STATUS.confirme;
                    return (
                      <tr key={receipt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-2 font-mono-data text-xs font-bold text-[#0F172A]">
                          {receipt.receiptNumber}
                        </td>
                        <td className="py-2.5 px-2 font-mono-data text-[11px] text-slate-500">
                          {receipt.dateTime}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1.5">
                            {receipt.vehiclePlate && (
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono-plate text-[10px] text-[#0F172A] tracking-wider font-bold border border-slate-300">
                                {receipt.vehiclePlate}
                              </span>
                            )}
                            <span className="font-medium text-[#0F172A] truncate max-w-[120px]">
                              {receipt.memberName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-500 truncate max-w-[90px]">{siteNames[receipt.siteId] || receipt.siteName}</td>
                        <td className="py-2.5 px-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono-data text-[10px] font-semibold text-[#0F172A]">
                            {receipt.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono-data font-bold text-[#0F172A]">
                          {formatAr(receipt.amountPaidAr)} <span className="text-slate-400 text-[10px] font-normal">Ar</span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-mono-data text-[10px] font-bold ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => onSelectReceipt(receipt)}
                            aria-label={`Imprimer reçu ${receipt.receiptNumber}`}
                            className="p-1 rounded text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
                            title="Imprimer / Voir le reçu"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">print</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-[#E2E8F0] mt-3">
            <span className="font-mono-data text-xs text-slate-500">
              Affichage {Math.min(filteredReceipts.length, 6)} sur {filteredReceipts.length} reçus enregistrés
            </span>
            <button
              onClick={() => onNavigate('encaissements-et-recus')}
              type="button"
              className="text-xs text-[#06B6D4] hover:underline flex items-center gap-1 font-semibold"
            >
              Voir le journal complet des caisses <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Alerts & Vehicle Parc Donut */}
        <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
          {/* Alerts & Actions Required Panel */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#DC2626]">notification_important</span>
                <h2 className="font-headline text-base font-bold text-[#0F172A]">Alertes &amp; Actions Requises</h2>
              </div>
              <span className={`w-5 h-5 rounded-full font-mono-data text-xs font-bold flex items-center justify-center ${alerts.length > 0 ? 'bg-red-100 text-[#DC2626]' : 'bg-slate-100 text-slate-500'}`}>
                {alerts.length}
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {alerts.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">Aucune alerte : rien à traiter pour le moment.</p>
              )}
              {alerts.map((a) => {
                const st = alertStyle(a);
                return (
                  <div key={a.id} className={`p-3 rounded-lg border flex items-start gap-3 ${st.box}`}>
                    <div className={`p-1.5 rounded mt-0.5 ${st.icon}`}>
                      <span className="material-symbols-outlined text-[16px]">{st.symbol}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold truncate ${st.title}`}>{a.title}</span>
                        <span className={`shrink-0 font-mono-data text-[10px] font-bold ${a.urgent ? 'px-1.5 py-0.5 rounded bg-red-100 text-[#DC2626]' : 'text-slate-600'}`}>
                          {a.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{a.detail}</p>
                      <div className="mt-2 flex gap-3 text-xs">
                        {a.kind === 'echeance' && (
                          <button onClick={() => onNavigate('abonnements-et-tarifs')} className="font-medium text-[#06B6D4] hover:underline" type="button">
                            Voir les comptes
                          </button>
                        )}
                        {a.kind === 'incident' && (
                          <>
                            <button onClick={() => onNavigate('incidents-et-registre')} className="font-medium text-[#06B6D4] hover:underline" type="button">
                              Fiche d'incident
                            </button>
                            <span className="text-slate-300">•</span>
                            <button onClick={() => onNavigate('materiels-et-equipements')} className="text-slate-500 hover:underline" type="button">
                              Matériel
                            </button>
                          </>
                        )}
                        {a.kind === 'depense' && (
                          <button onClick={() => onNavigate('tresorerie-et-caisses')} className="font-medium text-[#16A34A] hover:underline" type="button">
                            Examiner la dépense
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vehicle Distribution Donut & Breakdown */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-headline text-base font-bold text-[#0F172A]">Parc Roulant &amp; Typologie</h2>
                <p className="text-xs text-slate-500">Répartition des {vehicleTotal} véhicules enregistrés</p>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#F1F5F9" strokeWidth="14" />
                  {vehicleTotal > 0 && vehicleSlices.map((s) => {
                    const pct = (s.count / vehicleTotal) * 100;
                    const el = (
                      <circle
                        key={s.label}
                        cx="50" cy="50" fill="transparent" r="38"
                        pathLength={100}
                        stroke={s.color}
                        strokeDasharray={`${pct} ${100 - pct}`}
                        strokeDashoffset={-donutOffset}
                        strokeWidth="14"
                      />
                    );
                    donutOffset += pct;
                    return el;
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-headline text-xl font-bold text-[#0F172A] leading-none">{vehicleTotal}</span>
                  <span className="font-mono-data text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Véhicules</span>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-2 font-mono-data text-xs">
                {vehicleSlices.map((s) => (
                  <div key={s.label} className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: s.color }}></span>
                      <span className="text-[11px] text-[#0F172A] font-semibold truncate">{s.label}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-headline text-sm font-bold text-[#0F172A]">
                        {vehicleTotal > 0 ? Math.round((s.count / vehicleTotal) * 100) : 0}%
                      </span>
                      <span className="text-[10px] text-slate-400">{s.count} {s.unit}{s.unit === 'moto' && s.count > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

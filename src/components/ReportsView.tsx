import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import {
  Breakdown,
  Granularity,
  Period,
  buildReport,
  changePct,
  monthShortLabel,
  periodLabel,
  periodOf,
  periodOptions,
  previousPeriod
} from '../services/reports';
import { exportReportCsv, exportReportPdf } from '../services/reportExport';
import { todayInTana } from '../services/dashboardMetrics';
import { monthKey } from '../services/months';
import { useBranding } from '../services/branding';

interface ReportsViewProps {
  state: AppState;
  selectedSiteId: string;
}

/** Validated categorical slots (light surface) for the three money series. */
const SERIES = [
  { key: 'recettesAr', label: 'Recettes', color: '#2a78d6' },
  { key: 'depensesAr', label: 'Dépenses', color: '#eb6834' },
  { key: 'salairesAr', label: 'Salaires', color: '#1baf7a' }
] as const;
/** Single hue for one-series bars (magnitude). */
const BAR_HUE = '#2a78d6';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/[  ,]/g, ' ');
const ar = (n: number) => `${fmt(n)} Ar`;
const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1).replace('.', ',')} M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)} k`;
  return String(Math.round(n));
};

function niceMax(v: number) {
  if (v <= 0) return 100_000;
  const mag = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((s) => s * mag >= v) || 10) * mag;
}

const Card: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, subtitle, right, children, className = '' }) => (
  <section className={`bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
      <div>
        <h2 className="font-headline text-sm font-bold text-[#0F172A]">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

/** Horizontal bars, one hue, value + share as text (identity never by color). */
const BarList: React.FC<{ items: Breakdown[]; total: number; countLabel?: string; empty?: string }> = ({ items, total, countLabel = 'opération', empty = 'Aucune donnée sur la période.' }) => {
  if (items.length === 0) return <p className="py-6 text-center text-xs text-slate-400">{empty}</p>;
  const max = Math.max(...items.map((i) => i.valueAr), 1);
  return (
    <ul className="space-y-3">
      {items.map((b) => {
        const share = total > 0 ? (b.valueAr / total) * 100 : 0;
        return (
          <li key={b.label} title={`${b.label} : ${ar(b.valueAr)} (${share.toFixed(1).replace('.', ',')} %) — ${b.count} ${countLabel}${b.count > 1 ? 's' : ''}`}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-semibold text-[#0F172A] truncate">{b.label}</span>
              <span className="shrink-0 font-mono-data text-[#0F172A]">
                {ar(b.valueAr)} <span className="text-slate-400">· {share.toFixed(1).replace('.', ',')} %</span>
              </span>
            </div>
            <div className="mt-1 h-2 rounded bg-slate-100 overflow-hidden">
              <div className="h-full rounded" style={{ width: `${(b.valueAr / max) * 100}%`, backgroundColor: BAR_HUE }} />
            </div>
            <span className="text-[10px] text-slate-400">{b.count} {countLabel}{b.count > 1 ? 's' : ''}</span>
          </li>
        );
      })}
    </ul>
  );
};

/** KPI tile with comparison to the previous period. `goodWhenUp` decides the color of the change. */
const Kpi: React.FC<{ label: string; value: number; previous: number; prevLabel: string; goodWhenUp: boolean; emphasis?: boolean; showDifference?: boolean }> = ({ label, value, previous, prevLabel, goodWhenUp, emphasis, showDifference }) => {
  // A result can change sign: a % would be meaningless there, so it shows the difference in Ar
  const pct = showDifference ? (previous === 0 && value === 0 ? null : value - previous) : changePct(value, previous);
  const up = pct !== null && pct > 0;
  const good = pct === null || pct === 0 ? null : up === goodWhenUp;
  const changeText = pct === null ? '' : showDifference ? `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${ar(Math.abs(pct))}` : `${Math.abs(pct).toFixed(1).replace('.', ',')} %`;
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${emphasis ? 'bg-[#0F172A] border-[#0F172A] text-white' : 'bg-white border-[#E2E8F0]'}`}>
      <span className={`text-[11px] uppercase tracking-wider font-semibold ${emphasis ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
      <div className={`mt-2 font-headline text-xl sm:text-2xl font-bold tracking-tight ${emphasis ? (value < 0 ? 'text-rose-300' : 'text-white') : 'text-[#0F172A]'}`}>
        {ar(value)}
      </div>
      <div className={`mt-1.5 text-[11px] ${emphasis ? 'text-slate-300' : 'text-slate-500'}`}>
        {pct === null ? (
          <span>Pas de données en {prevLabel}</span>
        ) : (
          <>
            <span className={`font-bold font-mono-data ${good === null ? '' : good ? (emphasis ? 'text-emerald-300' : 'text-[#16A34A]') : (emphasis ? 'text-rose-300' : 'text-[#DC2626]')}`}>
              {up ? '▲' : pct < 0 ? '▼' : '='} {changeText}
            </span>{' '}
            vs {prevLabel} ({ar(previous)})
          </>
        )}
      </div>
    </div>
  );
};

export const ReportsView: React.FC<ReportsViewProps> = ({ state, selectedSiteId }) => {
  const { appName } = useBranding();
  const t = todayInTana();
  const currentMonth = monthKey(t.year, t.monthIndex);
  const [granularity, setGranularity] = useState<Granularity>('mois');
  const [periodValue, setPeriodValue] = useState<string>(currentMonth);
  const [siteId, setSiteId] = useState<string>(selectedSiteId || 'all');
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const options = useMemo(() => periodOptions(state, granularity), [state, granularity]);
  const period: Period = { granularity, value: periodValue };
  const report = useMemo(() => buildReport(state, period, siteId), [state, granularity, periodValue, siteId]);
  const prevLabel = periodLabel(previousPeriod(period));
  const siteLabel = siteId === 'all' ? 'Tous les sites' : (state.sites.find((s) => s.id === siteId)?.name || siteId);

  const changeGranularity = (g: Granularity) => {
    setGranularity(g);
    setPeriodValue(periodOf(currentMonth, g).value);
  };

  // Trend chart geometry
  const chartMax = niceMax(Math.max(...report.trend.flatMap((m) => [m.recettesAr, m.depensesAr, m.salairesAr]), 0));
  const W = 720, H = 240, PAD_L = 44, PAD_B = 26, PAD_T = 10;
  const plotW = W - PAD_L - 8;
  const plotH = H - PAD_B - PAD_T;
  const slot = plotW / report.trend.length;
  const barW = Math.max(4, Math.min(14, (slot - 10) / 3));
  const y = (v: number) => PAD_T + plotH - (v / chartMax) * plotH;
  const barPath = (x: number, v: number) => {
    const top = y(v);
    const h = PAD_T + plotH - top;
    if (h <= 0) return '';
    const r = Math.min(4, h, barW / 2);
    return `M${x},${PAD_T + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${PAD_T + plotH} Z`;
  };
  const inPeriod = (m: string) => report.months.includes(m);

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono-data text-xs text-slate-500 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">analytics</span>
            Pilotage &amp; Système
          </div>
          <h1 className="font-headline text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Rapports &amp; Statistiques</h1>
          <p className="text-xs text-slate-500">
            {periodLabel(period)} · {siteLabel} — recettes, dépenses, masse salariale et résultat, calculés sur les données enregistrées.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportReportCsv(report, siteLabel, appName)}
            className="px-3.5 py-2 rounded-lg bg-white border border-[#E2E8F0] shadow-sm hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-[#16A34A]">table_view</span>
            Exporter Excel (CSV)
          </button>
          <button
            type="button"
            onClick={() => exportReportPdf(report, siteLabel, appName)}
            className="px-3.5 py-2 rounded-lg bg-[#0F172A] text-white hover:bg-slate-800 shadow-md text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">picture_as_pdf</span>
            Exporter PDF
          </button>
        </div>
      </div>

      {/* Filters: one row above the charts */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200" role="group" aria-label="Type de période">
          {([['mois', 'Mois'], ['trimestre', 'Trimestre'], ['annee', 'Année']] as [Granularity, string][]).map(([g, label]) => (
            <button
              key={g}
              type="button"
              aria-pressed={granularity === g}
              onClick={() => changeGranularity(g)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${granularity === g ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-600 hover:text-[#0F172A]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          aria-label="Période"
          value={periodValue}
          onChange={(e) => setPeriodValue(e.target.value)}
          className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#06B6D4]"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{periodLabel(o)}</option>)}
        </select>
        <select
          aria-label="Site"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-[#06B6D4]"
        >
          <option value="all">Tous les sites</option>
          {state.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-[11px] text-slate-400 ml-auto">Comparaison avec : {prevLabel}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="Recettes encaissées" value={report.recettesAr} previous={report.previous.recettesAr} prevLabel={prevLabel} goodWhenUp />
        <Kpi label="Dépenses approuvées" value={report.depensesAr} previous={report.previous.depensesAr} prevLabel={prevLabel} goodWhenUp={false} />
        <Kpi label="Masse salariale (coût)" value={report.salairesCoutAr} previous={report.previous.salairesCoutAr} prevLabel={prevLabel} goodWhenUp={false} />
        <Kpi label="Résultat net" value={report.resultatAr} previous={report.previous.resultatAr} prevLabel={prevLabel} goodWhenUp emphasis showDifference />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {[
          ['Reçus encaissés', String(report.receiptsCount)],
          ['Ticket moyen', ar(report.ticketMoyenAr)],
          ['Dépenses en attente', ar(report.depensesEnAttenteAr)],
          ['Salaires nets · retenues', `${ar(report.salairesNetAr)} · ${ar(report.retenuesAr)}`]
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-lg border border-[#E2E8F0] px-3 py-2.5">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
            <span className="block mt-0.5 font-mono-data font-bold text-[#0F172A] truncate">{value}</span>
          </div>
        ))}
      </div>

      {/* Trend: 12 months */}
      <Card
        title="Évolution sur 12 mois"
        subtitle={`Recettes, dépenses et salaires en Ariary — jusqu'à ${monthShortLabel(report.months[report.months.length - 1])}. Les mois de la période sont en gras.`}
        right={
          <div className="flex items-center gap-3">
            <ul className="flex flex-wrap gap-3 text-[11px] text-slate-600" aria-label="Légende">
              {SERIES.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              {showTable ? 'Voir le graphique' : 'Voir le tableau'}
            </button>
          </div>
        }
      >
        {showTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="text-left py-2 px-2">Mois</th>
                  {SERIES.map((s) => <th key={s.key} className="text-right py-2 px-2">{s.label}</th>)}
                  <th className="text-right py-2 px-2">Résultat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-data">
                {report.trend.map((m) => (
                  <tr key={m.month} className={inPeriod(m.month) ? 'font-bold bg-cyan-50/40' : ''}>
                    <td className="py-1.5 px-2 font-sans">{monthShortLabel(m.month)}</td>
                    <td className="py-1.5 px-2 text-right">{fmt(m.recettesAr)}</td>
                    <td className="py-1.5 px-2 text-right">{fmt(m.depensesAr)}</td>
                    <td className="py-1.5 px-2 text-right">{fmt(m.salairesAr)}</td>
                    <td className={`py-1.5 px-2 text-right ${m.resultatAr < 0 ? 'text-[#DC2626]' : ''}`}>{fmt(m.resultatAr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Évolution mensuelle des recettes, dépenses et salaires">
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <g key={f}>
                  <line x1={PAD_L} x2={W - 8} y1={y(chartMax * f)} y2={y(chartMax * f)} stroke={f === 0 ? '#CBD5E1' : '#EEF2F6'} strokeWidth={1} />
                  <text x={PAD_L - 6} y={y(chartMax * f) + 3} textAnchor="end" fontSize="10" fill="#64748B">{compact(chartMax * f)}</text>
                </g>
              ))}
              {report.trend.map((m, i) => {
                const x0 = PAD_L + i * slot + (slot - (barW * 3 + 4)) / 2;
                return (
                  <g key={m.month}>
                    {hover === i && <rect x={PAD_L + i * slot + 1} y={PAD_T} width={slot - 2} height={plotH} fill="#F1F5F9" />}
                    {SERIES.map((s, si) => (
                      <path key={s.key} d={barPath(x0 + si * (barW + 2), m[s.key])} fill={s.color} />
                    ))}
                    <text
                      x={PAD_L + i * slot + slot / 2}
                      y={H - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={inPeriod(m.month) ? 700 : 400}
                      fill={inPeriod(m.month) ? '#0F172A' : '#64748B'}
                    >
                      {monthShortLabel(m.month)}
                    </text>
                    {/* Hit target larger than the marks */}
                    <rect
                      x={PAD_L + i * slot}
                      y={0}
                      width={slot}
                      height={H}
                      fill="transparent"
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                    />
                  </g>
                );
              })}
            </svg>
            {hover !== null && (() => {
              const m = report.trend[hover];
              const leftPct = ((PAD_L + hover * slot + slot / 2) / W) * 100;
              return (
                <div
                  className="pointer-events-none absolute top-1 z-10 bg-white border border-[#E2E8F0] shadow-lg rounded-lg px-3 py-2 text-[11px] min-w-[170px]"
                  style={{ left: `${leftPct}%`, transform: `translateX(${leftPct > 60 ? '-105%' : '5%'})` }}
                >
                  <div className="font-bold text-[#0F172A] mb-1">{monthShortLabel(m.month)}</div>
                  {SERIES.map((s) => (
                    <div key={s.key} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />{s.label}
                      </span>
                      <span className="font-mono-data text-[#0F172A]">{fmt(m[s.key])}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 mt-1 pt-1 border-t border-slate-100">
                    <span className="text-slate-600">Résultat</span>
                    <span className={`font-mono-data font-bold ${m.resultatAr < 0 ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}>{fmt(m.resultatAr)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recettes par mode de paiement" subtitle={`${periodLabel(period)} · total ${ar(report.recettesAr)}`}>
          <BarList items={report.byPaymentMethod} total={report.recettesAr} countLabel="reçu" />
        </Card>
        {siteId === 'all' && (
          <Card title="Recettes par site" subtitle={periodLabel(period)}>
            <BarList items={report.bySite} total={report.recettesAr} countLabel="reçu" />
          </Card>
        )}
        <Card title="Recettes par catégorie de membre" subtitle={periodLabel(period)}>
          <BarList items={report.byMemberCategory} total={report.recettesAr} countLabel="reçu" />
        </Card>
        <Card title="Dépenses approuvées par catégorie" subtitle={`${periodLabel(period)} · total ${ar(report.depensesAr)}`}>
          <BarList items={report.expensesByCategory} total={report.depensesAr} countLabel="dépense" />
        </Card>
        <Card title="Masse salariale par type" subtitle={`${report.bulletinsCount} bulletin${report.bulletinsCount > 1 ? 's' : ''} · coût ${ar(report.salairesCoutAr)}`}>
          <BarList items={report.payrollByType} total={report.salairesCoutAr} countLabel="bulletin" empty="Aucun bulletin de paie sur la période." />
        </Card>
        <Card title="Activité de la période" subtitle={periodLabel(period)}>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ['Nouveaux membres', report.activity.newMembers],
              ['Incidents déclarés', report.activity.incidents],
              ['Incidents non résolus', report.activity.incidentsOpen]
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-lg bg-slate-50 border border-slate-200 py-3">
                <div className="font-headline text-2xl font-bold text-[#0F172A]">{v}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
          {report.activity.incidentsBySeverity.length > 0 && (
            <p className="mt-3 text-[11px] text-slate-500">
              Gravité : {report.activity.incidentsBySeverity.map((b) => `${b.label} ${b.count}`).join(' · ')}
            </p>
          )}
        </Card>
      </div>

      {/* Snapshots (situation today) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Impayés"
          subtitle="Situation actuelle (soldes des membres aujourd'hui)"
          right={<span className="font-mono-data text-sm font-bold text-[#DC2626]">{ar(report.unpaid.totalAr)}</span>}
        >
          <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">✓ {report.subscriptions.aJour} abonnements à jour</span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">⏳ {report.subscriptions.procheEcheance} échéance proche</span>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">⚠ {report.subscriptions.enRetard} en retard</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{report.subscriptions.expire} expiré{report.subscriptions.expire > 1 ? 's' : ''}</span>
          </div>
          {report.unpaid.members.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">Aucun impayé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-slate-500 bg-slate-50">
                  <tr><th className="text-left py-2 px-2">Membre</th><th className="text-left py-2 px-2">Site</th><th className="text-right py-2 px-2">Montant dû</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.unpaid.members.map((m) => (
                    <tr key={m.number}>
                      <td className="py-1.5 px-2"><span className="font-semibold text-[#0F172A]">{m.name}</span> <span className="font-mono-data text-[10px] text-slate-400">{m.number}</span></td>
                      <td className="py-1.5 px-2 text-slate-600">{m.site}</td>
                      <td className="py-1.5 px-2 text-right font-mono-data font-bold text-[#DC2626]">{ar(m.balanceAr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-500">Revenu mensuel attendu des abonnements actifs : <strong className="font-mono-data text-[#0F172A]">{ar(report.subscriptions.revenuMensuelAr)}</strong></p>
        </Card>

        <Card title="Occupation des sites" subtitle="Situation actuelle (places occupées / capacité déclarée)">
          <ul className="space-y-4">
            {report.occupancy.map((o) => (
              <li key={o.site}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-semibold text-[#0F172A]">{o.site}</span>
                  <span className="font-mono-data text-[#0F172A]">{(o.rate * 100).toFixed(1).replace('.', ',')} % <span className="text-slate-400">· {o.occupied}/{o.capacity}</span></span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${Math.min(100, o.rate * 100)}%`, backgroundColor: BAR_HUE }} />
                </div>
                <span className="text-[10px] text-slate-400">{o.reserved} réservée{o.reserved > 1 ? 's' : ''} · {o.maintenance} en maintenance</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

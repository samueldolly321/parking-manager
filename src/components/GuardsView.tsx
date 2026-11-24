import React, { useState } from 'react';
import { initialsAvatar } from '../services/avatar';
import { EntityActions } from './EntityActions';
import { PhotoInput } from './PhotoInput';
import { Equipment, GuardPersonnel, Site, GuardDayCode, GUARD_DAY_CODES, User, WeekDayKey } from '../types';
import { updateGuardOrders, updateProfileAvatar, addGuardRecord, updateGuardShiftDays, addGuardLogEntry, NewGuardInput } from '../services/storage';
import { GUARD_STATUS, LOG_TYPES, currentGuardDay, equipmentOf, logTypeLabel, onDutyNow } from '../services/guards';
import { roleCan } from '../services/permissions';
import { notify } from '../services/notify';
import { escapeHtml, printHtmlDocument } from '../services/printHtml';
import { todayInTana } from '../services/dashboardMetrics';

const WEEK_KEYS: WeekDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEK_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const DAY_STYLE: Record<GuardDayCode, string> = {
  GARDE: 'bg-cyan-50 text-cyan-800 border border-cyan-200',
  REPOS: 'bg-slate-100 text-slate-500 border border-slate-200',
  CONGE: 'bg-amber-50 text-amber-800 border border-amber-200',
  ABSENT: 'bg-rose-50 text-rose-700 border border-rose-200'
};

const isDayCode = (v: string): v is GuardDayCode => GUARD_DAY_CODES.some((c) => c.code === v);

/** Current week (Monday → Sunday) in Antananarivo, with its ISO week number. */
function currentWeek() {
  const t = todayInTana();
  const today = new Date(Date.UTC(t.year, t.monthIndex, t.day));
  const offset = (today.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(today.getTime() - offset * 86_400_000);
  const days = WEEK_KEYS.map((key, i) => {
    const d = new Date(monday.getTime() + i * 86_400_000);
    return {
      key,
      short: WEEK_SHORT[i],
      label: `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      isToday: i === offset
    };
  });
  // ISO week: the week containing the year's first Thursday is week 1
  const thursday = new Date(monday.getTime() + 3 * 86_400_000);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const number = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { number, days };
}

const emptyNewGuard = (siteId: string): NewGuardInput => ({
  fullName: '',
  cin: '',
  phoneFlotte: '',
  residenceLot: '',
  recruitmentDate: new Date().toISOString().slice(0, 10),
  title: '',
  grade: 'Agent de sécurité',
  siteId,
  isTeamLeader: false,
  teamName: '',
  teamLeaderId: '',
  status: 'en_poste',
  avatarUrl: undefined,
  shiftDays: { mon: 'GARDE', tue: 'REPOS', wed: 'REPOS', thu: 'GARDE', fri: 'REPOS', sat: 'REPOS', sun: 'GARDE' }
});

interface GuardsViewProps {
  guards: GuardPersonnel[];
  /** Inventory: the equipment entrusted to each guard comes from here */
  equipments: Equipment[];
  currentUser: User;
  sites: Site[];
  selectedSiteId: string;
  /** Text pre-filled in the search field (from the header search) */
  initialSearch?: string;
  /** Record selected on arrival (from the header search) */
  initialSelectedId?: string;
}

export const GuardsView: React.FC<GuardsViewProps> = ({ guards, equipments, currentUser, sites, selectedSiteId, initialSearch, initialSelectedId }) => {
  const canWrite = roleCan(currentUser.role, 'write');
  const [viewMode, setViewMode] = useState<'hierarchie' | 'annuaire' | 'planning'>('hierarchie');
  const [selectedMatricule, setSelectedMatricule] = useState<string>(initialSelectedId || guards[0]?.matricule || 'GRD-2024-001');
  const [filterSite, setFilterSite] = useState<string>(selectedSiteId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch || '');

  // Modal pour donner un ordre de brigade
  const [orderModalTeam, setOrderModalTeam] = useState<{ id: string; name: string; leaderName: string } | null>(null);
  const [newOrderText, setNewOrderText] = useState('');

  // Modal pour modifier photo de profil
  const [photoModalTarget, setPhotoModalTarget] = useState<{ id: string; name: string; currentPhoto: string } | null>(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');


  const filteredGuards = guards.filter((g) => {
    const matchesSite = filterSite === 'all' || g.siteId === filterSite;
    const matchesStatus = filterStatus === 'all' || g.status === filterStatus;
    const matchesQuery =
      g.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.matricule.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.phoneFlotte.includes(searchQuery) ||
      g.teamName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSite && matchesStatus && matchesQuery;
  });

  const selectedAgent = guards.find((g) => g.matricule === selectedMatricule) || filteredGuards[0] || guards[0];

  // Figures of the site chosen in the filter
  const siteGuards = guards.filter((g) => filterSite === 'all' || g.siteId === filterSite);
  const guardDay = currentGuardDay();
  const onDuty = onDutyNow(siteGuards);
  const filtering = searchQuery.trim() !== '' || filterStatus !== 'all';
  const matching = new Set(filteredGuards.map((g) => g.id));

  // Regroupement par équipe/brigade (a team is shown when one of its members matches the search / status)
  const teamsMap = new Map<string, { leader?: GuardPersonnel; subordinates: GuardPersonnel[]; siteId: string; teamName: string }>();
  const teamsWithMatch = new Set(filteredGuards.map((g) => g.teamId || 'autre'));

  siteGuards.forEach((guard) => {
    const tId = guard.teamId || 'autre';
    if (!teamsWithMatch.has(tId)) return;
    if (!guard.isTeamLeader && filtering && !matching.has(guard.id)) return;
    if (!teamsMap.has(tId)) {
      teamsMap.set(tId, { subordinates: [], siteId: guard.siteId, teamName: guard.teamName });
    }
    const team = teamsMap.get(tId)!;
    if (guard.isTeamLeader) {
      team.leader = guard;
    } else {
      team.subordinates.push(guard);
    }
  });

  const handleEmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderModalTeam || !newOrderText.trim()) return;
    updateGuardOrders(orderModalTeam.id, newOrderText.trim());
    setNewOrderText('');
    setOrderModalTeam(null);
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoModalTarget || !customPhotoUrl.trim()) return;
    updateProfileAvatar('guard', photoModalTarget.id, customPhotoUrl.trim());
    setCustomPhotoUrl('');
    setPhotoModalTarget(null);
  };

  // ---------- Journal de faction ----------
  const [logForm, setLogForm] = useState<{ type: string; title: string; notes: string }>({ type: 'ronde', title: '', notes: '' });
  const [logSaving, setLogSaving] = useState(false);

  // ---------- Planning des gardes 24h (modifiable) ----------
  const week = currentWeek();
  const [planningDraft, setPlanningDraft] = useState<Record<string, GuardPersonnel['shiftDays']> | null>(null);
  const startPlanningEdit = () =>
    setPlanningDraft(Object.fromEntries(guards.map((g) => [g.id, { ...g.shiftDays }])));
  const setDraftDay = (guardId: string, day: WeekDayKey, code: GuardDayCode) =>
    setPlanningDraft((d) => d && { ...d, [guardId]: { ...d[guardId], [day]: code } });
  const changedGuards = planningDraft
    ? guards.filter((g) => WEEK_KEYS.some((k) => planningDraft[g.id]?.[k] !== g.shiftDays[k]))
    : [];
  const changedCount = changedGuards.length;
  const savePlanning = () => {
    if (!planningDraft) return;
    updateGuardShiftDays(changedGuards.map((g) => ({ id: g.id, shiftDays: planningDraft[g.id] })));
    setPlanningDraft(null);
  };
  /** Printable duty roster of the week (agents shown by the filters). */
  const printRoster = () => {
    const siteLabel = filterSite === 'all' ? 'Tous les sites' : sites.find((x) => x.id === filterSite)?.name || filterSite;
    const short = (code: string) => GUARD_DAY_CODES.find((c) => c.code === code)?.short || code || '—';
    const COLORS: Record<string, string> = { GARDE: '#CFFAFE', CONGE: '#FEF3C7', ABSENT: '#FFE4E6', REPOS: '#F1F5F9' };
    const head = week.days.map((d) => `<th>${d.short}<br><small>${d.label}</small></th>`).join('');
    const rows = filteredGuards
      .map((g) => {
        const cells = WEEK_KEYS.map((k) => {
          const code = g.shiftDays?.[k] || 'REPOS';
          return `<td style="background:${COLORS[code] || '#fff'}">${escapeHtml(short(code))}</td>`;
        }).join('');
        const count = WEEK_KEYS.filter((k) => g.shiftDays?.[k] === 'GARDE').length;
        return `<tr><td class="name"><b>${escapeHtml(g.fullName)}</b>${g.isTeamLeader ? ' (chef)' : ''}<br><small>${escapeHtml(g.matricule)} · ${escapeHtml(g.teamName)}</small></td>${cells}<td><b>${count}</b></td><td class="sign"></td></tr>`;
      })
      .join('');
    const coverage = week.days
      .map((d) => `<td>${filteredGuards.filter((g) => g.shiftDays?.[d.key] === 'GARDE').length}</td>`)
      .join('');
    printHtmlDocument(
      `Tableau de garde S${week.number}`,
      `<style>
        h1{font-size:16px;margin:0 0 2px} p{margin:0 0 8px;color:#475569}
        table{width:100%;border-collapse:collapse} th,td{border:1px solid #94A3B8;padding:4px 5px;text-align:center}
        th{background:#0F172A;color:#fff;font-size:10px} td.name{text-align:left} td.sign{width:70px}
        tfoot td{font-weight:bold;background:#F8FAFC} small{color:#64748B;font-weight:normal}
      </style>
      <h1>Tableau de garde — semaine S${week.number} (${week.days[0].label} → ${week.days[6].label})</h1>
      <p>${escapeHtml(siteLabel)} · Garde de 24 h : de 06h00 le jour indiqué à 06h00 le lendemain · ${filteredGuards.length} agent(s)</p>
      <table><thead><tr><th style="text-align:left">Agent / brigade</th>${head}<th>Gardes</th><th>Émargement</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="10">Aucun agent</td></tr>'}</tbody>
      <tfoot><tr><td style="text-align:left">De garde</td>${coverage}<td></td><td></td></tr></tfoot></table>
      <p style="margin-top:10px">Légende : ${GUARD_DAY_CODES.map((c) => `${escapeHtml(c.short)} = ${escapeHtml(c.label)}`).join(' · ')}</p>`
    );
  };

  const hasLegacyCodes = filteredGuards.some((g) => WEEK_KEYS.some((k) => !isDayCode(g.shiftDays[k] || 'REPOS')));

  // ---------- Nouveau personnel ----------
  const defaultSite = (selectedSiteId && selectedSiteId !== 'all' ? selectedSiteId : sites[0]?.id) || '';
  const [showNewModal, setShowNewModal] = useState(false);
  const [nf, setNf] = useState<NewGuardInput>(() => emptyNewGuard(defaultSite));
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const leaders = guards.filter((g) => g.isTeamLeader);
  const leadersForSite = leaders.filter((l) => l.siteId === nf.siteId);
  const otherLeaders = leaders.filter((l) => l.siteId !== nf.siteId);
  const knownPosts = Array.from(new Set(guards.map((g) => g.title))).sort();

  const openNewModal = () => {
    setNf(emptyNewGuard(defaultSite));
    setNewError(null);
    setShowNewModal(true);
  };
  const closeNewModal = () => {
    if (newSaving) return;
    setShowNewModal(false);
  };
  const submitNewGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nf.isTeamLeader && !nf.teamLeaderId) {
      setNewError('Choisissez le chef de brigade de ce gardien.');
      return;
    }
    setNewSaving(true);
    setNewError(null);
    try {
      const [y, m, d] = nf.recruitmentDate.split('-');
      const created = await addGuardRecord({
        ...nf,
        recruitmentDate: y && m && d ? `${d}/${m}/${y}` : nf.recruitmentDate,
        teamName: nf.isTeamLeader ? (nf.teamName?.trim() || undefined) : undefined,
        teamLeaderId: nf.isTeamLeader ? undefined : nf.teamLeaderId
      });
      setShowNewModal(false);
      setSelectedMatricule(created.matricule);
      setFilterSite('all');
      setViewMode('hierarchie');
    } catch (err) {
      setNewError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setNewSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Header Strip */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono-data text-xs text-slate-500 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">security</span>
            Organisation des Brigades &amp; Commandement
          </div>
          <h1 className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
            Hiérarchie du Personnel &amp; Gardiens
          </h1>
          <p className="text-xs text-slate-500 max-w-3xl">
            Organisation structurée par groupe : <strong>1 Chef de Brigade</strong> commandant <strong>2 à 3 gardiens subordonnés</strong> aux ordres directs, ordres de service du jour et profils avec photos d'identité.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View switcher */}
          <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl border border-slate-200 max-w-full">
            <button
              onClick={() => setViewMode('hierarchie')}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'hierarchie' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-cyan-600">account_tree</span>
              <span>Brigades &amp; Hiérarchie</span>
            </button>
            <button
              onClick={() => setViewMode('annuaire')}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'annuaire' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-cyan-600">badge</span>
              <span>Fiches Personnelles</span>
            </button>
            <button
              onClick={() => setViewMode('planning')}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'planning' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-cyan-600">calendar_month</span>
              <span>Planning des gardes</span>
            </button>
          </div>

          <button
            onClick={openNewModal}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] text-white shadow-md hover:bg-slate-800 text-xs font-bold"
          >
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">person_add</span>
            <span>+ Nouveau personnel</span>
          </button>

          <button
            onClick={printRoster}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#0F172A] border border-[#E2E8F0] shadow-sm hover:bg-slate-50 text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Imprimer Tableau de Garde</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E2E8F0] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Brigades Opérationnelles</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-data font-bold bg-cyan-100 text-[#06B6D4]">
              {teamsMap.size} groupe{teamsMap.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="font-headline text-3xl font-bold text-[#0F172A]">{teamsMap.size}</span>
            <span className="font-mono-data text-xs text-slate-500">équipes</span>
          </div>
          <p className="text-xs text-slate-400">{filterSite === 'all' ? 'Tous les sites' : sites.find((x) => x.id === filterSite)?.name}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E2E8F0] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Chefs de Poste / Équipe</span>
          </div>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="font-headline text-3xl font-bold text-[#0F172A]">
              {siteGuards.filter((g) => g.isTeamLeader).length}
            </span>
            <span className="font-mono-data text-xs text-slate-500">commandants</span>
          </div>
          <p className="text-xs text-slate-400">Responsables de brigade</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E2E8F0] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Gardiens Subordonnés</span>
          </div>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="font-headline text-3xl font-bold text-[#0F172A]">
              {siteGuards.filter((g) => !g.isTeamLeader).length}
            </span>
            <span className="font-mono-data text-xs text-slate-500">agents de faction</span>
          </div>
          <p className="text-xs text-slate-400">
            {siteGuards.filter((g) => g.status === 'en_conge').length} en congé · {siteGuards.filter((g) => g.status === 'absent').length} absent(s)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E2E8F0] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">De garde aujourd’hui</span>
          </div>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="font-headline text-3xl font-bold text-[#16A34A]">
              {onDuty.length}
            </span>
            <span className="font-mono-data text-xs text-slate-500">/ {siteGuards.length}</span>
          </div>
          <p className="text-xs text-slate-400 truncate" title={onDuty.map((g) => g.fullName).join(', ')}>
            {onDuty.length ? `Garde du ${guardDay.date} (06h → 06h)` : `Personne au planning le ${guardDay.date}`}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher gardien, chef, matricule..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">Tous les sites</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="en_poste">En poste</option>
            <option value="de_repos">De repos</option>
            <option value="en_conge">En congé</option>
            <option value="absent">Absent</option>
          </select>
        </div>
      </div>

      {/* VIEW MODE 1: HIÉRARCHIE & BRIGADES (Chef + 2 ou 3 subordonnés aux ordres) */}
      {viewMode === 'hierarchie' && (
        <div className="space-y-8">
          {Array.from(teamsMap.entries()).map(([teamId, group]) => {
            const site = sites.find(s => s.id === group.siteId);
            const leader = group.leader;
            const subordinates = group.subordinates;

            return (
              <div
                key={teamId}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* Team Header Banner */}
                <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <span className="material-symbols-outlined text-[22px]">shield</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold font-title text-base text-white">{group.teamName}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          {subordinates.length + (leader ? 1 : 0)} Effectifs
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-[14px] text-cyan-400">domain</span>
                        {site ? site.name : group.siteId} • {leader ? '1 chef de brigade' : 'sans chef'} + {subordinates.length} gardien{subordinates.length > 1 ? 's' : ''}{filtering ? ' (filtrés)' : ''}
                      </p>
                    </div>
                  </div>

                  {leader && (
                    <button
                      onClick={() => setOrderModalTeam({ id: teamId, name: group.teamName, leaderName: leader.fullName })}
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">campaign</span>
                      <span>Émettre un ordre du jour</span>
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  {/* CHEF DE GROUPE (LEADER) */}
                  {leader ? (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-400/40 relative">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                        {/* Avatar & Identité */}
                        <div className="flex items-center gap-4">
                          <div className="relative group">
                            <img
                              src={leader.avatarUrl || initialsAvatar(leader.fullName)}
                              data-zoom={leader.avatarUrl ? 'true' : undefined}
                              alt={leader.fullName}
                              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                            />
                            <button
                              onClick={() => setPhotoModalTarget({ id: leader.id, name: leader.fullName, currentPhoto: leader.avatarUrl || '' })}
                              className="absolute inset-0 bg-black/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity"
                            >
                              Changer
                            </button>
                            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                              <span className="material-symbols-outlined text-[14px] font-bold">military_tech</span>
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                                CHEF DE POSTE / GROUPE
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-500">{leader.matricule}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${GUARD_STATUS[leader.status]?.cls || ''}`}>
                                {GUARD_STATUS[leader.status]?.label || leader.status}
                              </span>
                            </div>
                            <h4 className="font-bold text-lg text-slate-900 mt-0.5">{leader.fullName}</h4>
                            <p className="text-xs text-amber-900 font-semibold">{leader.title} • {leader.grade}</p>
                          </div>
                        </div>

                        {/* Coordonnées & Flotte */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Téléphone Flotte</span>
                            <span className="font-mono font-bold text-slate-900">{leader.phoneFlotte}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Horaires de garde</span>
                            <span className="font-mono font-semibold text-slate-900">24h · 06h → 06h (J+1)</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Badge RFID</span>
                            <span className="font-mono font-semibold text-cyan-700">{leader.badgeRfid}</span>
                          </div>
                        </div>
                      </div>

                      {/* Consignes transmises par le chef */}
                      {leader.ordersOfTheDay && leader.ordersOfTheDay.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-amber-200/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-amber-600">assignment</span>
                              Ordres de Service Actifs émis par le Chef :
                            </span>
                            <span className="text-[11px] text-slate-500 italic">Transmis aux {subordinates.length} subordonnés</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {leader.ordersOfTheDay.slice(0, 3).map((ord, i) => (
                              <div key={i} className="p-2.5 rounded-xl bg-white/90 border border-amber-200 text-xs text-slate-800 flex items-start gap-2 shadow-xs">
                                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                <span className="leading-snug">{ord}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                      Aucun Chef de Groupe affecté à cette brigade. Veuillez nommer un chef de poste.
                    </div>
                  )}

                  {/* LIEN HIÉRARCHIQUE VISUEL */}
                  <div className="flex items-center gap-3 px-4">
                    <div className="h-0.5 bg-slate-200 flex-1"></div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-cyan-600">arrow_downward</span>
                      Gardiens subordonnés aux ordres de {leader ? leader.fullName : 'leur Chef'} ({subordinates.length})
                    </span>
                    <div className="h-0.5 bg-slate-200 flex-1"></div>
                  </div>

                  {/* 2 À 3 GARDIENS SUBORDONNÉS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subordinates.map((sub, idx) => (
                      <div
                        key={sub.id}
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-cyan-300 transition-all space-y-4 shadow-xs group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={sub.avatarUrl || initialsAvatar(sub.fullName)}
                                data-zoom={sub.avatarUrl ? 'true' : undefined}
                                alt={sub.fullName}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                              />
                              <button
                                onClick={() => setPhotoModalTarget({ id: sub.id, name: sub.fullName, currentPhoto: sub.avatarUrl || '' })}
                                className="absolute inset-0 bg-black/60 text-white rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] font-bold transition-opacity"
                              >
                                Photo
                              </button>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-slate-400">{sub.matricule}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-[10px] font-bold text-cyan-700">Gardien #{idx + 1}</span>
                              </div>
                              <h5 className="font-bold text-sm text-slate-900 line-clamp-1">{sub.fullName}</h5>
                              <p className="text-[11px] text-slate-500 line-clamp-1">{sub.title}</p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${GUARD_STATUS[sub.status]?.cls || ''}`}>
                            {GUARD_STATUS[sub.status]?.label || sub.status}
                          </span>
                        </div>

                        {/* Ordre hiérarchique mention */}
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Commandement :</span>
                            <span className="font-bold text-slate-800">Aux ordres du Chef</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Téléphone flotte :</span>
                            <span className="font-mono font-medium text-slate-800">{sub.phoneFlotte}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>CIN :</span>
                            <span className="font-mono text-slate-700">{sub.cin}</span>
                          </div>
                        </div>

                        {/* Matériel confié (inventaire) */}
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Matériel confié :</span>
                          <div className="flex flex-wrap gap-1">
                            {equipmentOf(equipments, sub).length === 0 ? (
                              <span className="text-[10px] text-slate-400">Aucun</span>
                            ) : (
                              equipmentOf(equipments, sub).map((eq) => (
                                <span key={eq.id} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                                  {eq.designation}{eq.quantity > 1 ? ` ×${eq.quantity}` : ''}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-mono">Garde 24h · 06h → 06h</span>
                          <button
                            onClick={() => { setSelectedMatricule(sub.matricule); setViewMode('annuaire'); }}
                            className="text-cyan-600 hover:text-cyan-700 font-bold"
                          >
                            Voir Fiche Dossier →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: ANNUAIRE & FICHE INDIVIDUELLE */}
      {viewMode === 'annuaire' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Liste latérale */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
            <h3 className="font-bold font-title text-sm text-slate-900 pb-2 border-b border-slate-100">
              Effectif Complet ({filteredGuards.length} agents)
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredGuards.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setSelectedMatricule(g.matricule)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedAgent.matricule === g.matricule
                      ? 'border-cyan-500 bg-cyan-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={g.avatarUrl || initialsAvatar(g.fullName)}
                      data-zoom={g.avatarUrl ? 'true' : undefined}
                      alt={g.fullName}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{g.fullName}</span>
                        {g.isTeamLeader && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">CHEF</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{g.title}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${GUARD_STATUS[g.status]?.cls || ''}`}>
                    {GUARD_STATUS[g.status]?.label || g.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fiche détaillée de l'agent sélectionné */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <img
                    src={selectedAgent.avatarUrl || initialsAvatar(selectedAgent.fullName)}
                    data-zoom={selectedAgent.avatarUrl ? 'true' : undefined}
                    alt={selectedAgent.fullName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-500 shadow-md"
                  />
                  <button
                    onClick={() => setPhotoModalTarget({ id: selectedAgent.id, name: selectedAgent.fullName, currentPhoto: selectedAgent.avatarUrl || '' })}
                    className="absolute inset-0 bg-black/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold transition-opacity"
                  >
                    Changer Photo
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-600">{selectedAgent.matricule}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-slate-500">{selectedAgent.grade}</span>
                    {selectedAgent.isTeamLeader && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                        CHEF DE BRIGADE
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold font-title text-slate-900 mt-0.5">{selectedAgent.fullName}</h2>
                  <p className="text-xs text-slate-500 mt-1">{selectedAgent.title} • {selectedAgent.teamName}</p>
                  <div className="mt-2"><EntityActions collection="guards" record={selectedAgent} label={selectedAgent.fullName} /></div>
                </div>
              </div>

              <button
                onClick={() => setPhotoModalTarget({ id: selectedAgent.id, name: selectedAgent.fullName, currentPhoto: selectedAgent.avatarUrl || '' })}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 self-start"
              >
                <span className="material-symbols-outlined text-[16px] text-cyan-600">photo_camera</span>
                <span>Modifier Photo</span>
              </button>
            </div>

            {/* Détails administratifs & hiérarchiques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rattachement Hiérarchique</span>
                <p className="font-bold text-slate-900 text-sm">{selectedAgent.teamName}</p>
                <p className="text-slate-600">
                  {selectedAgent.isTeamLeader
                    ? 'Commandant d\'équipe responsable des ordres du jour'
                    : `Placé directement sous les ordres de : ${selectedAgent.teamLeaderName || 'Chef de poste'}`}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">État Civil &amp; CIN</span>
                <p className="font-bold text-slate-900">CIN : <span className="font-mono">{selectedAgent.cin}</span></p>
                <p className="text-slate-600">Résidence : {selectedAgent.residenceLot}</p>
                <p className="text-slate-500 text-[11px]">Recruté le : {selectedAgent.recruitmentDate}</p>
              </div>
            </div>

            {/* Matériels assignés */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Matériel confié (inventaire)</h4>
              {equipmentOf(equipments, selectedAgent).length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Aucun matériel confié. Dans « Matériels &amp; équipements », choisissez la catégorie « Confiés aux gardiens » et indiquez
                  « {selectedAgent.fullName} » comme responsable.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {equipmentOf(equipments, selectedAgent).map((eq) => (
                    <div key={eq.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-cyan-700 text-[11px] block">{eq.inventoryCode}</span>
                        <span className="font-medium text-slate-800">{eq.designation}{eq.quantity > 1 ? ` ×${eq.quantity}` : ''}</span>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold ${eq.status === 'operationnel' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {eq.status === 'operationnel' ? 'Opérationnel' : 'À réparer'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Journal de faction */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Journal de faction</h4>
                <span className="text-[10px] text-slate-400">{selectedAgent.todayLog?.length || 0} entrée(s)</span>
              </div>
              {canWrite && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setLogSaving(true);
                    try {
                      await addGuardLogEntry(selectedAgent.id, logForm);
                      setLogForm({ type: logForm.type, title: '', notes: '' });
                      notify('Entrée ajoutée au journal.', 'success');
                    } catch (err) {
                      notify(err instanceof Error ? err.message : 'Enregistrement impossible.', 'error');
                    } finally {
                      setLogSaving(false);
                    }
                  }}
                  className="p-3 mb-3 rounded-xl border border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs"
                >
                  <select value={logForm.type} onChange={(e) => setLogForm({ ...logForm, type: e.target.value })} className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 bg-white">
                    {LOG_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <input maxLength={150} value={logForm.title} onChange={(e) => setLogForm({ ...logForm, title: e.target.value })} placeholder="Objet (facultatif)" className="sm:col-span-4 px-2 py-1.5 rounded-lg border border-slate-300 bg-white" />
                  <input maxLength={500} value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} placeholder="Observations" className="sm:col-span-5 px-2 py-1.5 rounded-lg border border-slate-300 bg-white" />
                  <button type="submit" disabled={logSaving} className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-50">
                    {logSaving ? '…' : 'Ajouter'}
                  </button>
                  <p className="sm:col-span-6 text-[10px] text-slate-400">La date et l’heure sont enregistrées automatiquement, avec votre nom.</p>
                </form>
              )}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedAgent.todayLog && selectedAgent.todayLog.length > 0 ? (
                  selectedAgent.todayLog.map((log, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-cyan-600 font-semibold shrink-0">{log.time.includes('/') ? log.time : `${log.time} (date non notée)`}</span>
                          <span>•</span>
                          <span className="truncate">{log.title}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white text-slate-600 text-[10px] border border-slate-200 shrink-0">{logTypeLabel(log.type)}</span>
                      </div>
                      {log.notes && <p className="text-slate-600 text-[11px] leading-relaxed">{log.notes}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Aucune entrée dans le journal de faction.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: PLANNING DES GARDES 24H (modifiable) */}
      {viewMode === 'planning' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold font-title text-base text-slate-900">Grille de Rotation Hebdomadaire — Gardes 24h</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Une garde commence à <strong>06h00 le jour indiqué</strong> et se termine à <strong>06h00 le lendemain</strong>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                Semaine S{week.number} · {week.days[0].label} → {week.days[6].label}
              </span>
              {planningDraft ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPlanningDraft(null)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={savePlanning}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Enregistrer le planning{changedCount > 0 ? ` (${changedCount})` : ''}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startPlanningEdit}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                  Modifier le planning
                </button>
              )}
            </div>
          </div>

          {/* Légende */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {GUARD_DAY_CODES.map((c) => (
              <span key={c.code} className={`px-2 py-0.5 rounded font-mono font-bold ${DAY_STYLE[c.code]}`}>{c.label}</span>
            ))}
            {planningDraft && <span className="text-slate-500">— Cliquez sur une case pour changer, ou choisissez dans la liste.</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4 min-w-[180px]">Agent / Brigade</th>
                  {week.days.map((d) => (
                    <th key={d.key} className={`py-3 px-2 text-center min-w-[92px] ${d.isToday ? 'text-cyan-700' : ''}`}>
                      <span className="block">{d.short}</span>
                      <span className="block font-mono font-normal normal-case text-[10px] text-slate-400">{d.label}</span>
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center">Gardes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGuards.length === 0 && (
                  <tr><td colSpan={9} className="py-10 text-center text-slate-400">Aucun agent pour ce filtre.</td></tr>
                )}
                {filteredGuards.map((g) => {
                  const days = planningDraft?.[g.id] || g.shiftDays;
                  const guardCount = WEEK_KEYS.filter((k) => days[k] === 'GARDE').length;
                  return (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={g.avatarUrl || initialsAvatar(g.fullName)}
                            data-zoom={g.avatarUrl ? 'true' : undefined}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <span className="truncate">{g.fullName}</span>
                              {g.isTeamLeader && <span className="text-[9px] px-1 rounded bg-amber-500 text-slate-950 font-bold">CHEF</span>}
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate">{g.teamName.split('(')[0]}</span>
                          </div>
                        </div>
                      </td>
                      {WEEK_KEYS.map((day) => {
                        const raw = days[day] || 'REPOS';
                        const known = isDayCode(raw);
                        return (
                          <td key={day} className="py-2 px-1.5 text-center">
                            {planningDraft ? (
                              <select
                                value={known ? raw : ''}
                                onChange={(e) => setDraftDay(g.id, day, e.target.value as GuardDayCode)}
                                aria-label={`${g.fullName} — ${week.days.find((d) => d.key === day)?.short}`}
                                className={`w-full px-1 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer ${known ? DAY_STYLE[raw as GuardDayCode] : 'bg-white text-slate-400 border-dashed border-slate-300'}`}
                              >
                                {!known && <option value="" disabled>{raw}</option>}
                                {GUARD_DAY_CODES.map((c) => (
                                  <option key={c.code} value={c.code}>{c.short}</option>
                                ))}
                              </select>
                            ) : known ? (
                              <span className={`inline-block px-2 py-1 rounded text-[10px] font-mono font-bold ${DAY_STYLE[raw as GuardDayCode]}`}>
                                {GUARD_DAY_CODES.find((c) => c.code === raw)!.short}
                              </span>
                            ) : (
                              <span
                                title="Ancien horaire (3×8). Cliquez sur « Modifier le planning » pour le remplacer."
                                className="inline-block px-2 py-1 rounded text-[10px] font-mono text-slate-400 border border-dashed border-slate-300"
                              >
                                {raw}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-700">{guardCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Couverture : qui est de garde chaque jour */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {week.days.map((d) => {
              const onDuty = filteredGuards.filter((g) => (planningDraft?.[g.id] || g.shiftDays)[d.key] === 'GARDE');
              return (
                <div key={d.key} className={`p-2.5 rounded-xl border text-[11px] ${onDuty.length === 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="font-bold text-slate-800">{d.short} {d.label}</div>
                  <div className={onDuty.length === 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'}>
                    {onDuty.length === 0 ? 'Personne de garde' : `${onDuty.length} de garde`}
                  </div>
                </div>
              );
            })}
          </div>
          {hasLegacyCodes && !planningDraft && (
            <p className="text-[11px] text-slate-500">
              Les cases en pointillés contiennent d'anciens horaires (3×8). Cliquez sur « Modifier le planning » pour les remplacer par des gardes 24h.
            </p>
          )}
        </div>
      )}

      {/* MODAL: DIFFUSER UN ORDRE DU JOUR DE BRIGADE */}
      {orderModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[22px]">campaign</span>
                <h3 className="text-base font-bold font-title text-slate-900">
                  Ordre de Service — {orderModalTeam.name}
                </h3>
              </div>
              <button onClick={() => setOrderModalTeam(null)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Émis sous l'autorité du Chef de Brigade <strong>{orderModalTeam.leaderName}</strong>. Cet ordre sera instantanément diffusé aux gardiens subordonnés de l'équipe et archivé dans le registre de sûreté.
            </p>

            <form onSubmit={handleEmitOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Consigne opérationnelle ou ordre du jour :
                </label>
                <textarea
                  rows={3}
                  required
                  value={newOrderText}
                  onChange={(e) => setNewOrderText(e.target.value)}
                  placeholder="ex: Renforcement du filtrage voie Sortie 2, vérification systématique de l'extincteur poste vigie..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOrderModalTeam(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm"
                >
                  Diffuser l'ordre à la brigade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOUVEAU PERSONNEL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="new-guard-title" className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 z-10">
              <h3 id="new-guard-title" className="text-base font-bold font-title text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-600 text-[22px]">person_add</span>
                Nouveau personnel
              </h3>
              <button type="button" onClick={closeNewModal} aria-label="Fermer" className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <form onSubmit={submitNewGuard} className="px-5 sm:px-6 py-5 space-y-5 text-xs">
              {/* Rôle dans la brigade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { leader: true, title: 'Chef de brigade', desc: 'Commande une nouvelle brigade', icon: 'military_tech' },
                  { leader: false, title: 'Gardien', desc: 'Placé sous les ordres d’un chef', icon: 'shield_person' }
                ] as const).map((opt) => (
                  <button
                    key={opt.title}
                    type="button"
                    onClick={() => setNf((f) => ({ ...f, isTeamLeader: opt.leader }))}
                    aria-pressed={nf.isTeamLeader === opt.leader}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      nf.isTeamLeader === opt.leader ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[22px] ${opt.leader ? 'text-amber-500' : 'text-cyan-600'}`}>{opt.icon}</span>
                    <span>
                      <span className="block font-bold text-slate-900">{opt.title}</span>
                      <span className="block text-[11px] text-slate-500">{opt.desc}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Identité */}
              <fieldset className="space-y-3">
                <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Identité</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block font-semibold text-slate-700 mb-1">Nom complet *</span>
                    <input required value={nf.fullName} onChange={(e) => setNf((f) => ({ ...f, fullName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                  </label>
                  <label className="block">
                    <span className="block font-semibold text-slate-700 mb-1">CIN *</span>
                    <input required value={nf.cin} onChange={(e) => setNf((f) => ({ ...f, cin: e.target.value }))} placeholder="101 000 000 000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                  </label>
                  <label className="block">
                    <span className="block font-semibold text-slate-700 mb-1">Téléphone *</span>
                    <input required type="tel" value={nf.phoneFlotte} onChange={(e) => setNf((f) => ({ ...f, phoneFlotte: e.target.value }))} placeholder="+261 34 00 000 00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                  </label>
                  <label className="block">
                    <span className="block font-semibold text-slate-700 mb-1">Date de recrutement</span>
                    <input type="date" value={nf.recruitmentDate} onChange={(e) => setNf((f) => ({ ...f, recruitmentDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="block font-semibold text-slate-700 mb-1">Adresse / Lot de résidence</span>
                    <input value={nf.residenceLot} onChange={(e) => setNf((f) => ({ ...f, residenceLot: e.target.value }))} placeholder="Lot IVB 42, Isoraka"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                  </label>
                </div>
                <div>
                  <span className="block font-semibold text-slate-700 mb-1">Photo d'identité</span>
                  <PhotoInput value={nf.avatarUrl} onChange={(v) => setNf((f) => ({ ...f, avatarUrl: v }))} fileNameHint={nf.fullName || 'personnel'} />
                </div>
              </fieldset>

              {/* Affectation */}
              <fieldset className="space-y-3">
                <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Affectation</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block font-semibold text-slate-700 mb-1">Site *</span>
                    <select required value={nf.siteId} onChange={(e) => setNf((f) => ({ ...f, siteId: e.target.value, teamLeaderId: '' }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-cyan-500">
                      {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block font-semibold text-slate-700 mb-1">Poste occupé *</span>
                    <input required list="guard-posts" value={nf.title} onChange={(e) => setNf((f) => ({ ...f, title: e.target.value }))}
                      placeholder={nf.isTeamLeader ? 'Chef de Poste Nord' : 'Gardien Barrière B1'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                    <datalist id="guard-posts">
                      {knownPosts.map((p) => <option key={p} value={p} />)}
                    </datalist>
                  </label>
                  <label className="block">
                    <span className="block font-semibold text-slate-700 mb-1">Grade</span>
                    <select value={nf.grade} onChange={(e) => setNf((f) => ({ ...f, grade: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-cyan-500">
                      {['Agent de sécurité', 'Assermenté', 'Stagiaire', 'Vidéosurveillance', 'Agent de caisse'].map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block font-semibold text-slate-700 mb-1">Statut</span>
                    <select value={nf.status} onChange={(e) => setNf((f) => ({ ...f, status: e.target.value as GuardPersonnel['status'] }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-cyan-500">
                      <option value="en_poste">En poste</option>
                      <option value="de_repos">De repos</option>
                      <option value="en_conge">En congé</option>
                    </select>
                  </label>

                  {nf.isTeamLeader ? (
                    <label className="block sm:col-span-2">
                      <span className="block font-semibold text-slate-700 mb-1">Nom de la nouvelle brigade</span>
                      <input value={nf.teamName} onChange={(e) => setNf((f) => ({ ...f, teamName: e.target.value }))}
                        placeholder={`Brigade ${nf.fullName || '…'} - ${sites.find((s) => s.id === nf.siteId)?.name.replace(/^Site \d+\s*-\s*/, '') || ''}`}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                    </label>
                  ) : (
                    <label className="block sm:col-span-2">
                      <span className="block font-semibold text-slate-700 mb-1">Chef de brigade (sous les ordres de) *</span>
                      <select required value={nf.teamLeaderId} onChange={(e) => setNf((f) => ({ ...f, teamLeaderId: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-cyan-500">
                        <option value="" disabled>Choisir le chef…</option>
                        {leadersForSite.length > 0 && (
                          <optgroup label="Chefs de ce site">
                            {leadersForSite.map((l) => <option key={l.id} value={l.id}>{l.fullName} — {l.teamName.split('(')[0]}</option>)}
                          </optgroup>
                        )}
                        {otherLeaders.length > 0 && (
                          <optgroup label="Chefs des autres sites">
                            {otherLeaders.map((l) => <option key={l.id} value={l.id}>{l.fullName} — {l.teamName.split('(')[0]}</option>)}
                          </optgroup>
                        )}
                      </select>
                      {leaders.length === 0 && (
                        <span className="block mt-1 text-[11px] text-amber-700">Aucun chef de brigade : créez d'abord un chef.</span>
                      )}
                    </label>
                  )}
                </div>
              </fieldset>

              {/* Jours de garde */}
              <fieldset>
                <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Jours de garde (24h, 06h → 06h J+1)</legend>
                <div className="flex flex-wrap gap-1.5">
                  {week.days.map((d) => {
                    const on = nf.shiftDays[d.key] === 'GARDE';
                    return (
                      <button
                        key={d.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setNf((f) => ({ ...f, shiftDays: { ...f.shiftDays, [d.key]: on ? 'REPOS' : 'GARDE' } }))}
                        className={`px-3 py-1.5 rounded-lg border font-bold ${on ? 'bg-cyan-500 border-cyan-500 text-slate-950' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">Modifiable ensuite dans l'onglet « Planning des gardes ».</p>
              </fieldset>

              {newError && <p role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[#DC2626]">{newError}</p>}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onClick={closeNewModal} disabled={newSaving}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 disabled:opacity-50">
                  Annuler
                </button>
                <button type="submit" disabled={newSaving || (!nf.isTeamLeader && !nf.teamLeaderId)}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {newSaving ? 'Enregistrement…' : nf.isTeamLeader ? 'Créer le chef et sa brigade' : 'Ajouter le gardien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGER LA PHOTO DE PROFIL D'UN PERSONNEL */}
      {photoModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-600 text-[20px]">photo_camera</span>
                <h3 className="text-base font-bold font-title text-slate-900">
                  Photo de profil : {photoModalTarget.name}
                </h3>
              </div>
              <button onClick={() => { setPhotoModalTarget(null); setCustomPhotoUrl(''); }} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="flex items-center justify-center py-2">
              <img
                src={customPhotoUrl || photoModalTarget.currentPhoto || initialsAvatar(photoModalTarget.name)}
                alt="Aperçu"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-cyan-500 shadow-md"
              />
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1">
                  Depuis le PC ou l'appareil photo :
                </span>
                <PhotoInput
                  value={customPhotoUrl.startsWith('data:') ? customPhotoUrl : undefined}
                  onChange={(v) => setCustomPhotoUrl(v || '')}
                  fileNameHint={photoModalTarget.name}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Ou coller l'adresse (URL) d'une photo :
                </label>
                <input
                  type="url"
                  value={customPhotoUrl.startsWith('data:') ? '' : customPhotoUrl}
                  onChange={(e) => setCustomPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>


              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setPhotoModalTarget(null); setCustomPhotoUrl(''); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!customPhotoUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enregistrer Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { EntityActions } from './EntityActions';
import { AppState, ParkingSpot, Site } from '../types';
import { addSiteRecord, deleteZone, updateZone } from '../services/storage';
import { roleCan } from '../services/permissions';
import { notify } from '../services/notify';
import { SPOT_TYPE_LABELS } from '../services/spots';
import { NewSpotsModal } from './SpotsView';
import { confirmedTotal, todayInTana } from '../services/dashboardMetrics';
import { monthKey } from '../services/months';

interface SitesViewProps {
  state: AppState;
  /** Opens another page (e.g. the spots plan) */
  onNavigate: (path: string) => void;
}

const STATUS: Record<Site['status'], { label: string; cls: string }> = {
  actif: { label: 'Actif', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  maintenance: { label: 'Maintenance', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  inactif: { label: 'Inactif', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
};

const SPOT_STATES: { key: ParkingSpot['status']; label: string; cls: string }[] = [
  { key: 'libre', label: 'Libres', cls: 'text-emerald-700' },
  { key: 'occupe', label: 'Occupées', cls: 'text-[#0F172A]' },
  { key: 'reserve', label: 'Réservées', cls: 'text-amber-700' },
  { key: 'maintenance', label: 'Maintenance', cls: 'text-rose-700' }
];

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/[  ,]/g, ' ');
const shortName = (s: Site) => s.name.replace(/^Site \d+\s*-\s*/, '');

const emptyForm = { name: '', code: '', address: '', city: 'Antananarivo', totalCapacity: '100', presidentName: '', presidentPhone: '', tresorierName: '', status: 'actif' as Site['status'] };

export const SitesView: React.FC<SitesViewProps> = ({ state, onNavigate }) => {
  const [selectedId, setSelectedId] = useState<string>(state.sites[0]?.id || '');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Zone being renamed / retyped, or receiving new spots
  const [editZone, setEditZone] = useState<{ zone: string; name: string; type: string } | null>(null);
  const [addToZone, setAddToZone] = useState<string | null>(null);
  const [zoneBusy, setZoneBusy] = useState(false);
  const canManageZones = roleCan(state.currentUser.role, 'spots');

  const t = todayInTana();
  const currentMonth = monthKey(t.year, t.monthIndex);

  /** Figures of each site, computed from the data. */
  const stats = useMemo(() => new Map(state.sites.map((site) => {
    const spots = state.spots.filter((s) => s.siteId === site.id);
    const occupied = spots.filter((s) => s.status === 'occupe').length;
    const guards = state.guards.filter((g) => g.siteId === site.id);
    const zones = new Map<string, ParkingSpot[]>();
    spots.forEach((s) => zones.set(s.zone, [...(zones.get(s.zone) || []), s]));
    return [site.id, {
      spots,
      occupied,
      rate: site.totalCapacity > 0 ? occupied / site.totalCapacity : 0,
      zones: Array.from(zones.entries()).sort(([a], [b]) => a.localeCompare(b)),
      guards: guards.length,
      guardsOnDuty: guards.filter((g) => g.status === 'en_poste').length,
      leaders: guards.filter((g) => g.isTeamLeader).map((g) => g.fullName),
      members: state.members.filter((m) => m.primarySiteId === site.id).length,
      vehicles: state.vehicles.filter((v) => v.siteId === site.id).length,
      registers: state.cashRegisters.filter((r) => r.siteId === site.id),
      equipments: state.equipments.filter((e) => e.siteId === site.id).length,
      openIncidents: state.incidents.filter((i) => i.siteId === site.id && (i.resolutionStatus === 'ouvert' || i.resolutionStatus === 'en_cours')).length,
      monthRevenue: confirmedTotal(state.receipts.filter((r) => r.siteId === site.id), currentMonth)
    }] as const;
  })), [state, currentMonth]);

  const selected = state.sites.find((s) => s.id === selectedId) || state.sites[0];
  const sel = selected ? stats.get(selected.id)! : null;
  const totalCapacity = state.sites.reduce((sum, s) => sum + s.totalCapacity, 0);
  const totalOccupied = state.spots.filter((s) => s.status === 'occupe').length;

  const removeZone = async (zone: string, spots: ParkingSpot[]) => {
    if (!selected) return;
    const occupied = spots.filter((sp) => sp.status === 'occupe').map((sp) => sp.code);
    if (occupied.length) {
      notify(`Suppression impossible : place(s) occupée(s) ${occupied.join(', ')}. Libérez-les d’abord.`, 'error');
      return;
    }
    if (!window.confirm(`Supprimer la zone « ${zone} » et ses ${spots.length} place(s) ?\nCette action est irréversible.`)) return;
    setZoneBusy(true);
    try {
      const n = await deleteZone(selected.id, zone);
      notify(`Zone « ${zone} » supprimée (${n} place${n > 1 ? 's' : ''}).`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Suppression impossible.', 'error');
    } finally {
      setZoneBusy(false);
    }
  };

  const saveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !editZone) return;
    const name = editZone.name.trim().replace(/\s+/g, ' ');
    const changes: { newZone?: string; type?: ParkingSpot['type'] } = {};
    if (name && name !== editZone.zone) changes.newZone = name;
    if (editZone.type) changes.type = editZone.type as ParkingSpot['type'];
    if (!changes.newZone && !changes.type) {
      setEditZone(null);
      return;
    }
    const merging = !!changes.newZone && (sel?.zones.some(([z]) => z === changes.newZone) ?? false);
    if (merging && !window.confirm(`La zone « ${changes.newZone} » existe déjà : les deux zones seront fusionnées. Continuer ?`)) return;
    setZoneBusy(true);
    try {
      const n = await updateZone(selected.id, editZone.zone, changes);
      notify(`Zone mise à jour (${n} place${n > 1 ? 's' : ''}).`, 'success');
      setEditZone(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Modification impossible.', 'error');
    } finally {
      setZoneBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const site = await addSiteRecord({
        name: form.name,
        code: form.code || undefined,
        address: form.address,
        city: form.city,
        totalCapacity: Number(form.totalCapacity),
        presidentName: form.presidentName,
        presidentPhone: form.presidentPhone,
        tresorierName: form.tresorierName,
        status: form.status
      });
      setShowNew(false);
      setForm(emptyForm);
      setSelectedId(site.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof emptyForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span>
      <input
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
        {...props}
      />
    </label>
  );

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono-data text-xs text-slate-500 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">domain</span>
            Vue générale
          </div>
          <h1 className="font-headline text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Sites &amp; Zones</h1>
          <p className="text-xs text-slate-500">
            {state.sites.length} site{state.sites.length > 1 ? 's' : ''} · capacité totale {fmt(totalCapacity)} places · {fmt(totalOccupied)} occupée{totalOccupied > 1 ? 's' : ''} actuellement
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setForm(emptyForm); setError(null); setShowNew(true); }}
          className="self-start lg:self-auto px-4 py-2.5 rounded-lg bg-[#0F172A] text-white hover:bg-slate-800 shadow-md text-xs font-bold flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">add_business</span>
          + Nouveau site
        </button>
      </div>

      {/* Site cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {state.sites.map((site) => {
          const st = stats.get(site.id)!;
          const active = selected?.id === site.id;
          return (
            <article
              key={site.id}
              className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3 transition-all ${active ? 'border-[#06B6D4] ring-2 ring-[#06B6D4]/20' : 'border-[#E2E8F0]'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono-data text-[10px] font-bold text-[#06B6D4]">{site.code}</span>
                  <h2 className="font-headline text-base font-bold text-[#0F172A] truncate">{shortName(site)}</h2>
                  <p className="text-[11px] text-slate-500 truncate">{site.address || 'Adresse non renseignée'} · {site.city}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS[site.status]?.cls || STATUS.inactif.cls}`}>
                  {STATUS[site.status]?.label || site.status}
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-500">Occupation</span>
                  <span className="font-mono-data font-bold text-[#0F172A]">
                    {(st.rate * 100).toFixed(1).replace('.', ',')} % <span className="text-slate-400 font-normal">· {st.occupied}/{site.totalCapacity}</span>
                  </span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100 overflow-hidden">
                  <div className="h-full rounded bg-[#06B6D4]" style={{ width: `${Math.min(100, st.rate * 100)}%` }} />
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['Zones', st.zones.length],
                  ['Gardiens', `${st.guardsOnDuty}/${st.guards}`],
                  ['Membres', st.members]
                ].map(([label, v]) => (
                  <div key={label as string} className="rounded-lg bg-slate-50 border border-slate-200 py-2">
                    <dd className="font-headline text-lg font-bold text-[#0F172A]">{v}</dd>
                    <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
                  </div>
                ))}
              </dl>

              <div className="text-[11px] text-slate-600 space-y-0.5">
                <p><span className="text-slate-400">Président :</span> {site.presidentName}{site.presidentPhone ? ` · ${site.presidentPhone}` : ''}</p>
                <p><span className="text-slate-400">Trésorier :</span> {site.tresorierName}</p>
                <p><span className="text-slate-400">Recettes du mois :</span> <strong className="font-mono-data text-[#0F172A]">{fmt(st.monthRevenue)} Ar</strong></p>
              </div>

              <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <EntityActions compact collection="sites" record={site} label={site.name} />
                <button
                  type="button"
                  onClick={() => setSelectedId(site.id)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${active ? 'bg-[#06B6D4] text-[#0F172A]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {active ? 'Zones affichées' : 'Voir les zones'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Zones of the selected site */}
      {selected && sel && (
        <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-headline text-base font-bold text-[#0F172A]">Zones — {shortName(selected)}</h2>
              <p className="text-[11px] text-slate-500">
                {sel.spots.length} emplacement{sel.spots.length > 1 ? 's' : ''} cartographié{sel.spots.length > 1 ? 's' : ''} sur {selected.totalCapacity} places déclarées
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('emplacements-et-occupation')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">map</span>
              Plan des emplacements
            </button>
            {canManageZones && (
              <button
                type="button"
                onClick={() => setAddToZone('')}
                className="px-3 py-1.5 rounded-lg bg-[#06B6D4] text-xs font-semibold text-[#0F172A] hover:bg-[#0891B2] hover:text-white flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                Nouvelle zone
              </button>
            )}
          </div>

          {sel.zones.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Aucune zone sur ce site.
              {canManageZones && (
                <button type="button" onClick={() => setAddToZone('')} className="block mx-auto mt-2 text-[#06B6D4] font-semibold hover:underline">
                  Créer une zone et ses emplacements
                </button>
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-slate-500 bg-slate-50">
                  <tr>
                    <th className="text-left py-2 px-3">Zone</th>
                    <th className="text-right py-2 px-3">Places</th>
                    {SPOT_STATES.map((s) => <th key={s.key} className="text-right py-2 px-3">{s.label}</th>)}
                    <th className="text-left py-2 px-3 min-w-[120px]">Occupation</th>
                    {canManageZones && <th className="text-right py-2 px-3">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sel.zones.map(([zone, spots]) => {
                    const occ = spots.filter((s) => s.status === 'occupe').length;
                    const pct = spots.length ? (occ / spots.length) * 100 : 0;
                    return (
                      <tr key={zone}>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-[#0F172A] block">{zone}</span>
                          <span className="text-[10px] text-slate-400">
                            {[...new Set(spots.map((sp) => SPOT_TYPE_LABELS[sp.type] || sp.type))].join(', ')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono-data">{spots.length}</td>
                        {SPOT_STATES.map((s) => (
                          <td key={s.key} className={`py-2 px-3 text-right font-mono-data ${s.cls}`}>
                            {spots.filter((sp) => sp.status === s.key).length}
                          </td>
                        ))}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded bg-slate-100 overflow-hidden">
                              <div className="h-full rounded bg-[#06B6D4]" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-mono-data text-[10px] text-slate-600 w-9 text-right">{Math.round(pct)} %</span>
                          </div>
                        </td>
                        {canManageZones && (
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Renommer / changer le type"
                                onClick={() => {
                                  const types = [...new Set(spots.map((sp) => sp.type))];
                                  setEditZone({ zone, name: zone, type: types.length === 1 ? types[0] : '' });
                                }}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                type="button"
                                title="Ajouter des places"
                                onClick={() => setAddToZone(zone)}
                                className="p-1.5 rounded hover:bg-slate-100 text-[#06B6D4]"
                              >
                                <span className="material-symbols-outlined text-[18px]">add_box</span>
                              </button>
                              <button
                                type="button"
                                title="Supprimer la zone"
                                disabled={zoneBusy}
                                onClick={() => removeZone(zone, spots)}
                                className="p-1.5 rounded hover:bg-rose-50 text-rose-600 disabled:opacity-40"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              ['Chefs de brigade', sel.leaders.length ? sel.leaders.join(', ') : 'Aucun'],
              ['Caisse', sel.registers.length ? sel.registers.map((r) => `${r.registerCode} : ${fmt(r.currentCashInHandAr)} Ar`).join(' · ') : 'Aucune caisse'],
              ['Véhicules · matériel', `${sel.vehicles} véhicule${sel.vehicles > 1 ? 's' : ''} · ${sel.equipments} équipement${sel.equipments > 1 ? 's' : ''}`],
              ['Incidents en cours', String(sel.openIncidents)]
            ].map(([label, v]) => (
              <div key={label} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
                <span className="block mt-0.5 font-semibold text-[#0F172A] break-words">{v}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* New site */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="new-site-title" className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <h3 id="new-site-title" className="font-headline text-base font-bold text-[#0F172A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#06B6D4]">add_business</span>
                Nouveau site
              </h3>
              <button type="button" onClick={() => !saving && setShowNew(false)} aria-label="Fermer" className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submit} className="px-5 sm:px-6 py-5 space-y-3">
              {field('name', 'Nom du site *', { required: true, placeholder: 'Behoririka Centre' })}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {field('code', 'Code (facultatif)', { placeholder: 'Généré automatiquement' })}
                {field('totalCapacity', 'Capacité (places) *', { required: true, type: 'number', min: 1, step: 1 })}
              </div>
              {field('address', 'Adresse', { placeholder: 'Rue, quartier' })}
              {field('city', 'Ville')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {field('presidentName', 'Président du site *', { required: true })}
                {field('presidentPhone', 'Téléphone du président', { type: 'tel', placeholder: '+261 34 …' })}
              </div>
              {field('tresorierName', 'Trésorier du site')}
              <label className="block">
                <span className="block text-xs font-semibold text-slate-700 mb-1">Statut</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Site['status'] }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-[#06B6D4]"
                >
                  <option value="actif">Actif</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactif">Inactif</option>
                </select>
              </label>
              {error && <p role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">{error}</p>}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowNew(false)} disabled={saving} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-60">
                  {saving ? 'Création…' : 'Créer le site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selected && addToZone !== null && (
        <NewSpotsModal
          sites={state.sites}
          spots={state.spots}
          defaultSiteId={selected.id}
          lockSite
          defaultZone={addToZone || undefined}
          onClose={() => setAddToZone(null)}
          onCreated={() => setAddToZone(null)}
        />
      )}

      {editZone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveZone} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="font-headline text-lg font-bold text-[#0F172A]">Modifier la zone</h3>
              <button type="button" onClick={() => setEditZone(null)} className="text-slate-400 hover:text-[#0F172A]" aria-label="Fermer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <label className="block">
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">Nom de la zone *</span>
              <input
                required
                maxLength={100}
                value={editZone.name}
                onChange={(e) => setEditZone({ ...editZone, name: e.target.value })}
                className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">Type de toutes les places de la zone</span>
              <select
                value={editZone.type}
                onChange={(e) => setEditZone({ ...editZone, type: e.target.value })}
                className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
              >
                <option value="">— Ne pas changer —</option>
                {(Object.keys(SPOT_TYPE_LABELS) as ParkingSpot['type'][]).map((t) => (
                  <option key={t} value={t}>{SPOT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <p className="text-[10px] text-slate-400">
              S’applique aux {sel?.zones.find(([z]) => z === editZone.zone)?.[1].length ?? 0} place(s) de la zone « {editZone.zone} ». Le statut des places
              (libre, occupée…) ne change pas.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button type="button" onClick={() => setEditZone(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
                Annuler
              </button>
              <button type="submit" disabled={zoneBusy} className="px-5 py-2 rounded-lg bg-[#06B6D4] text-[#0F172A] font-headline font-bold hover:bg-[#0891B2] hover:text-white disabled:opacity-50">
                {zoneBusy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

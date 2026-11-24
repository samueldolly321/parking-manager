import React, { useMemo, useState } from 'react';
import { notify } from '../services/notify';
import { EntityActions } from './EntityActions';
import { PhotoInput } from './PhotoInput';
import { Equipment, GuardPersonnel, Site, User } from '../types';
import { addEquipmentRecord, recordEquipmentEvent } from '../services/storage';
import { roleCan } from '../services/permissions';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUS_LABELS,
  HISTORY_KIND_LABELS,
  categoryLabel,
  historySortKey
} from '../services/equipment';

interface EquipmentViewProps {
  equipments: Equipment[];
  /** Staff, to hand equipment over to a guard */
  guards: GuardPersonnel[];
  sites: Site[];
  currentUser: User;
  selectedSiteId: string;
  /** Record selected on arrival (from the header search) */
  initialSelectedId?: string;
}

/** Fields of the "Modifier" window. */
const EQUIPMENT_EDIT_FIELDS = [
  'photoUrl', 'designation', 'category', 'modelSpecs', 'siteId', 'location', 'status', 'quantity',
  'responsibleName', 'commissioningDate', 'estimatedValueAr', 'totalCycles'
];

type Dialog = null | 'add' | 'journal' | 'audit' | 'intervention' | 'panne' | 'remise_service' | 'affectation' | 'restitution';

const field = 'w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs';
const label = 'block text-[11px] font-semibold text-slate-500 mb-1';

const Modal: React.FC<{ title: string; icon: string; onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({ title, icon, onClose, wide, children }) => (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className={`bg-white rounded-2xl ${wide ? 'max-w-3xl' : 'max-w-md'} w-full p-6 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto text-xs`}>
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <h3 className="font-headline text-lg font-bold text-[#0F172A] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#06B6D4]">{icon}</span>
          {title}
        </h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-[#0F172A]" aria-label="Fermer">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Footer: React.FC<{ onClose: () => void; busy: boolean; submitLabel: string; danger?: boolean; disabled?: boolean }> = ({ onClose, busy, submitLabel, danger, disabled }) => (
  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">Annuler</button>
    <button
      type="submit"
      disabled={busy || disabled}
      className={`px-5 py-2 rounded-lg font-headline font-bold disabled:opacity-50 ${
        danger ? 'bg-[#DC2626] text-white hover:bg-red-700' : 'bg-[#06B6D4] text-[#0F172A] hover:bg-[#0891B2] hover:text-white'
      }`}
    >
      {busy ? 'Enregistrement…' : submitLabel}
    </button>
  </div>
);

export const EquipmentView: React.FC<EquipmentViewProps> = ({ equipments, guards, sites, currentUser, selectedSiteId, initialSelectedId }) => {
  const [selectedCode, setSelectedCode] = useState<string>(initialSelectedId || equipments[0]?.inventoryCode || '');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>(selectedSiteId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  const canWrite = roleCan(currentUser.role, 'write');

  const filteredEquipments = equipments.filter((eq) => {
    const q = searchQuery.toLowerCase();
    const matchesCat = categoryFilter === 'all' || eq.category === categoryFilter;
    const matchesSite = siteFilter === 'all' || eq.siteId === siteFilter;
    const matchesQuery =
      eq.designation.toLowerCase().includes(q) || eq.inventoryCode.toLowerCase().includes(q) || eq.location.toLowerCase().includes(q);
    return matchesCat && matchesSite && matchesQuery;
  });

  const selectedItem = equipments.find((eq) => eq.inventoryCode === selectedCode) || filteredEquipments[0] || equipments[0];

  const formatAr = (val: number) => new Intl.NumberFormat('fr-FR').format(val).replace(/[  ,]/g, ' ');
  const siteName = (siteId: string) => (sites.find((s) => s.id === siteId)?.name || siteId).replace(/^Site \d+\s*-\s*/, '');

  // KPI figures, computed on the site chosen in the filter
  const siteEquipments = equipments.filter((eq) => siteFilter === 'all' || eq.siteId === siteFilter);
  const units = (list: Equipment[]) => list.reduce((sum, eq) => sum + (eq.quantity || 0), 0);
  const pctOf = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);
  const fmtPct = (v: number) => `${Number(v.toFixed(1))}%`;
  const totalUnits = units(siteEquipments);
  const totalValueAr = siteEquipments.reduce((sum, eq) => sum + (eq.estimatedValueAr || 0), 0);
  const operationalUnits = units(siteEquipments.filter((eq) => eq.status === 'operationnel'));
  const needsWork = siteEquipments.filter((eq) => eq.status !== 'operationnel');
  const needsWorkUnits = units(needsWork);
  const hasCritical = needsWork.some((eq) => eq.status === 'critique' || eq.status === 'maintenance');
  const assigned = siteEquipments.filter((eq) => eq.category === 'assigned');
  const assignedUnits = units(assigned);
  const countCategory = (cat: Equipment['category']) => siteEquipments.filter((eq) => eq.category === cat).length;
  const filteredValueAr = filteredEquipments.reduce((sum, eq) => sum + (eq.estimatedValueAr || 0), 0);
  const STATUS_LABEL = EQUIPMENT_STATUS_LABELS;

  /** Runs a server action, shows the result, closes the window. */
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      notify(success, 'success');
      setDialog(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Opération impossible.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const statusBadge = (eq: Equipment) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-data font-bold ${
        eq.status === 'operationnel'
          ? 'bg-emerald-100 text-[#16A34A]'
          : eq.status === 'maintenance' || eq.status === 'critique'
          ? 'bg-red-100 text-[#DC2626]'
          : 'bg-amber-100 text-amber-800'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {STATUS_LABEL[eq.status] || eq.status}
    </span>
  );

  const thumb = (eq: Equipment, size: string, iconSize = 18) =>
    eq.photoUrl ? (
      <img src={eq.photoUrl} alt={eq.designation} data-zoom="true" className={`${size} rounded-lg object-cover border border-[#E2E8F0] bg-white shrink-0`} />
    ) : (
      <div className={`${size} rounded-lg bg-slate-100 border border-[#E2E8F0] flex items-center justify-center text-slate-400 shrink-0`} title="Pas de photo">
        <span className="material-symbols-outlined" style={{ fontSize: iconSize }}>
          {EQUIPMENT_CATEGORIES.find((c) => c.id === eq.category)?.icon || 'inventory_2'}
        </span>
      </div>
    );

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0]">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 font-mono-data text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-[#06B6D4] uppercase font-bold border border-slate-200">PATRIMOINE TECHNIQUE</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-semibold uppercase">{siteFilter === 'all' ? 'Tous les sites' : siteName(siteFilter)}</span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-[#0F172A]">Inventaire des Matériels &amp; Équipements</h1>
          <p className="text-xs text-slate-500">
            Suivi des barrières, télécommunications, sécurité, monétique, mobilier et équipements remis aux gardiens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setDialog('journal')}
            type="button"
            className="bg-[#F8FAFC] text-[#0F172A] hover:bg-slate-100 text-xs font-headline font-bold px-3 py-2 rounded-lg border border-[#E2E8F0] flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>Journal des mouvements</span>
          </button>
          {canWrite && (
            <>
              <button
                onClick={() => setDialog('audit')}
                type="button"
                disabled={siteEquipments.length === 0}
                className="bg-[#F8FAFC] text-[#0F172A] hover:bg-slate-100 text-xs font-headline font-bold px-3 py-2 rounded-lg border border-[#E2E8F0] flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                <span>Faire un inventaire</span>
              </button>
              <button
                onClick={() => setDialog('add')}
                type="button"
                className="bg-[#0F172A] text-white hover:bg-slate-800 text-xs font-headline font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
              >
                <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">add_circle</span>
                <span>+ Ajouter un équipement</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total Biens Inventoriés</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#0F172A]">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline text-3xl font-bold text-[#0F172A]">{totalUnits}</span>
              <span className="font-mono-data text-xs text-slate-400">unités</span>
            </div>
            <div className="mt-1 flex items-center justify-between font-mono-data text-xs">
              <span className="text-slate-500">Valeur estimée :</span>
              <span className="font-bold text-[#06B6D4]">{formatAr(totalValueAr)} Ar</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#0F172A] h-full rounded-full" style={{ width: totalUnits > 0 ? '100%' : '0%' }}></div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">En Bon État / Opérationnels</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#16A34A]">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-[#0F172A]">{operationalUnits}</span>
              <span className="font-mono-data text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-[#16A34A] font-bold">
                {fmtPct(pctOf(operationalUnits, totalUnits))}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Sur {totalUnits} unité{totalUnits > 1 ? 's' : ''} inventoriée{totalUnits > 1 ? 's' : ''}</span>
              <span className={`font-mono-data font-bold ${needsWork.length === 0 ? 'text-[#16A34A]' : 'text-amber-600'}`}>
                {needsWork.length === 0 ? 'Conforme' : 'À surveiller'}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#16A34A] h-full rounded-full" style={{ width: `${pctOf(operationalUnits, totalUnits)}%` }}></div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200 bg-red-50/20 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-red-600 font-bold">En Maintenance / Révision</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-[#DC2626]">
              <span className="material-symbols-outlined text-[18px]">handyman</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-[#DC2626]">{needsWorkUnits}</span>
              {hasCritical && (
                <span className="font-mono-data text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-[#DC2626] font-bold">
                  Critique
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500 truncate">
              {needsWork.length > 0 ? `Ex : ${needsWork[0].designation}` : 'Aucun matériel en révision'}
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#DC2626] h-full rounded-full" style={{ width: `${pctOf(needsWorkUnits, totalUnits)}%` }}></div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Affectés au Personnel</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#06B6D4]">
              <span className="material-symbols-outlined text-[18px]">assignment_ind</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-[#0F172A]">{assignedUnits}</span>
              <span className="font-mono-data text-[11px] px-1.5 py-0.5 rounded bg-cyan-100 text-[#0891b2] font-bold">
                En Main Courante
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500 truncate">
              {assigned.length > 0 ? assigned.slice(0, 3).map((eq) => eq.designation).join(', ') : 'Aucun matériel confié'}
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#06B6D4] h-full rounded-full" style={{ width: `${pctOf(assignedUnits, totalUnits)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Content Workspace: Data Table + Detail Drawer */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col">
          <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col gap-3 min-w-0">
            {/* Categories: one line, scrolls horizontally */}
            <div className="scroll-x flex items-center gap-1.5 overflow-x-auto pb-2 min-w-0 w-full">
              {[{ id: 'all', label: `Tous (${siteEquipments.length})` }, ...EQUIPMENT_CATEGORIES.map((c) => ({ id: c.id, label: `${c.label} (${countCategory(c.id)})` }))].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  type="button"
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-headline whitespace-nowrap transition-all ${
                    categoryFilter === cat.id ? 'bg-[#0F172A] text-white font-bold shadow-sm' : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="bg-white text-xs font-medium text-[#0F172A] py-1.5 px-3 rounded-lg border border-[#E2E8F0]"
              >
                {sites.length > 1 && <option value="all">Tous sites</option>}
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrer réf / libellé..."
                  className="bg-white text-xs rounded-lg py-1.5 pl-7 pr-3 border border-[#E2E8F0] w-40 focus:ring-1 focus:ring-[#06B6D4]"
                />
                <span className="material-symbols-outlined absolute left-2 top-2 text-slate-400 text-[14px]">search</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] text-slate-500 uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
                  <th className="py-2.5 px-3">Photo</th>
                  <th className="py-2.5 px-3">Code inv.</th>
                  <th className="py-2.5 px-3">Désignation &amp; modèle</th>
                  <th className="py-2.5 px-3">Catégorie / site</th>
                  <th className="py-2.5 px-3">Qté &amp; emplacement</th>
                  <th className="py-2.5 px-3">État</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3 text-right">Dernier inventaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredEquipments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">Aucun matériel ne correspond à ces filtres.</td>
                  </tr>
                )}
                {filteredEquipments.map((eq) => {
                  const isSelected = selectedItem?.id === eq.id;
                  return (
                    <tr key={eq.id} onClick={() => setSelectedCode(eq.inventoryCode)} className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-cyan-50/50' : ''}`}>
                      <td className="py-2 px-3">{thumb(eq, 'w-11 h-11')}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono-plate text-xs font-bold text-[#0F172A] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">{eq.inventoryCode}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#0F172A]">{eq.designation}</span>
                          <span className="font-mono-data text-[10px] text-slate-400 truncate max-w-xs">{eq.modelSpecs}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[#06B6D4] font-semibold">{categoryLabel(eq.category)}</span>
                          <span className="font-mono-data text-[10px] text-slate-500">{siteName(eq.siteId)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono-data font-bold text-[#0F172A]">{eq.quantity} unité{eq.quantity > 1 ? 's' : ''}</span>
                        <div className="text-[10px] text-slate-400">{eq.location}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{statusBadge(eq)}</td>
                      <td className="py-3 px-3 whitespace-nowrap"><span className="text-[#0F172A] font-medium block">{eq.responsibleName}</span></td>
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono-data text-slate-500">{eq.lastAuditDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between font-mono-data text-xs text-slate-500">
            <span>Affichage de {filteredEquipments.length} matériel{filteredEquipments.length > 1 ? 's' : ''}</span>
            <span>Valeur totale : {formatAr(filteredValueAr)} Ar</span>
          </div>
        </div>

        {/* Fiche de vie */}
        {selectedItem && (
          <div className="w-full xl:w-[420px] shrink-0 bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-5 space-y-5 flex flex-col sticky top-20">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div className="space-y-0.5 min-w-0">
                <span className="font-mono-data text-[10px] text-[#06B6D4] font-bold uppercase tracking-wider">FICHE DE VIE ÉQUIPEMENT</span>
                <h2 className="font-headline text-lg font-bold text-[#0F172A] leading-tight">{selectedItem.designation}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono-plate text-xs font-bold text-[#0F172A] bg-slate-100 px-1.5 py-0.5 rounded border border-[#E2E8F0]">{selectedItem.inventoryCode}</span>
                  <span className="text-xs text-slate-500">{siteName(selectedItem.siteId)}</span>
                </div>
                <div className="pt-1.5 flex items-center gap-2">
                  {statusBadge(selectedItem)}
                  <EntityActions collection="equipments" record={selectedItem} label={selectedItem.designation} fields={EQUIPMENT_EDIT_FIELDS} />
                </div>
              </div>
            </div>

            {/* Photo */}
            {selectedItem.photoUrl ? (
              <img src={selectedItem.photoUrl} alt={selectedItem.designation} data-zoom="true" className="w-full max-h-56 object-contain rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]" />
            ) : (
              <div className="w-full h-28 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-400 text-[11px] gap-1">
                <span className="material-symbols-outlined text-[28px]">add_photo_alternate</span>
                Pas de photo{canWrite ? ' — ajoutez-en une avec « Modifier »' : ''}
              </div>
            )}

            <div className="bg-[#F8FAFC] p-3.5 rounded-lg border border-[#E2E8F0] space-y-2 text-xs">
              <div className="font-headline font-bold text-[#0F172A] flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">memory</span>
                Caractéristiques
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 font-body text-xs">
                {[
                  ['Modèle', selectedItem.modelSpecs || '—'],
                  ['Emplacement', selectedItem.location || '—'],
                  ['Catégorie', categoryLabel(selectedItem.category)],
                  ['Quantité', `${selectedItem.quantity} unité${selectedItem.quantity > 1 ? 's' : ''}`],
                  ['Mise en service', selectedItem.commissioningDate || '—'],
                  ['Valeur estimée', `${formatAr(selectedItem.estimatedValueAr || 0)} Ar`],
                  ['Responsable', selectedItem.responsibleName || '—'],
                  ['Cycles totaux', selectedItem.totalCycles || '—']
                ].map(([k, v]) => (
                  <div key={k}>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">{k}</span>
                    <span className="font-bold text-[#0F172A] break-words">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {(selectedItem.status === 'maintenance' || selectedItem.status === 'critique') && (
              <div className="bg-red-50 p-3.5 rounded-lg border border-red-200 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-[#DC2626] font-bold font-headline">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span>{selectedItem.status === 'critique' ? 'Panne critique' : 'Matériel en maintenance'}</span>
                </div>
                {selectedItem.maintenanceHistory[0] && (
                  <p className="text-slate-700 text-xs">
                    Dernier événement ({selectedItem.maintenanceHistory[0].date}) : {selectedItem.maintenanceHistory[0].title}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-headline text-xs font-bold text-[#0F172A]">Historique</span>
                <span className="font-mono-data text-[10px] text-[#06B6D4] font-bold">
                  {selectedItem.maintenanceHistory.length} événement{selectedItem.maintenanceHistory.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-3 relative pl-3 border-l-2 border-slate-200 ml-1 max-h-72 overflow-y-auto">
                {selectedItem.maintenanceHistory.length > 0 ? (
                  selectedItem.maintenanceHistory.map((m, idx) => (
                    <div key={idx} className="relative pl-2">
                      <span className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${m.isCritical ? 'bg-[#DC2626]' : 'bg-[#06B6D4]'}`}></span>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-[#0F172A]">{m.title}</span>
                        <span className="font-mono-data text-[10px] text-slate-400 shrink-0">{m.date}</span>
                      </div>
                      {m.description && <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-2">Aucun événement enregistré.</div>
                )}
              </div>
            </div>

            {canWrite && (
              <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDialog('affectation')}
                    type="button"
                    className="bg-cyan-50 text-[#0891b2] hover:bg-cyan-100 font-headline text-xs font-bold py-2 rounded-lg border border-cyan-200 flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">assignment_ind</span>
                    <span>Remettre à un gardien</span>
                  </button>
                  <button
                    onClick={() => setDialog('restitution')}
                    type="button"
                    disabled={selectedItem.category !== 'assigned'}
                    title={selectedItem.category !== 'assigned' ? 'Ce matériel n’est pas confié à un gardien' : undefined}
                    className="bg-slate-100 text-[#0F172A] hover:bg-slate-200 font-headline text-xs font-bold py-2 rounded-lg border border-[#E2E8F0] flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">assignment_return</span>
                    <span>Restitution</span>
                  </button>
                </div>
                <button
                  onClick={() => setDialog('intervention')}
                  type="button"
                  className="w-full bg-[#0F172A] text-white hover:bg-slate-800 font-headline text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">calendar_month</span>
                  <span>Planifier une intervention</span>
                </button>
                <div>
                  {selectedItem.status === 'operationnel' ? (
                    <button
                      onClick={() => setDialog('panne')}
                      type="button"
                      className="w-full bg-red-50 text-[#DC2626] hover:bg-red-100 font-headline text-xs font-bold py-2 rounded-lg border border-red-200 flex items-center justify-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">report_problem</span>
                      <span>Déclarer une panne</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setDialog('remise_service')}
                      type="button"
                      className="w-full bg-emerald-50 text-[#16A34A] hover:bg-emerald-100 font-headline text-xs font-bold py-2 rounded-lg border border-emerald-200 flex items-center justify-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Remettre en service</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main courante */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-headline text-base font-bold text-[#0F172A]">Main courante des équipements remis aux gardiens</h3>
            <p className="text-xs text-slate-500">Matériel de la catégorie « Confiés aux gardiens » et son responsable actuel.</p>
          </div>
          <span className="font-mono-data text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-bold border border-[#E2E8F0]">
            {assigned.length} affectation{assigned.length > 1 ? 's' : ''}
          </span>
        </div>
        {assigned.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">Aucun matériel confié aux gardiens pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assigned.map((eq) => (
              <button
                key={eq.id}
                type="button"
                onClick={() => setSelectedCode(eq.inventoryCode)}
                className="text-left p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-3 hover:border-[#06B6D4] transition-colors"
              >
                {thumb(eq, 'w-10 h-10', 20)}
                <div className="space-y-0.5 min-w-0 flex-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#0F172A] truncate">{eq.designation}</span>
                    <span className={`shrink-0 font-mono-data text-[10px] font-bold ${eq.status === 'operationnel' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {STATUS_LABEL[eq.status] || eq.status}
                    </span>
                  </div>
                  <div className="text-slate-600 truncate">Remis à : <strong>{eq.responsibleName}</strong></div>
                  <div className="font-mono-data text-[10px] text-slate-400 truncate">{eq.inventoryCode} · {eq.location} ({siteName(eq.siteId)})</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {dialog === 'add' && (
        <AddEquipmentModal
          sites={sites}
          defaultSiteId={siteFilter !== 'all' ? siteFilter : sites[0]?.id || ''}
          defaultResponsible={currentUser.fullName}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(input) =>
            run(async () => {
              const item = await addEquipmentRecord(input);
              setCategoryFilter('all');
              setSelectedCode(item.inventoryCode);
            }, 'Équipement ajouté à l’inventaire.')
          }
        />
      )}

      {dialog === 'journal' && <JournalModal equipments={siteEquipments} siteName={siteName} onClose={() => setDialog(null)} onOpen={(code) => { setSelectedCode(code); setDialog(null); }} />}

      {dialog === 'audit' && (
        <AuditModal
          equipments={siteEquipments}
          siteLabel={siteFilter === 'all' ? 'tous les sites' : siteName(siteFilter)}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(rows) =>
            run(async () => {
              for (const r of rows) await recordEquipmentEvent(r.id, { kind: 'audit', quantityFound: r.quantityFound, note: r.note });
            }, `Inventaire enregistré (${rows.length} matériel${rows.length > 1 ? 's' : ''}).`)
          }
        />
      )}

      {selectedItem && (dialog === 'affectation' || dialog === 'restitution') && (
        <HandoverModal
          kind={dialog}
          item={selectedItem}
          guards={guards.filter((g) => g.siteId === selectedItem.siteId)}
          defaultResponsible={currentUser.fullName}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(event, success) => run(() => recordEquipmentEvent(selectedItem.id, event), success)}
        />
      )}

      {selectedItem && dialog && ['intervention', 'panne', 'remise_service'].includes(dialog) && (
        <EventModal
          kind={dialog as 'intervention' | 'panne' | 'remise_service'}
          item={selectedItem}
          sites={sites}
          siteName={siteName}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(event, success) => run(() => recordEquipmentEvent(selectedItem.id, event), success)}
        />
      )}
    </div>
  );
};

/** New equipment form. */
const AddEquipmentModal: React.FC<{
  sites: Site[];
  defaultSiteId: string;
  defaultResponsible: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: Partial<Equipment>) => void;
}> = ({ sites, defaultSiteId, defaultResponsible, busy, onClose, onSubmit }) => {
  const [f, setF] = useState({
    designation: '',
    category: 'barriers' as Equipment['category'],
    modelSpecs: '',
    siteId: defaultSiteId,
    location: '',
    quantity: '1',
    status: 'operationnel' as Equipment['status'],
    responsibleName: defaultResponsible,
    commissioningDate: '',
    estimatedValueAr: '',
    photoUrl: undefined as string | undefined
  });
  const set = (k: keyof typeof f, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal title="Nouvel équipement" icon="add_circle" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ ...f, quantity: Number(f.quantity), estimatedValueAr: Number(f.estimatedValueAr) || 0 });
        }}
      >
        <div>
          <span className={label}>Photo (importer depuis l’ordinateur ou prendre une photo)</span>
          <PhotoInput value={f.photoUrl} onChange={(v) => set('photoUrl', v)} fileNameHint={`equipement_${f.designation || 'nouveau'}`} facingMode="environment" emptyIcon="inventory_2" maxSize={900} />
        </div>
        <label className="block">
          <span className={label}>Désignation *</span>
          <input required maxLength={200} value={f.designation} onChange={(e) => set('designation', e.target.value)} placeholder="ex : Barrière levante entrée principale" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={label}>Catégorie *</span>
            <select value={f.category} onChange={(e) => set('category', e.target.value)} className={field}>
              {EQUIPMENT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={label}>État</span>
            <select value={f.status} onChange={(e) => set('status', e.target.value)} className={field}>
              {Object.entries(EQUIPMENT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className={label}>Marque / modèle / caractéristiques</span>
          <input maxLength={500} value={f.modelSpecs} onChange={(e) => set('modelSpecs', e.target.value)} placeholder="ex : CAME G4000, 24 V" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={label}>Site *</span>
            <select value={f.siteId} onChange={(e) => set('siteId', e.target.value)} disabled={sites.length === 1} className={field} required>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={label}>Emplacement</span>
            <input maxLength={150} value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="ex : Voie sortie n°2" className={field} />
          </label>
          <label className="block">
            <span className={label}>Quantité *</span>
            <input type="number" min={1} step={1} required value={f.quantity} onChange={(e) => set('quantity', e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className={label}>Valeur estimée (Ar)</span>
            <input type="number" min={0} step={1000} value={f.estimatedValueAr} onChange={(e) => set('estimatedValueAr', e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className={label}>Responsable</span>
            <input maxLength={150} value={f.responsibleName} onChange={(e) => set('responsibleName', e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className={label}>Mise en service</span>
            <input type="date" value={f.commissioningDate} onChange={(e) => set('commissioningDate', e.target.value)} className={field} />
          </label>
        </div>
        <p className="text-[10px] text-slate-400">Le code d’inventaire (ex : MAT-BAR-004) est attribué automatiquement.</p>
        <Footer onClose={onClose} busy={busy} submitLabel="Ajouter" />
      </form>
    </Modal>
  );
};

/** Intervention / breakdown / back in service of the selected equipment. */
const EventModal: React.FC<{
  kind: 'intervention' | 'panne' | 'remise_service';
  item: Equipment;
  sites: Site[];
  siteName: (id: string) => string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: Record<string, unknown>, success: string) => void;
}> = ({ kind, item, sites, siteName, busy, onClose, onSubmit }) => {
  const [plannedDate, setPlannedDate] = useState('');
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [description, setDescription] = useState('');
  const [critical, setCritical] = useState(false);

  const head = (
    <p className="text-[11px] text-slate-500">
      <strong className="text-[#0F172A]">{item.designation}</strong> · {item.inventoryCode} · {siteName(item.siteId)}
    </p>
  );
  const textarea = (placeholder: string, required = false) => (
    <textarea required={required} rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={placeholder} className={field} />
  );

  if (kind === 'intervention') {
    return (
      <Modal title="Planifier une intervention" icon="calendar_month" onClose={onClose}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ kind, plannedDate, title, provider, description }, 'Intervention planifiée.'); }}>
          {head}
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={label}>Date prévue *</span><input type="date" required value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} className={field} /></label>
            <label className="block"><span className={label}>Prestataire</span><input maxLength={150} value={provider} onChange={(e) => setProvider(e.target.value)} className={field} /></label>
          </div>
          <label className="block"><span className={label}>Objet *</span><input required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex : Révision moteur, remplacement de la lisse" className={field} /></label>
          <label className="block"><span className={label}>Détails</span>{textarea('Pièces, accès, consignes…')}</label>
          <p className="text-[10px] text-slate-400">L’intervention est ajoutée à l’historique. L’état du matériel ne change pas.</p>
          <Footer onClose={onClose} busy={busy} submitLabel="Planifier" />
        </form>
      </Modal>
    );
  }
  if (kind === 'panne') {
    return (
      <Modal title="Déclarer une panne" icon="report_problem" onClose={onClose}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ kind, description, critical }, 'Panne déclarée : un incident a été ouvert.'); }}>
          {head}
          <label className="block"><span className={label}>Description de la panne *</span>{textarea('Que se passe-t-il ?', true)}</label>
          <label className="flex items-center gap-2 text-xs text-[#0F172A]">
            <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
            Panne critique (le matériel est hors service)
          </label>
          <p className="text-[10px] text-slate-400">
            Le matériel passe en « {critical ? 'Critique' : 'Maintenance'} » et un incident est ouvert dans « Incidents & sécurité ».
          </p>
          <Footer onClose={onClose} busy={busy} submitLabel="Déclarer" danger />
        </form>
      </Modal>
    );
  }
  return (
    <Modal title="Remettre en service" icon="check_circle" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ kind, description }, 'Matériel remis en service.'); }}>
        {head}
        <label className="block"><span className={label}>Commentaire</span>{textarea('Réparation effectuée, pièce changée…')}</label>
        <p className="text-[10px] text-slate-400">Le matériel repasse en « Opérationnel ». Pensez à clore l’incident correspondant.</p>
        <Footer onClose={onClose} busy={busy} submitLabel="Remettre en service" />
      </form>
    </Modal>
  );
};

/** Physical inventory: count each equipment, the differences are recorded. */
const AuditModal: React.FC<{
  equipments: Equipment[];
  siteLabel: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (rows: { id: string; quantityFound: number; note: string }[]) => void;
}> = ({ equipments, siteLabel, busy, onClose, onSubmit }) => {
  const [rows, setRows] = useState(() =>
    equipments.map((eq) => ({ id: eq.id, checked: true, quantityFound: String(eq.quantity), note: '' }))
  );
  const update = (id: string, patch: Partial<(typeof rows)[number]>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.checked);
  const gaps = chosen.filter((r) => Number(r.quantityFound) !== equipments.find((e) => e.id === r.id)?.quantity).length;
  return (
    <Modal title={`Inventaire — ${siteLabel}`} icon="fact_check" onClose={onClose} wide>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(chosen.map((r) => ({ id: r.id, quantityFound: Math.max(0, Math.floor(Number(r.quantityFound) || 0)), note: r.note })));
        }}
      >
        <p className="text-[11px] text-slate-500">
          Comptez chaque matériel et indiquez la quantité réellement présente. La date d’inventaire est mise à jour, et chaque écart est noté dans l’historique.
        </p>
        <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-[#F8FAFC] text-slate-500 text-[10px] uppercase">
              <tr>
                <th className="p-2 text-left">Compté</th>
                <th className="p-2 text-left">Matériel</th>
                <th className="p-2 text-right">Prévu</th>
                <th className="p-2 text-right">Constaté</th>
                <th className="p-2 text-left">Remarque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipments.map((eq) => {
                const r = rows.find((x) => x.id === eq.id)!;
                const gap = r.checked && Number(r.quantityFound) !== eq.quantity;
                return (
                  <tr key={eq.id} className={gap ? 'bg-amber-50' : ''}>
                    <td className="p-2"><input type="checkbox" checked={r.checked} onChange={(e) => update(eq.id, { checked: e.target.checked })} /></td>
                    <td className="p-2">
                      <span className="font-semibold text-[#0F172A] block">{eq.designation}</span>
                      <span className="font-mono-data text-[10px] text-slate-400">{eq.inventoryCode} · {eq.location}</span>
                    </td>
                    <td className="p-2 text-right font-mono-data">{eq.quantity}</td>
                    <td className="p-2 text-right">
                      <input type="number" min={0} step={1} disabled={!r.checked} value={r.quantityFound} onChange={(e) => update(eq.id, { quantityFound: e.target.value })} className="w-16 p-1 border border-[#E2E8F0] rounded text-right" />
                    </td>
                    <td className="p-2">
                      <input disabled={!r.checked} maxLength={300} value={r.note} onChange={(e) => update(eq.id, { note: e.target.value })} className="w-full p-1 border border-[#E2E8F0] rounded" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-600">
          {chosen.length} matériel{chosen.length > 1 ? 's' : ''} compté{chosen.length > 1 ? 's' : ''}
          {gaps ? ` · ${gaps} écart${gaps > 1 ? 's' : ''}` : ' · aucun écart'}
        </p>
        <Footer onClose={onClose} busy={busy} submitLabel="Enregistrer l’inventaire" disabled={chosen.length === 0} />
      </form>
    </Modal>
  );
};

/** Every history entry of the equipments shown, newest first. */
const JournalModal: React.FC<{
  equipments: Equipment[];
  siteName: (id: string) => string;
  onClose: () => void;
  onOpen: (inventoryCode: string) => void;
}> = ({ equipments, siteName, onClose, onOpen }) => {
  const [kind, setKind] = useState('all');
  const entries = useMemo(
    () =>
      equipments
        .flatMap((eq) => (eq.maintenanceHistory || []).map((m) => ({ ...m, eq })))
        .sort((a, b) => historySortKey(b.date) - historySortKey(a.date)),
    [equipments]
  );
  const shown = entries.filter((e) => kind === 'all' || (e.kind || 'intervention') === kind);
  return (
    <Modal title="Journal des mouvements" icon="history" onClose={onClose} wide>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">{entries.length} événement{entries.length > 1 ? 's' : ''} sur {equipments.length} matériel{equipments.length > 1 ? 's' : ''}.</p>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs">
          <option value="all">Tous les événements</option>
          {Object.entries(HISTORY_KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-slate-400">Aucun événement.</p>
      ) : (
        <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-[#F8FAFC] text-slate-500 text-[10px] uppercase">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Matériel</th>
                <th className="p-2 text-left">Événement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((e, i) => (
                <tr key={`${e.eq.id}-${i}`} className="hover:bg-slate-50 cursor-pointer" onClick={() => onOpen(e.eq.inventoryCode)}>
                  <td className="p-2 font-mono-data whitespace-nowrap text-slate-600">{e.date}</td>
                  <td className="p-2">
                    <span className="font-semibold text-[#0F172A] block">{e.eq.designation}</span>
                    <span className="font-mono-data text-[10px] text-slate-400">{e.eq.inventoryCode} · {siteName(e.eq.siteId)}</span>
                  </td>
                  <td className="p-2">
                    <span className={`font-semibold block ${e.isCritical ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}>{e.title}</span>
                    {e.description && <span className="text-[11px] text-slate-500">{e.description}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};

/** Handing the equipment over to a guard of its site, or taking it back. */
const HandoverModal: React.FC<{
  kind: 'affectation' | 'restitution';
  item: Equipment;
  guards: GuardPersonnel[];
  defaultResponsible: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: Record<string, unknown>, success: string) => void;
}> = ({ kind, item, guards, defaultResponsible, busy, onClose, onSubmit }) => {
  const [guardId, setGuardId] = useState(guards.find((g) => g.fullName !== item.responsibleName)?.id || guards[0]?.id || '');
  const [responsibleName, setResponsibleName] = useState(defaultResponsible);
  const [note, setNote] = useState('');
  const head = (
    <p className="text-[11px] text-slate-500">
      <strong className="text-[#0F172A]">{item.designation}</strong> · {item.inventoryCode} · actuellement : <strong>{item.responsibleName || '—'}</strong>
    </p>
  );
  if (kind === 'affectation') {
    return (
      <Modal title="Remettre à un gardien" icon="assignment_ind" onClose={onClose}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ kind, guardId, note }, 'Matériel remis au gardien.'); }}>
          {head}
          {guards.length === 0 ? (
            <p className="text-slate-500">Aucun gardien sur le site de ce matériel.</p>
          ) : (
            <label className="block">
              <span className={label}>Gardien *</span>
              <select required value={guardId} onChange={(e) => setGuardId(e.target.value)} className={field}>
                {guards.map((g) => (
                  <option key={g.id} value={g.id}>{g.fullName} — {g.matricule}{g.isTeamLeader ? ' (chef)' : ''}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block"><span className={label}>Remarque</span><input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="État du matériel, accessoires…" className={field} /></label>
          <p className="text-[10px] text-slate-400">Le matériel passe dans « Confiés aux gardiens » et apparaît sur la fiche du gardien.</p>
          <Footer onClose={onClose} busy={busy} submitLabel="Remettre" disabled={guards.length === 0} />
        </form>
      </Modal>
    );
  }
  return (
    <Modal title="Restitution du matériel" icon="assignment_return" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ kind, responsibleName, note }, 'Restitution enregistrée.'); }}>
        {head}
        <label className="block">
          <span className={label}>Repris par *</span>
          <input required maxLength={150} value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} placeholder="ex : Magasin, chef de poste…" className={field} />
        </label>
        <label className="block"><span className={label}>Remarque</span><input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="État au retour…" className={field} /></label>
        <Footer onClose={onClose} busy={busy} submitLabel="Enregistrer la restitution" />
      </form>
    </Modal>
  );
};

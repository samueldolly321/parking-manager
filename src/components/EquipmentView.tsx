import React, { useState } from 'react';
import { notifyNotAvailable } from '../services/notify';
import { EntityActions } from './EntityActions';
import { Equipment, Site } from '../types';

interface EquipmentViewProps {
  equipments: Equipment[];
  sites: Site[];
  selectedSiteId: string;
  /** Record selected on arrival (from the header search) */
  initialSelectedId?: string;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({ equipments, sites, selectedSiteId, initialSelectedId }) => {
  const [selectedCode, setSelectedCode] = useState<string>(initialSelectedId || equipments[0]?.inventoryCode || 'MAT-BAR-002');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>(selectedSiteId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEquipments = equipments.filter((eq) => {
    const matchesCat = categoryFilter === 'all' || eq.category === categoryFilter;
    const matchesSite = siteFilter === 'all' || eq.siteId === siteFilter;
    const matchesQuery =
      eq.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.inventoryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSite && matchesQuery;
  });

  const selectedItem = equipments.find((eq) => eq.inventoryCode === selectedCode) || equipments[0];

  const formatAr = (val: number) => {
    return new Intl.NumberFormat('fr-FR').format(val).replace(/[  ,]/g, ' ');
  };

  const siteName = (siteId: string) =>
    (sites.find((s) => s.id === siteId)?.name || siteId).replace(/^Site \d+\s*-\s*/, '');

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

  const STATUS_LABEL: Record<Equipment['status'], string> = {
    operationnel: 'Opérationnel',
    maintenance: 'Maintenance',
    critique: 'Critique',
    controle_requis: 'Contrôle'
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0]">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 font-mono-data text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-[#06B6D4] uppercase font-bold border border-slate-200">
              PATRIMOINE TECHNIQUE
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-semibold uppercase">
              {siteFilter === 'all' ? 'Tous les sites' : siteName(siteFilter)}
            </span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-[#0F172A]">
            Inventaire des Matériels &amp; Équipements
          </h1>
          <p className="text-xs text-slate-500">
            Suivi patrimonial des installations de péage, barrières automatiques, télécommunications, sécurité incendie et équipements remis aux gardiens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => notifyNotAvailable('Journal des mouvements de matériel')}
            type="button"
            className="bg-[#F8FAFC] text-[#0F172A] hover:bg-slate-100 text-xs font-headline font-bold px-3 py-2 rounded-lg border border-[#E2E8F0] flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>Journal Mouvements</span>
          </button>
          <button
            onClick={() => notifyNotAvailable('Inventaire / audit physique')}
            type="button"
            className="bg-[#F8FAFC] text-[#0F172A] hover:bg-slate-100 text-xs font-headline font-bold px-3 py-2 rounded-lg border border-[#E2E8F0] flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">fact_check</span>
            <span>Faire un Inventaire / Audit</span>
          </button>
          <button
            onClick={() => notifyNotAvailable('Ajout d’un équipement')}
            type="button"
            className="bg-[#0F172A] text-white hover:bg-slate-800 text-xs font-headline font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
          >
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">add_circle</span>
            <span>+ Ajouter un Équipement</span>
          </button>
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
        {/* Table Section */}
        <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col">
          {/* Filter Tabs & Site Selection */}
          <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: `Tous les matériels (${siteEquipments.length})` },
                { id: 'barriers', label: `Barrières & Bornes (${countCategory('barriers')})` },
                { id: 'telecom', label: `Télécoms & LoRa (${countCategory('telecom')})` },
                { id: 'security', label: `Sécurité & Extincteurs (${countCategory('security')})` },
                { id: 'monetique', label: `Monétique (${countCategory('monetique')})` },
                { id: 'assigned', label: `Confiés Gardiens (${countCategory('assigned')})` }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-headline whitespace-nowrap transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-[#0F172A] text-white font-bold shadow-sm'
                      : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="bg-white text-xs font-medium text-[#0F172A] py-1.5 px-3 rounded-lg border border-[#E2E8F0]"
              >
                <option value="all">Tous Sites</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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

          {/* High-Density Equipment Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] text-slate-500 uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
                  <th className="py-2.5 px-3">Code Inv.</th>
                  <th className="py-2.5 px-3">Désignation &amp; Modèle</th>
                  <th className="py-2.5 px-3">Catégorie / Site</th>
                  <th className="py-2.5 px-3">Qté &amp; Voie</th>
                  <th className="py-2.5 px-3">État</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3 text-right">Dernier Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredEquipments.map((eq) => {
                  const isSelected = selectedItem?.inventoryCode === eq.inventoryCode;
                  return (
                    <tr
                      key={eq.id}
                      onClick={() => setSelectedCode(eq.inventoryCode)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-cyan-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono-plate text-xs font-bold text-[#0F172A] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                          {eq.inventoryCode}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#0F172A]">{eq.designation}</span>
                          <span className="font-mono-data text-[10px] text-slate-400 truncate max-w-xs">{eq.modelSpecs}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[#06B6D4] font-semibold">{eq.category.toUpperCase()}</span>
                          <span className="font-mono-data text-[10px] text-slate-500">
                            {siteName(eq.siteId)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono-data font-bold text-[#0F172A]">{eq.quantity} unit.</span>
                        <div className="text-[10px] text-slate-400">{eq.location}</div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
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
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-[#0F172A] font-medium block">{eq.responsibleName}</span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono-data text-slate-500">
                        {eq.lastAuditDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between font-mono-data text-xs text-slate-500">
            <span>Affichage de {filteredEquipments.length} matériels répertoriés</span>
            <span>Valeur totale : {formatAr(filteredValueAr)} Ar</span>
          </div>
        </div>

        {/* Right Drawer: Fiche de Vie Équipement (440px on XL) */}
        {selectedItem && (
        <div className="w-full xl:w-[420px] shrink-0 bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-5 space-y-5 flex flex-col sticky top-20">
          <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="space-y-0.5">
              <span className="font-mono-data text-[10px] text-[#06B6D4] font-bold uppercase tracking-wider">
                FICHE DE VIE ÉQUIPEMENT
              </span>
              <h2 className="font-headline text-lg font-bold text-[#0F172A] leading-tight">
                {selectedItem.designation}
              </h2>
              <div className="pt-1"><EntityActions collection="equipments" record={selectedItem} label={selectedItem.designation} /></div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono-plate text-xs font-bold text-[#0F172A] bg-slate-100 px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                  {selectedItem.inventoryCode}
                </span>
                <span className="text-xs text-slate-500">
                  {siteName(selectedItem.siteId)}
                </span>
              </div>
            </div>

            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                selectedItem.status === 'operationnel' ? 'bg-emerald-100 text-[#16A34A]' : 'bg-red-100 text-[#DC2626]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {selectedItem.status === 'operationnel' ? 'check_circle' : 'build'}
              </span>
            </span>
          </div>

          {/* Technical Specifications */}
          <div className="bg-[#F8FAFC] p-3.5 rounded-lg border border-[#E2E8F0] space-y-2 text-xs">
            <div className="font-headline font-bold text-[#0F172A] flex items-center gap-1.5 text-xs">
              <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">memory</span>
              Spécifications &amp; Électromécanique
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-body text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Modèle:</span>
                <span className="font-bold text-[#0F172A]">{selectedItem.modelSpecs.split('•')[0] || selectedItem.designation}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Emplacement:</span>
                <span className="font-bold text-[#0F172A]">{selectedItem.location || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Mise en service:</span>
                <span className="font-mono-data text-[#0F172A]">{selectedItem.commissioningDate || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cycles totaux:</span>
                <span className="font-mono-data text-[#06B6D4] font-bold">{selectedItem.totalCycles || '—'}</span>
              </div>
            </div>
          </div>

          {/* Incident / Maintenance Status Alert */}
          {(selectedItem.status === 'maintenance' || selectedItem.status === 'critique') && (
            <div className="bg-red-50 p-3.5 rounded-lg border border-red-200 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-[#DC2626] font-bold font-headline">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>{selectedItem.status === 'critique' ? 'Panne critique' : 'Matériel en maintenance'}</span>
              </div>
              {selectedItem.maintenanceHistory[0] && (
                <p className="text-slate-700 text-xs">
                  Dernière intervention ({selectedItem.maintenanceHistory[0].date}) : {selectedItem.maintenanceHistory[0].title}
                </p>
              )}
              <div className="font-mono-data text-[10px] text-slate-500 pt-1">
                Responsable : {selectedItem.responsibleName}
              </div>
            </div>
          )}

          {/* Maintenance History */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-headline text-xs font-bold text-[#0F172A]">Historique Révisions &amp; Mouvements</span>
              <span className="font-mono-data text-[10px] text-[#06B6D4] font-bold">
                {selectedItem.maintenanceHistory.length} interventions
              </span>
            </div>

            <div className="space-y-3 relative pl-3 border-l-2 border-slate-200 ml-1">
              {selectedItem.maintenanceHistory.length > 0 ? (
                selectedItem.maintenanceHistory.map((m, idx) => (
                  <div key={idx} className="relative pl-2">
                    <span
                      className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${
                        m.isCritical ? 'bg-[#DC2626]' : 'bg-[#06B6D4]'
                      }`}
                    ></span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0F172A]">{m.title}</span>
                      <span className="font-mono-data text-[10px] text-slate-400">{m.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-2">Aucune intervention majeure requise récemment. Contrôle nominal.</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <button
              onClick={() => notifyNotAvailable('Planification d’intervention technique')}
              type="button"
              className="w-full bg-[#0F172A] text-white hover:bg-slate-800 font-headline text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">calendar_month</span>
              <span>Planifier Intervention Technique</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => notifyNotAvailable('Déclaration de panne (utilisez la page Incidents)')}
                type="button"
                className="bg-red-50 text-[#DC2626] hover:bg-red-100 font-headline text-xs font-bold py-2 rounded-lg border border-red-200 flex items-center justify-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">report_problem</span>
                <span>Déclarer Panne</span>
              </button>
              <button
                onClick={() => notifyNotAvailable('Transfert de matériel entre sites')}
                type="button"
                className="bg-slate-100 text-[#0F172A] hover:bg-slate-200 font-headline text-xs font-bold py-2 rounded-lg border border-[#E2E8F0] flex items-center justify-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">move_up</span>
                <span>Transférer Site</span>
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Main Courante des Équipements Remis aux Gardiens */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-headline text-base font-bold text-[#0F172A]">Main Courante des Équipements Remis aux Gardiens</h3>
            <p className="text-xs text-slate-500">Matériel de la catégorie « Confiés Gardiens » et son responsable actuel.</p>
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
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#06B6D4] shrink-0 border border-[#E2E8F0] shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">assignment_ind</span>
                </div>
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
    </div>
  );
};

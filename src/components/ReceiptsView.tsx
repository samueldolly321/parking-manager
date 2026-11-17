import React, { useState } from 'react';
import { EntityActions } from './EntityActions';
import { PaymentReceipt, Site } from '../types';

interface ReceiptsViewProps {
  receipts: PaymentReceipt[];
  sites: Site[];
  selectedSiteId: string;
  onOpenNewPayment: () => void;
  onSelectReceipt: (receipt: PaymentReceipt) => void;
  /** Text pre-filled in the search field (from the header search) */
  initialSearch?: string;
}

export const ReceiptsView: React.FC<ReceiptsViewProps> = ({
  receipts,
  sites,
  selectedSiteId,
  onOpenNewPayment,
  onSelectReceipt,
  initialSearch
}) => {
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>(selectedSiteId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch || '');

  const filtered = receipts.filter(r => {
    const matchesSite = filterSite === 'all' || r.siteId === filterSite;
    const matchesMethod = filterMethod === 'all' || r.paymentMethod === filterMethod;
    const matchesSearch =
      r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.vehiclePlate && r.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.transactionRef.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSite && matchesMethod && matchesSearch;
  });

  const totalCollectedAr = filtered.reduce((sum, r) => sum + r.amountPaidAr, 0);

  const formatAr = (val: number) => {
    return new Intl.NumberFormat('fr-MG').format(val).replace(/,/g, ' ');
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono-data text-xs text-slate-500 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">receipt_long</span>
            Finances &amp; Trésorerie
          </div>
          <h1 className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
            Encaissements &amp; Émission de Reçus
          </h1>
          <p className="text-xs text-slate-500">
            Journal général des encaissements par caisse, passerelle Mobile Money et virements bancaires.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.print()}
            type="button"
            className="bg-white text-[#0F172A] font-headline text-xs font-bold px-3.5 py-2 rounded-lg border border-[#E2E8F0] shadow-sm hover:bg-slate-50 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Exporter Journal Fiscal</span>
          </button>
          <button
            onClick={onOpenNewPayment}
            type="button"
            className="bg-[#06B6D4] text-[#0F172A] font-headline text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#0891b2] hover:text-white transition-all shadow-md flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Nouvel Encaissement</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0]">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Encaissé Filtré</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#16A34A]">{formatAr(totalCollectedAr)}</span>
            <span className="font-mono-data text-xs text-slate-500">Ar</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{filtered.length} transactions enregistrées</span>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0]">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Part Mobile Money</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#06B6D4]">
              {formatAr(filtered.filter(r => r.paymentMethod.includes('Money') || r.paymentMethod === 'MVola').reduce((s, r) => s + r.amountPaidAr, 0))}
            </span>
            <span className="font-mono-data text-xs text-slate-500">Ar</span>
          </div>
          <span className="text-[11px] text-[#06B6D4] font-medium mt-0.5 block">MVola, Orange Money, Airtel Money</span>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0]">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Part Espèces &amp; Caisse</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#0F172A]">
              {formatAr(filtered.filter(r => r.paymentMethod === 'Espèces').reduce((s, r) => s + r.amountPaidAr, 0))}
            </span>
            <span className="font-mono-data text-xs text-slate-500">Ar</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Guichets d'exploitation physiques</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher numéro de reçu, membre, plaque, référence..."
            className="w-full bg-[#F8FAFC] text-xs rounded-lg py-2 pl-9 pr-3 border border-[#E2E8F0] focus:ring-1 focus:ring-[#06B6D4]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 uppercase font-semibold text-[10px]">Site :</span>
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="bg-[#F8FAFC] text-xs font-medium text-[#0F172A] py-1.5 px-3 rounded-lg border border-[#E2E8F0]"
            >
              <option value="all">Tous les sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 uppercase font-semibold text-[10px]">Mode :</span>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="bg-[#F8FAFC] text-xs font-medium text-[#0F172A] py-1.5 px-3 rounded-lg border border-[#E2E8F0]"
            >
              <option value="all">Tous les modes</option>
              <option value="MVola">MVola</option>
              <option value="Orange Money">Orange Money</option>
              <option value="Airtel Money">Airtel Money</option>
              <option value="Espèces">Espèces</option>
              <option value="Virement BNI">Virement Bancaire</option>
              <option value="Chèque">Chèque</option>
            </select>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] text-slate-500 font-semibold uppercase tracking-wider border-b border-[#E2E8F0]">
                <th className="py-2.5 px-3">Réf Reçu</th>
                <th className="py-2.5 px-3">Date &amp; Heure</th>
                <th className="py-2.5 px-3">Membre / Client</th>
                <th className="py-2.5 px-3">Véhicule</th>
                <th className="py-2.5 px-3">Objet &amp; Période</th>
                <th className="py-2.5 px-3">Mode &amp; Transaction</th>
                <th className="py-2.5 px-3 text-right">Montant</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-mono-data font-bold text-[#0F172A]">
                    {r.receiptNumber}
                    <div className="mt-1"><EntityActions compact collection="receipts" record={r} label={`Reçu ${r.receiptNumber}`} /></div>
                  </td>
                  <td className="py-3 px-3 font-mono-data text-slate-500">{r.dateTime}</td>
                  <td className="py-3 px-3 font-bold text-[#0F172A]">{r.memberName}</td>
                  <td className="py-3 px-3">
                    {r.vehiclePlate ? (
                      <span className="font-mono-plate px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-bold text-[10px]">
                        {r.vehiclePlate}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-[#0F172A]">{r.purpose}</div>
                    <div className="text-[10px] text-slate-400">{r.period}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 font-mono-data text-[10px] text-[#0F172A] font-semibold">
                      {r.paymentMethod}
                    </span>
                    <div className="text-[9px] font-mono-data text-slate-400 mt-0.5">{r.transactionRef}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono-data font-bold text-[#0F172A]">
                    {formatAr(r.amountPaidAr)} Ar
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-[#16A34A] font-mono-data text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                      Confirmé
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onSelectReceipt(r)}
                      type="button"
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-medium text-xs flex items-center gap-1 ml-auto"
                      title="Imprimer / Télécharger Reçu"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Reçu</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

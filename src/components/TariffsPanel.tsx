import React, { useEffect, useState } from 'react';
import { AppState, Tariff } from '../types';
import { addTariffRecord, deleteEntity, savePricing, updateEntity } from '../services/storage';
import { can } from '../services/access';
import { notify } from '../services/notify';
import { DEFAULT_PROMO, TARIFF_DURATION_LABELS, TARIFF_FORMULA_LABELS, monthlyAmount } from '../services/pricing';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/[  ,]/g, ' ');
const PERIOD: Record<Tariff['duration'], string> = { jour: 'jour', semaine: 'semaine', mois: 'mois', an: 'an', unique: 'une fois' };

/** Settings page: prices used at the cash desk and promotion on annual payment. */
export const TariffsPanel: React.FC<{ state: AppState }> = ({ state }) => {
  const canEdit = can('tariffs');
  const promo = state.pricing || DEFAULT_PROMO;
  type Draft = { name: string; amountAr: string; duration: Tariff['duration'] };
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const emptyNew = { name: '', typeFormula: 'autre' as Tariff['typeFormula'], duration: 'mois' as Tariff['duration'], amountAr: '', siteId: '' };
  const [showNew, setShowNew] = useState(false);
  const [nf, setNf] = useState(emptyNew);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [p, setP] = useState({ enabled: promo.enabled, percent: String(promo.percent), minMonths: String(promo.minMonths) });
  const [savingPromo, setSavingPromo] = useState(false);

  useEffect(() => {
    setP({ enabled: promo.enabled, percent: String(promo.percent), minMonths: String(promo.minMonths) });
  }, [promo.enabled, promo.percent, promo.minMonths]);

  const siteName = (id?: string) => (id ? state.sites.find((s) => s.id === id)?.name || id : 'Tous les sites');
  const tariffs = [...state.tariffs].sort((a, b) => a.name.localeCompare(b.name, 'fr') || (a.siteId || '').localeCompare(b.siteId || ''));
  const draftOf = (t: Tariff): Draft => draft[t.id] || { name: t.name, amountAr: String(t.amountAr), duration: t.duration };
  const edit = (t: Tariff, patch: Partial<Draft>) => setDraft((d) => ({ ...d, [t.id]: { ...draftOf(t), ...patch } }));

  const removeTariff = async (t: Tariff) => {
    if (!window.confirm(`Supprimer la formule « ${t.name} » ?\nElle ne sera plus proposée à l’encaissement. Les reçus déjà émis ne changent pas.`)) return;
    setBusyId(t.id);
    try {
      await deleteEntity('tariffs', t.id);
      notify('Formule supprimée.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Suppression impossible.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const createTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await addTariffRecord({ ...nf, amountAr: Number(nf.amountAr), siteId: nf.siteId || undefined });
      notify('Formule ajoutée.', 'success');
      setNf(emptyNew);
      setShowNew(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Création impossible.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const saveTariff = async (t: Tariff, patch: Partial<Tariff>) => {
    setBusyId(t.id);
    try {
      await updateEntity('tariffs', t.id, patch as Record<string, unknown>);
      setDraft((d) => {
        const n = { ...d };
        delete n[t.id];
        return n;
      });
      notify('Tarif enregistré.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Enregistrement impossible.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const submitPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPromo(true);
    try {
      await savePricing({ enabled: p.enabled, percent: Number(p.percent), minMonths: Number(p.minMonths) });
      notify('Promotion enregistrée.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Enregistrement impossible.', 'error');
    } finally {
      setSavingPromo(false);
    }
  };

  const example = tariffs.find((t) => t.typeFormula === 'placement_libre_interieur' && t.isActive);
  const exampleCalc = example ? monthlyAmount(example.amountAr, Number(p.minMonths) || 12, { enabled: p.enabled, percent: Number(p.percent) || 0, minMonths: Number(p.minMonths) || 12 }) : null;

  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
        <span className="material-symbols-outlined text-[#06B6D4]">sell</span>
        <div>
          <h2 className="font-headline text-base font-bold text-[#0F172A]">Tarifs &amp; promotions</h2>
          <p className="text-xs text-slate-500">Prix utilisés à l’encaissement. {canEdit ? '' : 'Modification réservée au Président Général, au Trésorier Général et aux administrateurs.'}</p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Tariffs */}
        <div className="xl:col-span-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-slate-500 bg-slate-50">
              <tr>
                <th className="text-left py-2 px-2">Formule</th>
                <th className="text-left py-2 px-2">Paiement</th>
                <th className="text-left py-2 px-2">Site</th>
                <th className="text-right py-2 px-2">Prix (Ar)</th>
                <th className="text-center py-2 px-2">Actif</th>
                {canEdit && <th className="py-2 px-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tariffs.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400">Aucune formule : ajoutez-en une.</td></tr>
              )}
              {tariffs.map((t) => {
                const d = draftOf(t);
                const changed = d.name.trim() !== t.name || Number(d.amountAr) !== t.amountAr || d.duration !== t.duration;
                const valid = d.name.trim() !== '' && Number(d.amountAr) >= 0 && d.amountAr !== '';
                return (
                  <tr key={t.id} className={t.isActive ? '' : 'opacity-50'}>
                    <td className="py-2 px-2 min-w-[180px]">
                      {canEdit ? (
                        <input
                          value={d.name}
                          maxLength={150}
                          onChange={(e) => edit(t, { name: e.target.value })}
                          className="w-full p-1.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] font-semibold text-[#0F172A]"
                        />
                      ) : (
                        <span className="font-semibold text-[#0F172A] block">{t.name}</span>
                      )}
                      <span className="text-[10px] text-slate-400">{TARIFF_FORMULA_LABELS[t.typeFormula] || t.typeFormula}</span>
                    </td>
                    <td className="py-2 px-2">
                      {canEdit ? (
                        <select value={d.duration} onChange={(e) => edit(t, { duration: e.target.value as Tariff['duration'] })} className="p-1.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
                          {Object.entries(TARIFF_DURATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      ) : (
                        <span className="text-slate-600">{TARIFF_DURATION_LABELS[t.duration] || t.duration}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-slate-600">{siteName(t.siteId)}</td>
                    <td className="py-2 px-2 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={d.amountAr}
                          onChange={(e) => edit(t, { amountAr: e.target.value })}
                          className="w-28 p-1.5 text-right font-mono-data border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]"
                        />
                      ) : (
                        <span className="font-mono-data font-bold">{fmt(t.amountAr)}</span>
                      )}
                      <span className="block text-[10px] text-slate-400">/ {PERIOD[d.duration] || d.duration}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={t.isActive}
                        disabled={!canEdit || busyId === t.id}
                        onChange={(e) => saveTariff(t, { isActive: e.target.checked })}
                        title={t.isActive ? 'Proposée à l’encaissement' : 'Désactivée (non proposée)'}
                      />
                    </td>
                    {canEdit && (
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!changed || !valid || busyId === t.id}
                          onClick={() => saveTariff(t, { name: d.name.trim(), amountAr: Math.round(Number(d.amountAr)), duration: d.duration })}
                          className="px-2.5 py-1 rounded-lg bg-[#0F172A] text-white font-bold disabled:opacity-30"
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          title="Supprimer la formule"
                          disabled={busyId === t.id}
                          onClick={() => removeTariff(t)}
                          className="ml-1 p-1 rounded-md hover:bg-rose-50 text-rose-600 align-middle"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-slate-400">
            Chaque formule active est proposée à l’encaissement. « Une seule fois » : payée une seule fois par membre (ex. droit d’adhésion).
            Une formule propre à un site remplace la formule « Tous les sites » du même type. Les reçus déjà émis ne changent pas.
          </p>
          {canEdit && !showNew && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowNew(true)} className="px-3 py-1.5 rounded-lg bg-[#06B6D4] text-[#0F172A] font-bold">
                + Ajouter une formule
              </button>
              {!state.tariffs.some((t) => t.duration === 'unique') && (
                <button
                  type="button"
                  onClick={() => {
                    setNf({ ...emptyNew, name: 'Droit d’adhésion', typeFormula: 'droit_adhesion', duration: 'unique' });
                    setShowNew(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] font-semibold hover:bg-slate-50"
                >
                  + Droit d’adhésion (payé une fois)
                </button>
              )}
            </div>
          )}
          {canEdit && showNew && (
            <form onSubmit={createTariff} className="mt-3 p-3 rounded-xl border border-cyan-200 bg-cyan-50/40 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <label className="block col-span-2 sm:col-span-3">
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">Nom de la formule *</span>
                <input required maxLength={150} value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="ex : Droit d’adhésion, Lavage, Pass journalier…" className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white" />
              </label>
              <label className="block">
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">Paiement *</span>
                <select value={nf.duration} onChange={(e) => setNf({ ...nf, duration: e.target.value as Tariff['duration'] })} className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white">
                  {Object.entries(TARIFF_DURATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">Type</span>
                <select value={nf.typeFormula} onChange={(e) => setNf({ ...nf, typeFormula: e.target.value as Tariff['typeFormula'] })} className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white">
                  {Object.entries(TARIFF_FORMULA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">Prix (Ar) *</span>
                <input required type="number" min={0} step={1000} value={nf.amountAr} onChange={(e) => setNf({ ...nf, amountAr: e.target.value })} className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white font-mono-data" />
              </label>
              <label className="block col-span-2 sm:col-span-1">
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">Site</span>
                <select value={nf.siteId} onChange={(e) => setNf({ ...nf, siteId: e.target.value })} className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white">
                  <option value="">Tous les sites</option>
                  {state.sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              <div className="col-span-2 flex items-end justify-end gap-2">
                <button type="button" onClick={() => { setShowNew(false); setNf(emptyNew); }} className="px-3 py-2 rounded-lg bg-white border border-[#E2E8F0]">Annuler</button>
                <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-[#0F172A] text-white font-bold disabled:opacity-50">
                  {creating ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Annual payment promotion */}
        <form onSubmit={submitPromo} className="xl:col-span-2 rounded-xl border border-[#E2E8F0] p-4 space-y-3 text-xs bg-[#F8FAFC]">
          <h3 className="font-headline text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">percent</span>
            Promotion paiement annuel
          </h3>
          <label className="flex items-center gap-2 text-[#0F172A]">
            <input type="checkbox" checked={p.enabled} disabled={!canEdit} onChange={(e) => setP({ ...p, enabled: e.target.checked })} />
            Activer la remise
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">Remise (%)</span>
              <input type="number" min={0} max={100} step={0.5} disabled={!canEdit || !p.enabled} value={p.percent} onChange={(e) => setP({ ...p, percent: e.target.value })} className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white" />
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">Mois payés d’un coup</span>
              <input type="number" min={2} max={60} step={1} disabled={!canEdit || !p.enabled} value={p.minMonths} onChange={(e) => setP({ ...p, minMonths: e.target.value })} className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white" />
            </label>
          </div>
          {exampleCalc && p.enabled && (
            <p className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
              Exemple — {example!.name} : {p.minMonths} mois = {fmt(exampleCalc.grossAr)} Ar, remise {fmt(exampleCalc.discountAr)} Ar,
              <strong> à payer {fmt(exampleCalc.netAr)} Ar</strong>.
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            S’applique à l’encaissement des abonnements mensuels quand le membre règle au moins ce nombre de mois en une fois. La remise figure sur le reçu.
          </p>
          {canEdit && (
            <button type="submit" disabled={savingPromo} className="w-full py-2 rounded-lg bg-[#0F172A] text-white font-bold disabled:opacity-50">
              {savingPromo ? 'Enregistrement…' : 'Enregistrer la promotion'}
            </button>
          )}
        </form>
      </div>
    </section>
  );
};

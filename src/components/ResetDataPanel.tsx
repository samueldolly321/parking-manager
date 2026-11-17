import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, CheckCircle2, X, Loader2 } from 'lucide-react';
import { AppState } from '../types';
import { resetOperationalData, ResetSummary } from '../services/storage';

const CONFIRMATION_WORD = 'REINITIALISER';

interface ResetDataPanelProps {
  state: AppState;
  /** Lets the user save the audit log before it is wiped. */
  onExportAudit: () => void;
}

/** "Zone sensible" card in Paramètres & Audit: wipes operational data, keeps configuration. */
export const ResetDataPanel: React.FC<ResetDataPanelProps> = ({ state, onExportAudit }) => {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ResetSummary | null>(null);

  const occupiedSpots = state.spots.filter((s) => s.status === 'occupe' || s.status === 'reserve').length;
  const toDelete: [string, number][] = [
    ['Membres & propriétaires', state.members.length],
    ['Véhicules', state.vehicles.length],
    ['Abonnements', state.subscriptions.length],
    ['Reçus & encaissements', state.receipts.length],
    ['Cartes de membres', state.cards.length],
    ['Dépenses', state.expenses.length],
    ['Fiches de paie', state.payrolls.length],
    ['Incidents', state.incidents.length],
    ['Réunions du comité', state.meetings.length],
    ["Lignes du journal d'audit", state.auditLogs.length]
  ];
  const kept = [
    `${state.sites.length} sites`,
    `${state.spots.length} emplacements (vidés)`,
    `${state.tariffs.length} tarifs`,
    `${state.guards.length} gardiens`,
    `${state.committeeMembers.length} membres du comité`,
    `${state.equipments.length} équipements`,
    'les comptes utilisateurs'
  ];

  const wordOk = typed.trim() === CONFIRMATION_WORD;

  const close = () => {
    if (running) return;
    setOpen(false);
    setError(null);
  };

  const confirm = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await resetOperationalData(typed.trim());
      setSummary(result);
      setOpen(false);
      setTyped('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La remise à zéro a échoué.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 bg-red-50/60 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
          <h2 className="text-base font-bold font-title text-slate-900">Zone sensible — Remise à zéro des données</h2>
        </div>
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="text-sm text-slate-600 space-y-2 max-w-3xl">
            <p>
              Efface toutes les données d'exploitation (membres, véhicules, encaissements, dépenses, paies, incidents,
              réunions, journal d'audit), libère tous les emplacements et remet les caisses à <strong>0 Ar</strong>.
            </p>
            <p className="text-slate-500">
              La configuration est conservée : sites, emplacements, tarifs, personnel, comité, matériel et comptes
              utilisateurs. Cette action est <strong className="text-[#DC2626]">irréversible</strong>.
            </p>
          </div>
          <div className="shrink-0 w-full lg:w-72 space-y-2">
            <label htmlFor="reset-confirm-word" className="block text-xs text-slate-600">
              Tapez <strong className="font-mono-data text-[#DC2626]">{CONFIRMATION_WORD}</strong> pour activer le bouton :
            </label>
            <input
              id="reset-confirm-word"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRMATION_WORD}
              autoComplete="off"
              spellCheck={false}
              className={`w-full px-3 py-2 rounded-xl border font-mono-data text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
                typed && !wordOk ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
              }`}
            />
            <button
              onClick={() => { setSummary(null); setError(null); setOpen(true); }}
              disabled={!wordOk}
              title={wordOk ? undefined : `Tapez ${CONFIRMATION_WORD} dans le champ ci-dessus`}
              className="w-full px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#DC2626]"
            >
              <RotateCcw className="w-4 h-4" />
              Remettre à zéro…
            </button>
          </div>
        </div>
        {summary && (
          <div className="mx-6 mb-6 p-4 rounded-xl border border-green-200 bg-green-50 text-sm text-green-800 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
            <p>
              Remise à zéro effectuée : {summary.members} membres, {summary.vehicles} véhicules, {summary.receipts} reçus,{' '}
              {summary.expenses} dépenses, {summary.payrolls} paies et {summary.incidents} incidents supprimés ;{' '}
              {summary.spotsFreed} places libérées, {summary.cashRegistersZeroed} caisse(s) remise(s) à 0 Ar.
            </p>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 id="reset-title" className="text-base font-bold font-title text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
                Confirmer la remise à zéro
              </h3>
              <button onClick={close} aria-label="Fermer" className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-900 mb-2">Sera supprimé définitivement :</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  {toDelete.map(([label, n]) => (
                    <li key={label} className="flex justify-between text-slate-700">
                      <span>{label}</span>
                      <span className="font-mono-data font-semibold">{n}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-slate-600">
                  + {occupiedSpots} emplacement(s) occupé(s) ou réservé(s) libéré(s), {state.cashRegisters.length} caisse(s) remise(s) à 0 Ar.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
                <span className="font-semibold text-slate-800">Conservé : </span>
                {kept.join(', ')}.
              </div>
              <p className="text-slate-600">
                Conseil : <button onClick={onExportAudit} className="text-[#0891B2] font-semibold underline underline-offset-2">exportez le journal d'audit (CSV)</button> avant de continuer.
              </p>
              <p className="font-semibold text-slate-900">Cette action est irréversible. Confirmez-vous la remise à zéro ?</p>
              {error && (
                <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626]">{error}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={close} disabled={running} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                Annuler
              </button>
              <button
                onClick={confirm}
                disabled={!wordOk || running}
                className="px-4 py-2 rounded-xl bg-[#DC2626] text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {running ? 'Remise à zéro…' : 'Tout remettre à zéro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

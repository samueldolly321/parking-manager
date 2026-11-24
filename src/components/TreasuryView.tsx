import React, { useState } from 'react';
import { notify } from '../services/notify';
import { can, currentUserName } from '../services/access';
import { cashRegisterAction } from '../services/storage';
import { EntityActions } from './EntityActions';
import { PhotoInput, downloadPhoto } from './PhotoInput';
import { CashRegister, ExpenseRecord, Site, PaymentMethod, EXPENSE_UNITS } from '../types';

/** Invoices must stay readable: keep up to 1400 px on the longest side. */
const INVOICE_PHOTO_MAX_PX = 1400;

/** Units that never take a plural "s". */
const INVARIABLE_UNITS = new Set(['kg', 'g']);

/** "20 litres", "1 boîte", "2,5 kg", "3 rouleaux" */
function formatQuantity(quantity: number, unit?: string) {
  const qty = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(quantity);
  if (!unit) return qty;
  if (quantity < 2 || INVARIABLE_UNITS.has(unit)) return `${qty} ${unit}`;
  return `${qty} ${unit.endsWith('eau') ? `${unit}x` : `${unit}s`}`;
}

interface TreasuryViewProps {
  cashRegisters: CashRegister[];
  expenses: ExpenseRecord[];
  sites: Site[];
  selectedSiteId: string;
  onApproveExpense: (expenseId: string) => void;
  onRejectExpense: (expenseId: string) => void;
  /** Resolves once the expense is saved on the server, rejects with a readable message otherwise. */
  onAddExpense: (expenseData: Partial<ExpenseRecord>) => Promise<void>;
}

export const TreasuryView: React.FC<TreasuryViewProps> = ({
  cashRegisters,
  expenses,
  sites,
  selectedSiteId,
  onApproveExpense,
  onRejectExpense,
  onAddExpense
}) => {
  // Closing / opening a cash register
  const [registerDialog, setRegisterDialog] = useState<{ reg: CashRegister; action: 'close' | 'open' } | null>(null);
  const [countedCash, setCountedCash] = useState('');
  const [registerNotes, setRegisterNotes] = useState('');
  const [registerCashier, setRegisterCashier] = useState('');
  const [registerBusy, setRegisterBusy] = useState(false);
  const startRegisterDialog = (d: { reg: CashRegister; action: 'close' | 'open' } | null) => {
    setRegisterDialog(d);
    setCountedCash(d ? String(d.reg.currentCashInHandAr) : '');
    setRegisterNotes('');
    setRegisterCashier(d ? (currentUserName() || d.reg.cashierName) : '');
  };
  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerDialog) return;
    setRegisterBusy(true);
    try {
      const { reg, action } = registerDialog;
      if (action === 'close') {
        await cashRegisterAction(reg.id, 'close', { countedCashAr: Number(countedCash), notes: registerNotes });
        notify(`Caisse ${reg.registerCode} clôturée.`, 'success');
      } else {
        await cashRegisterAction(reg.id, 'open', { openingBalanceAr: Number(countedCash), cashierName: registerCashier });
        notify(`Caisse ${reg.registerCode} ouverte.`, 'success');
      }
      setRegisterDialog(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Opération impossible.', 'error');
    } finally {
      setRegisterBusy(false);
    }
  };

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [desc, setDesc] = useState<string>('');
  const [beneficiary, setBeneficiary] = useState<string>('');
  const [amountAr, setAmountAr] = useState<number>(100000);
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<string>('unité');
  const [category, setCategory] = useState<any>('Carburant Groupe');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Espèces');
  const [siteId, setSiteId] = useState<string>(sites[0]?.id || 'S1');
  const [invoicePhoto, setInvoicePhoto] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [viewedInvoice, setViewedInvoice] = useState<ExpenseRecord | null>(null);

  const filteredExpenses = expenses.filter(e => selectedSiteId === 'all' || e.siteId === selectedSiteId);
  const pendingExpenses = filteredExpenses.filter(e => e.status === 'en_attente');
  const decidedExpenses = filteredExpenses.filter(e => e.status !== 'en_attente');
  const pendingTotalAr = pendingExpenses.reduce((sum, e) => sum + e.amountAr, 0);
  const filteredRegisters = cashRegisters.filter(r => selectedSiteId === 'all' || r.siteId === selectedSiteId);

  const formatAr = (val: number) => {
    return new Intl.NumberFormat('fr-FR').format(val).replace(/[  ,]/g, ' ');
  };
  const siteName = (id: string) => (sites.find((s) => s.id === id)?.name || id).replace(/^Site \d+\s*-\s*/, '');

  const resetForm = () => {
    setDesc('');
    setBeneficiary('');
    setAmountAr(100000);
    setQuantity('1');
    setUnit('unité');
    setInvoicePhoto(undefined);
    setSubmitError(null);
  };

  const closeModal = () => {
    if (submitting) return;
    resetForm();
    setShowAddModal(false);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity.replace(',', '.'));
    if (!desc.trim() || !beneficiary.trim() || amountAr <= 0) return;
    if (!Number.isFinite(qty) || qty <= 0) {
      setSubmitError('Indiquez une quantité supérieure à 0.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onAddExpense({
        description: desc.trim(),
        beneficiary: beneficiary.trim(),
        amountAr,
        category,
        paymentMethod,
        siteId,
        invoicePhotoUrl: invoicePhoto,
        quantity: qty,
        unit
      });
      resetForm();
      setShowAddModal(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'La dépense n’a pas été enregistrée.');
    } finally {
      setSubmitting(false);
    }
  };

  /** Small clickable invoice thumbnail, or a dash when there is none. */
  const invoiceCell = (exp: ExpenseRecord) =>
    exp.invoicePhotoUrl ? (
      <button
        type="button"
        onClick={() => setViewedInvoice(exp)}
        title="Voir la facture"
        className="w-10 h-10 rounded border border-[#E2E8F0] overflow-hidden hover:ring-2 hover:ring-[#06B6D4]"
      >
        <img src={exp.invoicePhotoUrl} alt={`Facture ${exp.expenseNumber}`} className="w-full h-full object-cover" />
      </button>
    ) : (
      <span className="text-slate-300">—</span>
    );

  const expenseDescription = (exp: ExpenseRecord) => (
    <>
      <span className="font-bold text-[#0F172A] block">{exp.category}</span>
      <span className="text-slate-500 text-[11px] block">{exp.description}</span>
      {exp.quantity !== undefined && exp.quantity > 0 && (
        <span className="mt-0.5 inline-flex items-center gap-1 font-mono-data text-[10px] text-[#0F172A] bg-slate-100 px-1.5 py-0.5 rounded">
          {formatQuantity(exp.quantity, exp.unit)}
          {exp.unit && (
            <span className="text-slate-500">
              · {formatAr(Math.round(exp.amountAr / exp.quantity))} Ar/{exp.unit}
            </span>
          )}
        </span>
      )}
    </>
  );

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono-data text-xs text-slate-500 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">account_balance_wallet</span>
            Finances &amp; Trésorerie
          </div>
          <h1 className="font-headline text-2xl font-bold text-[#0F172A] tracking-tight">
            Trésorerie, Caisses &amp; Approbations des Dépenses
          </h1>
          <p className="text-xs text-slate-500">
            Suivi des balances de caisses par site, réconciliation espèces/mobile money et circuit d'autorisation des dépenses.
          </p>
        </div>

        {can('finance') && (
          <button
            onClick={() => setShowAddModal(true)}
            type="button"
            className="bg-[#0F172A] text-white font-headline text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors shadow-md flex items-center gap-1.5 self-start xl:self-auto"
          >
            <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">add_circle</span>
            <span>+ Engager une Dépense</span>
          </button>
        )}
      </div>

      {/* Caisses par site Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredRegisters.map((reg) => (
          <div key={reg.id} className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono-data text-xs font-bold text-[#06B6D4] bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                {reg.registerCode}
              </span>
              {reg.status === 'ouverte' ? (
                <span className="inline-flex items-center gap-1 font-mono-data text-[10px] font-bold text-[#16A34A] bg-emerald-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                  OUVERTE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono-data text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  CLÔTURÉE
                </span>
              )}
            </div>

            <div>
              <h3 className="font-headline text-sm font-bold text-[#0F172A]">{reg.siteName}</h3>
              <span className="text-xs text-slate-500 block">Caissier(e) : {reg.cashierName}</span>
              <span className="text-[11px] text-slate-400 block">{reg.status === 'ouverte' ? `Ouverte le ${reg.openedAt}` : reg.closures?.[0] ? `Clôturée le ${reg.closures[0].closedAt}` : 'Clôturée'}</span>
              <div className="mt-2"><EntityActions collection="cash-registers" record={reg} label={`Caisse ${reg.registerCode}`} /></div>
              <div className="mt-3 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fond initial :</span>
                  <span className="font-mono-data font-bold">{formatAr(reg.openingBalanceAr)} Ar</span>
                </div>
                <div className="flex justify-between text-[#16A34A]">
                  <span>Espèces collectées :</span>
                  <span className="font-mono-data font-bold">+{formatAr(reg.totalCashCollectedAr)} Ar</span>
                </div>
                <div className="flex justify-between text-[#06B6D4]">
                  <span>Mobile Money :</span>
                  <span className="font-mono-data font-bold">+{formatAr(reg.totalMobileMoneyAr)} Ar</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Dépenses sorties :</span>
                  <span className="font-mono-data font-bold">-{formatAr(reg.totalExpensesPaidAr)} Ar</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Espèces en main</span>
                <span className="font-headline text-base font-bold text-[#0F172A]">
                  {formatAr(reg.currentCashInHandAr)} Ar
                </span>
              </div>
              {can('finance') && (
                <button
                  onClick={() => startRegisterDialog({ reg, action: reg.status === 'ouverte' ? 'close' : 'open' })}
                  type="button"
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${reg.status === 'ouverte' ? 'bg-slate-100 hover:bg-slate-200' : 'bg-[#06B6D4] text-[#0F172A] hover:bg-[#0891B2] hover:text-white'}`}
                >
                  {reg.status === 'ouverte' ? 'Clôturer la caisse' : 'Ouvrir la caisse'}
                </button>
              )}
            </div>
            {reg.closures && reg.closures.length > 0 && (
              <details className="text-[11px] text-slate-600">
                <summary className="cursor-pointer text-[#06B6D4] font-semibold">Dernières clôtures ({reg.closures.length})</summary>
                <ul className="mt-2 space-y-1.5">
                  {reg.closures.slice(0, 5).map((c, i) => (
                    <li key={i} className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                      <div className="flex justify-between gap-2">
                        <span className="font-mono-data">{c.closedAt}</span>
                        <span className={`font-mono-data font-bold ${c.differenceAr === 0 ? 'text-[#16A34A]' : c.differenceAr < 0 ? 'text-[#DC2626]' : 'text-amber-600'}`}>
                          {c.differenceAr === 0 ? 'Juste' : `${c.differenceAr > 0 ? '+' : ''}${formatAr(c.differenceAr)} Ar`}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        Comptés {formatAr(c.countedCashAr)} / attendus {formatAr(c.expectedCashAr)} Ar · Mobile Money {formatAr(c.mobileMoneyAr)} Ar · par {c.closedBy || '—'}
                      </div>
                      {c.notes && <div className="italic text-slate-500">{c.notes}</div>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Table 1 : dépenses en attente d'approbation */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-headline text-base font-bold text-[#0F172A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-amber-600">pending_actions</span>
              Dépenses en attente d'approbation
            </h2>
            <p className="text-xs text-slate-500">Chaque nouvelle dépense arrive ici. Validation requise par le Trésorier avant tout décaissement.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-data text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold">
              {pendingExpenses.length} en attente
            </span>
            {pendingExpenses.length > 0 && (
              <span className="font-mono-data text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                {formatAr(pendingTotalAr)} Ar
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-amber-50/60 text-slate-500 font-semibold uppercase tracking-wider border-b border-[#E2E8F0]">
                <th className="py-2.5 px-3">N° Dépense</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Site</th>
                <th className="py-2.5 px-3">Catégorie &amp; Description</th>
                <th className="py-2.5 px-3">Bénéficiaire</th>
                <th className="py-2.5 px-3">Demandeur</th>
                <th className="py-2.5 px-3 text-center">Facture</th>
                <th className="py-2.5 px-3 text-right">Montant</th>
                <th className="py-2.5 px-3 text-right">Décision du Trésorier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {pendingExpenses.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Aucune dépense en attente d'approbation.</td>
                </tr>
              )}
              {pendingExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-amber-50/40 transition-colors">
                  <td className="py-3 px-3 font-mono-data font-bold text-[#0F172A]">
                    {exp.expenseNumber}
                    <div className="mt-1"><EntityActions compact collection="expenses" record={exp} label={`Dépense ${exp.expenseNumber}`} /></div>
                  </td>
                  <td className="py-3 px-3 font-mono-data text-slate-500">{exp.date}</td>
                  <td className="py-3 px-3 font-medium text-slate-700">{siteName(exp.siteId)}</td>
                  <td className="py-3 px-3">{expenseDescription(exp)}</td>
                  <td className="py-3 px-3 text-slate-600">{exp.beneficiary}</td>
                  <td className="py-3 px-3 text-slate-500">{exp.requesterName}</td>
                  <td className="py-3 px-3 text-center">{invoiceCell(exp)}</td>
                  <td className="py-3 px-3 text-right font-mono-data font-bold text-red-600">-{formatAr(exp.amountAr)} Ar</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {can('expense_approve') && (
                        <button
                          onClick={() => onApproveExpense(exp.id)}
                          type="button"
                          className="px-2.5 py-1 rounded bg-[#16A34A] text-white font-bold text-[11px] hover:bg-emerald-700"
                        >
                          Valider
                        </button>
                      )}
                      {can('expense_approve') && (
                        <button
                          onClick={() => onRejectExpense(exp.id)}
                          type="button"
                          className="px-2.5 py-1 rounded bg-red-100 text-red-700 font-semibold text-[11px] hover:bg-red-200"
                        >
                          Rejeter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2 : historique des dépenses traitées */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline text-base font-bold text-[#0F172A]">Historique des dépenses</h2>
            <p className="text-xs text-slate-500">Dépenses déjà approuvées ou rejetées</p>
          </div>
          <span className="font-mono-data text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
            {decidedExpenses.length} traitée{decidedExpenses.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] text-slate-500 font-semibold uppercase tracking-wider border-b border-[#E2E8F0]">
                <th className="py-2.5 px-3">N° Dépense</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Site</th>
                <th className="py-2.5 px-3">Catégorie &amp; Description</th>
                <th className="py-2.5 px-3">Bénéficiaire</th>
                <th className="py-2.5 px-3 text-center">Facture</th>
                <th className="py-2.5 px-3 text-right">Montant</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 text-right">Décidé par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {decidedExpenses.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Aucune dépense traitée pour le moment.</td>
                </tr>
              )}
              {decidedExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-mono-data font-bold text-[#0F172A]">
                    {exp.expenseNumber}
                    <div className="mt-1"><EntityActions compact collection="expenses" record={exp} label={`Dépense ${exp.expenseNumber}`} /></div>
                  </td>
                  <td className="py-3 px-3 font-mono-data text-slate-500">{exp.date}</td>
                  <td className="py-3 px-3 font-medium text-slate-700">{siteName(exp.siteId)}</td>
                  <td className="py-3 px-3">{expenseDescription(exp)}</td>
                  <td className="py-3 px-3 text-slate-600">{exp.beneficiary}</td>
                  <td className="py-3 px-3 text-center">{invoiceCell(exp)}</td>
                  <td className="py-3 px-3 text-right font-mono-data font-bold text-red-600">-{formatAr(exp.amountAr)} Ar</td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono-data text-[10px] font-bold ${
                        exp.status === 'approuve' ? 'bg-emerald-100 text-[#16A34A]' : 'bg-red-100 text-[#DC2626]'
                      }`}
                    >
                      {exp.status === 'approuve' ? 'Approuvé' : 'Rejeté'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-[10px] text-slate-500">
                    {exp.approverName?.split('(')[0] || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice viewer */}
      {viewedInvoice?.invoicePhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewedInvoice(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Facture ${viewedInvoice.expenseNumber}`}
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-headline text-sm font-bold text-[#0F172A]">Facture — {viewedInvoice.expenseNumber}</h3>
                <p className="text-[11px] text-slate-500">
                  {viewedInvoice.beneficiary} · {formatAr(viewedInvoice.amountAr)} Ar · {viewedInvoice.date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadPhoto(viewedInvoice.invoicePhotoUrl!, `facture_${viewedInvoice.expenseNumber}.jpg`)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#E2E8F0] hover:bg-slate-50 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">download</span>
                  Télécharger
                </button>
                <button type="button" onClick={() => setViewedInvoice(null)} aria-label="Fermer" className="text-slate-400 hover:text-[#0F172A]">
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>
            </div>
            <div className="overflow-auto p-4 bg-slate-50 flex justify-center">
              <img src={viewedInvoice.invoicePhotoUrl} alt={`Facture ${viewedInvoice.expenseNumber}`} className="max-w-full h-auto rounded border border-[#E2E8F0]" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Expense */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#06B6D4] text-[22px]">payments</span>
                <h3 className="font-headline text-lg font-bold text-[#0F172A]">Engager une Dépense</h3>
              </div>
              <button onClick={closeModal} type="button" aria-label="Fermer" className="text-slate-400 hover:text-[#0F172A]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Catégorie *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                >
                  <option value="Carburant Groupe">Carburant Groupe Électrogène</option>
                  <option value="Entretien & Nettoyage">Entretien &amp; Nettoyage Voies</option>
                  <option value="Fournitures Caisse">Fournitures Caisse (Bobines/Encre)</option>
                  <option value="Pièces Barrières">Pièces Rechange Barrières</option>
                  <option value="Prime Gardiennage">Prime &amp; Dotation Gardiennage</option>
                  <option value="Autre">Autre dépense</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Description &amp; Motif *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Motif de la dépense..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bénéficiaire / Fournisseur *</label>
                  <input
                    type="text"
                    required
                    placeholder="TotalEnergies, Papmad..."
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Montant en Ariary *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={amountAr}
                    onChange={(e) => setAmountAr(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-data font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expense-quantity" className="block text-[11px] font-semibold text-slate-500 mb-1">Quantité *</label>
                  <input
                    id="expense-quantity"
                    type="number"
                    required
                    min={0.001}
                    step="any"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-data font-bold text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="expense-unit" className="block text-[11px] font-semibold text-slate-500 mb-1">Unité *</label>
                  <select
                    id="expense-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  >
                    {EXPENSE_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              {Number(quantity.replace(',', '.')) > 0 && amountAr > 0 && (
                <p className="-mt-1 text-[11px] text-slate-500">
                  Prix unitaire : <strong className="font-mono-data text-[#0F172A]">{formatAr(Math.round(amountAr / Number(quantity.replace(',', '.'))))} Ar / {unit}</strong>
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Site</label>
                  <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  >
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mode de règlement</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="MVola">MVola</option>
                    <option value="Virement BNI">Virement Bancaire</option>
                    <option value="Chèque">Chèque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Photo de la facture <span className="font-normal text-slate-400">(facultatif)</span>
                </label>
                <PhotoInput
                  value={invoicePhoto}
                  onChange={setInvoicePhoto}
                  maxSize={INVOICE_PHOTO_MAX_PX}
                  facingMode="environment"
                  emptyIcon="receipt_long"
                  fileNameHint={`facture_${beneficiary || 'depense'}`}
                />
              </div>

              {submitError && (
                <p role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[#DC2626]">{submitError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg bg-[#0F172A] text-white font-headline font-bold hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  {submitting ? 'Enregistrement…' : 'Soumettre pour Approbation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {registerDialog && (() => {
        const { reg, action } = registerDialog;
        const counted = Number(countedCash) || 0;
        const diff = counted - reg.currentCashInHandAr;
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={submitRegister} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <h3 className="font-headline text-lg font-bold text-[#0F172A]">
                  {action === 'close' ? 'Clôturer' : 'Ouvrir'} la caisse {reg.registerCode}
                </h3>
                <button type="button" onClick={() => setRegisterDialog(null)} className="text-slate-400 hover:text-[#0F172A]" aria-label="Fermer">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              {action === 'close' ? (
                <>
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Fond initial</span><span className="font-mono-data">{formatAr(reg.openingBalanceAr)} Ar</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">+ Espèces encaissées</span><span className="font-mono-data">{formatAr(reg.totalCashCollectedAr)} Ar</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">− Dépenses payées</span><span className="font-mono-data">{formatAr(reg.totalExpensesPaidAr)} Ar</span></div>
                    <div className="flex justify-between font-bold border-t border-[#E2E8F0] pt-1"><span>Espèces attendues</span><span className="font-mono-data">{formatAr(reg.currentCashInHandAr)} Ar</span></div>
                    <div className="flex justify-between text-[#06B6D4]"><span>Mobile Money (hors caisse)</span><span className="font-mono-data">{formatAr(reg.totalMobileMoneyAr)} Ar</span></div>
                  </div>
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">Espèces comptées dans la caisse (Ar) *</span>
                    <input type="number" min={0} step={100} required value={countedCash} onChange={(e) => setCountedCash(e.target.value)} className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-data" />
                  </label>
                  <p className={`font-bold ${diff === 0 ? 'text-[#16A34A]' : diff < 0 ? 'text-[#DC2626]' : 'text-amber-600'}`}>
                    {diff === 0 ? 'Caisse juste.' : diff < 0 ? `Manque ${formatAr(-diff)} Ar.` : `Excédent de ${formatAr(diff)} Ar.`}
                  </p>
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">Observations</span>
                    <textarea rows={2} maxLength={500} value={registerNotes} onChange={(e) => setRegisterNotes(e.target.value)} className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" />
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Après la clôture, les encaissements et dépenses ne sont plus comptés dans cette caisse tant qu’elle n’est pas rouverte.
                  </p>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">Fond de caisse à l’ouverture (Ar) *</span>
                    <input type="number" min={0} step={100} required value={countedCash} onChange={(e) => setCountedCash(e.target.value)} className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono-data" />
                    <span className="text-[10px] text-slate-400">Proposé : espèces restées dans la caisse à la dernière clôture.</span>
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">Caissier(e)</span>
                    <input maxLength={150} value={registerCashier} onChange={(e) => setRegisterCashier(e.target.value)} className="w-full p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" />
                  </label>
                </>
              )}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button type="button" onClick={() => setRegisterDialog(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">Annuler</button>
                <button type="submit" disabled={registerBusy} className="px-5 py-2 rounded-lg bg-[#06B6D4] text-[#0F172A] font-headline font-bold hover:bg-[#0891B2] hover:text-white disabled:opacity-50">
                  {registerBusy ? 'Enregistrement…' : action === 'close' ? 'Clôturer' : 'Ouvrir'}
                </button>
              </div>
            </form>
          </div>
        );
      })()}
    </div>
  );
};

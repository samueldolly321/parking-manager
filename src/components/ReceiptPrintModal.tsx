import React from 'react';
import { useBranding, BrandLogo } from '../services/branding';
import { PaymentReceipt } from '../types';

interface ReceiptPrintModalProps {
  receipt: PaymentReceipt | null;
  onClose: () => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({ receipt, onClose }) => {
  const { appName } = useBranding();
  if (!receipt) return null;

  const formatAr = (val: number) => {
    return new Intl.NumberFormat('fr-MG').format(val).replace(/,/g, ' ');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-[#E2E8F0]">
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] no-print">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#06B6D4] text-[20px]">receipt_long</span>
            <span className="font-headline text-sm font-bold text-[#0F172A]">Reçu Fiscal d'Encaissement</span>
          </div>
          <button onClick={onClose} type="button" className="text-slate-400 hover:text-[#0F172A]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* The Printable Official Receipt Layout */}
        <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-3 font-mono-data text-xs text-[#0F172A]">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-0.5">
            <div className="flex items-center justify-center gap-2">
              <BrandLogo size={28} />
              <div className="font-headline text-base font-bold tracking-tight text-[#0F172A] uppercase">{appName}</div>
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Gestion Régionale d'Antananarivo</div>
            <div className="text-[9px] text-slate-400">NIF: 400 128 903 • STAT: 52210 11 2023 0 10044</div>
            <div className="font-bold text-xs text-[#06B6D4] mt-1">{receipt.siteName}</div>
          </div>

          {/* Receipt Number & Date */}
          <div className="flex items-center justify-between font-mono-data text-[11px] py-1 border-b border-slate-200">
            <div>
              <span className="text-slate-400">N° REÇU: </span>
              <strong className="text-[#0F172A]">{receipt.receiptNumber}</strong>
            </div>
            <div className="text-slate-500">{receipt.dateTime}</div>
          </div>

          {/* Member & Vehicle Info */}
          <div className="space-y-1 py-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Bénéficiaire / Membre :</span>
              <strong className="text-[#0F172A]">{receipt.memberName}</strong>
            </div>
            {receipt.vehiclePlate && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Immatriculation :</span>
                <span className="font-mono-plate px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 font-bold text-[11px]">
                  {receipt.vehiclePlate}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Période couverte :</span>
              <span className="text-slate-700">{receipt.period}</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              Objet : <strong>{receipt.purpose}</strong>
            </div>
          </div>

          {/* Breakdown */}
          <div className="py-2 border-t border-b border-dashed border-slate-300 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Montant Facturé :</span>
              <span className="font-bold">{formatAr(receipt.amountDueAr)} Ar</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#16A34A]">
              <span>Montant Encaissé :</span>
              <span>{formatAr(receipt.amountPaidAr)} Ar</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Solde restant dû :</span>
              <span className="font-bold text-[#0F172A]">{formatAr(receipt.remainingBalanceAr)} Ar</span>
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="space-y-1 text-[10px] text-slate-500">
            <div className="flex justify-between">
              <span>Mode de règlement :</span>
              <strong className="text-[#0F172A]">{receipt.paymentMethod}</strong>
            </div>
            <div className="flex justify-between">
              <span>Réf. Transaction :</span>
              <span className="font-mono-data">{receipt.transactionRef}</span>
            </div>
            <div className="flex justify-between">
              <span>Agent Caissier :</span>
              <span>{receipt.cashierName}</span>
            </div>
          </div>

          {/* QR Verification & Signature Stamp */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="w-14 h-14 bg-white p-1 rounded border border-slate-300 shrink-0">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <rect x="5" y="5" width="26" height="26" fill="#0F172A" />
                <rect x="9" y="9" width="18" height="18" fill="white" />
                <rect x="13" y="13" width="10" height="10" fill="#0F172A" />
                <rect x="69" y="5" width="26" height="26" fill="#0F172A" />
                <rect x="73" y="9" width="18" height="18" fill="white" />
                <rect x="77" y="13" width="10" height="10" fill="#0F172A" />
                <rect x="5" y="69" width="26" height="26" fill="#0F172A" />
                <rect x="9" y="73" width="18" height="18" fill="white" />
                <rect x="13" y="77" width="10" height="10" fill="#0F172A" />
                <rect x="36" y="8" width="5" height="5" fill="#0F172A" />
                <rect x="44" y="8" width="5" height="10" fill="#0F172A" />
                <rect x="36" y="36" width="14" height="14" fill="#0F172A" />
                <rect x="40" y="40" width="6" height="6" fill="white" />
                <rect x="58" y="38" width="8" height="5" fill="#0F172A" />
                <rect x="72" y="38" width="12" height="6" fill="#0F172A" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Cachet Électronique PMM</div>
              <div className="font-headline font-bold text-xs text-[#06B6D4] mt-0.5">ACQUITTÉ &amp; VALIDE</div>
              <div className="text-[9px] text-slate-400">Poste Central Analakely</div>
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 no-print">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-headline font-bold"
          >
            Fermer
          </button>
          <button
            onClick={() => window.print()}
            type="button"
            className="px-4 py-2 rounded-lg bg-[#06B6D4] text-[#0F172A] hover:bg-[#0891B2] hover:text-white transition-all text-xs font-headline font-bold flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Imprimer le Reçu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

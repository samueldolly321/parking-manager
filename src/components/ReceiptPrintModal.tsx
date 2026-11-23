import React, { useRef, useState } from 'react';
import { useBranding } from '../services/branding';
import { PaymentReceipt } from '../types';
import { QrCodeSvg } from './QrCodeSvg';

interface ReceiptPrintModalProps {
  receipt: PaymentReceipt | null;
  onClose: () => void;
}

/** Thermal roll widths (mm). */
type RollWidth = 58 | 80;
const WIDTH_KEY = 'pm_receipt_width';

const ROLL: Record<RollWidth, { font: number; small: number; big: number; pad: number; qr: number; logo: number }> = {
  58: { font: 11, small: 9.5, big: 15, pad: 2, qr: 24, logo: 26 },
  80: { font: 12.5, small: 10.5, big: 18, pad: 3, qr: 30, logo: 34 }
};

const formatAr = (val: number) => new Intl.NumberFormat('fr-FR').format(val).replace(/[  ,]/g, ' ');

/**
 * Prints the receipt alone, in a hidden frame sized to the roll (width × height of the content),
 * so the thermal printer gets exactly one ticket, without the rest of the page.
 */
function printReceipt(el: HTMLElement, widthMm: RollWidth) {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Reçu</title><style>` +
      `*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
      `html,body{margin:0;padding:0;background:#fff;color:#000}body{width:${widthMm}mm}` +
      `</style></head><body>${el.outerHTML}</body></html>`
  );
  doc.close();
  const go = () => {
    // Page = roll width × content height (px at 96 dpi -> mm), no margins
    const heightMm = Math.ceil((doc.body.scrollHeight * 25.4) / 96) + 4;
    const page = doc.createElement('style');
    page.textContent = `@page{size:${widthMm}mm ${heightMm}mm;margin:0}`;
    doc.head.appendChild(page);
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => iframe.remove(), 1000);
  };
  const images = Array.from(doc.images);
  Promise.all(images.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; })))).then(() =>
    setTimeout(go, 50)
  );
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({ receipt, onClose }) => {
  const { appName, logoUrl } = useBranding();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<RollWidth>(() => (localStorage.getItem(WIDTH_KEY) === '58' ? 58 : 80));
  if (!receipt) return null;

  const chooseWidth = (w: RollWidth) => {
    setWidth(w);
    localStorage.setItem(WIDTH_KEY, String(w));
  };

  const r = ROLL[width];
  const rule: React.CSSProperties = { borderTop: '1px dashed #000', margin: '1.5mm 0' };
  const row = (label: string, value: React.ReactNode, strong = false): React.ReactNode => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2mm', alignItems: 'baseline' }}>
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ textAlign: 'right', fontWeight: strong ? 700 : 400, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
  const paidInFull = receipt.remainingBalanceAr <= 0;
  const qrText = `RECU ${receipt.receiptNumber} | ${formatAr(receipt.amountPaidAr)} Ar | ${receipt.dateTime} | ${receipt.memberName}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-[#E2E8F0]">
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#06B6D4] text-[20px]">receipt_long</span>
            <span className="font-headline text-sm font-bold text-[#0F172A]">Reçu d'encaissement</span>
          </div>
          <button onClick={onClose} type="button" className="text-slate-400 hover:text-[#0F172A]" aria-label="Fermer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Roll width */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">Format du ticket (imprimante thermique)</span>
          <div className="flex bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
            {([58, 80] as RollWidth[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => chooseWidth(w)}
                className={`px-3 py-1 rounded text-xs ${width === w ? 'bg-[#0F172A] text-white font-bold' : 'text-slate-600 hover:text-[#0F172A]'}`}
              >
                {w} mm
              </button>
            ))}
          </div>
        </div>

        {/* Preview at real size: what the printer receives */}
        <div className="bg-slate-100 rounded-xl p-4 flex justify-center overflow-x-auto">
          <div
            ref={ticketRef}
            style={{
              width: `${width}mm`,
              padding: `${r.pad + 1}mm ${r.pad}mm`,
              background: '#fff',
              color: '#000',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: r.font,
              lineHeight: 1.35,
              boxShadow: '0 1px 4px rgba(0,0,0,.15)'
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="" style={{ width: r.logo, height: r.logo, objectFit: 'contain', display: 'block', margin: '0 auto 1mm', filter: 'grayscale(1)' }} />
              ) : null}
              <div style={{ fontWeight: 700, fontSize: r.font + 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{appName}</div>
              <div style={{ fontSize: r.small }}>{receipt.siteName}</div>
              <div style={{ fontWeight: 700, marginTop: '1.5mm' }}>REÇU D'ENCAISSEMENT</div>
            </div>
            <div style={rule} />
            {row('N° :', receipt.receiptNumber, true)}
            {row('Date :', receipt.dateTime)}
            <div style={rule} />
            {row('Membre :', receipt.memberName, true)}
            {receipt.vehiclePlate && row('Véhicule :', receipt.vehiclePlate)}
            {receipt.period && row('Période :', receipt.period)}
            <div style={{ marginTop: '1mm' }}>
              <span>Objet : </span>
              <span style={{ fontWeight: 700 }}>{receipt.purpose}</span>
            </div>
            <div style={rule} />
            {row('Montant dû :', `${formatAr(receipt.amountDueAr)} Ar`)}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 700, fontSize: r.big, margin: '1mm 0' }}>
              <span>PAYÉ</span>
              <span>{formatAr(receipt.amountPaidAr)} Ar</span>
            </div>
            {row('Reste à payer :', `${formatAr(Math.max(0, receipt.remainingBalanceAr))} Ar`, !paidInFull)}
            <div style={rule} />
            {row('Règlement :', receipt.paymentMethod)}
            {receipt.transactionRef && row('Réf. :', receipt.transactionRef)}
            {receipt.cashierName && row('Caissier :', receipt.cashierName)}
            <div style={rule} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: `${r.qr}mm`, height: `${r.qr}mm`, margin: '1mm auto' }}>
                <QrCodeSvg value={qrText} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: r.font + 1, marginTop: '1mm' }}>
                {receipt.status === 'annule' ? 'REÇU ANNULÉ' : paidInFull ? 'ACQUITTÉ' : 'PAIEMENT PARTIEL'}
              </div>
              <div style={{ fontSize: r.small, marginTop: '1mm' }}>Merci de conserver ce reçu.</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button onClick={onClose} type="button" className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-headline font-bold">
            Fermer
          </button>
          <button
            onClick={() => ticketRef.current && printReceipt(ticketRef.current, width)}
            type="button"
            className="px-4 py-2 rounded-lg bg-[#06B6D4] text-[#0F172A] hover:bg-[#0891B2] hover:text-white transition-all text-xs font-headline font-bold flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Imprimer ({width} mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

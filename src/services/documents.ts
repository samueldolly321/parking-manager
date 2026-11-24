/**
 * Printable documents (A4) and CSV exports: pay slip, payroll book, meeting minutes,
 * receipts journal, card sheet. Each document is built as standalone HTML and printed alone.
 */
import QRCode from 'qrcode';
import type { GovernanceMeeting, MembershipCard, PaymentReceipt, PayrollRecord } from '../types';
import { escapeHtml as e, printHtmlDocument } from './printHtml';

export interface DocBrand {
  appName: string;
  logoUrl?: string | null;
  nif?: string;
  stat?: string;
}

const ar = (n: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)).replace(/[  ,]/g, ' ')} Ar`;

const BASE_CSS = `
  .doc{padding:0 2mm} h1{font-size:18px;margin:0} h2{font-size:13px;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.5px;color:#334155}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0F172A;padding-bottom:8px;margin-bottom:10px}
  .brand{display:flex;gap:8px;align-items:center} .brand img{width:42px;height:42px;object-fit:contain}
  .brand b{font-size:15px;text-transform:uppercase} .muted{color:#64748B} .small{font-size:10px}
  table{width:100%;border-collapse:collapse} th,td{border:1px solid #CBD5E1;padding:5px 6px;text-align:left;vertical-align:top}
  th{background:#F1F5F9;font-size:10px;text-transform:uppercase} td.n,th.n{text-align:right;white-space:nowrap}
  tfoot td{font-weight:bold;background:#F8FAFC} .box{border:1px solid #CBD5E1;border-radius:6px;padding:8px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px} .total{font-size:16px;font-weight:bold}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px} .sign div{border-top:1px solid #94A3B8;padding-top:4px;height:60px}
  .pre{white-space:pre-wrap;line-height:1.45}
`;

function header(brand: DocBrand, title: string, right: string) {
  const ids = [brand.nif && `NIF : ${e(brand.nif)}`, brand.stat && `STAT : ${e(brand.stat)}`].filter(Boolean).join(' · ');
  return `<div class="head"><div class="brand">${brand.logoUrl ? `<img src="${e(brand.logoUrl)}" alt="">` : ''}<div><b>${e(brand.appName)}</b>${
    ids ? `<div class="small muted">${ids}</div>` : ''
  }</div></div><div style="text-align:right"><h1>${e(title)}</h1><div class="muted">${right}</div></div></div>`;
}

const today = () => new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' });
const footer = () => `<p class="small muted" style="margin-top:14px">Document édité le ${today()}.</p>`;

// ---------- Pay slip ----------
export function payslipHtml(p: PayrollRecord, brand: DocBrand): string {
  const gains: [string, number][] = [
    ['Salaire de base / indemnité', p.baseSalaryAr],
    ['Prime de responsabilité', p.responsibilityBonusAr],
    ['Prime de nuit / astreinte', p.nightShiftBonusAr],
    ['Indemnité transport & repas', p.transportBonusAr],
    ['Prime de rendement / présence', p.performanceBonusAr]
  ];
  const cuts: [string, number][] = [
    ['CNaPS (part salariale)', p.cnapsDeductionAr],
    ['OSTIE', p.ostieDeductionAr],
    ['IRSA', p.irsaDeductionAr],
    ['Acompte', p.advanceDeductionAr]
  ];
  const STATUS: Record<PayrollRecord['status'], string> = { en_attente: 'En attente de validation', valide_tresorier: 'Validé par la trésorerie', paye: 'Payé' };
  const rows = (list: [string, number][]) => list.filter(([, v]) => v).map(([k, v]) => `<tr><td>${e(k)}</td><td class="n">${ar(v)}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">—</td></tr>';
  return `<div class="doc">${header(brand, 'Bulletin de paie', `${e(p.slipNumber)} · ${e(p.periodMonth)}`)}
    <div class="grid2">
      <div class="box"><b>${e(p.beneficiaryName)}</b><br>${e(p.roleTitle)}<br><span class="muted">${e(p.siteName || p.siteId)}</span>${p.cin ? `<br>CIN : ${e(p.cin)}` : ''}</div>
      <div class="box">Mode de paiement : <b>${e(p.paymentMethod)}</b>${p.bankAccountOrPhone ? `<br>Compte / tél. : ${e(p.bankAccountOrPhone)}` : ''}<br>Statut : <b>${STATUS[p.status]}</b>${
        p.paidDate ? `<br>Payé le ${e(p.paidDate)}` : ''
      }${p.transactionRef ? `<br>Réf. : ${e(p.transactionRef)}` : ''}</div>
    </div>
    <h2>Gains</h2><table><tbody>${rows(gains)}</tbody><tfoot><tr><td>Total brut</td><td class="n">${ar(p.grossSalaryAr)}</td></tr></tfoot></table>
    <h2>Retenues</h2><table><tbody>${rows(cuts)}</tbody><tfoot><tr><td>Total retenues</td><td class="n">${ar(p.totalDeductionsAr)}</td></tr></tfoot></table>
    <div class="box" style="margin-top:12px;display:flex;justify-content:space-between"><span class="total">NET À PAYER</span><span class="total">${ar(p.netSalaryAr)}</span></div>
    ${p.notes ? `<p class="small">Observations : ${e(p.notes)}</p>` : ''}
    <div class="sign"><div>Visa de la trésorerie${p.approverName ? ` : ${e(p.approverName)}` : ''}</div><div>Signature du bénéficiaire</div></div>
    ${footer()}</div>`;
}

export function printPayslip(p: PayrollRecord, brand: DocBrand) {
  printHtmlDocument(`Bulletin ${p.slipNumber}`, `<style>${BASE_CSS}</style>${payslipHtml(p, brand)}`, '@page{size:A4 portrait;margin:12mm}');
}

// ---------- Payroll book ----------
export function printPayrollBook(slips: PayrollRecord[], periodLabel: string, brand: DocBrand) {
  const sum = (k: keyof PayrollRecord) => slips.reduce((s, p) => s + (Number(p[k]) || 0), 0);
  const rows = slips
    .map(
      (p) =>
        `<tr><td>${e(p.slipNumber)}</td><td><b>${e(p.beneficiaryName)}</b><br><span class="small muted">${e(p.roleTitle)}</span></td><td>${e(
          p.siteName || p.siteId
        )}</td><td>${e(p.periodMonth)}</td><td class="n">${ar(p.grossSalaryAr)}</td><td class="n">${ar(p.totalDeductionsAr)}</td><td class="n"><b>${ar(
          p.netSalaryAr
        )}</b></td><td>${p.status === 'paye' ? 'Payé' : p.status === 'valide_tresorier' ? 'Validé' : 'En attente'}</td></tr>`
    )
    .join('');
  printHtmlDocument(
    `Livre de paie ${periodLabel}`,
    `<style>${BASE_CSS}</style><div class="doc">${header(brand, 'Livre de paie', e(periodLabel))}
      <table><thead><tr><th>N°</th><th>Bénéficiaire</th><th>Site</th><th>Période</th><th class="n">Brut</th><th class="n">Retenues</th><th class="n">Net</th><th>Statut</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="muted">Aucun bulletin</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4">Total — ${slips.length} bulletin(s)</td><td class="n">${ar(sum('grossSalaryAr'))}</td><td class="n">${ar(sum('totalDeductionsAr'))}</td><td class="n">${ar(
        sum('netSalaryAr')
      )}</td><td></td></tr></tfoot></table>${footer()}</div>`,
    '@page{size:A4 landscape;margin:10mm}'
  );
}

// ---------- Meeting minutes ----------
export function printMeetingPv(m: GovernanceMeeting, brand: DocBrand) {
  printHtmlDocument(
    `PV ${m.title}`,
    `<style>${BASE_CSS}</style><div class="doc">${header(brand, 'Procès-verbal de réunion', `Séance du ${e(m.date)}`)}
      <h1 style="font-size:16px;margin-top:6px">${e(m.title)}</h1>
      <p class="muted">Lieu : ${e(m.location || '—')} · ${m.resolutionsCount} résolution(s) adoptée(s)</p>
      <h2>Ordre du jour</h2><div class="box pre">${e(m.agenda || '—')}</div>
      <h2>Compte rendu et résolutions</h2><div class="box pre">${e(m.summaryPV || '—')}</div>
      <div class="sign"><div>Le Président de séance</div><div>Le Secrétaire de séance</div></div>
      ${footer()}</div>`,
    '@page{size:A4 portrait;margin:15mm}'
  );
}

// ---------- CSV ----------
/** CSV for Excel: ";" separator, UTF-8 with BOM so accents display correctly. */
export function downloadCsv(fileName: string, header: string[], rows: (string | number | undefined | null)[][]) {
  const cell = (v: string | number | undefined | null) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const RECEIPT_CSV_HEADER = [
  'N° reçu', 'Date', 'Membre', 'Véhicule', 'Site', 'Objet', 'Période', 'Montant dû (Ar)', 'Encaissé (Ar)', 'Reste (Ar)', 'Mode', 'Référence', 'Caissier', 'Statut'
];
export const receiptCsvRow = (r: PaymentReceipt) => [
  r.receiptNumber, r.dateTime, r.memberName, r.vehiclePlate, r.siteName, r.purpose, r.period,
  r.amountDueAr, r.amountPaidAr, r.remainingBalanceAr, r.paymentMethod, r.transactionRef, r.cashierName, r.status
];

// ---------- Card sheet (A4, 8 cards per page, card size) ----------
function qrSvg(value: string): string {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const { size, data } = qr.modules;
  let d = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) d += `M${x} ${y}h1v1h-1z`;
  return `<svg viewBox="-1 -1 ${size + 2} ${size + 2}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect x="-1" y="-1" width="${size + 2}" height="${size + 2}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

export function printCardSheet(cards: MembershipCard[], brand: DocBrand) {
  const css = `${BASE_CSS}
    .sheet{display:grid;grid-template-columns:85.6mm 85.6mm;gap:4mm 6mm;justify-content:center}
    .card{width:85.6mm;height:54mm;border:1px dashed #94A3B8;border-radius:3mm;padding:3mm;display:flex;gap:3mm;page-break-inside:avoid;overflow:hidden}
    .card .qr{width:26mm;height:26mm;flex-shrink:0;align-self:center} .card .qr svg{width:100%;height:100%}
    .card .t{font-size:8px;text-transform:uppercase;color:#475569} .card .name{font-size:12px;font-weight:bold;margin:1mm 0}
    .card .num{font-family:monospace;font-size:10px;font-weight:bold} .card .plates{font-family:monospace;font-size:10px}`;
  const items = cards
    .map(
      (c) => `<div class="card"><div style="flex:1;min-width:0"><div class="t">${e(brand.appName)} · carte de membre</div>
        <div class="name">${e(c.memberName)}</div><div class="num">${e(c.cardNumber)}</div>
        <div class="plates">${e(c.primaryPlate)}${c.secondaryPlate ? ` / ${e(c.secondaryPlate)}` : ''}</div>
        <div class="small muted" style="margin-top:1mm">${e(c.siteName)}</div><div class="small">Valable jusqu’au ${e(c.expirationDate)}</div></div>
        <div class="qr">${qrSvg(c.qrToken)}</div></div>`
    )
    .join('');
  printHtmlDocument(
    'Planche de cartes',
    `<style>${css}</style><div class="doc"><p class="small muted">${cards.length} carte(s) — format carte 85,6 × 54 mm, à découper le long des pointillés.</p><div class="sheet">${
      items || '<p>Aucune carte.</p>'
    }</div></div>`,
    '@page{size:A4 portrait;margin:8mm}'
  );
}

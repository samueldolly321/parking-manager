/** Export of the report: CSV (opens in Excel) and PDF. */
import { jsPDF } from 'jspdf';
import type { Breakdown, ReportData } from './reports';
import { monthShortLabel, periodLabel } from './reports';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/[  ,]/g, ' ');
const ar = (n: number) => `${fmt(n)} Ar`;
const fileBase = (r: ReportData, siteLabel: string) =>
  `rapport_${periodLabel(r.period).replace(/\s+/g, '_')}_${siteLabel.replace(/\s+/g, '_')}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '');

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV with ";" separators and a BOM, so that Excel (French settings) opens it directly. */
export function exportReportCsv(r: ReportData, siteLabel: string, appName = 'Parking Mada') {
  const rows: (string | number)[][] = [];
  const blank = () => rows.push([]);
  const section = (title: string) => { blank(); rows.push([title]); };
  const breakdown = (title: string, items: Breakdown[], unit = 'Montant (Ar)') => {
    section(title);
    rows.push(['Libellé', unit, 'Nombre']);
    items.forEach((b) => rows.push([b.label, Math.round(b.valueAr), b.count]));
  };

  rows.push([`Rapport ${appName}`, periodLabel(r.period)]);
  rows.push(['Site', siteLabel]);
  rows.push(['Généré le', new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' })]);

  section('SYNTHÈSE');
  rows.push(['Indicateur', 'Période (Ar)', 'Période précédente (Ar)']);
  rows.push(['Recettes encaissées', r.recettesAr, r.previous.recettesAr]);
  rows.push(['Dépenses approuvées', r.depensesAr, r.previous.depensesAr]);
  rows.push(['Masse salariale (coût)', r.salairesCoutAr, r.previous.salairesCoutAr]);
  rows.push(['Résultat net', r.resultatAr, r.previous.resultatAr]);
  rows.push(['Nombre de reçus', r.receiptsCount, '']);
  rows.push(['Ticket moyen', r.ticketMoyenAr, '']);
  rows.push(['Dépenses en attente', r.depensesEnAttenteAr, '']);
  rows.push(['Salaires nets versés', r.salairesNetAr, '']);
  rows.push(['Retenues CNaPS / OSTIE / IRSA', r.retenuesAr, '']);

  section('ÉVOLUTION MENSUELLE (12 MOIS)');
  rows.push(['Mois', 'Recettes', 'Dépenses', 'Salaires', 'Résultat']);
  r.trend.forEach((m) => rows.push([monthShortLabel(m.month), m.recettesAr, m.depensesAr, m.salairesAr, m.resultatAr]));

  breakdown('RECETTES PAR MODE DE PAIEMENT', r.byPaymentMethod);
  breakdown('RECETTES PAR SITE', r.bySite);
  breakdown('RECETTES PAR CATÉGORIE DE MEMBRE', r.byMemberCategory);
  breakdown('DÉPENSES PAR CATÉGORIE', r.expensesByCategory);
  breakdown('MASSE SALARIALE PAR TYPE', r.payrollByType);

  section('IMPAYÉS (SITUATION ACTUELLE)');
  rows.push(['Membre', 'N° membre', 'Site', 'Mois impayés', 'Montant dû (Ar)']);
  r.unpaid.members.forEach((m) => rows.push([m.name, m.number, m.site, m.months, m.balanceAr]));
  rows.push(['TOTAL', '', '', r.unpaid.months, r.unpaid.totalAr]);

  section('OCCUPATION (SITUATION ACTUELLE)');
  rows.push(['Site', 'Places configurées', 'Capacité déclarée', 'Occupées', 'Réservées', 'Maintenance', 'Taux (%)']);
  r.occupancy.forEach((o) => rows.push([o.site, o.capacity, o.declared, o.occupied, o.reserved, o.maintenance, Math.round(o.rate * 1000) / 10]));

  const esc = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${fileBase(r, siteLabel)}.csv`);
}

/** A4 PDF with the summary and every table of the report. */
export function exportReportPdf(r: ReportData, siteLabel: string, appName = 'Parking Mada') {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 14;
  let y = 16;

  const ensure = (h: number) => {
    if (y + h > 285) { pdf.addPage(); y = 16; }
  };
  const title = (text: string) => {
    ensure(12);
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(text, M, y);
    y += 2;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(M, y, W - M, y);
    y += 5;
  };
  /** Simple table: first column left-aligned, the others right-aligned. */
  const table = (head: string[], body: (string | number)[][], widths: number[]) => {
    const rowH = 6;
    const drawRow = (cells: (string | number)[], bold: boolean, shade: boolean) => {
      ensure(rowH);
      if (shade) { pdf.setFillColor(241, 245, 249); pdf.rect(M, y - 4.2, W - 2 * M, rowH, 'F'); }
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(30, 41, 59);
      let x = M;
      cells.forEach((c, i) => {
        const text = String(c);
        const w = widths[i];
        const clipped = pdf.splitTextToSize(text, w - 2)[0] || '';
        if (i === 0) pdf.text(clipped, x + 1, y);
        else pdf.text(clipped, x + w - 1, y, { align: 'right' });
        x += w;
      });
      y += rowH;
    };
    drawRow(head, true, true);
    if (body.length === 0) drawRow(['Aucune donnée', ...head.slice(1).map(() => '')], false, false);
    body.forEach((row, i) => drawRow(row, false, i % 2 === 1));
    y += 2;
  };
  const breakdownTable = (items: Breakdown[], total: number) =>
    table(
      ['Libellé', 'Montant', 'Part', 'Nombre'],
      items.map((b) => [b.label, ar(b.valueAr), total > 0 ? `${Math.round((b.valueAr / total) * 1000) / 10} %` : '—', b.count]),
      [92, 42, 24, 24]
    );

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Rapport financier & statistiques', M, y);
  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`${appName} — ${periodLabel(r.period)} — ${siteLabel}`, M, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.text(`Généré le ${new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' })} (GMT+3)`, M, y);
  y += 4;

  title('Synthèse de la période');
  table(
    ['Indicateur', 'Période', 'Période précédente'],
    [
      ['Recettes encaissées', ar(r.recettesAr), ar(r.previous.recettesAr)],
      ['Dépenses approuvées', ar(r.depensesAr), ar(r.previous.depensesAr)],
      ['Masse salariale (coût)', ar(r.salairesCoutAr), ar(r.previous.salairesCoutAr)],
      ['Résultat net', ar(r.resultatAr), ar(r.previous.resultatAr)],
      ['Nombre de reçus / ticket moyen', `${r.receiptsCount} / ${ar(r.ticketMoyenAr)}`, ''],
      ['Dépenses en attente d’approbation', ar(r.depensesEnAttenteAr), ''],
      ['Salaires nets / retenues', `${ar(r.salairesNetAr)} / ${ar(r.retenuesAr)}`, '']
    ],
    [92, 45, 45]
  );

  title('Évolution mensuelle (12 mois)');
  table(
    ['Mois', 'Recettes', 'Dépenses', 'Salaires', 'Résultat'],
    r.trend.map((m) => [monthShortLabel(m.month), fmt(m.recettesAr), fmt(m.depensesAr), fmt(m.salairesAr), fmt(m.resultatAr)]),
    [38, 36, 36, 36, 36]
  );

  title('Recettes par mode de paiement');
  breakdownTable(r.byPaymentMethod, r.recettesAr);
  if (r.siteId === 'all') { title('Recettes par site'); breakdownTable(r.bySite, r.recettesAr); }
  title('Recettes par catégorie de membre');
  breakdownTable(r.byMemberCategory, r.recettesAr);
  title('Dépenses approuvées par catégorie');
  breakdownTable(r.expensesByCategory, r.depensesAr);
  title('Masse salariale par type');
  breakdownTable(r.payrollByType, r.salairesCoutAr);

  title('Impayés — situation actuelle');
  table(
    ['Membre', 'N° membre', 'Site', 'Mois', 'Montant dû'],
    [...r.unpaid.members.map((m) => [m.name, m.number, m.site, String(m.months), ar(m.balanceAr)]), ['TOTAL', '', '', String(r.unpaid.months), ar(r.unpaid.totalAr)]],
    [62, 32, 38, 14, 36]
  );

  title('Occupation — situation actuelle');
  table(
    ['Site', 'Places', 'Déclarées', 'Occupées', 'Réservées', 'Maint.', 'Taux'],
    r.occupancy.map((o) => [o.site, o.capacity, o.declared, o.occupied, o.reserved, o.maintenance, `${Math.round(o.rate * 1000) / 10} %`]),
    [50, 22, 22, 22, 22, 22, 22]
  );

  // Page numbers
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${i} / ${pages}`, W - M, 292, { align: 'right' });
  }
  pdf.save(`${fileBase(r, siteLabel)}.pdf`);
}

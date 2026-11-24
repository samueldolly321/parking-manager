import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payslipHtml } from './documents.ts';
import type { PayrollRecord } from '../types/index.ts';

test('bulletin de paie : montants, retenues non nulles, texte échappé, NIF/STAT', () => {
  const slip = {
    slipNumber: 'PAY-2026-001',
    periodMonth: 'Novembre 2026',
    beneficiaryName: 'Rakoto <Jean>',
    roleTitle: 'Gardien',
    siteName: 'Site 01',
    siteId: 'S1',
    cin: '',
    paymentMethod: 'MVola',
    bankAccountOrPhone: '034 00 000 00',
    baseSalaryAr: 300000,
    responsibilityBonusAr: 0,
    nightShiftBonusAr: 50000,
    transportBonusAr: 0,
    performanceBonusAr: 0,
    grossSalaryAr: 350000,
    cnapsDeductionAr: 3500,
    ostieDeductionAr: 0,
    irsaDeductionAr: 0,
    advanceDeductionAr: 0,
    totalDeductionsAr: 3500,
    netSalaryAr: 346500,
    status: 'paye'
  } as PayrollRecord;
  const html = payslipHtml(slip, { appName: 'Parking Mada', nif: '1234', stat: '' });
  assert.match(html, /Rakoto &lt;Jean&gt;/);
  assert.doesNotMatch(html, /<Jean>/);
  assert.match(html, /346 500 Ar/);
  assert.match(html, /Prime de nuit/);
  assert.doesNotMatch(html, /OSTIE/); // 0 Ar : non affiché
  assert.doesNotMatch(html, /CIN :/); // CIN vide : non affichée
  assert.match(html, /NIF : 1234/);
  assert.doesNotMatch(html, /STAT :/);
  assert.match(html, /Payé/);
});

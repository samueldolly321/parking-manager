import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPromo, monthlyAmount, oneTimeAlreadyPaid, paymentFormulas, tariffFor } from './pricing.ts';
import type { Tariff } from '../types/index.ts';

const t = (id: string, typeFormula: Tariff['typeFormula'], amountAr: number, siteId?: string, isActive = true) =>
  ({ id, typeFormula, amountAr, siteId, isActive }) as Tariff;

test('tarif : celui du site, sinon le tarif général actif', () => {
  const list = [t('g', 'deux_roues', 40000), t('s2', 'deux_roues', 35000, 'S2'), t('off', 'deux_roues', 1, 'S3', false)];
  assert.equal(tariffFor(list, 'deux_roues', 'S2')?.amountAr, 35000);
  assert.equal(tariffFor(list, 'deux_roues', 'S1')?.amountAr, 40000);
  assert.equal(tariffFor(list, 'deux_roues', 'S3')?.amountAr, 40000);
  assert.equal(tariffFor(list, 'carte_pvc', 'S1'), undefined);
});

test('remise annuelle : 10 % à partir de 12 mois payés d’un coup', () => {
  const promo = { enabled: true, percent: 10, minMonths: 12 };
  assert.deepEqual(monthlyAmount(120000, 12, promo), { grossAr: 1440000, discountAr: 144000, netAr: 1296000, applied: true });
  assert.deepEqual(monthlyAmount(120000, 11, promo), { grossAr: 1320000, discountAr: 0, netAr: 1320000, applied: false });
  // Arrondi à 100 Ar
  assert.equal(monthlyAmount(40050, 12, { ...promo, percent: 7 }).discountAr, 33600);
  // Désactivée
  assert.equal(monthlyAmount(120000, 12, { ...promo, enabled: false }).discountAr, 0);
});

test('réglage de la promotion borné', () => {
  assert.deepEqual(cleanPromo({ enabled: true, percent: 150, minMonths: 1 }), { enabled: true, percent: 100, minMonths: 12 });
  assert.deepEqual(cleanPromo({ enabled: false, percent: 12.5, minMonths: 6 }), { enabled: false, percent: 12.5, minMonths: 6 });
  assert.deepEqual(cleanPromo(undefined), { enabled: true, percent: 10, minMonths: 12 });
});

test('formules de la caisse : tarifs actifs, tarif du site prioritaire', () => {
  const T = (id: string, name: string, typeFormula: Tariff['typeFormula'], duration: Tariff['duration'], amountAr: number, siteId?: string, isActive = true) =>
    ({ id, name, typeFormula, duration, amountAr, siteId, isActive }) as Tariff;
  const list = [
    T('vl', 'Libre intérieur', 'placement_libre_interieur', 'mois', 120000),
    T('vl-s2', 'Libre intérieur S2', 'placement_libre_interieur', 'mois', 100000, 'S2'),
    T('adh', 'Droit d’adhésion', 'droit_adhesion', 'unique', 50000),
    T('cot', 'Cotisation', 'adhesion_annuelle', 'an', 160000),
    T('x', 'Lavage', 'autre', 'jour', 5000),
    T('off', 'Ancien', 'deux_roues', 'mois', 1, undefined, false)
  ];
  assert.deepEqual(paymentFormulas(list, 'S1').map((f) => `${f.id}:${f.billing}`), ['vl:mensuel', 'adh:unique', 'cot:annuel', 'x:ponctuel']);
  assert.deepEqual(paymentFormulas(list, 'S2').map((f) => f.id), ['vl-s2', 'adh', 'cot', 'x']);
});

test('droit d’adhésion : déjà payé une fois → reconnu', () => {
  const receipts = [
    { memberId: 'm1', purpose: 'Droit d’adhésion', status: 'confirme' },
    { memberId: 'm2', purpose: 'Droit d’adhésion', status: 'annule' }
  ];
  assert.ok(oneTimeAlreadyPaid(receipts, 'm1', 'Droit d’adhésion'));
  assert.equal(oneTimeAlreadyPaid(receipts, 'm2', 'Droit d’adhésion'), undefined);
  assert.equal(oneTimeAlreadyPaid(receipts, 'm3', 'Droit d’adhésion'), undefined);
});

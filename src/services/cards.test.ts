import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonthsFr, buildCard, cardProblem } from './cards.ts';
import { closeRegister, openRegister } from './cashRegister.ts';
import type { CashRegister, Member, MembershipCard, Vehicle } from '../types/index.ts';

const member = { id: 'm1', fullName: 'Rivo', primarySiteId: 'S1', status: 'actif' } as Member;
const vehicles = [
  { id: 'v1', memberId: 'm1', licensePlate: '1111 TAA', status: 'actif' },
  { id: 'v2', memberId: 'm1', licensePlate: '2222 TAA', status: 'actif' },
  { id: 'v3', memberId: 'm2', licensePlate: '3333 TAA', status: 'actif' }
] as Vehicle[];

test('date d’expiration', () => {
  assert.equal(addMonthsFr('24/11/2026', 12), '24/11/2027');
  assert.equal(addMonthsFr('31/01/2026', 1), '28/02/2026');
  assert.equal(addMonthsFr('29/02/2028', 12), '28/02/2029');
});

test('contrôles avant émission', () => {
  assert.equal(cardProblem(member, vehicles, { primaryPlate: '1111 TAA', validityMonths: 12 }), null);
  assert.match(cardProblem(undefined, vehicles, { primaryPlate: '1111 TAA', validityMonths: 12 })!, /introuvable/);
  assert.match(cardProblem({ ...member, status: 'radie' }, vehicles, { primaryPlate: '1111 TAA', validityMonths: 12 })!, /radié/);
  assert.match(cardProblem(member, vehicles, { primaryPlate: '3333 TAA', validityMonths: 12 })!, /appartenir/);
  assert.match(cardProblem(member, vehicles, { primaryPlate: '1111 TAA', secondaryPlate: '1111 TAA', validityMonths: 12 })!, /autre véhicule/);
  assert.match(cardProblem(member, vehicles, { primaryPlate: '1111 TAA', validityMonths: 0 })!, /validité/);
});

test('nouvelle carte : numéro de l’année suivant, jeton, validité', () => {
  const existing = [{ cardNumber: 'CRD-9981-ANL' }, { cardNumber: 'CRD-2026-0004' }] as MembershipCard[];
  const card = buildCard(member, { id: 'S1', name: 'Site 01' } as any, { primaryPlate: '1111 TAA', secondaryPlate: '2222 TAA', validityMonths: 12 }, existing, '24/11/2026', 'abcd-1234');
  assert.equal(card.cardNumber, 'CRD-2026-0005');
  assert.equal(card.qrToken, 'uuid:abcd-1234');
  assert.equal(card.expirationDate, '24/11/2027');
  assert.equal(card.siteName, 'Site 01');
  assert.equal(card.status, 'actif');
});

const reg = {
  id: 'r1',
  registerCode: 'CAISSE-1',
  cashierName: 'Fara',
  openedAt: '24/11/2026 07:00',
  openingBalanceAr: 100000,
  totalCashCollectedAr: 50000,
  totalMobileMoneyAr: 30000,
  totalExpensesPaidAr: 20000,
  currentCashInHandAr: 130000,
  status: 'ouverte'
} as CashRegister;

test('clôture : écart entre compté et attendu, historique conservé', () => {
  const { patch, closure } = closeRegister(reg, { countedCashAr: 125000, notes: 'Billet déchiré' }, '24/11/2026 19:00', 'Tresorier');
  assert.equal(closure.expectedCashAr, 130000);
  assert.equal(closure.differenceAr, -5000);
  assert.equal(closure.mobileMoneyAr, 30000);
  assert.equal(patch.status, 'cloturee');
  assert.equal(patch.currentCashInHandAr, 125000);
  assert.equal(patch.closures!.length, 1);
});

test('réouverture : totaux remis à zéro, fond de caisse', () => {
  const p = openRegister({ ...reg, status: 'cloturee' }, { openingBalanceAr: 125000, cashierName: '' }, '25/11/2026 07:00');
  assert.deepEqual(
    { status: p.status, opening: p.openingBalanceAr, cash: p.totalCashCollectedAr, mm: p.totalMobileMoneyAr, inHand: p.currentCashInHandAr, cashier: p.cashierName },
    { status: 'ouverte', opening: 125000, cash: 0, mm: 0, inHand: 125000, cashier: 'Fara' }
  );
});

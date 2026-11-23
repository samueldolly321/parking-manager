import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paidMonths, subscriptionReceipts, unpaidMonths, yearCalendar } from './subscriptionCalendar.ts';
import type { PaymentReceipt, Subscription } from '../types/index.ts';

const sub = (over: Partial<Subscription> = {}): Subscription =>
  ({
    id: 's1',
    contractRef: 'ABO-1',
    memberId: 'm1',
    memberName: 'Membre',
    vehiclePlate: '6543 TBD',
    vehicleModel: 'Rav4',
    siteId: 'S1',
    tariffType: 'Placement Libre Intérieur',
    monthlyAmountAr: 120000,
    startDate: '01/02/2026',
    endDate: '28/02/2026',
    nextDueDate: '28/02/2026',
    daysRemaining: 0,
    status: 'a_jour',
    ...over
  }) as Subscription;

let n = 0;
const rec = (period: string, over: Partial<PaymentReceipt> = {}): PaymentReceipt =>
  ({
    id: `r${++n}`,
    memberId: 'm1',
    vehiclePlate: '6543 TBD',
    period,
    purpose: 'Abonnement Standard VL',
    remainingBalanceAr: 0,
    status: 'confirme',
    ...over
  }) as PaymentReceipt;

test('reçus pris en compte : même membre et même véhicule, paiements mensuels uniquement', () => {
  const receipts = [
    rec('Février 2026'),
    rec('Mars 2026', { vehiclePlate: '6543 TBD / 1209 TBH' }), // plusieurs plaques
    rec('Avril 2026', { vehiclePlate: undefined }), // sans plaque
    rec('Mai 2026', { vehiclePlate: '9999 XXX' }), // autre véhicule
    rec('Juin 2026', { memberId: 'm2' }), // autre membre
    rec('Juillet 2026', { status: 'annule' }),
    rec('15/08/2026', { purpose: 'Pass Journalier' }),
    rec('Année 2026', { purpose: 'Cotisation Statutaire Annuelle Membre' })
  ];
  assert.deepEqual(
    subscriptionReceipts(sub(), receipts).map((r) => r.period),
    ['Février 2026', 'Mars 2026', 'Avril 2026']
  );
});

test('mois payés et partiels (un paiement complet l’emporte)', () => {
  const { paid, partial } = paidMonths(sub(), [
    rec('Janvier–Mars 2026'),
    rec('Mars–Avril 2026', { remainingBalanceAr: 10000 }),
    rec('01/05/2026 - 31/05/2026')
  ]);
  assert.deepEqual([...paid].sort(), ['2026-01', '2026-02', '2026-03', '2026-05']);
  assert.deepEqual([...partial], ['2026-04']);
});

test('calendrier annuel', () => {
  const receipts = [rec('Février–Mars 2026'), rec('Mai 2026', { remainingBalanceAr: 5000 })];
  const cal = yearCalendar(sub(), receipts, 2026, '2026-06');
  assert.deepEqual(
    cal.map((c) => c.state),
    ['hors_contrat', 'paye', 'paye', 'impaye', 'partiel', 'impaye', 'a_venir', 'a_venir', 'a_venir', 'a_venir', 'a_venir', 'a_venir']
  );
  // Expired contract: the months after its end are outside the contract
  const expired = yearCalendar(sub({ status: 'expire', endDate: '30/04/2026' }), receipts, 2026, '2026-06');
  assert.deepEqual(expired.slice(3, 7).map((c) => c.state), ['impaye', 'partiel', 'hors_contrat', 'hors_contrat']);
});

test('liste des mois impayés jusqu’au mois en cours', () => {
  const receipts = [rec('Février 2026'), rec('Avril 2026', { remainingBalanceAr: 1 })];
  assert.deepEqual(unpaidMonths(sub(), receipts, '2026-05'), ['2026-03', '2026-05']);
  assert.deepEqual(unpaidMonths(sub({ startDate: 'inconnue' }), receipts, '2026-05'), []);
  assert.deepEqual(unpaidMonths(sub({ startDate: '01/11/2026' }), [], '2027-01'), ['2026-11', '2026-12', '2027-01']);
});

test('rien n’est dû avant janvier 2026', async () => {
  const { BILLING_START_KEY, subscriptionHealth } = await import('./subscriptionCalendar.ts');
  assert.equal(BILLING_START_KEY, '2026-01');
  const old = sub({ startDate: '01/05/2024', monthlyAmountAr: 100 });
  // Contrat de 2024 : seuls les mois depuis janvier 2026 sont dus
  assert.deepEqual(unpaidMonths(old, [], '2026-03'), ['2026-01', '2026-02', '2026-03']);
  // Un reste à payer sur un reçu de 2024 n'est plus compté
  const h = subscriptionHealth(old, [rec('Mai 2024', { remainingBalanceAr: 50 })], { year: 2026, monthIndex: 2, day: 1 });
  assert.equal(h.arrearsAr, 300);
  // Calendrier 2025 : tout est hors contrat (sauf un mois réellement payé)
  const cal2025 = yearCalendar(old, [rec('Juin 2025')], 2025, '2026-03');
  assert.equal(cal2025.filter((c) => c.state === 'hors_contrat').length, 11);
  assert.equal(cal2025[5].state, 'paye');
});

test('état calculé d’un abonnement', async () => {
  const { subscriptionHealth } = await import('./subscriptionCalendar.ts');
  const s = sub({ startDate: '01/04/2026', monthlyAmountAr: 100 });
  // Avril payé, mai partiellement (reste 30), juin impayé
  const receipts = [rec('Avril 2026'), rec('Mai 2026', { remainingBalanceAr: 30 })];
  const late = subscriptionHealth(s, receipts, { year: 2026, monthIndex: 5, day: 10 });
  assert.equal(late.state, 'en_retard');
  assert.deepEqual(late.unpaid, ['2026-06']);
  assert.equal(late.arrearsAr, 130);

  const paidUp = [rec('Avril–Juin 2026')];
  assert.equal(subscriptionHealth(s, paidUp, { year: 2026, monthIndex: 5, day: 10 }).state, 'a_jour');
  assert.equal(subscriptionHealth(s, paidUp, { year: 2026, monthIndex: 5, day: 25 }).state, 'proche_echeance');
  assert.equal(subscriptionHealth(s, [rec('Avril–Juillet 2026')], { year: 2026, monthIndex: 5, day: 25 }).state, 'a_jour');
  assert.equal(subscriptionHealth(sub({ status: 'expire' }), [], { year: 2026, monthIndex: 5, day: 1 }).state, 'expire');
});

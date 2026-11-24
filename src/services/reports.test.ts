import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from './reports.ts';
import { subscriptionHealth } from './subscriptionCalendar.ts';
import { todayInTana } from './dashboardMetrics.ts';
import { monthKey } from './months.ts';
import type { AppState } from '../types/index.ts';

const t = todayInTana();
const current = monthKey(t.year, t.monthIndex);

const state = {
  sites: [{ id: 'S1', name: 'Site 01 - Centre', totalCapacity: 250 }],
  members: [
    { id: 'm1', fullName: 'Rivo', memberNumber: 'MBR-1', primarySiteId: 'S1', category: 'standard', currentBalanceAr: 0, joinedDate: '01/01/2026' },
    { id: 'm2', fullName: 'Haja', memberNumber: 'MBR-2', primarySiteId: 'S1', category: 'standard', currentBalanceAr: -999999, joinedDate: '01/01/2026' }
  ],
  subscriptions: [
    // Rivo: contrat depuis 2024, rien payé -> dû depuis janvier 2026
    { id: 's1', memberId: 'm1', vehiclePlate: '1111 TAA', siteId: 'S1', monthlyAmountAr: 1000, startDate: '01/05/2024', endDate: '31/05/2024', status: 'a_jour' },
    // Haja : tout payé jusqu'au mois en cours -> aucun impayé, malgré son « solde » enregistré
    { id: 's2', memberId: 'm2', vehiclePlate: '2222 TAA', siteId: 'S1', monthlyAmountAr: 1000, startDate: `01/${String(t.monthIndex + 1).padStart(2, '0')}/${t.year}`, endDate: '', status: 'en_retard' }
  ],
  receipts: [
    { id: 'r1', memberId: 'm2', vehiclePlate: '2222 TAA', siteId: 'S1', status: 'confirme', period: `${['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][t.monthIndex]} ${t.year}`, purpose: 'Abonnement', remainingBalanceAr: 0, amountPaidAr: 1000, dateTime: '01/01/2026 08:00', paymentMethod: 'Espèces' }
  ],
  spots: [
    { id: 'p1', siteId: 'S1', status: 'occupe' },
    { id: 'p2', siteId: 'S1', status: 'libre' },
    { id: 'p3', siteId: 'S1', status: 'reserve' },
    { id: 'p4', siteId: 'S1', status: 'libre' }
  ],
  expenses: [],
  payrolls: [],
  incidents: []
} as unknown as AppState;

test('impayés et états des abonnements calculés comme le tableau de bord', () => {
  const r = buildReport(state, { granularity: 'mois', value: current }, 'all');
  const expected = subscriptionHealth(state.subscriptions[0], state.receipts, t);
  assert.equal(r.unpaid.members.length, 1);
  assert.equal(r.unpaid.members[0].name, 'Rivo');
  assert.equal(r.unpaid.totalAr, expected.arrearsAr);
  assert.equal(r.unpaid.members[0].months, expected.unpaid.length);
  assert.equal(r.unpaid.months, t.monthIndex + 1); // janvier 2026 -> mois en cours (année 2026)
  assert.equal(r.subscriptions.enRetard, 1);
  assert.equal(r.subscriptions.enRetard + r.subscriptions.aJour + r.subscriptions.procheEcheance, 2);
});

test('occupation sur les places configurées, capacité déclarée à part', () => {
  const r = buildReport(state, { granularity: 'mois', value: current }, 'all');
  assert.deepEqual(
    { capacity: r.occupancy[0].capacity, declared: r.occupancy[0].declared, occupied: r.occupancy[0].occupied, reserved: r.occupancy[0].reserved },
    { capacity: 4, declared: 250, occupied: 1, reserved: 1 }
  );
  assert.equal(r.occupancy[0].rate, 0.25);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roleCan, scopeState, userSite, writeRule } from './permissions.ts';
import type { AppState } from '../types/index.ts';

const stateKeyOf = (c: string) =>
  ({ members: 'members', payrolls: 'payrolls', committee: 'committeeMembers', sites: 'sites', 'cash-registers': 'cashRegisters' } as Record<string, string>)[c] ?? null;

test('les administrateurs peuvent tout faire', () => {
  for (const role of ['super_admin', 'president_general']) {
    for (const action of ['write', 'delete', 'payroll', 'sites', 'admin'] as const) assert.ok(roleCan(role, action), `${role} ${action}`);
  }
});

test('auditeur et propriétaire sont en lecture seule', () => {
  for (const role of ['auditeur', 'proprietaire_membre']) {
    assert.equal(roleCan(role, 'write'), false);
    assert.equal(roleCan(role, 'finance'), false);
  }
});

test('rôles de terrain : pas de paie, pas de remise à zéro', () => {
  assert.equal(roleCan('gardien', 'payroll'), false);
  assert.equal(roleCan('agent_caisse', 'admin'), false);
  assert.ok(roleCan('agent_caisse', 'finance'));
  assert.equal(roleCan('tresorier_site', 'delete'), false);
  assert.equal(roleCan(undefined, 'write'), false);
  assert.equal(roleCan('role_inconnu', 'write'), false);
});

test('site d’un utilisateur : seulement pour les rôles rattachés à un site', () => {
  assert.equal(userSite({ role: 'president_site', siteId: 'S2' }), 'S2');
  assert.equal(userSite({ role: 'president_general', siteId: 'S2' }), null);
  assert.equal(userSite({ role: 'gardien', siteId: undefined }), null);
});

test('règles des requêtes d’écriture', () => {
  assert.equal(writeRule('GET', '/members', stateKeyOf), null);
  assert.equal(writeRule('POST', '/auth/login', stateKeyOf), null);
  assert.equal(writeRule('PUT', '/users/u1', stateKeyOf), null);
  assert.equal(writeRule('POST', '/cards/verify-qr', stateKeyOf), null);
  assert.deepEqual(writeRule('POST', '/members', stateKeyOf), { action: 'write', site: { body: 'primarySiteId' } });
  assert.deepEqual(writeRule('POST', '/receipts', stateKeyOf), { action: 'finance', site: { body: 'siteId' } });
  assert.deepEqual(writeRule('POST', '/admin/reset', stateKeyOf), { action: 'admin' });
  assert.deepEqual(writeRule('POST', '/expenses/e1/approve', stateKeyOf), {
    action: 'expense_approve',
    record: { stateKey: 'expenses', id: 'e1' }
  });
  assert.deepEqual(writeRule('PUT', '/payrolls/p1', stateKeyOf), { action: 'payroll', record: { stateKey: 'payrolls', id: 'p1' } });
  assert.deepEqual(writeRule('DELETE', '/payrolls/p1', stateKeyOf), {
    action: 'delete',
    also: 'payroll',
    record: { stateKey: 'payrolls', id: 'p1' }
  });
  assert.deepEqual(writeRule('DELETE', '/members/m1', stateKeyOf), {
    action: 'delete',
    also: undefined,
    record: { stateKey: 'members', id: 'm1' }
  });
  // Unknown write route: at least the right to change data
  assert.deepEqual(writeRule('POST', '/nouvelle-route', stateKeyOf), { action: 'write' });
});

test('un rôle de site ne voit que les données de son site', () => {
  const state = {
    currentUser: { id: 'u1' },
    selectedSiteId: 'all',
    sites: [{ id: 'S1', code: 'S1-A' }, { id: 'S2', code: 'S2-B' }],
    users: [{ id: 'u1', siteId: 'S2' }, { id: 'u2', siteId: 'S1' }, { id: 'u3' }],
    members: [{ id: 'm1', primarySiteId: 'S1' }, { id: 'm2', primarySiteId: 'S2' }],
    vehicles: [], spots: [], subscriptions: [], cards: [], guards: [], equipments: [], cashRegisters: [], expenses: [], incidents: [],
    tariffs: [{ id: 't0' }, { id: 't1', siteId: 'S1' }, { id: 't2', siteId: 'S2' }],
    receipts: [{ id: 'r1', siteId: 'S1' }, { id: 'r2', siteId: 'S2' }],
    committeeMembers: [{ id: 'c0' }, { id: 'c1', siteId: 'S1' }],
    meetings: [{ id: 'mt1' }],
    payrolls: [{ id: 'p0', siteId: 'GLOBAL' }, { id: 'p2', siteId: 'S2' }],
    auditLogs: [{ id: 'a1', siteCode: 'S2-B' }, { id: 'a2', siteCode: 'GLOBAL' }, { id: 'a3', siteCode: 'S2' }]
  } as unknown as AppState;

  const ids = (list: { id: string }[]) => list.map((x) => x.id);
  const scoped = scopeState(state, { id: 'u1', role: 'tresorier_site', siteId: 'S2' });
  assert.equal(scoped.selectedSiteId, 'S2');
  assert.deepEqual(ids(scoped.sites), ['S2']);
  assert.deepEqual(ids(scoped.members), ['m2']);
  assert.deepEqual(ids(scoped.receipts), ['r2']);
  assert.deepEqual(ids(scoped.tariffs), ['t0', 't2']);
  assert.deepEqual(ids(scoped.committeeMembers), ['c0']);
  assert.deepEqual(ids(scoped.payrolls), ['p2']);
  assert.deepEqual(ids(scoped.users), ['u1']);
  assert.deepEqual(ids(scoped.auditLogs), ['a1', 'a3']);

  // A general role sees everything
  assert.equal(scopeState(state, { id: 'u9', role: 'tresorier_general', siteId: undefined }), state);
});

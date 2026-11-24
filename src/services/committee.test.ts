import { test } from 'node:test';
import assert from 'node:assert/strict';
import { membershipApprovers, sitePresidentOf } from './committee.ts';
import type { CommitteeMember, Site } from '../types/index.ts';

const c = (id: string, fullName: string, role: CommitteeMember['role'], siteId?: string, status: CommitteeMember['status'] = 'actif') =>
  ({ id, fullName, role, siteId, status, phone: `03${id}` }) as CommitteeMember;
const sites = [{ id: 'S1', name: 'Site 01 - Site principal' }, { id: 'S2', name: 'Site 02 - Ivato' }] as Site[];
const committee = [
  c('1', 'Luc', 'President Site', 'S1'),
  c('2', 'Hery', 'President General'),
  c('3', 'Solo', 'Vice President'),
  c('4', 'Fara', 'Tresorier Site', 'S1'),
  c('5', 'Ancien', 'President Site', 'S2', 'honoraire')
];

test('président de site : rôle « Président de site », actif, rattaché au site', () => {
  assert.equal(sitePresidentOf(committee, 'S1')?.fullName, 'Luc');
  assert.equal(sitePresidentOf(committee, 'S2'), undefined); // honoraire
});

test('« Adhésion acceptée par » : seulement les présidents actifs du comité', () => {
  assert.deepEqual(membershipApprovers(committee, sites), [
    { value: 'Hery (Président Général)', label: 'Hery — Président Général' },
    { value: 'Luc (Président du site Site 01 - Site principal)', label: 'Luc — Président du site Site 01 - Site principal', siteId: 'S1' }
  ]);
});

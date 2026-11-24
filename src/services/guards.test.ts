import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentGuardDay, equipmentOf, onDutyNow } from './guards.ts';
import type { Equipment, GuardPersonnel } from '../types/index.ts';

// Mardi 24/11/2026 à Antananarivo (GMT+3)
const at = (hourTana: number, minute = 0) => new Date(Date.UTC(2026, 10, 24, hourTana - 3, minute));

test('jour de garde : 06h → 06h le lendemain', () => {
  assert.deepEqual(currentGuardDay(at(10)), { key: 'tue', date: '24/11/2026' });
  assert.deepEqual(currentGuardDay(at(6)), { key: 'tue', date: '24/11/2026' });
  // 05h59 : c'est encore la garde de lundi
  assert.deepEqual(currentGuardDay(at(5, 59)), { key: 'mon', date: '23/11/2026' });
  // 01h du matin heure de Tana = la veille en UTC
  assert.deepEqual(currentGuardDay(at(1)), { key: 'mon', date: '23/11/2026' });
});

const g = (id: string, day: Partial<GuardPersonnel['shiftDays']>): GuardPersonnel =>
  ({ id, fullName: id, shiftDays: { mon: 'REPOS', tue: 'REPOS', wed: 'REPOS', thu: 'REPOS', fri: 'REPOS', sat: 'REPOS', sun: 'REPOS', ...day } }) as GuardPersonnel;

test('de garde maintenant, selon le planning', () => {
  const guards = [g('a', { mon: 'GARDE' }), g('b', { tue: 'GARDE' }), g('c', { tue: 'CONGE' })];
  assert.deepEqual(onDutyNow(guards, at(10)).map((x) => x.id), ['b']);
  assert.deepEqual(onDutyNow(guards, at(3)).map((x) => x.id), ['a']);
});

test('matériel confié : catégorie « Confiés aux gardiens » et nom du responsable', () => {
  const eq = (id: string, category: Equipment['category'], responsibleName: string) => ({ id, category, responsibleName }) as Equipment;
  const list = [
    eq('radio', 'assigned', 'Rakoto  Jean'),
    eq('lampe', 'assigned', 'RAKOTÔ jean'),
    eq('barriere', 'barriers', 'Rakoto Jean'),
    eq('autre', 'assigned', 'Rabe Paul')
  ];
  assert.deepEqual(equipmentOf(list, { fullName: 'Rakoto Jean' }).map((e) => e.id), ['radio', 'lampe']);
  assert.deepEqual(equipmentOf(list, { fullName: '' }), []);
});

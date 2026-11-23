import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextYearlyNumber, pickYearlyNumber } from './numbering.ts';

test('premier numéro de l’année', () => {
  assert.equal(nextYearlyNumber([], 'MBR', 2026), 'MBR-2026-0001');
});

test('suit le plus grand numéro, pas le nombre d’éléments', () => {
  // 2 members left after deleting MBR-2026-0002: the next one must not reuse 0003
  assert.equal(nextYearlyNumber(['MBR-2026-0001', 'MBR-2026-0003'], 'MBR', 2026), 'MBR-2026-0004');
});

test('ignore les autres années et les autres préfixes', () => {
  const existing = ['REC-2024-8492', 'MBR-2026-0010', 'REC-2026-0007', 'n’importe quoi', null, undefined];
  assert.equal(nextYearlyNumber(existing, 'REC', 2026), 'REC-2026-0008');
  assert.equal(nextYearlyNumber(existing, 'REC', 2027), 'REC-2027-0001');
});

test('longueur de remplissage configurable', () => {
  assert.equal(nextYearlyNumber(['PAY-2026-009'], 'PAY', 2026, 3), 'PAY-2026-010');
});

test('garde le numéro demandé s’il est libre et bien formé', () => {
  assert.equal(pickYearlyNumber('REC-2026-0005', ['REC-2026-0001'], 'REC', 2026), 'REC-2026-0005');
});

test('remplace un numéro déjà pris ou mal formé', () => {
  const existing = ['REC-2026-0001', 'REC-2026-0002'];
  assert.equal(pickYearlyNumber('REC-2026-0002', existing, 'REC', 2026), 'REC-2026-0003');
  assert.equal(pickYearlyNumber('n’importe quoi', existing, 'REC', 2026), 'REC-2026-0003');
  assert.equal(pickYearlyNumber(undefined, existing, 'REC', 2026), 'REC-2026-0003');
});

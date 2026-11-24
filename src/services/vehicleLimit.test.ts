import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carsOf, vehicleLimitProblem } from './vehicleLimit.ts';
import type { Vehicle } from '../types/index.ts';

const v = (id: string, memberId: string, category: string, status = 'actif') => ({ id, memberId, category, status, licensePlate: id }) as Vehicle;
// Comme RAMANANTSOA : 1 voiture + 1 utilitaire + 1 moto
const vehicles = [v('VL', 'm1', 'Voiture Légère (VL)'), v('UT', 'm1', 'Utilitaire / Fourgon'), v('MOTO', 'm1', 'Deux-Roues (2R)'), v('OLD', 'm1', 'SUV / 4x4', 'radie'), v('X', 'm2', 'Voiture Légère (VL)')];

test('les deux-roues et les véhicules radiés ne comptent pas', () => {
  assert.deepEqual(carsOf(vehicles, 'm1').map((x) => x.id), ['VL', 'UT']);
});

test('une troisième voiture est refusée, une moto est acceptée', () => {
  assert.match(vehicleLimitProblem(vehicles, 'm1', { category: 'SUV / 4x4' })!, /plus de 2 voitures \(déjà : VL, UT\)/);
  assert.equal(vehicleLimitProblem(vehicles, 'm1', { category: 'Deux-Roues (2R)' }), null);
  assert.equal(vehicleLimitProblem(vehicles, 'm2', { category: 'SUV / 4x4' }), null);
});

test('modifier une de ses voitures ne la compte pas deux fois', () => {
  assert.equal(vehicleLimitProblem(vehicles, 'm1', { id: 'VL', category: 'SUV / 4x4' }), null);
  // Réactiver un véhicule radié alors que 2 voitures sont déjà là : refusé
  assert.ok(vehicleLimitProblem(vehicles, 'm1', { id: 'OLD', category: 'SUV / 4x4', status: 'actif' }));
  // La moto devient une voiture : refusé
  assert.ok(vehicleLimitProblem(vehicles, 'm1', { id: 'MOTO', category: 'Voiture Légère (VL)' }));
});

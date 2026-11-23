import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elapsedSince, formatEntryTime, groupByZone, nextSpotCodes, parseEntryTime, tariffForSpot } from './spots.ts';
import type { ParkingSpot, Tariff } from '../types/index.ts';

const spot = (code: string, zone: string, status: ParkingSpot['status'] = 'libre', siteId = 'S1'): ParkingSpot => ({
  id: `${siteId}-${code}`,
  code,
  siteId,
  zone,
  type: 'placement_libre_interieur',
  status
});

test('heure d’arrivée : écriture et lecture à l’heure de Madagascar', () => {
  const d = new Date(Date.UTC(2026, 10, 23, 5, 7)); // 08:07 à Antananarivo
  assert.equal(formatEntryTime(d), '23/11/2026 08:07');
  assert.equal(parseEntryTime('23/11/2026 08:07')?.getTime(), d.getTime());
  assert.equal(parseEntryTime('07:42'), null); // heure sans date : durée inconnue
  assert.equal(parseEntryTime(undefined), null);
  assert.equal(parseEntryTime('32/13/2026 08:00'), null);
});

test('durée écoulée', () => {
  const now = new Date(Date.UTC(2026, 10, 23, 9, 30)); // 12:30 à Tana
  assert.equal(elapsedSince('23/11/2026 12:05', now), '25 min');
  assert.equal(elapsedSince('23/11/2026 08:00', now), '4 h 30 min');
  assert.equal(elapsedSince('21/11/2026 10:30', now), '2 j 2 h');
  assert.equal(elapsedSince('07:42', now), null);
  // Une arrivée "dans le futur" (horloge décalée) ne donne pas de durée négative
  assert.equal(elapsedSince('23/11/2026 13:00', now), '0 min');
});

test('zones lues depuis les données, quels que soient les codes', () => {
  const groups = groupByZone([
    spot('A-10', 'Zone A'),
    spot('A-2', 'Zone A', 'occupe'),
    spot('D-01', 'Parking sous-sol', 'occupe'),
    spot('P1', 'Parking sous-sol', 'occupe'),
    spot('X', '  '),
    spot('A-01', 'Zone A', 'libre', 'S2')
  ]);
  assert.deepEqual(
    groups.map((g) => [g.siteId, g.zone, g.spots.map((s) => s.code), g.occupied, g.rate]),
    [
      ['S1', 'Parking sous-sol', ['D-01', 'P1'], 2, 100],
      ['S1', 'Sans zone', ['X'], 0, 0],
      ['S1', 'Zone A', ['A-2', 'A-10'], 1, 50],
      ['S2', 'Zone A', ['A-01'], 0, 0]
    ]
  );
});

test('codes suivants pour de nouvelles places', () => {
  const spots = [spot('A-01', 'Z'), spot('A-08', 'Z'), spot('B-03', 'Z'), spot('A-99', 'Z', 'libre', 'S2')];
  assert.deepEqual(nextSpotCodes(spots, 'S1', 'A-', 3), ['A-09', 'A-10', 'A-11']);
  assert.deepEqual(nextSpotCodes(spots, 'S1', 'C-', 2), ['C-01', 'C-02']);
  assert.deepEqual(nextSpotCodes(spots, 'S3', 'A-', 1), ['A-01']);
  assert.deepEqual(nextSpotCodes([spot('M-120', 'Z')], 'S1', 'M-', 1), ['M-121']);
  assert.deepEqual(nextSpotCodes(spots, 'S1', 'A-', 0), []);
});

test('tarif d’un type de place : celui du site, sinon le tarif général actif', () => {
  const t = (id: string, siteId: string | undefined, isActive = true, amountAr = 1): Tariff =>
    ({ id, siteId, isActive, amountAr, typeFormula: 'deux_roues', duration: 'mois', name: id, category: 'Deux-Roues (2R)', description: '' }) as Tariff;
  const tariffs = [t('general', undefined), t('s2', 'S2'), t('s3-inactif', 'S3', false)];
  assert.equal(tariffForSpot(tariffs, 'deux_roues', 'S2')?.id, 's2');
  assert.equal(tariffForSpot(tariffs, 'deux_roues', 'S1')?.id, 'general');
  assert.equal(tariffForSpot(tariffs, 'deux_roues', 'S3')?.id, 'general');
  assert.equal(tariffForSpot(tariffs, 'poids_lourd', 'S1'), undefined);
});

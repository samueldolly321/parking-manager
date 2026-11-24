import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { computeLicenseState, machineCodeFrom, normalizeMachineCode, signLicense, verifyLicense } from './license.ts';

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const PRIV = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const PUB = publicKey.export({ type: 'spki', format: 'pem' }).toString();

test('code machine : stable, 16 caractères lisibles', () => {
  const a = machineCodeFrom('2f1c9a8e-1111-2222-3333-444455556666');
  assert.match(a, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
  assert.equal(machineCodeFrom('2F1C9A8E-1111-2222-3333-444455556666 '), a);
  assert.notEqual(machineCodeFrom('autre-pc'), a);
  assert.equal(normalizeMachineCode(a.toLowerCase().replace(/-/g, ' ')), a);
});

test('clé : valide pour son ordinateur seulement', () => {
  const machine = machineCodeFrom('pc-client-1');
  const key = signLicense({ m: machine, c: 'Parking Analakely', d: '2026-11-24' }, PRIV);
  const ok = verifyLicense(key, machine, PUB);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.payload.c, 'Parking Analakely');
  // Avec des espaces / retours à la ligne collés
  assert.equal(verifyLicense(`  ${key.slice(0, 20)}\n${key.slice(20)} `, machine, PUB).ok, true);
  const other = verifyLicense(key, machineCodeFrom('pc-client-2'), PUB);
  assert.deepEqual(other, { ok: false, error: 'Cette clé a été créée pour un autre ordinateur.' });
});

test('clé : falsifiée ou signée par une autre clé privée → refusée', () => {
  const machine = machineCodeFrom('pc-client-1');
  const key = signLicense({ m: machine, c: 'Client', d: '2026-11-24' }, PRIV);
  // On remplace le contenu (autre client) en gardant la signature
  const [, sig] = key.split('.');
  const forged = `PM1-${Buffer.from(JSON.stringify({ v: 1, m: machine, c: 'Pirate', k: 'lifetime', d: '2026-11-24' })).toString('base64url')}.${sig}`;
  assert.equal(verifyLicense(forged, machine, PUB).ok, false);
  const otherPriv = crypto.generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  assert.equal(verifyLicense(signLicense({ m: machine, c: 'X', d: '2026-11-24' }, otherPriv), machine, PUB).ok, false);
  assert.equal(verifyLicense('n’importe quoi', machine, PUB).ok, false);
});

test('essai gratuit de 7 jours', () => {
  const D = 86_400_000;
  const start = Date.UTC(2026, 10, 24);
  assert.deepEqual(computeLicenseState({ now: start, trialStart: start, lastSeen: start }), { state: 'trial', daysLeft: 7, endsAt: start + 7 * D });
  assert.equal((computeLicenseState({ now: start + 6.5 * D, trialStart: start, lastSeen: start }) as any).daysLeft, 1);
  assert.deepEqual(computeLicenseState({ now: start + 7 * D, trialStart: start, lastSeen: start }), { state: 'expired', reason: 'trial_over' });
  // Horloge reculée de plus d'un jour : essai terminé
  assert.deepEqual(computeLicenseState({ now: start + 2 * D, trialStart: start, lastSeen: start + 5 * D }), { state: 'expired', reason: 'clock' });
  // Licence activée : toujours actif
  const license = { v: 1 as const, m: 'X', c: 'Client', k: 'lifetime' as const, d: '2026-11-24' };
  assert.equal(computeLicenseState({ now: start + 400 * D, trialStart: start, lastSeen: start, license }).state, 'active');
});

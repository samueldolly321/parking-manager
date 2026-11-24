import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyEquipmentEvent, historySortKey, isoToFr, nextInventoryCode } from './equipment.ts';
import type { Equipment } from '../types/index.ts';

const eq = (over: Partial<Equipment> = {}): Equipment =>
  ({
    id: 'e1',
    inventoryCode: 'MAT-BAR-002',
    designation: 'Barrière',
    category: 'barriers',
    modelSpecs: '',
    siteId: 'S1',
    location: 'Entrée',
    status: 'operationnel',
    quantity: 4,
    responsibleName: 'Chef',
    commissioningDate: '01/01/2026',
    estimatedValueAr: 0,
    lastAuditDate: '01/01/2026',
    maintenanceHistory: [],
    ...over
  }) as Equipment;

test('code d’inventaire suivant, par catégorie, jamais réutilisé', () => {
  const list = [{ inventoryCode: 'MAT-BAR-002' }, { inventoryCode: 'MAT-BAR-007' }, { inventoryCode: 'MAT-TEL-001' }];
  assert.equal(nextInventoryCode(list, 'barriers'), 'MAT-BAR-008');
  assert.equal(nextInventoryCode(list, 'telecom'), 'MAT-TEL-002');
  assert.equal(nextInventoryCode(list, 'furniture'), 'MAT-MOB-001');
});

test('dates', () => {
  assert.equal(isoToFr('2026-12-05'), '05/12/2026');
  assert.ok(historySortKey('05/12/2026 10:30') > historySortKey('05/12/2026'));
  assert.ok(historySortKey('01/01/2027') > historySortKey('31/12/2026 23:59'));
  assert.equal(historySortKey('n’importe quoi'), 0);
});

test('panne puis remise en service', () => {
  const p = applyEquipmentEvent(eq(), { kind: 'panne', description: 'Moteur HS', critical: true }, '24/11/2026 09:00', 'Rivo');
  assert.equal(p.patch.status, 'critique');
  assert.equal(p.entry.isCritical, true);
  assert.equal(p.entry.kind, 'panne');
  assert.match(p.entry.description, /Moteur HS — Rivo/);
  const m = applyEquipmentEvent(eq(), { kind: 'panne', description: 'Lent', critical: false }, '24/11/2026 09:00', '');
  assert.equal(m.patch.status, 'maintenance');
  const r = applyEquipmentEvent(eq({ status: 'critique' }), { kind: 'remise_service' }, '24/11/2026 10:00', '');
  assert.equal(r.patch.status, 'operationnel');
});

test('intervention planifiée : l’état ne change pas', () => {
  const i = applyEquipmentEvent(eq(), { kind: 'intervention', plannedDate: '02/12/2026', title: 'Révision', provider: 'CAME' }, '24/11/2026 09:00', '');
  assert.deepEqual(i.patch, {});
  assert.equal(i.entry.title, 'Intervention planifiée le 02/12/2026 : Révision');
});

test('transfert de site', () => {
  const t = applyEquipmentEvent(
    eq(),
    { kind: 'transfert', siteId: 'S2', location: 'Local technique', siteName: 'Site 02', fromSiteName: 'Site 01' },
    '24/11/2026 09:00',
    ''
  );
  assert.deepEqual(t.patch, { siteId: 'S2', location: 'Local technique' });
  assert.equal(t.entry.title, 'Transfert : Site 01 → Site 02');
});

test('inventaire : conforme ou écart, quantité et date mises à jour', () => {
  const ok = applyEquipmentEvent(eq(), { kind: 'audit', quantityFound: 4 }, '24/11/2026 09:00', '');
  assert.equal(ok.entry.title, 'Inventaire : conforme');
  assert.equal(ok.patch.lastAuditDate, '24/11/2026');
  const missing = applyEquipmentEvent(eq(), { kind: 'audit', quantityFound: 3 }, '24/11/2026 09:00', '');
  assert.equal(missing.patch.quantity, 3);
  assert.equal(missing.entry.title, 'Inventaire : écart de -1 (4 → 3)');
  assert.equal(missing.entry.isCritical, true);
});

test('remise à un gardien puis restitution', () => {
  const a = applyEquipmentEvent(eq({ category: 'security', responsibleName: 'Magasin' }), { kind: 'affectation', guardName: 'Rakoto Jean' }, '24/11/2026 09:00', 'Chef');
  assert.deepEqual(a.patch, { category: 'assigned', responsibleName: 'Rakoto Jean' });
  assert.equal(a.entry.title, 'Remis à Rakoto Jean');
  assert.match(a.entry.description, /Précédent détenteur : Magasin/);
  const r = applyEquipmentEvent(eq({ category: 'assigned', responsibleName: 'Rakoto Jean' }), { kind: 'restitution', responsibleName: 'Magasin' }, '24/11/2026 18:00', '');
  assert.deepEqual(r.patch, { responsibleName: 'Magasin' });
  assert.equal(r.entry.title, 'Rendu par Rakoto Jean');
});

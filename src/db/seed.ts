import { getDb, schema } from './index.ts';
import {
  initialSites,
  initialCurrentUser,
  initialMembers,
  initialVehicles,
  initialSpots,
  initialTariffs,
  initialSubscriptions,
  initialReceipts,
  initialCards,
  initialGuards,
  initialEquipments,
  initialExpenses,
  initialIncidents,
  initialCommitteeMembers,
  initialMeetings,
  initialAuditLogs,
  initialPayrolls
} from '../services/storage.ts';

export async function seedDatabaseIfEmpty(): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const existingSites = await db.select().from(schema.sites).limit(1);
  if (existingSites.length > 0) {
    return false;
  }

  // Installed version: a clean start (one site to rename, the administrator account, no demo data)
  if (process.env.PM_DESKTOP === '1') {
    await db.transaction(async (tx) => {
      await tx.insert(schema.sites).values({
        id: 'S1',
        code: 'S1-PRINCIPAL',
        name: 'Site 01 - Site principal',
        address: '',
        city: 'Antananarivo',
        totalCapacity: 50,
        presidentName: 'À désigner',
        presidentPhone: '',
        tresorierName: 'À désigner',
        guardCount: 0,
        status: 'actif'
      }).onConflictDoNothing();
      await tx.insert(schema.users).values({
        ...initialCurrentUser,
        fullName: 'Administrateur',
        email: 'admin@parking.local',
        phone: '',
        avatarUrl: null,
        lastLogin: null,
        siteId: null,
        // No password: it is created on the first-launch screen
        passwordHash: ''
      } as any).onConflictDoNothing();
      await tx.insert(schema.tariffs).values(initialTariffs.filter((t) => !t.siteId || t.siteId === 'S1')).onConflictDoNothing();
      await tx.insert(schema.cashRegisters).values({
        id: 'reg-S1',
        siteId: 'S1',
        siteName: 'Site 01 - Site principal',
        registerCode: 'CAISSE-S1',
        cashierName: 'À désigner',
        openedAt: new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' }),
        openingBalanceAr: 0,
        totalCashCollectedAr: 0,
        totalMobileMoneyAr: 0,
        totalExpensesPaidAr: 0,
        currentCashInHandAr: 0,
        status: 'ouverte'
      }).onConflictDoNothing();
    });
    console.log('[db] Première installation : site principal et compte administrateur créés (sans données de démonstration).');
    return true;
  }

  await db.transaction(async (tx) => {
    await tx.insert(schema.sites).values(initialSites).onConflictDoNothing();

    await tx.insert(schema.users).values({
      ...initialCurrentUser,
      passwordHash: '$2a$12$e8w.x7Wq5P1kZ5Gg6I6S3O.fFz4D9A0Qy/s/GkUo4W8qTqK7S'
    }).onConflictDoNothing();

    await tx.insert(schema.members).values(initialMembers).onConflictDoNothing();
    await tx.insert(schema.vehicles).values(initialVehicles).onConflictDoNothing();
    await tx.insert(schema.parkingSpaces).values(initialSpots).onConflictDoNothing();
    await tx.insert(schema.tariffs).values(initialTariffs).onConflictDoNothing();
    await tx.insert(schema.subscriptions).values(initialSubscriptions).onConflictDoNothing();
    await tx.insert(schema.paymentReceipts).values(initialReceipts).onConflictDoNothing();
    await tx.insert(schema.membershipCards).values(initialCards).onConflictDoNothing();
    await tx.insert(schema.guards).values(initialGuards).onConflictDoNothing();
    await tx.insert(schema.inventoryItems).values(initialEquipments).onConflictDoNothing();

    await tx.insert(schema.cashRegisters).values({
      id: 'reg-01',
      siteId: 'S1',
      siteName: 'Site 01 - Analakely Central',
      registerCode: 'CAISSE-C1-ANL',
      cashierName: 'Razafindrakoto Fara',
      openedAt: '15/05/2024 07:00',
      openingBalanceAr: 500000,
      totalCashCollectedAr: 1180000,
      totalMobileMoneyAr: 480000,
      totalExpensesPaidAr: 185000,
      currentCashInHandAr: 1495000,
      status: 'ouverte'
    }).onConflictDoNothing();

    await tx.insert(schema.expenses).values(initialExpenses).onConflictDoNothing();
    await tx.insert(schema.incidents).values(initialIncidents).onConflictDoNothing();
    await tx.insert(schema.committeeMembers).values(initialCommitteeMembers).onConflictDoNothing();

    await tx.insert(schema.governanceMeetings).values(
      initialMeetings.map((m) => ({
        id: m.id,
        date: m.date,
        title: m.title,
        location: m.location,
        agenda: m.agenda,
        summaryPv: m.summaryPV,
        resolutionsCount: m.resolutionsCount,
        documentPdfUrl: m.documentPdfUrl
      }))
    ).onConflictDoNothing();

    await tx.insert(schema.payrolls).values(initialPayrolls).onConflictDoNothing();
    await tx.insert(schema.auditLogs).values(initialAuditLogs).onConflictDoNothing();
  });

  return true;
}

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

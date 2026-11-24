import fs from 'fs';
import path from 'path';
import { eq, desc, getTableColumns, and, inArray } from 'drizzle-orm';
import { getDb, getPool, isPostgresConfigured, schema } from './index.ts';
import type {
  AppState,
  Site,
  User,
  Member,
  Vehicle,
  ParkingSpot,
  Tariff,
  Subscription,
  PaymentReceipt,
  MembershipCard,
  GuardPersonnel,
  Equipment,
  CashRegister,
  ExpenseRecord,
  IncidentRecord,
  CommitteeMember,
  GovernanceMeeting,
  AuditLogItem,
  PayrollRecord
} from '../types/index.ts';
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
import { seedDatabaseIfEmpty } from './seed.ts';

const LOCAL_DB_FILE = path.resolve(process.env.PM_DATA_DIR || process.cwd(), '.data', 'parking_mada_db.json');

function buildInitialState(): AppState {
  return {
    currentUser: { ...initialCurrentUser },
    selectedSiteId: 'all',
    sites: [...initialSites],
    users: [{ ...initialCurrentUser }],
    members: [...initialMembers],
    vehicles: [...initialVehicles],
    spots: [...initialSpots],
    tariffs: [...initialTariffs],
    subscriptions: [...initialSubscriptions],
    receipts: [...initialReceipts],
    cards: [...initialCards],
    guards: [...initialGuards],
    equipments: [...initialEquipments],
    cashRegisters: [
      {
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
      }
    ],
    expenses: [...initialExpenses],
    incidents: [...initialIncidents],
    committeeMembers: [...initialCommitteeMembers],
    meetings: [...initialMeetings],
    auditLogs: [...initialAuditLogs],
    payrolls: [...initialPayrolls]
  };
}

/** "18/11/2026 00:32:13" (fr-FR, Antananarivo) -> sortable number; 0 if unreadable. Newest entries first. */
function auditTime(ts: string): number {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(ts || '');
  if (!m) return 0;
  return Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

let memoryStore: AppState | null = null;

function loadLocalStore(): AppState {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && Array.isArray(parsed.sites)) {
        if (!Array.isArray(parsed.payrolls)) parsed.payrolls = [...initialPayrolls];
        memoryStore = parsed;
        return memoryStore;
      }
    }
  } catch (err) {
    console.warn('Could not read local store file, using defaults:', err);
  }
  memoryStore = buildInitialState();
  saveLocalStore(memoryStore);
  return memoryStore;
}

function saveLocalStore(state: AppState): void {
  memoryStore = state;
  try {
    const dir = path.dirname(LOCAL_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem fallback: keep in memoryStore
  }
}

export async function getStorageMode(): Promise<'postgresql' | 'local'> {
  return isPostgresConfigured() ? 'postgresql' : 'local';
}

export async function getFullState(): Promise<AppState> {
  const db = getDb();
  if (!db) {
    return loadLocalStore();
  }

  await seedDatabaseIfEmpty();

  const [
    siteRows,
    userRows,
    memberRows,
    vehicleRows,
    spotRows,
    tariffRows,
    subRows,
    receiptRows,
    cardRows,
    guardRows,
    equipmentRows,
    cashRegisterRows,
    expenseRows,
    incidentRows,
    committeeRows,
    meetingRows,
    auditRows,
    payrollRows
  ] = await Promise.all([
    db.select().from(schema.sites),
    db.select().from(schema.users),
    db.select().from(schema.members),
    db.select().from(schema.vehicles),
    db.select().from(schema.parkingSpaces),
    db.select().from(schema.tariffs),
    db.select().from(schema.subscriptions),
    db.select().from(schema.paymentReceipts).orderBy(desc(schema.paymentReceipts.createdAt)),
    db.select().from(schema.membershipCards),
    db.select().from(schema.guards),
    db.select().from(schema.inventoryItems),
    db.select().from(schema.cashRegisters),
    db.select().from(schema.expenses),
    db.select().from(schema.incidents),
    db.select().from(schema.committeeMembers),
    db.select().from(schema.governanceMeetings).orderBy(desc(schema.governanceMeetings.createdAt)),
    db.select().from(schema.auditLogs),
    db.select().from(schema.payrolls).orderBy(desc(schema.payrolls.createdAt))
  ]);

  const mappedUsers: User[] = userRows.map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    role: u.role as User['role'],
    siteId: u.siteId ?? undefined,
    phone: u.phone,
    avatarUrl: u.avatarUrl ?? undefined,
    isActive: u.isActive,
    lastLogin: u.lastLogin ?? undefined
  }));

  return {
    currentUser: mappedUsers[0] || { ...initialCurrentUser },
    selectedSiteId: 'all',
    sites: siteRows.map((s): Site => ({
      id: s.id,
      code: s.code,
      name: s.name,
      address: s.address,
      city: s.city,
      totalCapacity: s.totalCapacity,
      presidentName: s.presidentName,
      presidentPhone: s.presidentPhone,
      tresorierName: s.tresorierName,
      guardCount: s.guardCount,
      status: s.status as Site['status'],
      coordinates: s.coordinates ?? undefined
    })),
    users: mappedUsers,
    members: memberRows.map((m): Member => ({
      id: m.id,
      memberNumber: m.memberNumber,
      fullName: m.fullName,
      category: m.category as Member['category'],
      cin: m.cin,
      cinIssuedDate: m.cinIssuedDate ?? undefined,
      cinIssuedLocation: m.cinIssuedLocation ?? undefined,
      phone: m.phone,
      mobileMoneyProvider: (m.mobileMoneyProvider as Member['mobileMoneyProvider']) ?? undefined,
      emergencyContactName: m.emergencyContactName ?? undefined,
      emergencyContactPhone: m.emergencyContactPhone ?? undefined,
      address: m.address,
      primarySiteId: m.primarySiteId,
      joinedDate: m.joinedDate,
      approvedByPresident: m.approvedByPresident ?? undefined,
      status: m.status as Member['status'],
      currentBalanceAr: m.currentBalanceAr,
      avatarUrl: m.avatarUrl ?? undefined,
      notes: m.notes ?? undefined
    })),
    vehicles: vehicleRows.map((v): Vehicle => ({
      id: v.id,
      licensePlate: v.licensePlate,
      category: v.category as Vehicle['category'],
      brand: v.brand,
      model: v.model,
      color: v.color,
      memberId: v.memberId,
      siteId: v.siteId,
      spotId: v.spotId ?? undefined,
      rfidTag: v.rfidTag ?? undefined,
      barcode: v.barcode ?? undefined,
      photoUrl: v.photoUrl ?? undefined,
      registeredAt: v.registeredAt,
      status: v.status as Vehicle['status'],
      assignedSpotType: (v.assignedSpotType as Vehicle['assignedSpotType']) ?? undefined
    })),
    spots: spotRows.map((sp): ParkingSpot => ({
      id: sp.id,
      code: sp.code,
      siteId: sp.siteId,
      zone: sp.zone,
      type: sp.type as ParkingSpot['type'],
      status: sp.status as ParkingSpot['status'],
      currentVehiclePlate: sp.currentVehiclePlate ?? undefined,
      currentVehicleModel: sp.currentVehicleModel ?? undefined,
      currentDriverName: sp.currentDriverName ?? undefined,
      entryTime: sp.entryTime ?? undefined,
      duration: sp.duration ?? undefined,
      assignedAbonnement: sp.assignedAbonnement ?? undefined,
      rfidUid: sp.rfidUid ?? undefined
    })),
    tariffs: tariffRows.map((t): Tariff => ({
      id: t.id,
      name: t.name,
      category: t.category as Tariff['category'],
      siteId: t.siteId ?? undefined,
      typeFormula: t.typeFormula as Tariff['typeFormula'],
      duration: t.duration as Tariff['duration'],
      amountAr: t.amountAr,
      description: t.description,
      isActive: t.isActive
    })),
    subscriptions: subRows.map((sub): Subscription => ({
      id: sub.id,
      contractRef: sub.contractRef,
      memberId: sub.memberId,
      memberName: sub.memberName,
      vehiclePlate: sub.vehiclePlate,
      vehicleModel: sub.vehicleModel,
      siteId: sub.siteId,
      tariffType: sub.tariffType,
      monthlyAmountAr: sub.monthlyAmountAr,
      startDate: sub.startDate,
      endDate: sub.endDate,
      nextDueDate: sub.nextDueDate,
      daysRemaining: sub.daysRemaining,
      status: sub.status as Subscription['status']
    })),
    receipts: receiptRows.map((r): PaymentReceipt => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      dateTime: r.dateTime,
      memberId: r.memberId,
      memberName: r.memberName,
      vehiclePlate: r.vehiclePlate ?? undefined,
      siteId: r.siteId,
      siteName: r.siteName,
      purpose: r.purpose,
      period: r.period,
      amountDueAr: r.amountDueAr,
      amountPaidAr: r.amountPaidAr,
      remainingBalanceAr: r.remainingBalanceAr,
      paymentMethod: r.paymentMethod as PaymentReceipt['paymentMethod'],
      cashierName: r.cashierName,
      transactionRef: r.transactionRef,
      status: r.status as PaymentReceipt['status']
    })),
    cards: cardRows.map((c): MembershipCard => ({
      id: c.id,
      cardNumber: c.cardNumber,
      memberId: c.memberId,
      memberName: c.memberName,
      siteId: c.siteId,
      siteName: c.siteName,
      primaryPlate: c.primaryPlate,
      secondaryPlate: c.secondaryPlate ?? undefined,
      issuedDate: c.issuedDate,
      expirationDate: c.expirationDate,
      rfidTag: c.rfidTag,
      nfcChipType: c.nfcChipType,
      qrToken: c.qrToken,
      status: c.status as MembershipCard['status'],
      printedBatchRef: c.printedBatchRef ?? undefined,
      lastPassageTimestamp: c.lastPassageTimestamp ?? undefined,
      lastPassageGate: c.lastPassageGate ?? undefined
    })),
    guards: guardRows.map((g): GuardPersonnel => ({
      id: g.id,
      matricule: g.matricule,
      fullName: g.fullName,
      title: g.title,
      grade: g.grade,
      siteId: g.siteId,
      teamId: g.teamId,
      teamName: g.teamName,
      isTeamLeader: g.isTeamLeader,
      teamLeaderId: g.teamLeaderId ?? undefined,
      teamLeaderName: g.teamLeaderName ?? undefined,
      rankOrder: g.rankOrder,
      ordersOfTheDay: g.ordersOfTheDay ?? [],
      shiftHours: g.shiftHours,
      shiftName: g.shiftName as GuardPersonnel['shiftName'],
      status: g.status as GuardPersonnel['status'],
      phoneFlotte: g.phoneFlotte,
      cin: g.cin,
      residenceLot: g.residenceLot,
      recruitmentDate: g.recruitmentDate,
      badgeRfid: g.badgeRfid,
      avatarUrl: g.avatarUrl ?? undefined,
      assignedEquipments: g.assignedEquipments ?? [],
      shiftDays: g.shiftDays,
      todayLog: g.todayLog ?? []
    })),
    equipments: equipmentRows.map((e): Equipment => ({
      id: e.id,
      inventoryCode: e.inventoryCode,
      designation: e.designation,
      category: e.category as Equipment['category'],
      modelSpecs: e.modelSpecs,
      siteId: e.siteId,
      location: e.location,
      status: e.status as Equipment['status'],
      quantity: e.quantity,
      responsibleName: e.responsibleName,
      commissioningDate: e.commissioningDate,
      estimatedValueAr: e.estimatedValueAr,
      totalCycles: e.totalCycles ?? undefined,
      lastAuditDate: e.lastAuditDate,
      photoUrl: e.photoUrl ?? undefined,
      maintenanceHistory: (e.maintenanceHistory ?? []) as Equipment['maintenanceHistory']
    })),
    cashRegisters: cashRegisterRows.map((reg): CashRegister => ({
      id: reg.id,
      siteId: reg.siteId,
      siteName: reg.siteName,
      registerCode: reg.registerCode,
      cashierName: reg.cashierName,
      openedAt: reg.openedAt,
      openingBalanceAr: reg.openingBalanceAr,
      totalCashCollectedAr: reg.totalCashCollectedAr,
      totalMobileMoneyAr: reg.totalMobileMoneyAr,
      totalExpensesPaidAr: reg.totalExpensesPaidAr,
      currentCashInHandAr: reg.currentCashInHandAr,
      closures: (reg.closures ?? []) as unknown as CashRegister['closures'],
      status: reg.status as CashRegister['status']
    })),
    expenses: expenseRows.map((exp): ExpenseRecord => ({
      id: exp.id,
      expenseNumber: exp.expenseNumber,
      date: exp.date,
      siteId: exp.siteId,
      category: exp.category as ExpenseRecord['category'],
      description: exp.description,
      beneficiary: exp.beneficiary,
      amountAr: exp.amountAr,
      paymentMethod: exp.paymentMethod as ExpenseRecord['paymentMethod'],
      requesterName: exp.requesterName,
      approverName: exp.approverName ?? undefined,
      status: exp.status as ExpenseRecord['status'],
      justificatifRef: exp.justificatifRef ?? undefined,
      invoicePhotoUrl: exp.invoicePhotoUrl ?? undefined,
      quantity: exp.quantity ?? undefined,
      unit: exp.unit ?? undefined
    })),
    incidents: incidentRows.map((inc): IncidentRecord => ({
      id: inc.id,
      ticketCode: inc.ticketCode,
      date: inc.date,
      siteId: inc.siteId,
      reporterName: inc.reporterName,
      type: inc.type as IncidentRecord['type'],
      severity: inc.severity as IncidentRecord['severity'],
      title: inc.title,
      description: inc.description,
      assignedTo: inc.assignedTo ?? undefined,
      resolutionStatus: inc.resolutionStatus as IncidentRecord['resolutionStatus'],
      resolutionNotes: inc.resolutionNotes ?? undefined,
      resolvedAt: inc.resolvedAt ?? undefined,
      memberIds: inc.memberIds ?? [],
      vehicleIds: inc.vehicleIds ?? []
    })),
    committeeMembers: committeeRows.map((c): CommitteeMember => ({
      id: c.id,
      role: c.role as CommitteeMember['role'],
      fullName: c.fullName,
      siteId: c.siteId ?? undefined,
      phone: c.phone,
      email: c.email ?? undefined,
      avatarUrl: c.avatarUrl ?? undefined,
      monthlyIndemnityAr: c.monthlyIndemnityAr,
      mandateStart: c.mandateStart,
      mandateEnd: c.mandateEnd,
      status: c.status as CommitteeMember['status']
    })),
    meetings: meetingRows.map((m): GovernanceMeeting => ({
      id: m.id,
      date: m.date,
      title: m.title,
      location: m.location,
      agenda: m.agenda,
      summaryPV: m.summaryPv,
      resolutionsCount: m.resolutionsCount,
      documentPdfUrl: m.documentPdfUrl ?? undefined
    })),
    auditLogs: auditRows.map((a): AuditLogItem => ({
      id: a.id,
      timestamp: a.timestamp,
      userId: a.userId,
      userName: a.userName,
      action: a.action,
      siteCode: a.siteCode,
      module: a.module,
      details: a.details,
      ipAddress: a.ipAddress
    })).sort((x, y) => auditTime(y.timestamp) - auditTime(x.timestamp)),
    payrolls: payrollRows.map((p): PayrollRecord => ({
      id: p.id,
      slipNumber: p.slipNumber,
      periodMonth: p.periodMonth,
      beneficiaryType: p.beneficiaryType as PayrollRecord['beneficiaryType'],
      beneficiaryId: p.beneficiaryId,
      beneficiaryName: p.beneficiaryName,
      roleTitle: p.roleTitle,
      siteId: p.siteId,
      siteName: p.siteName,
      cin: p.cin,
      avatarUrl: p.avatarUrl ?? undefined,
      paymentMethod: p.paymentMethod as PayrollRecord['paymentMethod'],
      bankAccountOrPhone: p.bankAccountOrPhone,
      baseSalaryAr: p.baseSalaryAr,
      responsibilityBonusAr: p.responsibilityBonusAr,
      nightShiftBonusAr: p.nightShiftBonusAr,
      transportBonusAr: p.transportBonusAr,
      performanceBonusAr: p.performanceBonusAr,
      grossSalaryAr: p.grossSalaryAr,
      cnapsDeductionAr: p.cnapsDeductionAr,
      ostieDeductionAr: p.ostieDeductionAr,
      irsaDeductionAr: p.irsaDeductionAr,
      advanceDeductionAr: p.advanceDeductionAr,
      totalDeductionsAr: p.totalDeductionsAr,
      netSalaryAr: p.netSalaryAr,
      status: p.status as PayrollRecord['status'],
      generatedDate: p.generatedDate,
      approvedDate: p.approvedDate ?? undefined,
      paidDate: p.paidDate ?? undefined,
      approverName: p.approverName ?? undefined,
      transactionRef: p.transactionRef ?? undefined,
      notes: p.notes ?? undefined
    }))
  };
}

export async function addAuditLogEntry(entry: AuditLogItem): Promise<void> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.auditLogs = [entry, ...store.auditLogs];
    saveLocalStore(store);
    return;
  }
  await db.insert(schema.auditLogs).values(entry).onConflictDoNothing();
}

export async function createSiteRecord(site: Site): Promise<Site> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.sites.push(site);
    saveLocalStore(store);
    return site;
  }
  await db.insert(schema.sites).values(site);
  return site;
}

export async function createMemberRecord(member: Member): Promise<Member> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.members.unshift(member);
    saveLocalStore(store);
    return member;
  }
  await db.insert(schema.members).values(member);
  return member;
}

export async function createVehicleRecord(vehicle: Vehicle): Promise<Vehicle> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.vehicles.unshift(vehicle);
    saveLocalStore(store);
    return vehicle;
  }
  await db.insert(schema.vehicles).values(vehicle);
  return vehicle;
}

export async function createCardRecord(card: MembershipCard): Promise<MembershipCard> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.cards.unshift(card);
    saveLocalStore(store);
    return card;
  }
  await db.insert(schema.membershipCards).values(card as any);
  return card;
}

export async function createEquipmentRecord(item: Equipment): Promise<Equipment> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.equipments.unshift(item);
    saveLocalStore(store);
    return item;
  }
  await db.insert(schema.inventoryItems).values(item as any);
  return item;
}

export async function createSpotRecords(spots: ParkingSpot[]): Promise<ParkingSpot[]> {
  if (spots.length === 0) return [];
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.spots.push(...spots);
    saveLocalStore(store);
    return spots;
  }
  await db.insert(schema.parkingSpaces).values(spots);
  return spots;
}

/** Changes every spot of a zone of a site (new zone name and/or spot type). Returns the number of spots changed. */
export async function updateZoneSpots(
  siteId: string,
  zone: string,
  patch: { zone?: string; type?: ParkingSpot['type'] }
): Promise<number> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    const list = store.spots.filter((s) => s.siteId === siteId && s.zone === zone);
    list.forEach((s) => Object.assign(s, patch));
    saveLocalStore(store);
    return list.length;
  }
  const rows = await db
    .update(schema.parkingSpaces)
    .set(patch)
    .where(and(eq(schema.parkingSpaces.siteId, siteId), eq(schema.parkingSpaces.zone, zone)))
    .returning({ id: schema.parkingSpaces.id });
  return rows.length;
}

/** Deletes every spot of a zone of a site; vehicles that pointed to them lose their spot. Returns the number deleted. */
export async function deleteZoneSpots(siteId: string, zone: string): Promise<number> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    const ids = new Set(store.spots.filter((s) => s.siteId === siteId && s.zone === zone).map((s) => s.id));
    store.spots = store.spots.filter((s) => !ids.has(s.id));
    store.vehicles.forEach((v) => {
      if (v.spotId && ids.has(v.spotId)) v.spotId = undefined;
    });
    saveLocalStore(store);
    return ids.size;
  }
  return db.transaction(async (tx) => {
    const rows = await tx
      .delete(schema.parkingSpaces)
      .where(and(eq(schema.parkingSpaces.siteId, siteId), eq(schema.parkingSpaces.zone, zone)))
      .returning({ id: schema.parkingSpaces.id });
    const ids = rows.map((r) => r.id);
    if (ids.length) await tx.update(schema.vehicles).set({ spotId: null }).where(inArray(schema.vehicles.spotId, ids));
    return ids.length;
  });
}

export async function updateSpotRecord(id: string, patch: Partial<ParkingSpot>): Promise<ParkingSpot | null> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    const spot = store.spots.find((s) => s.id === id);
    if (!spot) return null;
    Object.assign(spot, patch);
    saveLocalStore(store);
    return spot;
  }
  const [updated] = await db
    .update(schema.parkingSpaces)
    .set(patch)
    .where(eq(schema.parkingSpaces.id, id))
    .returning();
  return (updated as unknown as ParkingSpot) ?? null;
}

export async function createReceiptRecord(receipt: PaymentReceipt): Promise<PaymentReceipt> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.receipts.unshift(receipt);
    const member = store.members.find((m) => m.id === receipt.memberId);
    if (member) {
      if (receipt.remainingBalanceAr === 0) {
        member.currentBalanceAr = 0;
        if (member.status === 'en_retard') member.status = 'actif';
      } else {
        member.currentBalanceAr = -receipt.remainingBalanceAr;
        member.status = 'en_retard';
      }
    }
    const reg = store.cashRegisters.find((r) => r.siteId === receipt.siteId && r.status === 'ouverte');
    if (reg) {
      if (receipt.paymentMethod === 'Espèces') {
        reg.totalCashCollectedAr += receipt.amountPaidAr;
        reg.currentCashInHandAr += receipt.amountPaidAr;
      } else {
        reg.totalMobileMoneyAr += receipt.amountPaidAr;
      }
    }
    saveLocalStore(store);
    return receipt;
  }

  await db.transaction(async (tx) => {
    await tx.insert(schema.paymentReceipts).values(receipt);
    const [member] = await tx.select().from(schema.members).where(eq(schema.members.id, receipt.memberId));
    if (member) {
      const nextBalance = receipt.remainingBalanceAr === 0 ? 0 : -receipt.remainingBalanceAr;
      const nextStatus = receipt.remainingBalanceAr === 0 && member.status === 'en_retard'
        ? 'actif'
        : receipt.remainingBalanceAr > 0
          ? 'en_retard'
          : member.status;
      await tx.update(schema.members).set({
        currentBalanceAr: nextBalance,
        status: nextStatus
      }).where(eq(schema.members.id, member.id));
    }

    const [reg] = await tx
      .select()
      .from(schema.cashRegisters)
      .where(eq(schema.cashRegisters.siteId, receipt.siteId));
    if (reg && reg.status === 'ouverte') {
      if (receipt.paymentMethod === 'Espèces') {
        await tx.update(schema.cashRegisters).set({
          totalCashCollectedAr: reg.totalCashCollectedAr + receipt.amountPaidAr,
          currentCashInHandAr: reg.currentCashInHandAr + receipt.amountPaidAr
        }).where(eq(schema.cashRegisters.id, reg.id));
      } else {
        await tx.update(schema.cashRegisters).set({
          totalMobileMoneyAr: reg.totalMobileMoneyAr + receipt.amountPaidAr
        }).where(eq(schema.cashRegisters.id, reg.id));
      }
    }
  });

  return receipt;
}

export async function toggleCardStatus(id: string): Promise<MembershipCard | null> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    const card = store.cards.find((c) => c.id === id);
    if (!card) return null;
    card.status = card.status === 'bloquee_perdue' ? 'actif' : 'bloquee_perdue';
    saveLocalStore(store);
    return card;
  }

  const [existing] = await db.select().from(schema.membershipCards).where(eq(schema.membershipCards.id, id));
  if (!existing) return null;
  const nextStatus = existing.status === 'bloquee_perdue' ? 'actif' : 'bloquee_perdue';
  const [updated] = await db
    .update(schema.membershipCards)
    .set({ status: nextStatus })
    .where(eq(schema.membershipCards.id, id))
    .returning();
  return updated as unknown as MembershipCard;
}

export async function createPayrollRecord(record: PayrollRecord): Promise<PayrollRecord> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.payrolls.unshift(record);
    saveLocalStore(store);
    return record;
  }
  await db.insert(schema.payrolls).values(record);
  return record;
}

export async function updatePayrollRecordStatus(
  id: string,
  status: PayrollRecord['status'],
  approverName?: string,
  transactionRef?: string
): Promise<PayrollRecord | null> {
  const now = new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' });
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    const slip = store.payrolls.find((p) => p.id === id);
    if (!slip) return null;
    slip.status = status;
    if (status === 'valide_tresorier') {
      slip.approvedDate = now;
      if (approverName) slip.approverName = approverName;
    } else if (status === 'paye') {
      slip.paidDate = now;
      if (transactionRef) slip.transactionRef = transactionRef;
      if (approverName && !slip.approverName) slip.approverName = approverName;
    }
    saveLocalStore(store);
    return slip;
  }

  const patch: Partial<typeof schema.payrolls.$inferInsert> = { status };
  if (status === 'valide_tresorier') {
    patch.approvedDate = now;
    if (approverName) patch.approverName = approverName;
  } else if (status === 'paye') {
    patch.paidDate = now;
    if (transactionRef) patch.transactionRef = transactionRef;
    if (approverName) patch.approverName = approverName;
  }

  const [updated] = await db
    .update(schema.payrolls)
    .set(patch)
    .where(eq(schema.payrolls.id, id))
    .returning();
  return (updated as unknown as PayrollRecord) ?? null;
}

/** Next free matricule of the year: GRD-YYYY-NNN. */
export function nextGuardMatricule(existing: { matricule: string }[], year = new Date().getFullYear()): string {
  const prefix = `GRD-${year}-`;
  const max = existing
    .map((g) => (g.matricule.startsWith(prefix) ? Number(g.matricule.slice(prefix.length)) : 0))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export async function createGuardRecord(guard: GuardPersonnel): Promise<GuardPersonnel> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.guards.push(guard);
    saveLocalStore(store);
    return guard;
  }
  await db.insert(schema.guards).values(guard);
  return guard;
}

export async function broadcastGuardOrders(teamId: string, orderText: string): Promise<number> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    let count = 0;
    store.guards.forEach((g) => {
      if (g.teamId === teamId) {
        if (!g.ordersOfTheDay) g.ordersOfTheDay = [];
        g.ordersOfTheDay.unshift(orderText);
        count++;
      }
    });
    if (count > 0) saveLocalStore(store);
    return count;
  }

  const teamGuards = await db.select().from(schema.guards).where(eq(schema.guards.teamId, teamId));
  await db.transaction(async (tx) => {
    for (const g of teamGuards) {
      const nextOrders = [orderText, ...(g.ordersOfTheDay || [])];
      await tx.update(schema.guards).set({ ordersOfTheDay: nextOrders }).where(eq(schema.guards.id, g.id));
    }
  });
  return teamGuards.length;
}

export async function updateEntityAvatar(
  type: 'guard' | 'committee' | 'user',
  id: string,
  avatarUrl: string
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    if (type === 'guard') {
      const g = store.guards.find((x) => x.id === id);
      if (g) g.avatarUrl = avatarUrl;
    } else if (type === 'committee') {
      const c = store.committeeMembers.find((x) => x.id === id);
      if (c) c.avatarUrl = avatarUrl;
    } else if (type === 'user') {
      const u = store.users.find((x) => x.id === id);
      if (u) u.avatarUrl = avatarUrl;
      if (store.currentUser.id === id) store.currentUser.avatarUrl = avatarUrl;
    }
    saveLocalStore(store);
    return true;
  }

  if (type === 'guard') {
    await db.update(schema.guards).set({ avatarUrl }).where(eq(schema.guards.id, id));
  } else if (type === 'committee') {
    await db.update(schema.committeeMembers).set({ avatarUrl }).where(eq(schema.committeeMembers.id, id));
  } else {
    await db.update(schema.users).set({ avatarUrl }).where(eq(schema.users.id, id));
  }
  return true;
}

export async function createExpenseRecord(expense: ExpenseRecord): Promise<ExpenseRecord> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.expenses.unshift(expense);
    saveLocalStore(store);
    return expense;
  }
  await db.insert(schema.expenses).values(expense);
  return expense;
}

export async function decideExpenseRecord(
  id: string,
  decision: 'approuve' | 'rejete',
  approverName: string
): Promise<ExpenseRecord | null> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    const exp = store.expenses.find((e) => e.id === id);
    if (!exp) return null;
    exp.status = decision;
    exp.approverName = approverName;
    if (decision === 'approuve' && exp.paymentMethod === 'Espèces') {
      const reg = store.cashRegisters.find((r) => r.siteId === exp.siteId && r.status === 'ouverte');
      if (reg) {
        reg.totalExpensesPaidAr += exp.amountAr;
        reg.currentCashInHandAr -= exp.amountAr;
      }
    }
    saveLocalStore(store);
    return exp;
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(schema.expenses)
      .set({ status: decision, approverName })
      .where(eq(schema.expenses.id, id))
      .returning();
    if (!updated) return null;
    if (decision === 'approuve' && updated.paymentMethod === 'Espèces') {
      const [reg] = await tx
        .select()
        .from(schema.cashRegisters)
        .where(eq(schema.cashRegisters.siteId, updated.siteId));
      if (reg && reg.status === 'ouverte') {
        await tx.update(schema.cashRegisters).set({
          totalExpensesPaidAr: reg.totalExpensesPaidAr + updated.amountAr,
          currentCashInHandAr: reg.currentCashInHandAr - updated.amountAr
        }).where(eq(schema.cashRegisters.id, reg.id));
      }
    }
    return updated as unknown as ExpenseRecord;
  });
}

export async function createIncidentRecord(incident: IncidentRecord): Promise<IncidentRecord> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.incidents.unshift(incident);
    saveLocalStore(store);
    return incident;
  }
  await db.insert(schema.incidents).values(incident);
  return incident;
}

export async function updateIncidentRecordStatus(
  id: string,
  resolutionStatus: IncidentRecord['resolutionStatus'],
  resolutionNotes?: string
): Promise<IncidentRecord | null> {
  const resolvedAt =
    resolutionStatus === 'resolu' || resolutionStatus === 'classe'
      ? new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' })
      : undefined;

  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    const inc = store.incidents.find((i) => i.id === id);
    if (!inc) return null;
    inc.resolutionStatus = resolutionStatus;
    if (resolutionNotes) inc.resolutionNotes = resolutionNotes;
    if (resolvedAt) inc.resolvedAt = resolvedAt;
    saveLocalStore(store);
    return inc;
  }

  const patch: Partial<typeof schema.incidents.$inferInsert> = { resolutionStatus };
  if (resolutionNotes) patch.resolutionNotes = resolutionNotes;
  if (resolvedAt) patch.resolvedAt = resolvedAt;

  const [updated] = await db
    .update(schema.incidents)
    .set(patch)
    .where(eq(schema.incidents.id, id))
    .returning();
  return (updated as unknown as IncidentRecord) ?? null;
}

export async function createCommitteeMemberRecord(member: CommitteeMember): Promise<CommitteeMember> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.committeeMembers.push(member);
    saveLocalStore(store);
    return member;
  }
  await db.insert(schema.committeeMembers).values(member);
  return member;
}

export async function createMeetingRecord(meeting: GovernanceMeeting): Promise<GovernanceMeeting> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    store.meetings.unshift(meeting);
    saveLocalStore(store);
    return meeting;
  }
  await db.insert(schema.governanceMeetings).values({
    id: meeting.id,
    date: meeting.date,
    title: meeting.title,
    location: meeting.location,
    agenda: meeting.agenda,
    summaryPv: meeting.summaryPV,
    resolutionsCount: meeting.resolutionsCount,
    documentPdfUrl: meeting.documentPdfUrl
  });
  return meeting;
}

// ===================== GENERIC UPDATE / DELETE =====================

/** Collections that can be edited / deleted from the UI, keyed by their API segment. */
const EDITABLE_COLLECTIONS = {
  sites: { stateKey: 'sites', table: schema.sites },
  members: { stateKey: 'members', table: schema.members },
  vehicles: { stateKey: 'vehicles', table: schema.vehicles },
  spots: { stateKey: 'spots', table: schema.parkingSpaces },
  tariffs: { stateKey: 'tariffs', table: schema.tariffs },
  subscriptions: { stateKey: 'subscriptions', table: schema.subscriptions },
  receipts: { stateKey: 'receipts', table: schema.paymentReceipts },
  cards: { stateKey: 'cards', table: schema.membershipCards },
  guards: { stateKey: 'guards', table: schema.guards },
  equipments: { stateKey: 'equipments', table: schema.inventoryItems },
  'cash-registers': { stateKey: 'cashRegisters', table: schema.cashRegisters },
  expenses: { stateKey: 'expenses', table: schema.expenses },
  incidents: { stateKey: 'incidents', table: schema.incidents },
  committee: { stateKey: 'committeeMembers', table: schema.committeeMembers },
  meetings: { stateKey: 'meetings', table: schema.governanceMeetings },
  payrolls: { stateKey: 'payrolls', table: schema.payrolls }
} as const;

export type EditableCollection = keyof typeof EDITABLE_COLLECTIONS;

export function isEditableCollection(name: string): name is EditableCollection {
  return Object.prototype.hasOwnProperty.call(EDITABLE_COLLECTIONS, name);
}

/** Key of a collection in the app state (e.g. "cash-registers" -> "cashRegisters"), or null if unknown. */
export function collectionStateKey(name: string): string | null {
  return isEditableCollection(name) ? EDITABLE_COLLECTIONS[name].stateKey : null;
}

/** App field name -> DB column property name, when they differ. */
const FIELD_RENAMES: Record<string, string> = { summaryPV: 'summaryPv' };
const PROTECTED_FIELDS = new Set(['id', 'createdAt', 'updatedAt']);

export class RecordInUseError extends Error {}

function toColumnPatch(table: any, patch: Record<string, unknown>): Record<string, unknown> {
  const columns = getTableColumns(table);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const columnKey = FIELD_RENAMES[key] || key;
    if (PROTECTED_FIELDS.has(columnKey) || !(columnKey in columns) || value === undefined) continue;
    out[columnKey] = value;
  }
  return out;
}

export async function updateRecord(
  collection: EditableCollection,
  id: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  const { stateKey, table } = EDITABLE_COLLECTIONS[collection];
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    const list = (store as any)[stateKey] as Array<Record<string, unknown>>;
    const item = list?.find((x) => x.id === id);
    if (!item) return false;
    const clean = { ...patch };
    PROTECTED_FIELDS.forEach((f) => delete clean[f]);
    Object.assign(item, clean);
    saveLocalStore(store);
    return true;
  }
  const values = toColumnPatch(table, patch);
  if (Object.keys(values).length === 0) return true;
  const rows = await db
    .update(table as any)
    .set(values)
    .where(eq((table as any).id, id))
    .returning({ id: (table as any).id });
  return rows.length > 0;
}

export async function deleteRecord(collection: EditableCollection, id: string): Promise<boolean> {
  const { stateKey, table } = EDITABLE_COLLECTIONS[collection];
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    const list = (store as any)[stateKey] as Array<Record<string, unknown>>;
    const idx = list?.findIndex((x) => x.id === id) ?? -1;
    if (idx === -1) return false;
    list.splice(idx, 1);
    saveLocalStore(store);
    return true;
  }
  try {
    const rows = await db
      .delete(table as any)
      .where(eq((table as any).id, id))
      .returning({ id: (table as any).id });
    return rows.length > 0;
  } catch (err: any) {
    // 23503 = foreign_key_violation: other records still point to this one
    const code = err?.code || err?.cause?.code;
    if (code === '23503') {
      throw new RecordInUseError(
        "Suppression impossible : d'autres enregistrements (reçus, véhicules, cartes…) y sont encore liés. Supprimez-les d'abord ou changez plutôt le statut."
      );
    }
    throw err;
  }
}

// ===================== RÉINITIALISATION DES DONNÉES =====================

/** What a reset removes: operational records only. Configuration is kept. */
export interface ResetSummary {
  members: number;
  vehicles: number;
  subscriptions: number;
  receipts: number;
  cards: number;
  expenses: number;
  payrolls: number;
  incidents: number;
  meetings: number;
  auditLogs: number;
  spotsFreed: number;
  cashRegistersZeroed: number;
}

/** Frees a spot: drops the vehicle in it; reserved/occupied spots become free, maintenance stays. */
function freedSpotPatch(status: string) {
  return {
    status: status === 'maintenance' ? 'maintenance' : 'libre',
    currentVehiclePlate: null,
    currentVehicleModel: null,
    currentDriverName: null,
    entryTime: null,
    duration: null,
    assignedAbonnement: null
  } as const;
}

const ZEROED_CASH = {
  openingBalanceAr: 0,
  totalCashCollectedAr: 0,
  totalMobileMoneyAr: 0,
  totalExpensesPaidAr: 0,
  currentCashInHandAr: 0
} as const;

/**
 * Deletes all operational data (members, vehicles, subscriptions, receipts, cards,
 * expenses, payrolls, incidents, meetings, audit log), frees every parking spot and
 * sets cash registers to 0 Ar. Sites, spots, tariffs, users, guards, committee and
 * equipment are kept, so the database is not re-seeded with demo data afterwards.
 */
export async function resetOperationalData(): Promise<ResetSummary> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore();
    const summary: ResetSummary = {
      members: store.members.length,
      vehicles: store.vehicles.length,
      subscriptions: store.subscriptions.length,
      receipts: store.receipts.length,
      cards: store.cards.length,
      expenses: store.expenses.length,
      payrolls: store.payrolls.length,
      incidents: store.incidents.length,
      meetings: store.meetings.length,
      auditLogs: store.auditLogs.length,
      spotsFreed: store.spots.filter((s) => s.status !== 'libre' && s.status !== 'maintenance').length,
      cashRegistersZeroed: store.cashRegisters.length
    };
    store.members = [];
    store.vehicles = [];
    store.subscriptions = [];
    store.receipts = [];
    store.cards = [];
    store.expenses = [];
    store.payrolls = [];
    store.incidents = [];
    store.meetings = [];
    store.auditLogs = [];
    store.spots = store.spots.map((s) => {
      const patch = freedSpotPatch(s.status);
      return {
        id: s.id, code: s.code, siteId: s.siteId, zone: s.zone, type: s.type,
        rfidUid: s.rfidUid, status: patch.status
      } as ParkingSpot;
    });
    store.cashRegisters = store.cashRegisters.map((r) => ({ ...r, ...ZEROED_CASH }));
    saveLocalStore(store);
    return summary;
  }

  return db.transaction(async (tx) => {
    const spots = await tx.select({ id: schema.parkingSpaces.id, status: schema.parkingSpaces.status }).from(schema.parkingSpaces);
    // Children before parents: receipts restrict deletion of members.
    const receipts = await tx.delete(schema.paymentReceipts).returning({ id: schema.paymentReceipts.id });
    const cards = await tx.delete(schema.membershipCards).returning({ id: schema.membershipCards.id });
    const subscriptions = await tx.delete(schema.subscriptions).returning({ id: schema.subscriptions.id });
    const vehicles = await tx.delete(schema.vehicles).returning({ id: schema.vehicles.id });
    const members = await tx.delete(schema.members).returning({ id: schema.members.id });
    const expenses = await tx.delete(schema.expenses).returning({ id: schema.expenses.id });
    const payrolls = await tx.delete(schema.payrolls).returning({ id: schema.payrolls.id });
    const incidents = await tx.delete(schema.incidents).returning({ id: schema.incidents.id });
    const meetings = await tx.delete(schema.governanceMeetings).returning({ id: schema.governanceMeetings.id });
    const auditLogs = await tx.delete(schema.auditLogs).returning({ id: schema.auditLogs.id });

    let spotsFreed = 0;
    for (const s of spots) {
      if (s.status !== 'libre' && s.status !== 'maintenance') spotsFreed++;
      await tx.update(schema.parkingSpaces).set(freedSpotPatch(s.status)).where(eq(schema.parkingSpaces.id, s.id));
    }
    const registers = await tx.update(schema.cashRegisters).set(ZEROED_CASH).returning({ id: schema.cashRegisters.id });

    return {
      members: members.length,
      vehicles: vehicles.length,
      subscriptions: subscriptions.length,
      receipts: receipts.length,
      cards: cards.length,
      expenses: expenses.length,
      payrolls: payrolls.length,
      incidents: incidents.length,
      meetings: meetings.length,
      auditLogs: auditLogs.length,
      spotsFreed,
      cashRegistersZeroed: registers.length
    };
  });
}

// ===================== MISES À NIVEAU DU SCHÉMA =====================

/**
 * Additive, idempotent schema upgrades applied at server start, so an existing
 * database gets the columns added after its creation (see database/migrations/0002_*).
 */
export async function ensureSchemaUpgrades(): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  // Brand-new database (e.g. first deploy on Render): create the tables from database/migrations
  const { rows } = await pool.query("SELECT to_regclass('public.sites') AS t");
  if (!rows[0]?.t) {
    // Full schema generated from src/db/schema.ts (always in sync with the code)
    const file = path.resolve(process.env.PM_APP_ROOT || process.cwd(), 'database', 'schema.sql');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(file, 'utf-8'));
      await client.query('COMMIT');
      console.log('[db] Base vide : tables créées depuis database/schema.sql.');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  await pool.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_photo_url TEXT');
  await pool.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity DOUBLE PRECISION');
  await pool.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS unit VARCHAR(30)');
  await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS approved_by_president VARCHAR(150)');
  await pool.query('ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS photo_url TEXT');
  await pool.query("ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS closures JSONB NOT NULL DEFAULT '[]'::jsonb");
  await pool.query('CREATE TABLE IF NOT EXISTS app_settings (key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT now())');
}

/** Next expense number for the current year: DEP-YYYY-NNNN (one more than the highest of that year). */
export function nextExpenseNumber(existing: { expenseNumber: string }[], year = new Date().getFullYear()): string {
  const prefix = `DEP-${year}-`;
  const max = existing
    .map((e) => (e.expenseNumber.startsWith(prefix) ? Number(e.expenseNumber.slice(prefix.length)) : 0))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

// ===================== PARAMÈTRES DE L'APPLICATION =====================

/** Values stored in app_settings (a missing key means "use the default"). */
export async function getAppSettings(keys: string[]): Promise<Record<string, string>> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore() as AppState & { appSettings?: Record<string, string> };
    return Object.fromEntries(keys.filter((k) => store.appSettings?.[k] !== undefined).map((k) => [k, store.appSettings![k]]));
  }
  const rows = await db.select().from(schema.appSettings);
  return Object.fromEntries(rows.filter((r) => keys.includes(r.key)).map((r) => [r.key, r.value]));
}

/** Saves settings; a null value deletes the key (back to the default). */
export async function setAppSettings(values: Record<string, string | null>): Promise<void> {
  const db = getDb();
  if (!db) {
    const store = loadLocalStore() as AppState & { appSettings?: Record<string, string> };
    store.appSettings = { ...(store.appSettings || {}) };
    for (const [k, v] of Object.entries(values)) {
      if (v === null) delete store.appSettings[k];
      else store.appSettings[k] = v;
    }
    saveLocalStore(store);
    return;
  }
  for (const [key, value] of Object.entries(values)) {
    if (value === null) {
      await db.delete(schema.appSettings).where(eq(schema.appSettings.key, key));
    } else {
      await db.insert(schema.appSettings).values({ key, value })
        .onConflictDoUpdate({ target: schema.appSettings.key, set: { value, updatedAt: new Date() } });
    }
  }
}

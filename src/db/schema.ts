/**
 * PostgreSQL Schema with Drizzle ORM
 * Parking Manager Madagascar - Multi-sites
 *
 * All financial amounts in Malagasy Ariary are stored as bigint
 * to prevent floating-point inaccuracies.
 */

import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  bigint,
  doublePrecision,
  boolean,
  jsonb,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';

export const sites = pgTable('sites', {
  id: varchar('id', { length: 100 }).primaryKey(),
  code: varchar('code', { length: 30 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).default('Antananarivo').notNull(),
  totalCapacity: integer('total_capacity').notNull(),
  presidentName: varchar('president_name', { length: 150 }).notNull(),
  presidentPhone: varchar('president_phone', { length: 30 }).notNull(),
  tresorierName: varchar('tresorier_name', { length: 150 }).notNull(),
  guardCount: integer('guard_count').default(0).notNull(),
  status: varchar('status', { length: 30 }).default('actif').notNull(),
  coordinates: jsonb('coordinates').$type<{ lat: number; lng: number }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const users = pgTable('users', {
  id: varchar('id', { length: 100 }).primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'set null' }),
  phone: varchar('phone', { length: 30 }).notNull(),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true).notNull(),
  lastLogin: varchar('last_login', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('users_site_id_idx').on(table.siteId),
  index('users_role_idx').on(table.role)
]);

export const members = pgTable('members', {
  id: varchar('id', { length: 100 }).primaryKey(),
  memberNumber: varchar('member_number', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  category: varchar('category', { length: 50 }).default('standard').notNull(),
  cin: varchar('cin', { length: 30 }).notNull(),
  cinIssuedDate: varchar('cin_issued_date', { length: 30 }),
  cinIssuedLocation: varchar('cin_issued_location', { length: 100 }),
  phone: varchar('phone', { length: 30 }).notNull(),
  mobileMoneyProvider: varchar('mobile_money_provider', { length: 30 }),
  emergencyContactName: varchar('emergency_contact_name', { length: 150 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 30 }),
  address: text('address').notNull(),
  primarySiteId: varchar('primary_site_id', { length: 100 }).references(() => sites.id, { onDelete: 'restrict' }).notNull(),
  joinedDate: varchar('joined_date', { length: 30 }).notNull(),
  status: varchar('status', { length: 30 }).default('actif').notNull(),
  currentBalanceAr: bigint('current_balance_ar', { mode: 'number' }).default(0).notNull(),
  avatarUrl: text('avatar_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  uniqueIndex('members_num_idx').on(table.memberNumber),
  index('members_site_idx').on(table.primarySiteId)
]);

export const vehicleCategories = pgTable('vehicle_categories', {
  id: varchar('id', { length: 100 }).primaryKey(),
  code: varchar('code', { length: 30 }).notNull().unique(),
  label: varchar('label', { length: 100 }).notNull(),
  description: text('description')
});

export const vehicles = pgTable('vehicles', {
  id: varchar('id', { length: 100 }).primaryKey(),
  licensePlate: varchar('license_plate', { length: 30 }).notNull().unique(),
  category: varchar('category', { length: 100 }).notNull(),
  brand: varchar('brand', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  color: varchar('color', { length: 50 }).notNull(),
  memberId: varchar('member_id', { length: 100 }).references(() => members.id, { onDelete: 'cascade' }).notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'restrict' }).notNull(),
  spotId: varchar('spot_id', { length: 50 }),
  rfidTag: varchar('rfid_tag', { length: 100 }),
  barcode: varchar('barcode', { length: 100 }),
  photoUrl: text('photo_url'),
  registeredAt: varchar('registered_at', { length: 50 }).notNull(),
  status: varchar('status', { length: 30 }).default('actif').notNull(),
  assignedSpotType: varchar('assigned_spot_type', { length: 50 }).default('placement_libre_interieur')
}, (table) => [
  uniqueIndex('vehicles_plate_idx').on(table.licensePlate),
  index('vehicles_member_idx').on(table.memberId),
  index('vehicles_site_idx').on(table.siteId)
]);

export const parkingSpaces = pgTable('parking_spaces', {
  id: varchar('id', { length: 100 }).primaryKey(),
  code: varchar('code', { length: 30 }).notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  zone: varchar('zone', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 30 }).default('libre').notNull(),
  currentVehiclePlate: varchar('current_vehicle_plate', { length: 30 }),
  currentVehicleModel: varchar('current_vehicle_model', { length: 100 }),
  currentDriverName: varchar('current_driver_name', { length: 150 }),
  entryTime: varchar('entry_time', { length: 50 }),
  duration: varchar('duration', { length: 50 }),
  assignedAbonnement: varchar('assigned_abonnement', { length: 100 }),
  rfidUid: varchar('rfid_uid', { length: 100 })
}, (table) => [
  index('spots_site_zone_idx').on(table.siteId, table.zone)
]);

export const tariffs = pgTable('tariffs', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'set null' }),
  typeFormula: varchar('type_formula', { length: 50 }).notNull(),
  duration: varchar('duration', { length: 30 }).notNull(),
  amountAr: bigint('amount_ar', { mode: 'number' }).notNull(),
  description: text('description').notNull(),
  isActive: boolean('is_active').default(true).notNull()
});

export const subscriptions = pgTable('subscriptions', {
  id: varchar('id', { length: 100 }).primaryKey(),
  contractRef: varchar('contract_ref', { length: 50 }).notNull().unique(),
  memberId: varchar('member_id', { length: 100 }).references(() => members.id, { onDelete: 'cascade' }).notNull(),
  memberName: varchar('member_name', { length: 150 }).notNull(),
  vehiclePlate: varchar('vehicle_plate', { length: 30 }).notNull(),
  vehicleModel: varchar('vehicle_model', { length: 100 }).notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'restrict' }).notNull(),
  tariffType: varchar('tariff_type', { length: 150 }).notNull(),
  monthlyAmountAr: bigint('monthly_amount_ar', { mode: 'number' }).notNull(),
  startDate: varchar('start_date', { length: 30 }).notNull(),
  endDate: varchar('end_date', { length: 30 }).notNull(),
  nextDueDate: varchar('next_due_date', { length: 30 }).notNull(),
  daysRemaining: integer('days_remaining').default(30).notNull(),
  status: varchar('status', { length: 30 }).default('a_jour').notNull()
});

export const paymentReceipts = pgTable('payment_receipts', {
  id: varchar('id', { length: 100 }).primaryKey(),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
  dateTime: varchar('date_time', { length: 50 }).notNull(),
  memberId: varchar('member_id', { length: 100 }).references(() => members.id, { onDelete: 'restrict' }).notNull(),
  memberName: varchar('member_name', { length: 150 }).notNull(),
  vehiclePlate: varchar('vehicle_plate', { length: 30 }),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'restrict' }).notNull(),
  siteName: varchar('site_name', { length: 150 }).notNull(),
  purpose: text('purpose').notNull(),
  period: varchar('period', { length: 100 }).notNull(),
  amountDueAr: bigint('amount_due_ar', { mode: 'number' }).notNull(),
  amountPaidAr: bigint('amount_paid_ar', { mode: 'number' }).notNull(),
  remainingBalanceAr: bigint('remaining_balance_ar', { mode: 'number' }).default(0).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  cashierName: varchar('cashier_name', { length: 150 }).notNull(),
  transactionRef: varchar('transaction_ref', { length: 100 }).notNull(),
  status: varchar('status', { length: 30 }).default('confirme').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('receipts_member_idx').on(table.memberId),
  index('receipts_site_idx').on(table.siteId)
]);

export const membershipCards = pgTable('membership_cards', {
  id: varchar('id', { length: 100 }).primaryKey(),
  cardNumber: varchar('card_number', { length: 50 }).notNull().unique(),
  memberId: varchar('member_id', { length: 100 }).references(() => members.id, { onDelete: 'cascade' }).notNull(),
  memberName: varchar('member_name', { length: 150 }).notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'restrict' }).notNull(),
  siteName: varchar('site_name', { length: 150 }).notNull(),
  primaryPlate: varchar('primary_plate', { length: 30 }).notNull(),
  secondaryPlate: varchar('secondary_plate', { length: 30 }),
  issuedDate: varchar('issued_date', { length: 30 }).notNull(),
  expirationDate: varchar('expiration_date', { length: 30 }).notNull(),
  rfidTag: varchar('rfid_tag', { length: 100 }).notNull(),
  nfcChipType: varchar('nfc_chip_type', { length: 100 }).default('NTAG216').notNull(),
  qrToken: varchar('qr_token', { length: 150 }).notNull().unique(),
  status: varchar('status', { length: 30 }).default('actif').notNull(),
  printedBatchRef: varchar('printed_batch_ref', { length: 100 }),
  lastPassageTimestamp: varchar('last_passage_timestamp', { length: 50 }),
  lastPassageGate: varchar('last_passage_gate', { length: 100 })
});

export const guards = pgTable('guards', {
  id: varchar('id', { length: 100 }).primaryKey(),
  matricule: varchar('matricule', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  title: varchar('title', { length: 150 }).notNull(),
  grade: varchar('grade', { length: 100 }).notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'restrict' }).notNull(),
  teamId: varchar('team_id', { length: 80 }).notNull(),
  teamName: varchar('team_name', { length: 150 }).notNull(),
  isTeamLeader: boolean('is_team_leader').default(false).notNull(),
  teamLeaderId: varchar('team_leader_id', { length: 100 }),
  teamLeaderName: varchar('team_leader_name', { length: 150 }),
  rankOrder: integer('rank_order').default(2).notNull(),
  ordersOfTheDay: jsonb('orders_of_the_day').$type<string[]>().default([]).notNull(),
  shiftHours: varchar('shift_hours', { length: 50 }).notNull(),
  shiftName: varchar('shift_name', { length: 30 }).notNull(),
  status: varchar('status', { length: 30 }).default('en_poste').notNull(),
  phoneFlotte: varchar('phone_flotte', { length: 30 }).notNull(),
  cin: varchar('cin', { length: 30 }).notNull(),
  residenceLot: text('residence_lot').notNull(),
  recruitmentDate: varchar('recruitment_date', { length: 30 }).notNull(),
  badgeRfid: varchar('badge_rfid', { length: 80 }).notNull(),
  avatarUrl: text('avatar_url'),
  assignedEquipments: jsonb('assigned_equipments').$type<{ inventoryCode: string; designation: string }[]>().default([]).notNull(),
  shiftDays: jsonb('shift_days').$type<{
    mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string;
  }>().notNull(),
  todayLog: jsonb('today_log').$type<{
    time: string; type: 'prise_service' | 'ronde' | 'incident_resolu' | 'releve'; title: string; notes: string;
  }[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('guards_site_idx').on(table.siteId),
  index('guards_team_idx').on(table.teamId)
]);

export const cashRegisters = pgTable('cash_registers', {
  id: varchar('id', { length: 100 }).primaryKey(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'restrict' }).notNull(),
  siteName: varchar('site_name', { length: 150 }).notNull(),
  registerCode: varchar('register_code', { length: 60 }).notNull().unique(),
  cashierName: varchar('cashier_name', { length: 150 }).notNull(),
  openedAt: varchar('opened_at', { length: 50 }).notNull(),
  openingBalanceAr: bigint('opening_balance_ar', { mode: 'number' }).default(0).notNull(),
  totalCashCollectedAr: bigint('total_cash_collected_ar', { mode: 'number' }).default(0).notNull(),
  totalMobileMoneyAr: bigint('total_mobile_money_ar', { mode: 'number' }).default(0).notNull(),
  totalExpensesPaidAr: bigint('total_expenses_paid_ar', { mode: 'number' }).default(0).notNull(),
  currentCashInHandAr: bigint('current_cash_in_hand_ar', { mode: 'number' }).default(0).notNull(),
  status: varchar('status', { length: 30 }).default('ouverte').notNull()
});

export const expenses = pgTable('expenses', {
  id: varchar('id', { length: 100 }).primaryKey(),
  expenseNumber: varchar('expense_number', { length: 50 }).notNull().unique(),
  date: varchar('date', { length: 30 }).notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'restrict' }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description').notNull(),
  beneficiary: varchar('beneficiary', { length: 150 }).notNull(),
  amountAr: bigint('amount_ar', { mode: 'number' }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  requesterName: varchar('requester_name', { length: 150 }).notNull(),
  approverName: varchar('approver_name', { length: 150 }),
  status: varchar('status', { length: 30 }).default('en_attente').notNull(),
  justificatifRef: varchar('justificatif_ref', { length: 100 }),
  invoicePhotoUrl: text('invoice_photo_url'),
  quantity: doublePrecision('quantity'),
  unit: varchar('unit', { length: 30 })
});

export const inventoryItems = pgTable('inventory_items', {
  id: varchar('id', { length: 100 }).primaryKey(),
  inventoryCode: varchar('inventory_code', { length: 50 }).notNull().unique(),
  designation: varchar('designation', { length: 200 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  modelSpecs: text('model_specs').notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'restrict' }).notNull(),
  location: varchar('location', { length: 150 }).notNull(),
  status: varchar('status', { length: 50 }).default('operationnel').notNull(),
  quantity: integer('quantity').default(1).notNull(),
  responsibleName: varchar('responsible_name', { length: 150 }).notNull(),
  commissioningDate: varchar('commissioning_date', { length: 30 }).notNull(),
  estimatedValueAr: bigint('estimated_value_ar', { mode: 'number' }).default(0).notNull(),
  totalCycles: varchar('total_cycles', { length: 100 }),
  lastAuditDate: varchar('last_audit_date', { length: 30 }).notNull(),
  maintenanceHistory: jsonb('maintenance_history').$type<{
    date: string; title: string; description: string; isCritical?: boolean;
  }[]>().default([]).notNull()
});

export const incidents = pgTable('incidents', {
  id: varchar('id', { length: 100 }).primaryKey(),
  ticketCode: varchar('ticket_code', { length: 50 }).notNull().unique(),
  date: varchar('date', { length: 30 }).notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'restrict' }).notNull(),
  reporterName: varchar('reporter_name', { length: 150 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 30 }).default('moyen').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  assignedTo: varchar('assigned_to', { length: 150 }),
  resolutionStatus: varchar('resolution_status', { length: 30 }).default('ouvert').notNull(),
  resolutionNotes: text('resolution_notes'),
  resolvedAt: varchar('resolved_at', { length: 50 }),
  memberIds: jsonb('member_ids').$type<string[]>().default([]).notNull(),
  vehicleIds: jsonb('vehicle_ids').$type<string[]>().default([]).notNull()
});

export const committeeMembers = pgTable('committee_members', {
  id: varchar('id', { length: 100 }).primaryKey(),
  role: varchar('role', { length: 80 }).notNull(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  siteId: varchar('site_id', { length: 100 }).references(() => sites.id, { onDelete: 'set null' }),
  phone: varchar('phone', { length: 30 }).notNull(),
  email: varchar('email', { length: 150 }),
  avatarUrl: text('avatar_url'),
  monthlyIndemnityAr: bigint('monthly_indemnity_ar', { mode: 'number' }).default(0).notNull(),
  mandateStart: varchar('mandate_start', { length: 30 }).notNull(),
  mandateEnd: varchar('mandate_end', { length: 30 }).notNull(),
  status: varchar('status', { length: 30 }).default('actif').notNull()
});

export const governanceMeetings = pgTable('governance_meetings', {
  id: varchar('id', { length: 100 }).primaryKey(),
  date: varchar('date', { length: 30 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  location: varchar('location', { length: 150 }).notNull(),
  agenda: text('agenda').notNull(),
  summaryPv: text('summary_pv').notNull(),
  resolutionsCount: integer('resolutions_count').default(1).notNull(),
  documentPdfUrl: text('document_pdf_url'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const payrolls = pgTable('payrolls', {
  id: varchar('id', { length: 100 }).primaryKey(),
  slipNumber: varchar('slip_number', { length: 50 }).notNull().unique(),
  periodMonth: varchar('period_month', { length: 50 }).notNull(),
  beneficiaryType: varchar('beneficiary_type', { length: 30 }).notNull(),
  beneficiaryId: varchar('beneficiary_id', { length: 100 }).notNull(),
  beneficiaryName: varchar('beneficiary_name', { length: 150 }).notNull(),
  roleTitle: varchar('role_title', { length: 150 }).notNull(),
  siteId: varchar('site_id', { length: 50 }).notNull(),
  siteName: varchar('site_name', { length: 150 }).notNull(),
  cin: varchar('cin', { length: 30 }).notNull(),
  avatarUrl: text('avatar_url'),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  bankAccountOrPhone: varchar('bank_account_or_phone', { length: 120 }).notNull(),

  baseSalaryAr: bigint('base_salary_ar', { mode: 'number' }).notNull(),
  responsibilityBonusAr: bigint('responsibility_bonus_ar', { mode: 'number' }).default(0).notNull(),
  nightShiftBonusAr: bigint('night_shift_bonus_ar', { mode: 'number' }).default(0).notNull(),
  transportBonusAr: bigint('transport_bonus_ar', { mode: 'number' }).default(0).notNull(),
  performanceBonusAr: bigint('performance_bonus_ar', { mode: 'number' }).default(0).notNull(),
  grossSalaryAr: bigint('gross_salary_ar', { mode: 'number' }).notNull(),

  cnapsDeductionAr: bigint('cnaps_deduction_ar', { mode: 'number' }).default(0).notNull(),
  ostieDeductionAr: bigint('ostie_deduction_ar', { mode: 'number' }).default(0).notNull(),
  irsaDeductionAr: bigint('irsa_deduction_ar', { mode: 'number' }).default(0).notNull(),
  advanceDeductionAr: bigint('advance_deduction_ar', { mode: 'number' }).default(0).notNull(),
  totalDeductionsAr: bigint('total_deductions_ar', { mode: 'number' }).default(0).notNull(),
  netSalaryAr: bigint('net_salary_ar', { mode: 'number' }).notNull(),

  status: varchar('status', { length: 30 }).default('en_attente').notNull(),
  generatedDate: varchar('generated_date', { length: 30 }).notNull(),
  approvedDate: varchar('approved_date', { length: 30 }),
  paidDate: varchar('paid_date', { length: 30 }),
  approverName: varchar('approver_name', { length: 150 }),
  transactionRef: varchar('transaction_ref', { length: 120 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('payrolls_period_idx').on(table.periodMonth),
  index('payrolls_type_idx').on(table.beneficiaryType),
  index('payrolls_status_idx').on(table.status)
]);

export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 100 }).primaryKey(),
  timestamp: varchar('timestamp', { length: 60 }).notNull(),
  userId: varchar('user_id', { length: 100 }).notNull(),
  userName: varchar('user_name', { length: 150 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  siteCode: varchar('site_code', { length: 50 }).notNull(),
  module: varchar('module', { length: 100 }).notNull(),
  details: text('details').notNull(),
  ipAddress: varchar('ip_address', { length: 50 }).default('127.0.0.1').notNull()
});

// Drizzle Relations
export const sitesRelations = relations(sites, ({ many }) => ({
  users: many(users),
  members: many(members),
  vehicles: many(vehicles),
  parkingSpaces: many(parkingSpaces),
  guards: many(guards),
  cashRegisters: many(cashRegisters),
  expenses: many(expenses),
  inventoryItems: many(inventoryItems),
  incidents: many(incidents),
  committeeMembers: many(committeeMembers)
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  primarySite: one(sites, {
    fields: [members.primarySiteId],
    references: [sites.id]
  }),
  vehicles: many(vehicles),
  subscriptions: many(subscriptions),
  paymentReceipts: many(paymentReceipts),
  membershipCards: many(membershipCards)
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  owner: one(members, {
    fields: [vehicles.memberId],
    references: [members.id]
  }),
  site: one(sites, {
    fields: [vehicles.siteId],
    references: [sites.id]
  })
}));

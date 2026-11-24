export type UserRole =
  | 'super_admin'
  | 'president_general'
  | 'president_site'
  | 'tresorier_general'
  | 'tresorier_site'
  | 'secretaire'
  | 'membre_comite'
  | 'chef_poste_gardien'
  | 'gardien'
  | 'agent_caisse'
  | 'gestionnaire_materiel'
  | 'auditeur'
  | 'proprietaire_membre';

/** Label and scope of each role (shared by the server and the interface). */
export const USER_ROLES: { role: UserRole; label: string; needsSite: boolean }[] = [
  { role: 'super_admin', label: 'Super Admin', needsSite: false },
  { role: 'president_general', label: 'Président Général', needsSite: false },
  { role: 'tresorier_general', label: 'Trésorier Général', needsSite: false },
  { role: 'secretaire', label: 'Secrétaire Général', needsSite: false },
  { role: 'membre_comite', label: 'Membre du comité', needsSite: false },
  { role: 'auditeur', label: 'Auditeur', needsSite: false },
  { role: 'gestionnaire_materiel', label: 'Gestionnaire matériel', needsSite: false },
  { role: 'president_site', label: 'Président de site', needsSite: true },
  { role: 'tresorier_site', label: 'Trésorier de site', needsSite: true },
  { role: 'chef_poste_gardien', label: 'Chef de poste gardien', needsSite: true },
  { role: 'gardien', label: 'Gardien', needsSite: true },
  { role: 'agent_caisse', label: 'Agent de caisse', needsSite: true },
  { role: 'proprietaire_membre', label: 'Propriétaire / membre', needsSite: true }
];

/** Roles allowed to manage accounts and application settings. */
export const ADMIN_ROLES: UserRole[] = ['super_admin', 'president_general'];

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  siteId?: string; // null for general roles
  phone: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLogin?: string;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  totalCapacity: number;
  presidentName: string;
  presidentPhone: string;
  tresorierName: string;
  guardCount: number;
  status: 'actif' | 'maintenance' | 'inactif';
  coordinates?: { lat: number; lng: number };
}

export type VehicleCategory =
  | 'Voiture Légère (VL)'
  | 'Deux-Roues (2R)'
  | 'SUV / 4x4'
  | 'Utilitaire / Fourgon'
  | 'Taxi-Ville / Minibus'
  | 'Camionnette'
  | 'Poids Lourd (PL)'
  | 'Autre';

/** Every vehicle category, in display order (lists in forms). */
export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  'Voiture Légère (VL)',
  'SUV / 4x4',
  'Deux-Roues (2R)',
  'Utilitaire / Fourgon',
  'Camionnette',
  'Taxi-Ville / Minibus',
  'Poids Lourd (PL)',
  'Autre'
];

export interface Vehicle {
  id: string;
  licensePlate: string; // e.g. "6543 TBD"
  category: VehicleCategory;
  brand: string; // e.g. "Toyota"
  model: string; // e.g. "Rav4"
  color: string; // e.g. "Gris métallisé"
  memberId: string;
  siteId: string;
  spotId?: string;
  rfidTag?: string; // e.g. "#TAG-4482-PMM"
  barcode?: string;
  registeredAt: string;
  status: 'actif' | 'suspendu' | 'radie';
  photoUrl?: string;
  assignedSpotType?: 'placement_libre_interieur' | 'emplacement_privatif_dedie' | 'deux_roues' | 'poids_lourd';
}

export interface Member {
  id: string;
  memberNumber: string; // e.g. "MBR-2024-0089"
  fullName: string;
  category: 'privilege' | 'standard' | 'resident' | 'corporate';
  cin: string; // Malagasy CIN (12 digits)
  cinIssuedDate?: string;
  cinIssuedLocation?: string;
  phone: string;
  mobileMoneyProvider?: 'MVola' | 'Orange Money' | 'Airtel Money';
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address: string;
  primarySiteId: string;
  joinedDate: string;
  /** Président (du site ou général) qui a accepté l'adhésion */
  approvedByPresident?: string;
  status: 'actif' | 'en_retard' | 'suspendu' | 'radie';
  currentBalanceAr: number; // 0 if up to date, negative if unpaid
  avatarUrl?: string;
  notes?: string;
}

export type SpotStatus = 'libre' | 'occupe' | 'reserve' | 'maintenance';

export interface ParkingSpot {
  id: string;
  code: string; // e.g. "A-01", "B-03", "C-08"
  siteId: string;
  zone: string; // e.g. "Zone A - Couverte VIP", "Zone B - Extérieure Mixte", "Zone C - Deux-roues"
  type: 'placement_libre_interieur' | 'emplacement_privatif_dedie' | 'deux_roues' | 'poids_lourd';
  status: SpotStatus;
  currentVehiclePlate?: string;
  currentVehicleModel?: string;
  currentDriverName?: string;
  entryTime?: string;
  duration?: string;
  assignedAbonnement?: string;
  rfidUid?: string;
}

export type PaymentMethod = 'Espèces' | 'MVola' | 'Orange Money' | 'Airtel Money' | 'Virement BNI' | 'Virement BMOI' | 'Chèque';

export interface PaymentReceipt {
  id: string;
  receiptNumber: string; // e.g. "REC-2024-0512"
  dateTime: string;
  memberId: string;
  memberName: string;
  vehiclePlate?: string;
  siteId: string;
  siteName: string;
  purpose: string; // e.g. "Abonnement Standard Mensuel - Mai 2024"
  period: string; // "01/05/2024 - 31/05/2024"
  amountDueAr: number;
  amountPaidAr: number;
  remainingBalanceAr: number;
  paymentMethod: PaymentMethod;
  cashierName: string;
  transactionRef: string; // e.g. "TRX-99214-MVOLA"
  status: 'confirme' | 'en_attente' | 'annule' | 'rembourse';
}

export interface Subscription {
  id: string;
  contractRef: string; // e.g. "ABO-2024-0198"
  memberId: string;
  memberName: string;
  vehiclePlate: string;
  vehicleModel: string;
  siteId: string;
  tariffType: string;
  monthlyAmountAr: number;
  startDate: string;
  endDate: string;
  nextDueDate: string;
  daysRemaining: number;
  status: 'a_jour' | 'proche_echeance' | 'en_retard' | 'expire';
}

export interface Tariff {
  id: string;
  name: string;
  category: VehicleCategory;
  siteId?: string; // null = all sites
  typeFormula: 'placement_libre_interieur' | 'emplacement_privatif_dedie' | 'deux_roues' | 'adhesion_annuelle' | 'carte_pvc';
  duration: 'jour' | 'semaine' | 'mois' | 'an';
  amountAr: number;
  description: string;
  isActive: boolean;
}

export interface MembershipCard {
  id: string;
  cardNumber: string; // e.g. "CRD-9981-ANL"
  memberId: string;
  memberName: string;
  siteId: string;
  siteName: string;
  primaryPlate: string;
  secondaryPlate?: string;
  issuedDate: string;
  expirationDate: string;
  rfidTag: string; // e.g. "#TAG-4482-PMM"
  nfcChipType: string; // e.g. "MIFARE DESFire EV3 / NTAG216"
  qrToken: string; // opaque secure cryptographic token: e.g. "uuid:e8f9-4b12-98a0-22c3"
  status: 'actif' | 'a_renouveler' | 'bloquee_perdue' | 'revoquee';
  printedBatchRef?: string;
  lastPassageTimestamp?: string;
  lastPassageGate?: string;
}

/**
 * Day of a guard's weekly schedule. A guard ("GARDE") lasts 24 h:
 * from 06:00 on that day to 06:00 the next day.
 */
export type GuardDayCode = 'GARDE' | 'REPOS' | 'CONGE' | 'ABSENT';

export const GUARD_DAY_CODES: { code: GuardDayCode; label: string; short: string }[] = [
  { code: 'GARDE', label: 'Garde 24h (06h → 06h J+1)', short: 'Garde 24h' },
  { code: 'REPOS', label: 'Repos', short: 'Repos' },
  { code: 'CONGE', label: 'Congé', short: 'Congé' },
  { code: 'ABSENT', label: 'Absent', short: 'Absent' }
];

export const GUARD_SHIFT_LABEL = 'Garde 24h : 06h00 → 06h00 (J+1)';

export type WeekDayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface GuardPersonnel {
  id: string;
  matricule: string; // e.g. "GRD-2024-001"
  fullName: string;
  title: string; // e.g. "Chef de Poste Nord", "Gardien de Nuit"
  grade: string; // e.g. "Assermenté", "Vidéosurveillance"
  siteId: string;
  teamId: string; // Brigade / Groupe id e.g. "brigade-alpha-s1"
  teamName: string; // e.g. "Brigade Alpha - Poste Central & Barrières"
  isTeamLeader: boolean; // True si c'est le chef du groupe
  teamLeaderId?: string; // ID du chef de groupe pour les 2-3 gardiens subordonnés
  teamLeaderName?: string; // Nom du chef de groupe
  rankOrder?: number; // 1 = Chef, 2 = 1er Gardien, 3 = 2e Gardien, 4 = 3e Gardien
  ordersOfTheDay?: string[]; // Consignes transmises par le chef
  shiftHours: string; // e.g. "06h-14h", "14h-22h", "22h-06h"
  shiftName: 'Matin' | 'Après-midi' | 'Nuit' | 'Repos';
  status: 'en_poste' | 'de_repos' | 'en_conge' | 'absent';
  phoneFlotte: string;
  cin: string;
  residenceLot: string;
  recruitmentDate: string;
  badgeRfid: string;
  avatarUrl?: string;
  assignedEquipments: {
    inventoryCode: string;
    designation: string;
  }[];
  shiftDays: {
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
    sun: string;
  };
  todayLog: {
    time: string;
    type: 'prise_service' | 'ronde' | 'incident_resolu' | 'releve';
    title: string;
    notes: string;
  }[];
}

export interface Equipment {
  id: string;
  inventoryCode: string; // e.g. "MAT-BAR-002"
  designation: string; // e.g. "Barrière levante CAME G4000 (B-02)"
  category: 'barriers' | 'telecom' | 'security' | 'furniture' | 'assigned' | 'monetique';
  modelSpecs: string; // "CAME Gard G4000, 24V DC / 230V"
  siteId: string;
  location: string; // e.g. "Voie Sortie #2"
  status: 'operationnel' | 'maintenance' | 'critique' | 'controle_requis';
  quantity: number;
  responsibleName: string;
  commissioningDate: string;
  estimatedValueAr: number;
  totalCycles?: string;
  lastAuditDate: string;
  /** Photo of the equipment (data URL) */
  photoUrl?: string;
  /** Movement log: interventions, breakdowns, transfers, inventories… (newest first) */
  maintenanceHistory: EquipmentHistoryEntry[];
}

export interface EquipmentHistoryEntry {
  date: string;
  title: string;
  description: string;
  isCritical?: boolean;
  kind?: 'creation' | 'intervention' | 'panne' | 'remise_service' | 'transfert' | 'audit';
}

export interface CashRegister {
  id: string;
  siteId: string;
  siteName: string;
  registerCode: string; // e.g. "CAISSE-C1-ANL"
  cashierName: string;
  openedAt: string;
  openingBalanceAr: number;
  totalCashCollectedAr: number;
  totalMobileMoneyAr: number;
  totalExpensesPaidAr: number;
  currentCashInHandAr: number;
  status: 'ouverte' | 'cloturee';
}

export interface ExpenseRecord {
  id: string;
  expenseNumber: string; // e.g. "DEP-2024-0118"
  date: string;
  siteId: string;
  category: 'Carburant Groupe' | 'Entretien & Nettoyage' | 'Fournitures Caisse' | 'Pièces Barrières' | 'Prime Gardiennage' | 'Autre';
  description: string;
  beneficiary: string;
  amountAr: number;
  paymentMethod: PaymentMethod;
  requesterName: string;
  approverName?: string;
  status: 'en_attente' | 'approuve' | 'rejete';
  justificatifRef?: string;
  /** Photo of the invoice / receipt (JPEG data URL), optional */
  invoicePhotoUrl?: string;
  /** Quantity bought, e.g. 20 (litres) */
  quantity?: number;
  /** Unit of the quantity, one of EXPENSE_UNITS */
  unit?: string;
}

/** Units offered when recording an expense. */
export const EXPENSE_UNITS = ['unité', 'litre', 'kg', 'g', 'boîte', 'paquet', 'carton', 'sac', 'rouleau', 'mètre', 'lot', 'heure', 'jour', 'forfait'] as const;

export interface IncidentRecord {
  id: string;
  ticketCode: string; // e.g. "INC-2024-0042"
  date: string;
  siteId: string;
  reporterName: string;
  type: 'materiel' | 'stationnement_illicite' | 'impaye_force' | 'securite' | 'autre';
  severity: 'faible' | 'moyen' | 'eleve' | 'critique';
  title: string;
  description: string;
  assignedTo?: string;
  resolutionStatus: 'ouvert' | 'en_cours' | 'resolu' | 'classe';
  resolutionNotes?: string;
  resolvedAt?: string;
  /** Members involved in the incident */
  memberIds?: string[];
  /** Vehicles involved in the incident */
  vehicleIds?: string[];
}

export interface CommitteeMember {
  id: string;
  role: 'President General' | 'Vice President' | 'President Site' | 'Tresorier General' | 'Tresorier Site' | 'Secretaire General' | 'Controleur de Gestion';
  fullName: string;
  siteId?: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  monthlyIndemnityAr?: number; // Indemnité mensuelle statutaire en Ariary
  mandateStart: string;
  mandateEnd: string;
  status: 'actif' | 'honoraire';
}

export interface GovernanceMeeting {
  id: string;
  date: string;
  title: string;
  location: string;
  agenda: string;
  summaryPV: string;
  resolutionsCount: number;
  documentPdfUrl?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  siteCode: string;
  module: string;
  details: string;
  ipAddress: string;
}

export type PayrollBeneficiaryType = 'personnel' | 'bureau';

export interface PayrollRecord {
  id: string;
  slipNumber: string; // e.g. "PAY-2024-05-001"
  periodMonth: string; // "Mai 2024"
  beneficiaryType: PayrollBeneficiaryType;
  beneficiaryId: string;
  beneficiaryName: string;
  roleTitle: string; // e.g. "Chef de Poste Nord", "Président Général", etc.
  siteId: string; // "S1", "S2", "S3" ou "GLOBAL"
  siteName: string;
  cin: string;
  avatarUrl?: string;
  paymentMethod: 'Virement BNI' | 'Virement BMOI' | 'Virement BOA' | 'MVola' | 'Orange Money' | 'Espèces';
  bankAccountOrPhone: string;
  
  // Détails de la rémunération en Ariary
  baseSalaryAr: number; // Salaire de base ou Indemnité forfaitaire statutaire
  responsibilityBonusAr: number; // Prime de responsabilité (Chef de brigade)
  nightShiftBonusAr: number; // Prime de travail de nuit / astreinte
  transportBonusAr: number; // Indemnité de transport & panier repas
  performanceBonusAr: number; // Prime de rendement / présence
  grossSalaryAr: number; // Total Brut
  
  // Retenues légales à Madagascar
  cnapsDeductionAr: number; // Cotisation CNaPS 1% part salariale
  ostieDeductionAr: number; // Service médical interentreprises OSTIE 1%
  irsaDeductionAr: number; // Retenue IRSA (impôt sur revenu)
  advanceDeductionAr: number; // Acompte déduit
  totalDeductionsAr: number; // Total retenues
  
  netSalaryAr: number; // Net à payer en Ariary (Brut - Retenues)
  
  status: 'en_attente' | 'valide_tresorier' | 'paye';
  generatedDate: string;
  approvedDate?: string;
  paidDate?: string;
  approverName?: string;
  transactionRef?: string;
  notes?: string;
}

export interface AppState {
  currentUser: User;
  selectedSiteId: string;
  sites: Site[];
  users: User[];
  members: Member[];
  vehicles: Vehicle[];
  spots: ParkingSpot[];
  tariffs: Tariff[];
  subscriptions: Subscription[];
  receipts: PaymentReceipt[];
  cards: MembershipCard[];
  guards: GuardPersonnel[];
  equipments: Equipment[];
  cashRegisters: CashRegister[];
  expenses: ExpenseRecord[];
  incidents: IncidentRecord[];
  committeeMembers: CommitteeMember[];
  meetings: GovernanceMeeting[];
  auditLogs: AuditLogItem[];
  payrolls: PayrollRecord[];
}



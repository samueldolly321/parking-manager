import {
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
  PayrollRecord,
  AppState
} from '../types';

export type { AppState };

const STORAGE_KEY = 'parking_mada_master_state_v1';

export const initialSites: Site[] = [
  {
    id: 'S1',
    code: 'S1-ANALAKELY',
    name: 'Site 01 - Analakely Central',
    address: 'Avenue de l\'Indépendance',
    city: 'Antananarivo 101',
    totalCapacity: 250,
    presidentName: 'Rajaonarison Hery',
    presidentPhone: '+261 34 02 111 01',
    tresorierName: 'Rasoanaivo Mirana',
    guardCount: 4,
    status: 'actif',
    coordinates: { lat: -18.9056, lng: 47.5256 }
  },
  {
    id: 'S2',
    code: 'S2-ANKORONDRANO',
    name: 'Site 02 - Ankorondrano Business',
    address: 'Zone Tana Waterfront & Galaxy',
    city: 'Antananarivo 101',
    totalCapacity: 180,
    presidentName: 'Randriamifidimanana Jean',
    presidentPhone: '+261 34 02 222 02',
    tresorierName: 'Rakotomalala Sitraka',
    guardCount: 3,
    status: 'actif',
    coordinates: { lat: -18.8834, lng: 47.5289 }
  },
  {
    id: 'S3',
    code: 'S3-IVATO',
    name: 'Site 03 - Ivato Aéroport Hub',
    address: 'Zone Fret & Longue Durée, Aéroport',
    city: 'Antananarivo 105',
    totalCapacity: 80,
    presidentName: 'Ranaivoarisoa Pascal',
    presidentPhone: '+261 34 02 333 03',
    tresorierName: 'Ratsimbazafy Fidy',
    guardCount: 2,
    status: 'actif',
    coordinates: { lat: -18.7969, lng: 47.4788 }
  }
];

export const initialCurrentUser: User = {
  id: 'usr-admin-01',
  username: 'superadmin',
  fullName: 'Rajaonarison Hery',
  email: 'hery@parkingmada.mg',
  role: 'super_admin',
  phone: '+261 34 02 111 01',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWCGKnToDVy0AFXDKbIZSrB4cYfFru-TF00P0EffMz7UUte2VorhDkvpOjKzkVJJmKi0MWsZumbTuwxz4VtWfOiwdcCMtTxZQJJBVSBc9r8iu-bmmP-MVUOFTu-1TkrT5INpLcRh99XhJ4fKFRT7y4tk7khRqOjxHPsp2LhrxfsMWx7bNBzq_wlMgDGSFVWgaz120IOofEpeA-I6CCKtidlcC4ju5OJCcTBdVBcC4',
  isActive: true,
  lastLogin: '15/05/2024 14:40'
};

export const initialMembers: Member[] = [
  {
    id: 'mbr-0089',
    memberNumber: 'MBR-2024-0089',
    fullName: 'RAMANANTSOA Andry Thierry',
    category: 'privilege',
    cin: '101 234 567 890',
    cinIssuedDate: '14/03/2012',
    cinIssuedLocation: 'Tana Renivohitra',
    phone: '+261 34 12 345 67',
    mobileMoneyProvider: 'MVola',
    emergencyContactName: 'Épouse (Mme RAMANANTSOA)',
    emergencyContactPhone: '+261 32 98 765 43',
    address: 'Lot IVB 42 Bis, Isoraka, Antananarivo 101 — Région Analamanga',
    primarySiteId: 'S1',
    joinedDate: '12/01/2023',
    status: 'actif',
    currentBalanceAr: 0,
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKowTqWDIHUyYNTyslG-6YQsTUPvDPEGovwESfsCzIEw-prEikTVwX31_yTJu1sBqNn6xWfgtdzRzuNvP4uZceNey04m2Z6Kg9yYYwQT0uvELsTUq1S7s4HhkI3C76yh1EYtVs-ZEaeOLbOnhOHgkwImdcQBDLajp6c99RGxOJLmAr6lTjXPcVxhS-2wzOxsMwFrsdDfWzNiI5i-7niEJSL9bExTCix6Wu9zo4h1I',
    notes: 'Membre Privilège fondateur. 2 véhicules enregistrés.'
  },
  {
    id: 'mbr-0104',
    memberNumber: 'MBR-2024-0104',
    fullName: 'RAZAFINDRABE Bakoly',
    category: 'corporate',
    cin: '101 543 890 123',
    cinIssuedDate: '08/07/2015',
    cinIssuedLocation: 'Tana Sud',
    phone: '+261 33 22 456 78',
    mobileMoneyProvider: 'Orange Money',
    emergencyContactName: 'M. RAZAFINDRABE',
    emergencyContactPhone: '+261 33 22 456 79',
    address: 'Lot II M 45 Ankorondrano, Antananarivo 101',
    primarySiteId: 'S2',
    joinedDate: '15/02/2023',
    status: 'actif',
    currentBalanceAr: 0,
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAoatsE8i0FNs9CgzzJro9NRJfngIHUE4D-OaLu7Bwdyxk_J2Mj2NMs5gJOb2WB0A2Nc8w5R2QIZtHyBwBPI1WtfFl6-0rqi0kCyZf2Ahy3qqZJNdpIYMd1dMQp9t4eSKw3j2QWBzoDbKHKy6MOHP5HFaYOCoy6o7STzr9rRoxdmOb0-SLZQrTvNHp2875AX0tDXp4l2JgCFL4f07AWt4TttFpm6bzhhNTufs6gvXhNciO8RtrQnxAJ',
    notes: 'Flotte Pro Peugeot 3008.'
  },
  {
    id: 'mbr-0941',
    memberNumber: 'MBR-2023-0941',
    fullName: 'ANDRIAMBOLOLONA Haja',
    category: 'resident',
    cin: '101 889 001 456',
    cinIssuedDate: '22/11/2010',
    cinIssuedLocation: 'Avaradrano',
    phone: '+261 32 55 678 90',
    mobileMoneyProvider: 'Airtel Money',
    emergencyContactName: 'Fils (Haja Jr)',
    emergencyContactPhone: '+261 32 55 678 91',
    address: 'Lot VF 19 Analakely, Antananarivo 101',
    primarySiteId: 'S1',
    joinedDate: '04/05/2022',
    status: 'en_retard',
    currentBalanceAr: -120000,
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBghVIfy9QqHXkIsEdLPh-XFM_0v6Bi6wJ151GTuDMime8zzCHNe3i7_QpULX8ki9rjBJnRXVj5wZ9Xs6702_-JluolSU9V3BUiASEuPGWdIa0coKhFxkBzpRVxFYtmoIYIgGIwaFInJ2PwW0u4bu9GSNzLCZ0t5ihHk064elfI1CAuipTALD_1v78m3Mh2wnZzRyhDIvOqTyCXgIPqmDZF7oZzGwLfSzjb_9rLA3wBiAG0Mr-uDEFS',
    notes: 'Résident Nuit. Relance SMS transmise pour échéance 31/05.'
  },
  {
    id: 'mbr-0442',
    memberNumber: 'MBR-2022-0442',
    fullName: 'RAKOTO Jean-Luc',
    category: 'standard',
    cin: '101 772 345 889',
    cinIssuedDate: '19/04/2014',
    cinIssuedLocation: 'Ambohimanarina',
    phone: '+261 34 77 123 45',
    mobileMoneyProvider: 'MVola',
    emergencyContactName: 'Sœur (Rakoto M.)',
    emergencyContactPhone: '+261 34 77 123 46',
    address: 'Lot VB 33 67 Ha, Antananarivo 101',
    primarySiteId: 'S1',
    joinedDate: '10/08/2022',
    status: 'suspendu',
    currentBalanceAr: -80000,
    notes: 'Badge égaré et mis en opposition blacklistée le 12 Mai.'
  },
  {
    id: 'mbr-0312',
    memberNumber: 'MBR-2024-0312',
    fullName: 'RANDRIANASOLO Rivo',
    category: 'standard',
    cin: '101 902 443 112',
    cinIssuedDate: '30/09/2018',
    cinIssuedLocation: 'Ivato',
    phone: '+261 34 99 876 54',
    mobileMoneyProvider: 'MVola',
    emergencyContactName: 'Conjointe (Voahirana)',
    emergencyContactPhone: '+261 34 99 876 55',
    address: 'Lot PR 12 Mandrosoa Ivato',
    primarySiteId: 'S3',
    joinedDate: '02/01/2024',
    status: 'actif',
    currentBalanceAr: 0,
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfHFyRxUDN3fwC6CspiLrrVe4-3VC-dJLvMxIGeogLNbqr-8Q72dgd99Tg-sMnOKg8t-WcSHmV4uyct_F92g6MSFxFpQp3xmRbHqPLAXJxLmr0qM8FgMG6MO23GVjKnmAp19UsEic6ssTP1ndfpxM0OoQA-rxKioqOLbtyy4w1qRYs1ZKwnGjJjqvhldFTbQj2GZuoRgShFve4n5w0sUUfjVECpTE0z9kWu1LYDpG4RepAFI2piHt_'
  }
];

export const initialVehicles: Vehicle[] = [
  {
    id: 'veh-01',
    licensePlate: '6543 TBD',
    category: 'Voiture Légère (VL)',
    brand: 'Toyota',
    model: 'Rav4 Finition SUV',
    color: 'Gris métallisé',
    memberId: 'mbr-0089',
    siteId: 'S1',
    spotId: 'A-01',
    rfidTag: '#TAG-4482-PMM',
    barcode: '#BAR-9011',
    registeredAt: '12/01/2023',
    status: 'actif',
    assignedSpotType: 'placement_libre_interieur',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr_MXoUKjdSd4jTLAfxHviHuj6hhUDVRgcCMwp-1Vjd6O4yMxCoGYVEzTOXWfkd3BWAq1W_9wxDFMaHIycRl_ueZrrOzI7-jTywu3F76eVIcd0-onr1mNmG5UFpP01_lcCWugMhpgq2_jmjHS_obCl2InqnskgPv-vWMgRfRBw_SLa5kTTXpow4WfwbtpZw2dF99MCRkBJ8ZDpmJV7YXEVvggBDRYu4az95qCIk1OEco-QS3hIKO3h'
  },
  {
    id: 'veh-02',
    licensePlate: '1209 TBH',
    category: 'Deux-Roues (2R)',
    brand: 'Honda',
    model: 'PCX 150 Scooter Urbain',
    color: 'Noir Verni',
    memberId: 'mbr-0089',
    siteId: 'S1',
    spotId: 'C-08',
    rfidTag: '#TAG-1209-2RP',
    barcode: '#BAR-9012',
    registeredAt: '12/01/2023',
    status: 'actif',
    assignedSpotType: 'deux_roues',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvKZgOD43LZhyRlIaKy5tBjybOn1bPiO1kwqE87WnUKqp_3_BDEcZBixB7Hkjf7rKwD9VuFH9oUhGSOwiWFeWNGSCMFr8xguOOOFyxfBCG1RjfOi0vdqzdaLCw14rWDspt_yagn6hMB8VSPkLkNOyuBYUN-43JVlRrgNOYi3Zmplc2cscv-hQYHEwpg56YPIMA0afdi6pbczyPTLclImeubUk8r7BalaQ1vNqEDpk-oxyzM6In2BTS'
  },
  {
    id: 'veh-03',
    licensePlate: '8912 WWT',
    category: 'Voiture Légère (VL)',
    brand: 'Peugeot',
    model: '3008 GT Line',
    color: 'Gris Platinium',
    memberId: 'mbr-0104',
    siteId: 'S2',
    spotId: 'A-02',
    rfidTag: '#TAG-8912-PMM',
    barcode: '#BAR-8912',
    registeredAt: '15/02/2023',
    status: 'actif',
    assignedSpotType: 'placement_libre_interieur'
  },
  {
    id: 'veh-04',
    licensePlate: '1104 PMM',
    category: 'SUV / 4x4',
    brand: 'Renault',
    model: 'Duster 4x4',
    color: 'Blanc Glacier',
    memberId: 'mbr-0941',
    siteId: 'S1',
    spotId: 'A-05',
    rfidTag: '#TAG-1104-PMM',
    barcode: '#BAR-1104',
    registeredAt: '04/05/2022',
    status: 'actif',
    assignedSpotType: 'placement_libre_interieur'
  },
  {
    id: 'veh-05',
    licensePlate: '7719 TAB',
    category: 'Voiture Légère (VL)',
    brand: 'Hyundai',
    model: 'Tucson 2.0 CRDi',
    color: 'Bleu Nuit',
    memberId: 'mbr-0312',
    siteId: 'S3',
    spotId: 'A-02',
    rfidTag: '#TAG-7719-PMM',
    barcode: '#BAR-7719',
    registeredAt: '02/01/2024',
    status: 'actif',
    assignedSpotType: 'placement_libre_interieur'
  },
  {
    id: 'veh-06',
    licensePlate: '4512 TAB',
    category: 'Utilitaire / Fourgon',
    brand: 'Toyota',
    model: 'Hilux GR Sport Double Cab',
    color: 'Noir Intense',
    memberId: 'mbr-0089',
    siteId: 'S1',
    spotId: 'A-01',
    rfidTag: '#TAG-4512-PMM',
    barcode: '#BAR-4512',
    registeredAt: '10/01/2024',
    status: 'actif',
    assignedSpotType: 'placement_libre_interieur'
  }
];

export const initialSpots: ParkingSpot[] = [
  // Site 1 Zone A (Placement libre intérieur)
  {
    id: 'spot-A01',
    code: 'A-01',
    siteId: 'S1',
    zone: 'Zone A : Couverte Intérieure',
    type: 'placement_libre_interieur',
    status: 'occupe',
    currentVehiclePlate: '4512 TAB',
    currentVehicleModel: 'Toyota Hilux GR Sport',
    currentDriverName: 'Rabemananjara A.',
    entryTime: '15/05/2024 07:42',
    duration: '3h 18min',
    assignedAbonnement: 'Pass Enceinte Banalisé (120 000 Ar/m)',
    rfidUid: '04:A3:99:BC:11:01'
  },
  {
    id: 'spot-A02',
    code: 'A-02',
    siteId: 'S1',
    zone: 'Zone A : Couverte Intérieure',
    type: 'placement_libre_interieur',
    status: 'occupe',
    currentVehiclePlate: '8920 WWT',
    currentVehicleModel: 'Peugeot 3008 GT Line',
    currentDriverName: 'Dr. Lova Randria',
    entryTime: '15/05/2024 08:15',
    duration: '2h 45min',
    assignedAbonnement: 'Professionnel Mensuel (120 000 Ar/m)',
    rfidUid: '04:A3:99:BC:11:02'
  },
  {
    id: 'spot-A03',
    code: 'A-03',
    siteId: 'S1',
    zone: 'Zone A : Couverte Intérieure',
    type: 'placement_libre_interieur',
    status: 'libre'
  },
  {
    id: 'spot-A04',
    code: 'A-04',
    siteId: 'S1',
    zone: 'Zone A : Couverte Intérieure',
    type: 'placement_libre_interieur',
    status: 'occupe',
    currentVehiclePlate: '5421 TAB',
    currentVehicleModel: 'Mazda CX-5 Skyactiv',
    currentDriverName: 'Raveloson Thierry',
    entryTime: '15/05/2024 09:10',
    duration: '1h 50min',
    assignedAbonnement: 'Abonnement Standard Mensuel',
    rfidUid: '04:A3:99:BC:11:04'
  },
  {
    id: 'spot-A05',
    code: 'A-05',
    siteId: 'S1',
    zone: 'Zone A : Couverte Intérieure',
    type: 'placement_libre_interieur',
    status: 'occupe',
    currentVehiclePlate: '1104 PMM',
    currentVehicleModel: 'Renault Duster 4x4',
    currentDriverName: 'Andriambololona Haja',
    entryTime: '15/05/2024 10:20',
    duration: '40min',
    assignedAbonnement: 'Pass Résident Nuit',
    rfidUid: '04:A3:99:BC:11:05'
  },
  {
    id: 'spot-A06',
    code: 'A-06',
    siteId: 'S1',
    zone: 'Zone A : Couverte Intérieure',
    type: 'placement_libre_interieur',
    status: 'reserve',
    assignedAbonnement: 'Réservation Navette BNI'
  },
  {
    id: 'spot-A07',
    code: 'A-07',
    siteId: 'S1',
    zone: 'Zone A : Couverte Intérieure',
    type: 'placement_libre_interieur',
    status: 'occupe',
    currentVehiclePlate: '9012 WWT',
    currentVehicleModel: 'Ford Ranger XLT',
    currentDriverName: 'Andria Corp',
    entryTime: '15/05/2024 06:50',
    duration: '4h 10min',
    assignedAbonnement: 'Corporate B2B',
    rfidUid: '04:A3:99:BC:11:07'
  },
  {
    id: 'spot-A08',
    code: 'A-08',
    siteId: 'S1',
    zone: 'Zone A : Couverte Intérieure',
    type: 'placement_libre_interieur',
    status: 'maintenance',
    assignedAbonnement: 'Réfection pavage & capteur sol'
  },

  // Site 1 Zone B (Voirie extérieure dédiée / Privatif)
  {
    id: 'spot-B01',
    code: 'B-01',
    siteId: 'S1',
    zone: 'Zone B : Extérieure Privative',
    type: 'emplacement_privatif_dedie',
    status: 'occupe',
    currentVehiclePlate: '3301 TAZ',
    currentVehicleModel: 'Isuzu D-Max 3.0',
    currentDriverName: 'Sahaza SARL',
    entryTime: '15/05/2024 08:00',
    assignedAbonnement: 'Privatif Dédié (180 000 Ar/m)'
  },
  {
    id: 'spot-B02',
    code: 'B-02',
    siteId: 'S1',
    zone: 'Zone B : Extérieure Privative',
    type: 'emplacement_privatif_dedie',
    status: 'libre'
  },
  {
    id: 'spot-B03',
    code: 'B-03',
    siteId: 'S1',
    zone: 'Zone B : Extérieure Privative',
    type: 'emplacement_privatif_dedie',
    status: 'occupe',
    currentVehiclePlate: '7845 TBA',
    currentVehicleModel: 'Toyota Land Cruiser Prado',
    currentDriverName: 'Ranaivo H.',
    entryTime: '15/05/2024 07:15',
    assignedAbonnement: 'Privatif Dédié (180 000 Ar/m)'
  },
  {
    id: 'spot-B04',
    code: 'B-04',
    siteId: 'S1',
    zone: 'Zone B : Extérieure Privative',
    type: 'emplacement_privatif_dedie',
    status: 'reserve',
    assignedAbonnement: 'Direction Télécom Madagascar'
  },

  // Site 1 Zone C (Deux-roues)
  {
    id: 'spot-C01',
    code: 'C-01',
    siteId: 'S1',
    zone: 'Zone C : Deux-roues Clôturée',
    type: 'deux_roues',
    status: 'occupe',
    currentVehiclePlate: '1209 TBH',
    currentVehicleModel: 'Honda PCX 150',
    currentDriverName: 'RAMANANTSOA Andry',
    entryTime: '15/05/2024 08:30',
    assignedAbonnement: 'Abonnement Mensuel Moto (40 000 Ar/m)'
  },
  {
    id: 'spot-C02',
    code: 'C-02',
    siteId: 'S1',
    zone: 'Zone C : Deux-roues Clôturée',
    type: 'deux_roues',
    status: 'libre'
  },
  {
    id: 'spot-C03',
    code: 'C-03',
    siteId: 'S1',
    zone: 'Zone C : Deux-roues Clôturée',
    type: 'deux_roues',
    status: 'libre'
  },
  {
    id: 'spot-C04',
    code: 'C-04',
    siteId: 'S1',
    zone: 'Zone C : Deux-roues Clôturée',
    type: 'deux_roues',
    status: 'occupe',
    currentVehiclePlate: '0321 PMM',
    currentVehicleModel: 'Yamaha NMAX 155',
    currentDriverName: 'Rakotomalala J.',
    entryTime: '15/05/2024 09:00',
    assignedAbonnement: 'Abonnement Moto Standard'
  }
];

export const initialTariffs: Tariff[] = [
  {
    id: 'tar-01',
    name: 'Placement Libre Intérieur (Standard Mensuel)',
    category: 'Voiture Légère (VL)',
    typeFormula: 'placement_libre_interieur',
    duration: 'mois',
    amountAr: 120000,
    description: 'Place non privative en zone intérieure partagée, accès barrière automatisée 24h/7j.',
    isActive: true
  },
  {
    id: 'tar-02',
    name: 'Emplacement Privatif Dédié (Voirie Extérieure)',
    category: 'Voiture Légère (VL)',
    typeFormula: 'emplacement_privatif_dedie',
    duration: 'mois',
    amountAr: 180000,
    description: 'Emplacement nominatif numéroté et réservé exclusivement sur voirie balisée.',
    isActive: true
  },
  {
    id: 'tar-03',
    name: 'Abonnement Mensuel Deux-Roues (Zone C)',
    category: 'Deux-Roues (2R)',
    typeFormula: 'deux_roues',
    duration: 'mois',
    amountAr: 40000,
    description: 'Stationnement abrité et sécurisé pour scooters et motos en zone grillagée.',
    isActive: true
  },
  {
    id: 'tar-04',
    name: 'Cotisation Statutaire Annuelle',
    category: 'Voiture Légère (VL)',
    typeFormula: 'adhesion_annuelle',
    duration: 'an',
    amountAr: 160000,
    description: 'Contribution annuelle statutaire des membres de l\'association gestionnaire.',
    isActive: true
  },
  {
    id: 'tar-05',
    name: 'Délivrance & Encodage Carte PVC CR80',
    category: 'Voiture Légère (VL)',
    typeFormula: 'carte_pvc',
    duration: 'an',
    amountAr: 25000,
    description: 'Support plastique haute résistance avec puce RFID intégrée et QR token.',
    isActive: true
  }
];

export const initialSubscriptions: Subscription[] = [
  {
    id: 'sub-01',
    contractRef: 'ABO-2024-0198',
    memberId: 'mbr-0089',
    memberName: 'RAMANANTSOA Andry Thierry',
    vehiclePlate: '6543 TBD',
    vehicleModel: 'Toyota Rav4',
    siteId: 'S1',
    tariffType: 'Placement Libre Intérieur',
    monthlyAmountAr: 120000,
    startDate: '01/05/2024',
    endDate: '31/05/2024',
    nextDueDate: '31/05/2024',
    daysRemaining: 16,
    status: 'a_jour'
  },
  {
    id: 'sub-02',
    contractRef: 'ABO-2024-0199',
    memberId: 'mbr-0089',
    memberName: 'RAMANANTSOA Andry Thierry',
    vehiclePlate: '1209 TBH',
    vehicleModel: 'Honda PCX 150',
    siteId: 'S1',
    tariffType: 'Abonnement Mensuel Deux-Roues',
    monthlyAmountAr: 40000,
    startDate: '01/05/2024',
    endDate: '31/05/2024',
    nextDueDate: '31/05/2024',
    daysRemaining: 16,
    status: 'a_jour'
  },
  {
    id: 'sub-03',
    contractRef: 'ABO-2024-0205',
    memberId: 'mbr-0104',
    memberName: 'RAZAFINDRABE Bakoly',
    vehiclePlate: '8912 WWT',
    vehicleModel: 'Peugeot 3008',
    siteId: 'S2',
    tariffType: 'Placement Libre Intérieur',
    monthlyAmountAr: 120000,
    startDate: '01/05/2024',
    endDate: '31/05/2024',
    nextDueDate: '31/05/2024',
    daysRemaining: 16,
    status: 'a_jour'
  },
  {
    id: 'sub-04',
    contractRef: 'ABO-2024-0155',
    memberId: 'mbr-0941',
    memberName: 'ANDRIAMBOLOLONA Haja',
    vehiclePlate: '1104 PMM',
    vehicleModel: 'Renault Duster',
    siteId: 'S1',
    tariffType: 'Résident Nuit',
    monthlyAmountAr: 120000,
    startDate: '01/04/2024',
    endDate: '30/04/2024',
    nextDueDate: '10/05/2024',
    daysRemaining: -5,
    status: 'en_retard'
  }
];

export const initialReceipts: PaymentReceipt[] = [
  {
    id: 'rec-01',
    receiptNumber: 'REC-2024-0512',
    dateTime: '02/05/2024 09:14',
    memberId: 'mbr-0089',
    memberName: 'RAMANANTSOA Andry Thierry',
    vehiclePlate: '6543 TBD / 1209 TBH',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    purpose: 'Abonnement Mai 2024 (VL Libre 120 000 + Moto 40 000)',
    period: '01/05/2024 - 31/05/2024',
    amountDueAr: 160000,
    amountPaidAr: 160000,
    remainingBalanceAr: 0,
    paymentMethod: 'MVola',
    cashierName: 'RASOANAIVO Mirana',
    transactionRef: 'TRX-99214-MVOLA',
    status: 'confirme'
  },
  {
    id: 'rec-02',
    receiptNumber: 'REC-2024-0402',
    dateTime: '03/04/2024 14:28',
    memberId: 'mbr-0089',
    memberName: 'RAMANANTSOA Andry Thierry',
    vehiclePlate: '6543 TBD',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    purpose: 'Abonnement Avril 2024 (VL + Moto)',
    period: '01/04/2024 - 30/04/2024',
    amountDueAr: 160000,
    amountPaidAr: 160000,
    remainingBalanceAr: 0,
    paymentMethod: 'Espèces',
    cashierName: 'RAZAFINDRAKOTO P.',
    transactionRef: 'ES-C1-8841',
    status: 'confirme'
  },
  {
    id: 'rec-03',
    receiptNumber: 'REC-2024-8492',
    dateTime: '15/05/2024 14:38',
    memberId: 'mbr-0089',
    memberName: 'Raveloson Thierry',
    vehiclePlate: '5421 TAB',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    purpose: 'Stationnement Forfaitaire Mensuel',
    period: 'Mai 2024',
    amountDueAr: 150000,
    amountPaidAr: 150000,
    remainingBalanceAr: 0,
    paymentMethod: 'MVola',
    cashierName: 'RASOANAIVO Mirana',
    transactionRef: 'TRX-84920-MV',
    status: 'confirme'
  },
  {
    id: 'rec-04',
    receiptNumber: 'REC-2024-8491',
    dateTime: '15/05/2024 14:15',
    memberId: 'mbr-0104',
    memberName: 'Andria Corp',
    vehiclePlate: '9012 WWT',
    siteId: 'S2',
    siteName: 'Site 02 - Ankorondrano Business',
    purpose: 'Pass Journalier Flotte',
    period: '15/05/2024',
    amountDueAr: 40000,
    amountPaidAr: 40000,
    remainingBalanceAr: 0,
    paymentMethod: 'Espèces',
    cashierName: 'RAKOTOMALALA Sitraka',
    transactionRef: 'ES-C2-4011',
    status: 'confirme'
  },
  {
    id: 'rec-05',
    receiptNumber: 'REC-2024-8490',
    dateTime: '15/05/2024 13:52',
    memberId: 'mbr-0104',
    memberName: 'Razafy Marc',
    vehiclePlate: '1289 TBG',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    purpose: 'Abonnement Trimestriel Véhicule Pro',
    period: 'T2 2024',
    amountDueAr: 250000,
    amountPaidAr: 250000,
    remainingBalanceAr: 0,
    paymentMethod: 'Orange Money',
    cashierName: 'RASOANAIVO Mirana',
    transactionRef: 'OM-99014',
    status: 'confirme'
  }
];

export const initialCards: MembershipCard[] = [
  {
    id: 'crd-01',
    cardNumber: 'CRD-9981-ANL',
    memberId: 'mbr-0089',
    memberName: 'RAMANANTSOA Andry Thierry',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    primaryPlate: '6543 TBD',
    secondaryPlate: '1209 TBH',
    issuedDate: '12/01/2023',
    expirationDate: '31/12/2024',
    rfidTag: '#TAG-4482-PMM',
    nfcChipType: 'MIFARE DESFire EV3 (NTAG216)',
    qrToken: 'uuid:e8f9-4b12-98a0-22c3',
    status: 'actif',
    lastPassageTimestamp: '15/05/2024 08:24',
    lastPassageGate: 'Porte 1 Analakely (Entrée)'
  },
  {
    id: 'crd-02',
    cardNumber: 'CRD-8912-ANK',
    memberId: 'mbr-0104',
    memberName: 'RAZAFINDRABE Bakoly',
    siteId: 'S2',
    siteName: 'Site 02 - Ankorondrano Business',
    primaryPlate: '8912 WWT',
    issuedDate: '15/02/2023',
    expirationDate: '31/12/2024',
    rfidTag: '#TAG-8912-PMM',
    nfcChipType: 'NTAG216 (888 Bytes)',
    qrToken: 'uuid:b401-11cd-89fa-77aa',
    status: 'actif',
    lastPassageTimestamp: '14/05/2024 18:40',
    lastPassageGate: 'Barrière Entrée Ankorondrano'
  },
  {
    id: 'crd-03',
    cardNumber: 'CRD-1104-ANL',
    memberId: 'mbr-0941',
    memberName: 'ANDRIAMBOLOLONA Haja',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    primaryPlate: '1104 PMM',
    issuedDate: '04/05/2022',
    expirationDate: '31/05/2024',
    rfidTag: '#TAG-1104-PMM',
    nfcChipType: 'NTAG216',
    qrToken: 'uuid:c992-0041-33da-12bb',
    status: 'a_renouveler',
    lastPassageTimestamp: '14/05/2024 22:10',
    lastPassageGate: 'Porte 2 Analakely'
  },
  {
    id: 'crd-04',
    cardNumber: 'CRD-0321-BLK',
    memberId: 'mbr-0442',
    memberName: 'RAKOTO Jean-Luc',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    primaryPlate: '0321 PMM',
    issuedDate: '10/08/2022',
    expirationDate: '31/12/2024',
    rfidTag: '#TAG-0321-PMM',
    nfcChipType: 'NTAG216',
    qrToken: 'uuid:dd88-1102-ff55-90ab',
    status: 'bloquee_perdue',
    lastPassageTimestamp: '12/05/2024 11:00',
    lastPassageGate: 'Refus Barrière (Perdue)'
  },
  {
    id: 'crd-05',
    cardNumber: 'CRD-7719-IVA',
    memberId: 'mbr-0312',
    memberName: 'RANDRIANASOLO Rivo',
    siteId: 'S3',
    siteName: 'Site 03 - Ivato Aéroport Hub',
    primaryPlate: '7719 TAB',
    issuedDate: '02/01/2024',
    expirationDate: '31/12/2024',
    rfidTag: '#TAG-7719-PMM',
    nfcChipType: 'NTAG216',
    qrToken: 'uuid:a190-2443-88bb-6611',
    status: 'actif',
    lastPassageTimestamp: '15/05/2024 07:15',
    lastPassageGate: 'Barrière Ivato (Sortie 02)'
  }
];

export const initialGuards: GuardPersonnel[] = [
  // --- BRIGADE ALPHA (Site 01 - Analakely Central / Matin) : 1 Chef + 3 Gardiens aux ordres ---
  {
    id: 'grd-001',
    matricule: 'GRD-2024-001',
    fullName: 'Rasoanaivo Jean',
    title: 'Chef de Poste Nord & Barrière B1',
    grade: 'Chef de Brigade Assermenté',
    siteId: 'S1',
    teamId: 'team-s1-alpha',
    teamName: 'Brigade Alpha (Site 01 - Matin)',
    isTeamLeader: true,
    rankOrder: 1,
    ordersOfTheDay: [
      'Contrôle visuel systématique des badges PVC à l\'entrée',
      'Interdiction stricte de stationnement en zone de refoulement B-03',
      'Assurer la relève de midi avec la Brigade de transition à 13h55'
    ],
    shiftHours: '06h-14h',
    shiftName: 'Matin',
    status: 'en_poste',
    phoneFlotte: '+261 34 88 901 23',
    cin: '101 241 089 312',
    residenceLot: 'Lot IVG 12 Antohomadinika',
    recruitmentDate: '15 Mars 2021',
    badgeRfid: '#RF-9941',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-04', designation: 'Talkie Baofeng Pro VHF' },
      { inventoryCode: 'MAT-BAR-02', designation: 'Télécommande Master Barrière B1' },
      { inventoryCode: 'MAT-CLE-11', designation: 'Trousseau Clés Armoire Sécurité' },
      { inventoryCode: 'DOT-UNI-24', designation: 'Uniforme Haute Visibilité 2024' }
    ],
    shiftDays: { mon: '06-14', tue: '06-14', wed: '06-14', thu: '06-14', fri: '06-14', sat: 'REPOS', sun: 'REPOS' },
    todayLog: [
      { time: '05h55', type: 'prise_service', title: 'Prise de service validée', notes: 'Scan badge RFID. Inspection du poste et prise de commandement de la Brigade Alpha.' },
      { time: '08h30', type: 'ronde', title: 'Tournée de vérification Zone A & B', notes: 'Ronde effectuée avec le gardien Haja. 48 véhicules en place, aucun obstacle sur issues.' },
      { time: '10h14', type: 'incident_resolu', title: 'Incident régularisé', notes: 'Contrôle infraction B-03 traité avec quittance.' }
    ]
  },
  {
    id: 'grd-002',
    matricule: 'GRD-2024-002',
    fullName: 'Rakotoarisoa Haja',
    title: 'Contrôleur Barrière Entrée B1',
    grade: 'Garde de faction',
    siteId: 'S1',
    teamId: 'team-s1-alpha',
    teamName: 'Brigade Alpha (Site 01 - Matin)',
    isTeamLeader: false,
    teamLeaderId: 'grd-001',
    teamLeaderName: 'Rasoanaivo Jean',
    rankOrder: 2,
    shiftHours: '06h-14h',
    shiftName: 'Matin',
    status: 'en_poste',
    phoneFlotte: '+261 34 88 901 27',
    cin: '101 445 789 221',
    residenceLot: 'Lot II A 24 Anjanahary',
    recruitmentDate: '10 Janvier 2023',
    badgeRfid: '#RF-8822',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-05', designation: 'Talkie Baofeng UV-5R' },
      { inventoryCode: 'DOT-LAM-02', designation: 'Torche Tactique LED' }
    ],
    shiftDays: { mon: '06-14', tue: '06-14', wed: '06-14', thu: '06-14', fri: '06-14', sat: 'REPOS', sun: 'REPOS' },
    todayLog: [
      { time: '06h00', type: 'prise_service', title: 'Prise de faction', notes: 'Aux ordres du Chef Rasoanaivo Jean. Poste barrière B1 actif.' }
    ]
  },
  {
    id: 'grd-003',
    matricule: 'GRD-2024-003',
    fullName: 'Andriamandrato Faly',
    title: 'Agent Guidage & Circulation Voie Intérieure',
    grade: 'Garde de faction',
    siteId: 'S1',
    teamId: 'team-s1-alpha',
    teamName: 'Brigade Alpha (Site 01 - Matin)',
    isTeamLeader: false,
    teamLeaderId: 'grd-001',
    teamLeaderName: 'Rasoanaivo Jean',
    rankOrder: 3,
    shiftHours: '06h-14h',
    shiftName: 'Matin',
    status: 'en_poste',
    phoneFlotte: '+261 34 88 901 28',
    cin: '101 556 123 459',
    residenceLot: 'Lot III B 15 Isotry',
    recruitmentDate: '01 Septembre 2023',
    badgeRfid: '#RF-8823',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-06', designation: 'Talkie Baofeng UV-5R' },
      { inventoryCode: 'DOT-BAT-01', designation: 'Bâton Lumineux de Trafic' }
    ],
    shiftDays: { mon: '06-14', tue: '06-14', wed: '06-14', thu: '06-14', fri: '06-14', sat: 'REPOS', sun: 'REPOS' },
    todayLog: [
      { time: '06h05', type: 'prise_service', title: 'Affectation guidage', notes: 'Ordre reçu du chef de poste : régulation fluide des accès Matin.' }
    ]
  },
  {
    id: 'grd-004',
    matricule: 'GRD-2024-004',
    fullName: 'Razafy Tojo',
    title: 'Contrôleur Barrière Sortie B2 & Reçus',
    grade: 'Garde de faction',
    siteId: 'S1',
    teamId: 'team-s1-alpha',
    teamName: 'Brigade Alpha (Site 01 - Matin)',
    isTeamLeader: false,
    teamLeaderId: 'grd-001',
    teamLeaderName: 'Rasoanaivo Jean',
    rankOrder: 4,
    shiftHours: '06h-14h',
    shiftName: 'Matin',
    status: 'en_poste',
    phoneFlotte: '+261 34 88 901 29',
    cin: '101 778 901 345',
    residenceLot: 'Lot VT 32 Mandroseza',
    recruitmentDate: '15 Février 2024',
    badgeRfid: '#RF-8824',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-07', designation: 'Talkie Baofeng UV-5R' }
    ],
    shiftDays: { mon: '06-14', tue: '06-14', wed: '06-14', thu: '06-14', fri: '06-14', sat: 'REPOS', sun: 'REPOS' },
    todayLog: [
      { time: '06h00', type: 'prise_service', title: 'Poste sortie B2', notes: 'Vérification scan tickets sortants et quittances.' }
    ]
  },

  // --- BRIGADE BRAVO (Site 01 - Analakely Central / Nuit) : 1 Chef + 2 Gardiens aux ordres ---
  {
    id: 'grd-005',
    matricule: 'GRD-2024-005',
    fullName: 'Ravalison Eric',
    title: 'Chef de Poste Nuit Analakely',
    grade: 'Chef de Brigade Nuit',
    siteId: 'S1',
    teamId: 'team-s1-bravo',
    teamName: 'Brigade Bravo (Site 01 - Nuit)',
    isTeamLeader: true,
    rankOrder: 1,
    ordersOfTheDay: [
      'Verrouillage des portails secondaires à 22h00 précises',
      'Rondes nocturnes toutes les 45 minutes en binôme',
      'Contrôle d\'éclairage des projecteurs LED périmétriques'
    ],
    shiftHours: '22h-06h',
    shiftName: 'Nuit',
    status: 'de_repos',
    phoneFlotte: '+261 34 88 901 35',
    cin: '101 112 334 556',
    residenceLot: 'Lot IVC 99 Ambodivona',
    recruitmentDate: '01 Novembre 2021',
    badgeRfid: '#RF-6010',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-08', designation: 'Poste Radio fixe vigie' },
      { inventoryCode: 'DOT-PRJ-01', designation: 'Projecteur Torche Rechargeable 2000lm' }
    ],
    shiftDays: { mon: '22-06', tue: '22-06', wed: '22-06', thu: '22-06', fri: '22-06', sat: 'REPOS', sun: 'REPOS' },
    todayLog: []
  },
  {
    id: 'grd-006',
    matricule: 'GRD-2024-006',
    fullName: 'Randrianasolo Patrick',
    title: 'Gardien Vidéosurveillance & Accès Nuit',
    grade: 'Garde de faction',
    siteId: 'S1',
    teamId: 'team-s1-bravo',
    teamName: 'Brigade Bravo (Site 01 - Nuit)',
    isTeamLeader: false,
    teamLeaderId: 'grd-005',
    teamLeaderName: 'Ravalison Eric',
    rankOrder: 2,
    shiftHours: '22h-06h',
    shiftName: 'Nuit',
    status: 'de_repos',
    phoneFlotte: '+261 34 88 901 31',
    cin: '101 112 908 433',
    residenceLot: 'Lot IVC 88 Andravoahangy',
    recruitmentDate: '01 Juin 2022',
    badgeRfid: '#RF-6019',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-CAM-01', designation: 'Moniteur Surveillance DVR 16 voies' }
    ],
    shiftDays: { mon: '22-06', tue: '22-06', wed: '22-06', thu: '22-06', fri: '22-06', sat: 'REPOS', sun: 'REPOS' },
    todayLog: []
  },
  {
    id: 'grd-007',
    matricule: 'GRD-2024-007',
    fullName: 'Rabehasina Claude',
    title: 'Agent Rondier Nuit & Issues de Secours',
    grade: 'Garde de faction',
    siteId: 'S1',
    teamId: 'team-s1-bravo',
    teamName: 'Brigade Bravo (Site 01 - Nuit)',
    isTeamLeader: false,
    teamLeaderId: 'grd-005',
    teamLeaderName: 'Ravalison Eric',
    rankOrder: 3,
    shiftHours: '22h-06h',
    shiftName: 'Nuit',
    status: 'de_repos',
    phoneFlotte: '+261 34 88 901 36',
    cin: '101 667 112 890',
    residenceLot: 'Lot VA 14 Ambohimanarina',
    recruitmentDate: '15 Juillet 2023',
    badgeRfid: '#RF-6022',
    avatarUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'DOT-BAT-02', designation: 'Torche Tactique LED' }
    ],
    shiftDays: { mon: '22-06', tue: '22-06', wed: '22-06', thu: '22-06', fri: '22-06', sat: 'REPOS', sun: 'REPOS' },
    todayLog: []
  },

  // --- BRIGADE DELTA (Site 02 - Ankorondrano Business) : 1 Chef + 2 Gardiens aux ordres ---
  {
    id: 'grd-008',
    matricule: 'GRD-2024-008',
    fullName: 'Rakotondrasoa Michel',
    title: 'Chef de Poste Ankorondrano Business',
    grade: 'Chef de Brigade Site',
    siteId: 'S2',
    teamId: 'team-s2-delta',
    teamName: 'Brigade Delta (Site 02 - Ankorondrano)',
    isTeamLeader: true,
    rankOrder: 1,
    ordersOfTheDay: [
      'Priorité aux flux des entreprises et commerces Galaxy Waterfront',
      'Surveillance stricte des zones réservées Direction',
      'Pointage des badges corporate par borne sans contact'
    ],
    shiftHours: '07h-17h',
    shiftName: 'Matin',
    status: 'en_poste',
    phoneFlotte: '+261 34 88 901 50',
    cin: '101 223 445 667',
    residenceLot: 'Lot II M 45 Ankorondrano',
    recruitmentDate: '10 Août 2021',
    badgeRfid: '#RF-7001',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-10', designation: 'Talkie Baofeng Pro' },
      { inventoryCode: 'MAT-BAR-03', designation: 'Pupitre Commande Barrières S2' }
    ],
    shiftDays: { mon: '07-17', tue: '07-17', wed: '07-17', thu: '07-17', fri: '07-17', sat: 'REPOS', sun: 'REPOS' },
    todayLog: [
      { time: '06h50', type: 'prise_service', title: 'Prise de poste Ankorondrano', notes: 'Inspection des 180 emplacements. Taux d\'occupation initial : 25%.' }
    ]
  },
  {
    id: 'grd-009',
    matricule: 'GRD-2024-009',
    fullName: 'Raharison Paul',
    title: 'Contrôleur Barrières & Flux Corporate',
    grade: 'Garde de faction',
    siteId: 'S2',
    teamId: 'team-s2-delta',
    teamName: 'Brigade Delta (Site 02 - Ankorondrano)',
    isTeamLeader: false,
    teamLeaderId: 'grd-008',
    teamLeaderName: 'Rakotondrasoa Michel',
    rankOrder: 2,
    shiftHours: '07h-17h',
    shiftName: 'Matin',
    status: 'en_poste',
    phoneFlotte: '+261 34 88 901 51',
    cin: '101 445 667 889',
    residenceLot: 'Lot II G 12 Alarobia',
    recruitmentDate: '01 Mars 2023',
    badgeRfid: '#RF-7002',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-11', designation: 'Talkie Baofeng UV-5R' }
    ],
    shiftDays: { mon: '07-17', tue: '07-17', wed: '07-17', thu: '07-17', fri: '07-17', sat: 'REPOS', sun: 'REPOS' },
    todayLog: [
      { time: '07h00', type: 'prise_service', title: 'Faction barrière', notes: 'Aux ordres du Chef Michel. Barrière entrée fluide.' }
    ]
  },
  {
    id: 'grd-010',
    matricule: 'GRD-2024-010',
    fullName: 'Rajaona Tahina',
    title: 'Agent Ronde Allées & Deux-Roues S2',
    grade: 'Garde de faction',
    siteId: 'S2',
    teamId: 'team-s2-delta',
    teamName: 'Brigade Delta (Site 02 - Ankorondrano)',
    isTeamLeader: false,
    teamLeaderId: 'grd-008',
    teamLeaderName: 'Rakotondrasoa Michel',
    rankOrder: 3,
    shiftHours: '07h-17h',
    shiftName: 'Matin',
    status: 'en_poste',
    phoneFlotte: '+261 34 88 901 52',
    cin: '101 889 001 223',
    residenceLot: 'Lot III F 77 Tanjombato',
    recruitmentDate: '15 Mai 2023',
    badgeRfid: '#RF-7003',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-12', designation: 'Talkie Baofeng UV-5R' }
    ],
    shiftDays: { mon: '07-17', tue: '07-17', wed: '07-17', thu: '07-17', fri: '07-17', sat: 'REPOS', sun: 'REPOS' },
    todayLog: []
  },

  // --- BRIGADE ECHO (Site 03 - Ivato Aéroport Hub / 24/7) : 1 Chef + 2 Gardiens aux ordres ---
  {
    id: 'grd-011',
    matricule: 'GRD-2024-011',
    fullName: 'Ranaivojaona Bruno',
    title: 'Chef de Poste Ivato Aéroport Hub',
    grade: 'Chef de Brigade Aéroportuaire',
    siteId: 'S3',
    teamId: 'team-s3-echo',
    teamName: 'Brigade Echo (Site 03 - Ivato Hub)',
    isTeamLeader: true,
    rankOrder: 1,
    ordersOfTheDay: [
      'Application protocole sûreté aéroportuaire CUA/ACM',
      'Vérification des véhicules stationnés en longue durée',
      'Interdiction de tout stationnement sauvage sur voie de dépose-minute'
    ],
    shiftHours: '06h-18h',
    shiftName: 'Matin',
    status: 'en_poste',
    phoneFlotte: '+261 34 88 901 70',
    cin: '101 991 223 445',
    residenceLot: 'Lot PR 12 Ivato Aéroport',
    recruitmentDate: '01 Décembre 2020',
    badgeRfid: '#RF-8001',
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-15', designation: 'Poste Radio Bande Aviation/Sûreté' },
      { inventoryCode: 'MAT-BAR-04', designation: 'Pupitre Télécommande Voie Longue Durée' }
    ],
    shiftDays: { mon: '06-18', tue: '06-18', wed: 'REPOS', thu: '06-18', fri: '06-18', sat: '06-18', sun: 'REPOS' },
    todayLog: [
      { time: '05h50', type: 'prise_service', title: 'Prise de commandement Ivato Hub', notes: 'Contrôle barrière et registre des 52 véhicules longue durée.' }
    ]
  },
  {
    id: 'grd-012',
    matricule: 'GRD-2024-012',
    fullName: 'Ramiaramanana Kevin',
    title: 'Contrôleur d\'accès Voie Dépose-Minute',
    grade: 'Garde de faction',
    siteId: 'S3',
    teamId: 'team-s3-echo',
    teamName: 'Brigade Echo (Site 03 - Ivato Hub)',
    isTeamLeader: false,
    teamLeaderId: 'grd-011',
    teamLeaderName: 'Ranaivojaona Bruno',
    rankOrder: 2,
    shiftHours: '06h-18h',
    shiftName: 'Matin',
    status: 'en_poste',
    phoneFlotte: '+261 34 88 901 71',
    cin: '101 329 881 772',
    residenceLot: 'Lot PR 40 Ivato Aéroport',
    recruitmentDate: '01 Mars 2024',
    badgeRfid: '#RF-8002',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-16', designation: 'Talkie Baofeng UV-5R' }
    ],
    shiftDays: { mon: '06-18', tue: '06-18', wed: 'REPOS', thu: '06-18', fri: '06-18', sat: '06-18', sun: 'REPOS' },
    todayLog: [
      { time: '06h00', type: 'prise_service', title: 'Faction dépose-minute', notes: 'Ordre du Chef Bruno reçu : fluidité stricte des dépose-minute.' }
    ]
  },
  {
    id: 'grd-013',
    matricule: 'GRD-2024-013',
    fullName: 'Razanakoto Lova',
    title: 'Agent Surveillance Zone Longue Durée S3',
    grade: 'Garde de faction',
    siteId: 'S3',
    teamId: 'team-s3-echo',
    teamName: 'Brigade Echo (Site 03 - Ivato Hub)',
    isTeamLeader: false,
    teamLeaderId: 'grd-011',
    teamLeaderName: 'Ranaivojaona Bruno',
    rankOrder: 3,
    shiftHours: '06h-18h',
    shiftName: 'Matin',
    status: 'en_poste',
    phoneFlotte: '+261 34 88 901 72',
    cin: '101 772 334 119',
    residenceLot: 'Lot AK 18 Talatamaty',
    recruitmentDate: '15 Novembre 2023',
    badgeRfid: '#RF-8003',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    assignedEquipments: [
      { inventoryCode: 'MAT-RAD-17', designation: 'Talkie Baofeng UV-5R' },
      { inventoryCode: 'DOT-BAT-03', designation: 'Torche Tactique LED' }
    ],
    shiftDays: { mon: '06-18', tue: '06-18', wed: 'REPOS', thu: '06-18', fri: '06-18', sat: '06-18', sun: 'REPOS' },
    todayLog: []
  }
];


export const initialEquipments: Equipment[] = [
  {
    id: 'equip-01',
    inventoryCode: 'MAT-BAR-002',
    designation: 'Barrière levante CAME G4000 (B-02)',
    category: 'barriers',
    modelSpecs: 'S/N: CM-4099-MG • Moteur 24V DC / 230V + Onduleur APC',
    siteId: 'S1',
    location: 'Voie Sortie #2 Analakely',
    status: 'maintenance',
    quantity: 1,
    responsibleName: 'Socatana SARL (Prestataire)',
    commissioningDate: '12/01/2023',
    estimatedValueAr: 6800000,
    totalCycles: '142 890 ouv.',
    lastAuditDate: '14/05/2024',
    maintenanceHistory: [
      {
        date: '14/05/2024',
        title: 'Diagnostic défaut boucle voie B',
        description: 'Contrôleur de spire en court-circuit intermittent suite à orage.',
        isCritical: true
      },
      {
        date: '15/02/2024',
        title: 'Maintenance Préventive Q1',
        description: 'Graissage réducteur, tension ressort d\'équilibrage et nettoyage cellule IR.'
      },
      {
        date: '10/11/2023',
        title: 'Remplacement batterie secours',
        description: 'Installation bloc batterie gel 12V 7Ah pour continuité sans coupure.'
      }
    ]
  },
  {
    id: 'equip-02',
    inventoryCode: 'MAT-CAM-008',
    designation: 'Caméra LPR Hikvision 4K DeepinView',
    category: 'barriers',
    modelSpecs: 'iDS-2CD7A46G0/P-IZHS • PoE IP67 4K Lecture Plaques',
    siteId: 'S1',
    location: 'Mât Entrée #1 Analakely',
    status: 'operationnel',
    quantity: 1,
    responsibleName: 'Razafy Marc (Admin IT)',
    commissioningDate: '04/03/2023',
    estimatedValueAr: 4200000,
    totalCycles: '320 110 lectures',
    lastAuditDate: '10/05/2024',
    maintenanceHistory: [
      {
        date: '10/05/2024',
        title: 'Calibrage reconnaissance optique OCR',
        description: 'Taux de détection plaques malgaches validé à 98.4% de jour et 96.1% de nuit.'
      }
    ]
  },
  {
    id: 'equip-03',
    inventoryCode: 'MAT-RAD-004',
    designation: 'Talkie-Walkie VHF/UHF Baofeng UV-5R',
    category: 'assigned',
    modelSpecs: 'Poste mobile bi-bande canal Ch-04 Sécu • Batterie 1800mAh',
    siteId: 'S1',
    location: 'Poste Vigie Sud Analakely',
    status: 'operationnel',
    quantity: 1,
    responsibleName: 'Rasoanaivo Jean (Chef Poste)',
    commissioningDate: '19/08/2023',
    estimatedValueAr: 350000,
    lastAuditDate: '12/05/2024',
    maintenanceHistory: []
  },
  {
    id: 'equip-04',
    inventoryCode: 'MAT-EXT-012',
    designation: 'Extincteur à Poudre Polyvalente ABC 6kg',
    category: 'security',
    modelSpecs: 'NF-EN3 • Pression permanente gaz propulseur azote',
    siteId: 'S2',
    location: 'Zone Couverte B Ankorondrano',
    status: 'controle_requis',
    quantity: 1,
    responsibleName: 'Andria Patrick (Resp QSE)',
    commissioningDate: '01/06/2022',
    estimatedValueAr: 280000,
    lastAuditDate: '01/06/2023',
    maintenanceHistory: [
      {
        date: '01/06/2023',
        title: 'Vérification annuelle obligatoire',
        description: 'Plombage et manomètre en zone verte vérifiés.'
      }
    ]
  },
  {
    id: 'equip-05',
    inventoryCode: 'MAT-POS-003',
    designation: 'Terminal TPE Mobile Money POS Sunmi V2',
    category: 'monetique',
    modelSpecs: 'Android 4G Telma/Airtel + Imprimante thermique 58mm',
    siteId: 'S3',
    location: 'Guichet Express 1 Ivato Hub',
    status: 'operationnel',
    quantity: 1,
    responsibleName: 'Rakotomalala Sitraka (Caissière)',
    commissioningDate: '15/10/2023',
    estimatedValueAr: 1450000,
    lastAuditDate: '08/05/2024',
    maintenanceHistory: []
  },
  {
    id: 'equip-06',
    inventoryCode: 'MAT-LOR-001',
    designation: 'Passerelle LoRaWAN Kerlink Wirnet iStation',
    category: 'telecom',
    modelSpecs: 'Concentrateur 868MHz capteurs solaires • PoE 48V',
    siteId: 'S1',
    location: 'Toit Cabine Tech Analakely',
    status: 'operationnel',
    quantity: 1,
    responsibleName: 'Service Réseau Superviseur Tana',
    commissioningDate: '05/02/2023',
    estimatedValueAr: 3200000,
    lastAuditDate: '02/05/2024',
    maintenanceHistory: []
  }
];

export const initialExpenses: ExpenseRecord[] = [
  {
    id: 'dep-01',
    expenseNumber: 'DEP-2024-0118',
    date: '14/05/2024',
    siteId: 'S2',
    category: 'Carburant Groupe',
    description: 'Achat 60 litres gasoil groupe électrogène de secours lors des coupures JIRAMA.',
    beneficiary: 'Station TotalEnergies Ankorondrano',
    amountAr: 450000,
    paymentMethod: 'Espèces',
    requesterName: 'Randriamifidimanana Jean',
    status: 'en_attente',
    justificatifRef: 'FAC-TOTAL-8812'
  },
  {
    id: 'dep-02',
    expenseNumber: 'DEP-2024-0112',
    date: '08/05/2024',
    siteId: 'S1',
    category: 'Entretien & Nettoyage',
    description: 'Produits dégraissants industriels pour nettoyage voies d\'accès et caniveaux.',
    beneficiary: 'Quincaillerie Centrale Analakely',
    amountAr: 185000,
    paymentMethod: 'Espèces',
    requesterName: 'Rasoanaivo Jean',
    approverName: 'Rasoanaivo Mirana (Trésorière)',
    status: 'approuve',
    justificatifRef: 'REC-QC-1194'
  },
  {
    id: 'dep-03',
    expenseNumber: 'DEP-2024-0098',
    date: '02/05/2024',
    siteId: 'S1',
    category: 'Fournitures Caisse',
    description: 'Lot de 50 bobines thermiques 58mm pour bornes tickets et TPE.',
    beneficiary: 'Papeterie Papmad Tana Renivohitra',
    amountAr: 120000,
    paymentMethod: 'MVola',
    requesterName: 'Razafindrakoto Fara',
    approverName: 'Rasoanaivo Mirana (Trésorière)',
    status: 'approuve',
    justificatifRef: 'PAPMAD-INV-992'
  }
];

export const initialIncidents: IncidentRecord[] = [
  {
    id: 'inc-01',
    ticketCode: 'INC-2024-0042',
    date: '14/05/2024 16:30',
    siteId: 'S1',
    reporterName: 'Rasoanaivo Jean',
    type: 'materiel',
    severity: 'eleve',
    title: 'Défaillance boucle magnétique Barrière B2 Sortie',
    description: 'La spire magnétique sous chaussée de la barrière de sortie ne détecte plus la masse métallique du véhicule. Passage mis en mode manuel avec gardien.',
    assignedTo: 'Socatana SARL (Technicien)',
    resolutionStatus: 'en_cours',
    resolutionNotes: 'Intervention planifiée le 16 Mai 2024 à 09h00.'
  },
  {
    id: 'inc-02',
    ticketCode: 'INC-2024-0041',
    date: '15/05/2024 10:14',
    siteId: 'S1',
    reporterName: 'Rakotoarisoa Haja',
    type: 'stationnement_illicite',
    severity: 'moyen',
    title: 'Véhicule stationné hors emplacement en zone de refoulement B-03',
    description: 'Véhicule Peugeot non abonné stationné devant l\'issue de secours. Contact propriétaire établi et encaissement immédiat du forfait d\'infraction.',
    assignedTo: 'Rasoanaivo Jean',
    resolutionStatus: 'resolu',
    resolutionNotes: 'Véhicule déplacé et reçu #88142 régularisé.',
    resolvedAt: '15/05/2024 10:45'
  },
  {
    id: 'inc-03',
    ticketCode: 'INC-2024-0039',
    date: '12/05/2024 10:50',
    siteId: 'S1',
    reporterName: 'RAKOTO Jean-Luc (Membre)',
    type: 'securite',
    severity: 'moyen',
    title: 'Déclaration perte de carte d\'accès PVC RFID',
    description: 'Le titulaire a déclaré la perte de sa carte CRD-0321-BLK. Mise en opposition immédiate pour éviter tout franchissement frauduleux.',
    assignedTo: 'Razafindrakoto Fara',
    resolutionStatus: 'resolu',
    resolutionNotes: 'Carte révoquée dans la base de données. Nouveau duplicata préparé.',
    resolvedAt: '12/05/2024 11:15'
  }
];

export const initialCommitteeMembers: CommitteeMember[] = [
  {
    id: 'com-01',
    role: 'President General',
    fullName: 'Rajaonarison Hery',
    phone: '+261 34 02 111 01',
    email: 'president.general@parking-mada.mg',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    monthlyIndemnityAr: 750000,
    mandateStart: '01/01/2023',
    mandateEnd: '31/12/2025',
    status: 'actif'
  },
  {
    id: 'com-02',
    role: 'Vice President',
    fullName: 'Andriamahitsy Solo',
    phone: '+261 34 11 223 34',
    email: 'vice.president@parking-mada.mg',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    monthlyIndemnityAr: 500000,
    mandateStart: '01/01/2023',
    mandateEnd: '31/12/2025',
    status: 'actif'
  },
  {
    id: 'com-03',
    role: 'President Site',
    fullName: 'Randriamifidimanana Jean',
    siteId: 'S2',
    phone: '+261 34 02 222 02',
    email: 'president.s2@parking-mada.mg',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    monthlyIndemnityAr: 460000,
    mandateStart: '01/01/2023',
    mandateEnd: '31/12/2025',
    status: 'actif'
  },
  {
    id: 'com-04',
    role: 'Tresorier General',
    fullName: 'Rasoanaivo Mirana',
    phone: '+261 34 88 901 24',
    email: 'tresorier.general@parking-mada.mg',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    monthlyIndemnityAr: 620000,
    mandateStart: '01/01/2023',
    mandateEnd: '31/12/2025',
    status: 'actif'
  },
  {
    id: 'com-05',
    role: 'Secretaire General',
    fullName: 'Razafindrakoto Fara',
    phone: '+261 34 12 888 99',
    email: 'secretaire@parking-mada.mg',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    monthlyIndemnityAr: 450000,
    mandateStart: '01/01/2023',
    mandateEnd: '31/12/2025',
    status: 'actif'
  },
  {
    id: 'com-06',
    role: 'Controleur de Gestion',
    fullName: 'Ratsimbazafy Fidy',
    phone: '+261 34 02 333 03',
    email: 'controleur@parking-mada.mg',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    monthlyIndemnityAr: 450000,
    mandateStart: '01/01/2023',
    mandateEnd: '31/12/2025',
    status: 'actif'
  }
];

export const initialMeetings: GovernanceMeeting[] = [
  {
    id: 'meet-01',
    date: '28/04/2024',
    title: 'Assemblée Générale Ordinaire & Approbation des Comptes T1 2024',
    location: 'Salle de réunion Hôtel de Ville Analakely',
    agenda: 'Rapport moral du Président, Bilan financier du Trésorier Général, Décision sur le tarif privatif extérieur à 180 000 Ar, Plan d\'équipement barrières Ivato.',
    summaryPV: 'Quorum atteint à 92%. Approbation des comptes de trésorerie sans réserve. Validation de la règle : placement intérieur libre et non privatif (120 000 Ar/m) vs emplacement privatif dédié sur voirie (180 000 Ar/m).',
    resolutionsCount: 4
  },
  {
    id: 'meet-02',
    date: '15/02/2024',
    title: 'Comité de Direction : Passation et Modernisation RFID',
    location: 'Bureau Central d\'Exploitation Analakely',
    agenda: 'Mise en place des cartes PVC sécurisées format ISO CR80 avec puces NFC/RFID NTAG216 et tokens QR chiffrés.',
    summaryPV: 'Validation de la commande des 500 cartes PVC vierges et intégration de l\'encodeur Evolis Primacy.',
    resolutionsCount: 2
  }
];

export const initialAuditLogs: AuditLogItem[] = [
  {
    id: 'aud-01',
    timestamp: '15/05/2024 14:38:12',
    userId: 'usr-admin-01',
    userName: 'Rajaonarison Hery',
    action: 'ENCAISSEMENT_VALIDE',
    siteCode: 'S1-ANALAKELY',
    module: 'Finances',
    details: 'Reçu #RC-8492 de 150 000 Ar validé par MVola pour le véhicule 5421 TAB.',
    ipAddress: '192.168.1.10'
  },
  {
    id: 'aud-02',
    timestamp: '15/05/2024 10:15:00',
    userId: 'usr-admin-01',
    userName: 'Rasoanaivo Jean',
    action: 'INCIDENT_DECLARATION',
    siteCode: 'S1-ANALAKELY',
    module: 'Sécurité',
    details: 'Déclaration panne détecteur barrière B2 sortie (#TICK-2024-089).',
    ipAddress: '192.168.1.45'
  },
  {
    id: 'aud-03',
    timestamp: '12/05/2024 11:15:30',
    userId: 'usr-admin-01',
    userName: 'Razafindrakoto Fara',
    action: 'CARTE_MISE_EN_OPPOSITION',
    siteCode: 'S1-ANALAKELY',
    module: 'Cartes Membres',
    details: 'Blocage sécurité carte CRD-0321-BLK déclarée perdue par MBR-2022-0442.',
    ipAddress: '192.168.1.22'
  }
];

// --- SEED DE LA PAIE & DES INDEMNITÉS (Mai 2024) ---
export const initialPayrolls: PayrollRecord[] = [
  // 1. Chef de Brigade Alpha (S1) - Rasoanaivo Jean
  {
    id: 'pay-001',
    slipNumber: 'PAY-2024-05-001',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'personnel',
    beneficiaryId: 'grd-001',
    beneficiaryName: 'Rasoanaivo Jean',
    roleTitle: 'Chef de Poste Nord & Barrière B1 (Brigade Alpha)',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    cin: '101 241 089 312',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'Virement BNI',
    bankAccountOrPhone: '00004 01234 11223344556 22',
    baseSalaryAr: 450000,
    responsibilityBonusAr: 80000,
    nightShiftBonusAr: 0,
    transportBonusAr: 50000,
    performanceBonusAr: 40000,
    grossSalaryAr: 620000,
    cnapsDeductionAr: 6200,
    ostieDeductionAr: 6200,
    irsaDeductionAr: 22600,
    advanceDeductionAr: 0,
    totalDeductionsAr: 35000,
    netSalaryAr: 585000,
    status: 'paye',
    generatedDate: '02/05/2024',
    approvedDate: '03/05/2024',
    paidDate: '05/05/2024',
    approverName: 'Rasoanaivo Mirana (Trésorière)',
    transactionRef: 'VIR-BNI-2024-05-9982',
    notes: 'Salaire complet viré avec prime de commandement Brigade Alpha.'
  },
  // 2. Gardien Brigade Alpha (S1) - Rakotoarisoa Haja
  {
    id: 'pay-002',
    slipNumber: 'PAY-2024-05-002',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'personnel',
    beneficiaryId: 'grd-002',
    beneficiaryName: 'Rakotoarisoa Haja',
    roleTitle: 'Contrôleur Barrière Entrée (Brigade Alpha)',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    cin: '101 445 789 221',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'MVola',
    bankAccountOrPhone: '+261 34 88 901 27',
    baseSalaryAr: 350000,
    responsibilityBonusAr: 0,
    nightShiftBonusAr: 0,
    transportBonusAr: 40000,
    performanceBonusAr: 30000,
    grossSalaryAr: 420000,
    cnapsDeductionAr: 4200,
    ostieDeductionAr: 4200,
    irsaDeductionAr: 11600,
    advanceDeductionAr: 0,
    totalDeductionsAr: 20000,
    netSalaryAr: 400000,
    status: 'paye',
    generatedDate: '02/05/2024',
    approvedDate: '03/05/2024',
    paidDate: '05/05/2024',
    approverName: 'Rasoanaivo Mirana (Trésorière)',
    transactionRef: 'MVOLA-PAY-88319',
    notes: 'Paiement effectué sur flotte MVola professionnelle.'
  },
  // 3. Gardien Brigade Alpha (S1) - Andriamandrato Faly
  {
    id: 'pay-003',
    slipNumber: 'PAY-2024-05-003',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'personnel',
    beneficiaryId: 'grd-003',
    beneficiaryName: 'Andriamandrato Faly',
    roleTitle: 'Agent Guidage & Trafic (Brigade Alpha)',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    cin: '101 556 123 459',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'MVola',
    bankAccountOrPhone: '+261 34 88 901 28',
    baseSalaryAr: 350000,
    responsibilityBonusAr: 0,
    nightShiftBonusAr: 0,
    transportBonusAr: 40000,
    performanceBonusAr: 25000,
    grossSalaryAr: 415000,
    cnapsDeductionAr: 4150,
    ostieDeductionAr: 4150,
    irsaDeductionAr: 11700,
    advanceDeductionAr: 50000,
    totalDeductionsAr: 70000,
    netSalaryAr: 345000,
    status: 'paye',
    generatedDate: '02/05/2024',
    approvedDate: '03/05/2024',
    paidDate: '05/05/2024',
    approverName: 'Rasoanaivo Mirana (Trésorière)',
    transactionRef: 'MVOLA-PAY-88320',
    notes: 'Acompte de 50 000 Ar déduit du net.'
  },
  // 4. Chef de Poste Nuit (S1) - Ravalison Eric
  {
    id: 'pay-004',
    slipNumber: 'PAY-2024-05-004',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'personnel',
    beneficiaryId: 'grd-005',
    beneficiaryName: 'Ravalison Eric',
    roleTitle: 'Chef de Poste Nuit (Brigade Bravo)',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    cin: '101 112 334 556',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'Virement BMOI',
    bankAccountOrPhone: '00005 02211 44556677889 11',
    baseSalaryAr: 450000,
    responsibilityBonusAr: 80000,
    nightShiftBonusAr: 75000,
    transportBonusAr: 50000,
    performanceBonusAr: 35000,
    grossSalaryAr: 690000,
    cnapsDeductionAr: 6900,
    ostieDeductionAr: 6900,
    irsaDeductionAr: 26200,
    advanceDeductionAr: 0,
    totalDeductionsAr: 40000,
    netSalaryAr: 650000,
    status: 'valide_tresorier',
    generatedDate: '02/05/2024',
    approvedDate: '04/05/2024',
    approverName: 'Rasoanaivo Mirana (Trésorière)',
    notes: 'Validation Trésorier effectuée, ordre de virement BMOI en attente d\'exécution.'
  },
  // 5. Chef de Poste S2 - Rakotondrasoa Michel
  {
    id: 'pay-005',
    slipNumber: 'PAY-2024-05-005',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'personnel',
    beneficiaryId: 'grd-008',
    beneficiaryName: 'Rakotondrasoa Michel',
    roleTitle: 'Chef de Poste Ankorondrano (Brigade Delta)',
    siteId: 'S2',
    siteName: 'Site 02 - Ankorondrano Business',
    cin: '101 223 445 667',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'Virement BOA',
    bankAccountOrPhone: '00008 04321 88990011223 44',
    baseSalaryAr: 450000,
    responsibilityBonusAr: 75000,
    nightShiftBonusAr: 0,
    transportBonusAr: 50000,
    performanceBonusAr: 35000,
    grossSalaryAr: 610000,
    cnapsDeductionAr: 6100,
    ostieDeductionAr: 6100,
    irsaDeductionAr: 22800,
    advanceDeductionAr: 0,
    totalDeductionsAr: 35000,
    netSalaryAr: 575000,
    status: 'paye',
    generatedDate: '02/05/2024',
    approvedDate: '03/05/2024',
    paidDate: '06/05/2024',
    approverName: 'Rasoanaivo Mirana (Trésorière)',
    transactionRef: 'VIR-BOA-2024-05-1102'
  },
  // 6. Chef de Poste S3 - Ranaivojaona Bruno
  {
    id: 'pay-006',
    slipNumber: 'PAY-2024-05-006',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'personnel',
    beneficiaryId: 'grd-011',
    beneficiaryName: 'Ranaivojaona Bruno',
    roleTitle: 'Chef de Poste Ivato Hub (Brigade Echo)',
    siteId: 'S3',
    siteName: 'Site 03 - Ivato Aéroport Hub',
    cin: '101 991 223 445',
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'Virement BNI',
    bankAccountOrPhone: '00004 01234 99001122334 55',
    baseSalaryAr: 470000,
    responsibilityBonusAr: 80000,
    nightShiftBonusAr: 50000,
    transportBonusAr: 60000,
    performanceBonusAr: 40000,
    grossSalaryAr: 700000,
    cnapsDeductionAr: 7000,
    ostieDeductionAr: 7000,
    irsaDeductionAr: 26000,
    advanceDeductionAr: 0,
    totalDeductionsAr: 40000,
    netSalaryAr: 660000,
    status: 'paye',
    generatedDate: '02/05/2024',
    approvedDate: '03/05/2024',
    paidDate: '06/05/2024',
    approverName: 'Rasoanaivo Mirana (Trésorière)',
    transactionRef: 'VIR-BNI-2024-05-9985'
  },
  // 7. Opératrice Caisse - Razafindrakoto Fara
  {
    id: 'pay-007',
    slipNumber: 'PAY-2024-05-007',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'personnel',
    beneficiaryId: 'agt-003',
    beneficiaryName: 'Razafindrakoto Fara',
    roleTitle: 'Opératrice de Caisse Principale',
    siteId: 'S1',
    siteName: 'Site 01 - Analakely Central',
    cin: '101 667 890 124',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'MVola',
    bankAccountOrPhone: '+261 34 88 901 44',
    baseSalaryAr: 380000,
    responsibilityBonusAr: 50000, // prime de caisse
    nightShiftBonusAr: 0,
    transportBonusAr: 40000,
    performanceBonusAr: 30000,
    grossSalaryAr: 500000,
    cnapsDeductionAr: 5000,
    ostieDeductionAr: 5000,
    irsaDeductionAr: 15000,
    advanceDeductionAr: 0,
    totalDeductionsAr: 25000,
    netSalaryAr: 475000,
    status: 'paye',
    generatedDate: '02/05/2024',
    approvedDate: '03/05/2024',
    paidDate: '05/05/2024',
    approverName: 'Rasoanaivo Mirana (Trésorière)',
    transactionRef: 'MVOLA-PAY-88325'
  },

  // --- MEMBRES DU BUREAU / COMITÉ DE GESTION (Indemnités statutaires) ---
  // 8. Président Général - Rajaonarison Hery
  {
    id: 'pay-008',
    slipNumber: 'PAY-2024-05-008',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'bureau',
    beneficiaryId: 'com-01',
    beneficiaryName: 'Rajaonarison Hery',
    roleTitle: 'Président Général (Comité Directeur)',
    siteId: 'GLOBAL',
    siteName: 'Direction Générale Consolidée',
    cin: '101 021 334 112',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'Virement BNI',
    bankAccountOrPhone: '00004 01234 00112233445 77',
    baseSalaryAr: 650000, // Indemnité statutaire forfaitaire
    responsibilityBonusAr: 100000, // Frais de représentation
    nightShiftBonusAr: 0,
    transportBonusAr: 50000,
    performanceBonusAr: 0,
    grossSalaryAr: 800000,
    cnapsDeductionAr: 0,
    ostieDeductionAr: 0,
    irsaDeductionAr: 40000,
    advanceDeductionAr: 0,
    totalDeductionsAr: 40000,
    netSalaryAr: 760000,
    status: 'paye',
    generatedDate: '02/05/2024',
    approvedDate: '03/05/2024',
    paidDate: '05/05/2024',
    approverName: 'Rasoanaivo Mirana (Trésorière Générale)',
    transactionRef: 'VIR-BNI-2024-05-DIR01',
    notes: 'Indemnité mensuelle statutaire validée par délibération AG.'
  },
  // 9. Trésorière Générale - Rasoanaivo Mirana
  {
    id: 'pay-009',
    slipNumber: 'PAY-2024-05-009',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'bureau',
    beneficiaryId: 'com-04',
    beneficiaryName: 'Rasoanaivo Mirana',
    roleTitle: 'Trésorière Générale (Comité Directeur)',
    siteId: 'GLOBAL',
    siteName: 'Direction Générale Consolidée',
    cin: '101 445 221 009',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'Virement BNI',
    bankAccountOrPhone: '00004 01234 55443322110 88',
    baseSalaryAr: 550000,
    responsibilityBonusAr: 70000,
    nightShiftBonusAr: 0,
    transportBonusAr: 40000,
    performanceBonusAr: 0,
    grossSalaryAr: 660000,
    cnapsDeductionAr: 0,
    ostieDeductionAr: 0,
    irsaDeductionAr: 33000,
    advanceDeductionAr: 0,
    totalDeductionsAr: 33000,
    netSalaryAr: 627000,
    status: 'paye',
    generatedDate: '02/05/2024',
    approvedDate: '03/05/2024',
    paidDate: '05/05/2024',
    approverName: 'Rajaonarison Hery (Président Général)',
    transactionRef: 'VIR-BNI-2024-05-DIR02'
  },
  // 10. Vice-Président - Andriamahitsy Solo
  {
    id: 'pay-010',
    slipNumber: 'PAY-2024-05-010',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'bureau',
    beneficiaryId: 'com-02',
    beneficiaryName: 'Andriamahitsy Solo',
    roleTitle: 'Vice-Président du Comité',
    siteId: 'GLOBAL',
    siteName: 'Direction Générale Consolidée',
    cin: '101 223 998 776',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'Virement BMOI',
    bankAccountOrPhone: '00005 01122 33445566778 99',
    baseSalaryAr: 450000,
    responsibilityBonusAr: 50000,
    nightShiftBonusAr: 0,
    transportBonusAr: 30000,
    performanceBonusAr: 0,
    grossSalaryAr: 530000,
    cnapsDeductionAr: 0,
    ostieDeductionAr: 0,
    irsaDeductionAr: 26500,
    advanceDeductionAr: 0,
    totalDeductionsAr: 26500,
    netSalaryAr: 503500,
    status: 'valide_tresorier',
    generatedDate: '02/05/2024',
    approvedDate: '04/05/2024',
    approverName: 'Rasoanaivo Mirana (Trésorière Générale)'
  },
  // 11. Président Site S2 - Randriamifidimanana Jean
  {
    id: 'pay-011',
    slipNumber: 'PAY-2024-05-011',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'bureau',
    beneficiaryId: 'com-03',
    beneficiaryName: 'Randriamifidimanana Jean',
    roleTitle: 'Président du Site 02 (Ankorondrano)',
    siteId: 'S2',
    siteName: 'Site 02 - Ankorondrano Business',
    cin: '101 334 556 778',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'Virement BOA',
    bankAccountOrPhone: '00008 02233 44556677889 00',
    baseSalaryAr: 420000,
    responsibilityBonusAr: 40000,
    nightShiftBonusAr: 0,
    transportBonusAr: 30000,
    performanceBonusAr: 0,
    grossSalaryAr: 490000,
    cnapsDeductionAr: 0,
    ostieDeductionAr: 0,
    irsaDeductionAr: 24500,
    advanceDeductionAr: 0,
    totalDeductionsAr: 24500,
    netSalaryAr: 465500,
    status: 'paye',
    generatedDate: '02/05/2024',
    approvedDate: '03/05/2024',
    paidDate: '05/05/2024',
    approverName: 'Rasoanaivo Mirana (Trésorière)',
    transactionRef: 'VIR-BOA-2024-05-DIR03'
  },
  // 12. Contrôleur de Gestion - Ratsimbazafy Fidy
  {
    id: 'pay-012',
    slipNumber: 'PAY-2024-05-012',
    periodMonth: 'Mai 2024',
    beneficiaryType: 'bureau',
    beneficiaryId: 'com-06',
    beneficiaryName: 'Ratsimbazafy Fidy',
    roleTitle: 'Contrôleur de Gestion & Audit Interne',
    siteId: 'GLOBAL',
    siteName: 'Direction Générale Consolidée',
    cin: '101 778 990 112',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    paymentMethod: 'Virement BNI',
    bankAccountOrPhone: '00004 01234 77889900112 33',
    baseSalaryAr: 420000,
    responsibilityBonusAr: 30000,
    nightShiftBonusAr: 0,
    transportBonusAr: 30000,
    performanceBonusAr: 0,
    grossSalaryAr: 480000,
    cnapsDeductionAr: 0,
    ostieDeductionAr: 0,
    irsaDeductionAr: 24000,
    advanceDeductionAr: 0,
    totalDeductionsAr: 24000,
    netSalaryAr: 456000,
    status: 'en_attente',
    generatedDate: '02/05/2024',
    notes: 'En attente de transmission du relevé d\'audit mensuel.'
  }
];

/**
 * Current state kept in memory. It is the source of truth for the screen; localStorage is only a
 * cache that may be full or unavailable, so a failed write must never hide a change.
 */
let memoryState: AppState | null = null;

// Helper to load or initialize state
export function loadState(): AppState {
  // Callers mutate what they get, then call saveState: hand out a copy so React sees a new object.
  if (memoryState) return structuredClone(memoryState);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sites) && Array.isArray(parsed.members)) {
        // Ensure payrolls exist in legacy localStorage (an empty list is valid, e.g. after a reset)
        if (!Array.isArray(parsed.payrolls)) {
          parsed.payrolls = initialPayrolls;
        }
        // Ensure guards have hierarchy if legacy
        if (Array.isArray(parsed.guards) && parsed.guards.length > 0 && !parsed.guards[0]?.teamId) {
          parsed.guards = initialGuards;
        }
        // Ensure committee members have avatars and indemnities
        if (Array.isArray(parsed.committeeMembers) && parsed.committeeMembers.length > 0 && !parsed.committeeMembers[0]?.avatarUrl) {
          parsed.committeeMembers = initialCommitteeMembers;
        }
        memoryState = parsed;
        return structuredClone(parsed);
      }
    }
  } catch (e) {
    console.error('Error loading state from localStorage:', e);
  }

  const defaultState: AppState = {
    currentUser: initialCurrentUser,
    selectedSiteId: 'all',
    sites: initialSites,
    users: [initialCurrentUser],
    members: initialMembers,
    vehicles: initialVehicles,
    spots: initialSpots,
    tariffs: initialTariffs,
    subscriptions: initialSubscriptions,
    receipts: initialReceipts,
    cards: initialCards,
    guards: initialGuards,
    equipments: initialEquipments,
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
    expenses: initialExpenses,
    incidents: initialIncidents,
    committeeMembers: initialCommitteeMembers,
    meetings: initialMeetings,
    auditLogs: initialAuditLogs,
    payrolls: initialPayrolls
  };

  saveState(defaultState);
  return structuredClone(defaultState);
}

/** On sign-out: forget every piece of data kept in this browser. */
export function clearLocalCache() {
  memoryState = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/** Copy of the state without embedded pictures (data URLs), small enough for a full localStorage. */
function withoutEmbeddedImages(state: AppState): AppState {
  return JSON.parse(
    JSON.stringify(state, (_key, value) =>
      typeof value === 'string' && value.startsWith('data:image/') && value.length > 2000 ? undefined : value
    )
  );
}

export function saveState(state: AppState) {
  memoryState = state;
  // Update the screen first: it must not depend on the browser cache succeeding
  listeners.forEach((listener) => listener(state));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Cache full (photos are large): keep a light copy, the server stays the reference
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutEmbeddedImages(state)));
    } catch (e) {
      console.warn('Cache local indisponible, les données restent chargées depuis le serveur :', e);
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
  }
}

type Listener = (state: AppState) => void;
const listeners: Listener[] = [];

export function subscribeToState(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function setSelectedSite(siteId: string) {
  const state = loadState();
  state.selectedSiteId = siteId;
  saveState(state);
}

export function setCurrentUser(user: User) {
  const state = loadState();
  state.currentUser = user;
  saveState(state);
}

export function addAuditLog(action: string, module: string, details: string, siteCode: string = 'GLOBAL') {
  const state = loadState();
  const log: AuditLogItem = {
    id: `aud-${Date.now()}`,
    timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' }),
    userId: state.currentUser.id,
    userName: state.currentUser.fullName,
    action,
    siteCode,
    module,
    details,
    ipAddress: '192.168.1.100'
  };
  state.auditLogs = [log, ...state.auditLogs];
  saveState(state);
}

export function syncApi(endpoint: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST', body?: unknown) {
  if (typeof window === 'undefined') return;
  fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined
  }).catch(() => {
    // Fallback to local state when backend is unavailable
  });
}

export async function hydrateFromBackend(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/v1/bootstrap');
    if (!res.ok) return;
    const remoteState = (await res.json()) as AppState;
    if (remoteState && Array.isArray(remoteState.sites) && remoteState.sites.length > 0) {
      const local = loadState();
      const merged: AppState = {
        ...remoteState,
        selectedSiteId: local.selectedSiteId || remoteState.selectedSiteId,
        currentUser: local.currentUser || remoteState.currentUser
      };
      saveState(merged);
    }
  } catch {
    // Keep local state if API is unreachable
  }
}

export function addIncident(incident: Omit<IncidentRecord, 'id' | 'ticketCode' | 'date'>) {
  const state = loadState();
  const ticketCode = `INC-${new Date().getFullYear()}-${String(state.incidents.length + 1).padStart(4, '0')}`;
  const newIncident: IncidentRecord = {
    ...incident,
    id: `inc-${Date.now()}`,
    ticketCode,
    date: new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' }) + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Antananarivo' })
  };
  state.incidents = [newIncident, ...state.incidents];
  addAuditLog('CREATION_INCIDENT', 'Sécurité', `Ticket ${ticketCode} ouvert: ${incident.title}`, incident.siteId);
  saveState(state);
  syncApi('/api/v1/incidents', 'POST', newIncident);
}

export function updateIncidentStatus(id: string, status: 'ouvert' | 'en_cours' | 'resolu' | 'classe', notes?: string) {
  const state = loadState();
  const inc = state.incidents.find(i => i.id === id);
  if (inc) {
    inc.resolutionStatus = status;
    if (notes) inc.resolutionNotes = notes;
    if (status === 'resolu' || status === 'classe') {
      inc.resolvedAt = new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' });
    }
    addAuditLog('MISE_A_JOUR_INCIDENT', 'Sécurité', `Ticket ${inc.ticketCode} passé à ${status}`, inc.siteId);
    saveState(state);
    syncApi(`/api/v1/incidents/${encodeURIComponent(id)}`, 'PATCH', {
      resolutionStatus: status,
      resolutionNotes: notes
    });
  }
}

export function addCommitteeMember(member: Omit<CommitteeMember, 'id'>) {
  const state = loadState();
  const newMember: CommitteeMember = {
    ...member,
    id: `com-${Date.now()}`
  };
  state.committeeMembers = [...state.committeeMembers, newMember];
  addAuditLog('NOUVEAU_MEMBRE_COMITE', 'Gouvernance', `${member.role} nommé: ${member.fullName}`);
  saveState(state);
  syncApi('/api/v1/committee', 'POST', newMember);
}

export function addMeeting(meeting: Omit<GovernanceMeeting, 'id'>) {
  const state = loadState();
  const newMeeting: GovernanceMeeting = {
    ...meeting,
    id: `meet-${Date.now()}`
  };
  state.meetings = [newMeeting, ...state.meetings];
  addAuditLog('REUNION_GOUVERNANCE_AJOUTEE', 'Gouvernance', `PV Réunion enregistré: ${meeting.title}`);
  saveState(state);
  syncApi('/api/v1/meetings', 'POST', newMeeting);
}

// --- NOUVELLES FONCTIONS GESTION DE LA PAIE & HIERARCHIE ---

export function addPayrollRecord(record: Omit<PayrollRecord, 'id' | 'slipNumber' | 'generatedDate'>) {
  const state = loadState();
  // Next free number of the year (the column is unique, a count would reuse numbers after a deletion)
  const prefix = `PAY-${new Date().getFullYear()}-`;
  const maxSeq = state.payrolls
    .map((p: PayrollRecord) => (p.slipNumber.startsWith(prefix) ? Number(p.slipNumber.slice(prefix.length)) : 0))
    .reduce((a: number, b: number) => Math.max(a, Number.isFinite(b) ? b : 0), 0);
  const slipNumber = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
  const newRecord: PayrollRecord = {
    ...record,
    id: `pay-${Date.now()}`,
    slipNumber,
    generatedDate: new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' })
  };
  state.payrolls = [newRecord, ...state.payrolls];
  addAuditLog('EMISSION_BULLETIN_PAIE', 'Paie & Rémunérations', `Bulletin #${slipNumber} émis pour ${record.beneficiaryName} (${record.netSalaryAr.toLocaleString('fr-FR')} Ar)`, record.siteId);
  saveState(state);
  syncApi('/api/v1/payrolls', 'POST', newRecord);
  return newRecord;
}

/**
 * Changes the CNaPS / OSTIE / IRSA amounts of a slip (0 = not applied).
 * The net to pay is kept: the gross is recomputed as net + deductions + advance.
 */
export function updatePayrollDeductions(
  id: string,
  deductions: { cnapsDeductionAr: number; ostieDeductionAr: number; irsaDeductionAr: number }
): PayrollRecord | null {
  const state = loadState();
  const slip = state.payrolls.find((p: PayrollRecord) => p.id === id);
  if (!slip) return null;
  slip.cnapsDeductionAr = Math.max(0, Math.round(deductions.cnapsDeductionAr));
  slip.ostieDeductionAr = Math.max(0, Math.round(deductions.ostieDeductionAr));
  slip.irsaDeductionAr = Math.max(0, Math.round(deductions.irsaDeductionAr));
  slip.totalDeductionsAr = slip.cnapsDeductionAr + slip.ostieDeductionAr + slip.irsaDeductionAr + (slip.advanceDeductionAr || 0);
  slip.grossSalaryAr = slip.netSalaryAr + slip.totalDeductionsAr;
  addAuditLog(
    'MODIFICATION_RETENUES_PAIE',
    'Paie & Rémunérations',
    `Bulletin #${slip.slipNumber} : CNaPS ${slip.cnapsDeductionAr} Ar, OSTIE ${slip.ostieDeductionAr} Ar, IRSA ${slip.irsaDeductionAr} Ar (net inchangé ${slip.netSalaryAr} Ar)`,
    slip.siteId
  );
  const fresh = loadState();
  fresh.payrolls = fresh.payrolls.map((p: PayrollRecord) => (p.id === id ? slip : p));
  saveState(fresh);
  syncApi(`/api/v1/payrolls/${encodeURIComponent(id)}`, 'PUT', {
    cnapsDeductionAr: slip.cnapsDeductionAr,
    ostieDeductionAr: slip.ostieDeductionAr,
    irsaDeductionAr: slip.irsaDeductionAr,
    totalDeductionsAr: slip.totalDeductionsAr,
    grossSalaryAr: slip.grossSalaryAr
  });
  return slip;
}

export function updatePayrollStatus(id: string, status: 'en_attente' | 'valide_tresorier' | 'paye', approverName?: string, transactionRef?: string) {
  const state = loadState();
  const slip = state.payrolls.find((p: PayrollRecord) => p.id === id);
  if (slip) {
    slip.status = status;
    const now = new Date().toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' });
    if (status === 'valide_tresorier') {
      slip.approvedDate = now;
      if (approverName) slip.approverName = approverName;
    } else if (status === 'paye') {
      slip.paidDate = now;
      if (transactionRef) slip.transactionRef = transactionRef;
      if (approverName && !slip.approverName) slip.approverName = approverName;
    }
    addAuditLog('STATUT_PAIE_MIS_A_JOUR', 'Paie & Rémunérations', `Bulletin #${slip.slipNumber} (${slip.beneficiaryName}) passé à statut: ${status}`, slip.siteId);
    saveState(state);
    syncApi(`/api/v1/payrolls/${encodeURIComponent(id)}/status`, 'PATCH', {
      status,
      approverName,
      transactionRef
    });
  }
}

/** Fields typed in the "Nouveau personnel" form. */
export interface NewGuardInput {
  fullName: string;
  cin: string;
  phoneFlotte: string;
  residenceLot: string;
  recruitmentDate: string;
  title: string;
  grade: string;
  siteId: string;
  isTeamLeader: boolean;
  /** New brigade name, when the person is a team leader */
  teamName?: string;
  /** Leader the guard reports to, when not a team leader */
  teamLeaderId?: string;
  status: GuardPersonnel['status'];
  avatarUrl?: string;
  shiftDays: GuardPersonnel['shiftDays'];
}

/** Creates a staff member on the server, then shows it. Throws with a readable message on failure. */
export async function addGuardRecord(input: NewGuardInput): Promise<GuardPersonnel> {
  let res: Response;
  try {
    res = await fetch('/api/v1/guards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
  } catch {
    throw new Error('Serveur injoignable : le personnel n’a pas été enregistré.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(res.status === 413 ? 'La photo est trop lourde.' : body?.error || `Enregistrement impossible (erreur ${res.status}).`);
  }
  const guard = body as GuardPersonnel;
  const state = loadState();
  state.guards = [...state.guards.filter((g) => g.id !== guard.id), guard];
  saveState(state);
  return guard;
}

/** Saves the weekly schedule of several staff members at once. */
export function updateGuardShiftDays(changes: { id: string; shiftDays: GuardPersonnel['shiftDays'] }[]) {
  if (changes.length === 0) return;
  const state = loadState();
  for (const c of changes) {
    const g = state.guards.find((x) => x.id === c.id);
    if (!g) continue;
    g.shiftDays = { ...c.shiftDays };
    syncApi(`/api/v1/guards/${encodeURIComponent(c.id)}`, 'PUT', { shiftDays: g.shiftDays });
  }
  saveState(state);
  addAuditLog('PLANNING_GARDES_MODIFIE', 'Sécurité & Gardiennage', `Planning hebdomadaire modifié pour ${changes.length} agent(s)`);
}

export function updateGuardOrders(teamId: string, orderText: string) {
  const state = loadState();
  let updatedCount = 0;
  state.guards.forEach(g => {
    if (g.teamId === teamId) {
      if (!g.ordersOfTheDay) g.ordersOfTheDay = [];
      g.ordersOfTheDay.unshift(orderText);
      updatedCount++;
    }
  });
  if (updatedCount > 0) {
    addAuditLog('ORDRE_DE_SERVICE_GARDIENS', 'Sécurité & Gardiennage', `Nouvel ordre de service diffusé à la brigade ${teamId}: "${orderText}"`);
    saveState(state);
    syncApi('/api/v1/guards/orders', 'POST', { teamId, orderText });
  }
}

export function updateProfileAvatar(type: 'guard' | 'committee' | 'user', id: string, newAvatarUrl: string) {
  const state = loadState();
  if (type === 'guard') {
    const g = state.guards.find(guard => guard.id === id);
    if (g) g.avatarUrl = newAvatarUrl;
  } else if (type === 'committee') {
    const c = state.committeeMembers.find(mem => mem.id === id);
    if (c) c.avatarUrl = newAvatarUrl;
  } else if (type === 'user') {
    const u = state.users.find(user => user.id === id);
    if (u) u.avatarUrl = newAvatarUrl;
    if (state.currentUser.id === id) state.currentUser.avatarUrl = newAvatarUrl;
  }
  addAuditLog('PHOTO_PROFIL_MODIFIEE', 'Administration', `Photo de profil mise à jour pour ${type} #${id}`);
  saveState(state);
  syncApi('/api/v1/profile/avatar', 'PATCH', { type, id, avatarUrl: newAvatarUrl });
}



// ===================== GENERIC EDIT / DELETE =====================

/** API collection segment -> key in AppState */
export const COLLECTION_STATE_KEYS = {
  sites: 'sites',
  members: 'members',
  vehicles: 'vehicles',
  spots: 'spots',
  tariffs: 'tariffs',
  subscriptions: 'subscriptions',
  receipts: 'receipts',
  cards: 'cards',
  guards: 'guards',
  equipments: 'equipments',
  'cash-registers': 'cashRegisters',
  expenses: 'expenses',
  incidents: 'incidents',
  committee: 'committeeMembers',
  meetings: 'meetings',
  payrolls: 'payrolls'
} as const;

export type EntityCollection = keyof typeof COLLECTION_STATE_KEYS;

async function callApi(endpoint: string, method: 'PUT' | 'DELETE', body?: unknown): Promise<void> {
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    // Backend unreachable: keep working on local state only
    return;
  }
  if (!res.ok) {
    let message = 'Opération refusée par le serveur';
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

/** Saves changes to one record (server + local state). Throws with a user-facing message on failure. */
export async function updateEntity(collection: EntityCollection, id: string, patch: Record<string, unknown>): Promise<void> {
  await callApi(`/api/v1/${collection}/${encodeURIComponent(id)}`, 'PUT', patch);
  const state = loadState();
  const key = COLLECTION_STATE_KEYS[collection];
  const list = (state as any)[key] as Array<Record<string, unknown>>;
  (state as any)[key] = list.map((item) => (item.id === id ? { ...item, ...patch, id } : item));
  saveState(state);
}

/** Deletes one record (server + local state). Throws with a user-facing message on failure. */
export async function deleteEntity(collection: EntityCollection, id: string): Promise<void> {
  await callApi(`/api/v1/${collection}/${encodeURIComponent(id)}`, 'DELETE');
  const state = loadState();
  const key = COLLECTION_STATE_KEYS[collection];
  const list = (state as any)[key] as Array<Record<string, unknown>>;
  (state as any)[key] = list.filter((item) => item.id !== id);
  saveState(state);
  // Linked records (vehicles, cards…) may have been removed by cascade: resync from the server
  await hydrateFromBackend();
}

/** Counts returned by the server after a data reset. */
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

/**
 * Asks the server to wipe operational data (configuration is kept), then reloads
 * the state from the server so every view shows the emptied data.
 * Throws with the server's message if the reset is refused or fails.
 */
export async function resetOperationalData(confirmation: string): Promise<ResetSummary> {
  const res = await fetch('/api/v1/admin/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `La remise à zéro a échoué (HTTP ${res.status}).`);
  }
  await hydrateFromBackend();
  return body.summary as ResetSummary;
}

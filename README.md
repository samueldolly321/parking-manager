# Parking Manager Madagascar — Gestion Multi-Sites

Application web de gestion centralisée et multi-sites d'organisations de parkings à Madagascar (*Antananarivo*).

Conçue et développée en respectant rigoureusement la charte graphique Stitch, les normes monétaires en **Ariary malgache (`Ar`)**, le fuseau horaire **`Indian/Antananarivo` (GMT+3)**, et le format de date **`JJ/MM/AAAA`**.

---

## 1. Architecture & Stack Technique

- **Frontend :** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion, Canvas-Confetti, QR Code (QRCode SVG/Canvas), Polices Google (*Space Grotesk*, *Inter*, *JetBrains Mono*).
- **Backend :** Node.js, Express, TypeScript (`server.ts`), API REST versionnée `/api/v1`.
- **Base de données relationnelle :**
  - PostgreSQL 16 (Drizzle ORM & `drizzle-kit`).
  - Schéma complet : `/src/db/schema.ts`.
  - Migrations SQL : `/database/migrations/0001_initial_schema.sql`.
  - Jeu d'initialisation & semences : `/database/seeds/seed.sql`.
  - Configuration conteneurisée : `/docker-compose.yml`.
  - Répertoire en mémoire réactif pour le développement local et la persistance immédiate sans dépendance externe.

---

## 2. Charte Graphique & Tokens Obligatoires

| Élément | Couleur Hex | Usage |
| :--- | :--- | :--- |
| **Bleu nuit principal** | `#0F172A` | Navigation latérale, éléments structurels, en-têtes |
| **Bleu nuit foncé** | `#131B2E` | Volet de navigation fixe |
| **Turquoise principal** | `#06B6D4` | Actions principales, liens actifs, CTA, accents de marque |
| **Fond général** | `#F8FAFC` | Arrière-plan des vues et interfaces |
| **Blanc** | `#FFFFFF` | Cartes, conteneurs, fiches dossiers |
| **Vert confirmé** | `#16A34A` | Paiements validés, barrières ouvertes, abonnements à jour |
| **Orange alertes** | `#F59E0B` | Échéances proches, alertes d'occupation, avertissements |
| **Rouge critique** | `#DC2626` | Pannes barrières, impayés, incidents, révocations |
| **Gris bordures** | `#E2E8F0` | Séparateurs, bordures de tableaux et de formulaires |

---

## 3. Sites Gérés Initialement

1. **Site 01 — Analakely Central (`S1-ANALAKELY`)**
   - Adresse : Avenue de l'Indépendance, Antananarivo 101
   - Capacité : 250 places (Zone A couverte, Zone B extérieure, Zone C motos)
   - Président : Rajaonarison Hery (`+261 34 02 111 01`)
   - Trésorière : Rasoanaivo Mirana
2. **Site 02 — Ankorondrano Business (`S2-ANKORONDRANO`)**
   - Adresse : Zone Tana Waterfront & Galaxy, Antananarivo 101
   - Capacité : 180 places
   - Président : Randriamifidimanana Jean (`+261 34 02 222 02`)
   - Trésorier : Rakotomalala Sitraka
3. **Site 03 — Ivato Aéroport Hub (`S3-IVATO`)**
   - Adresse : Zone Fret & Longue Durée, Aéroport Ivato, Antananarivo 105
   - Capacité : 80 places
   - Président : Ranaivoarisoa Pascal (`+261 34 02 333 03`)
   - Trésorier : Ratsimbazafy Fidy

---

## 4. Règles Métier & Tarification Réglementée

Conformément aux délibérations statutaires de l'Assemblée Générale :
- **Placement Libre Intérieur :** 120 000 Ar/mois (non privatif, rotation continue sous surveillance).
- **Emplacement Privatif Dédié sur Voirie :** 180 000 Ar/mois (marquage nominatif et arceau).
- **Abonnement Deux-Roues (Motos/Scooters) :** 40 000 Ar/mois.
- **Cotisation Annuelle Statutaire :** 160 000 Ar/an.
- **Émission Carte PVC Sécurisée CR80 :** 25 000 Ar (pups NFC NTAG216 + QR token cryptographique).

---

## 5. Démarrage Rapide

### A. Serveur de développement Full-Stack
```bash
npm run dev
# Lance Express (API REST /api/v1) et Vite sur le port 3000
```

### B. Base de données PostgreSQL avec Docker Compose
```bash
# Démarrer l'instance PostgreSQL 16 Alpine
docker compose up -d

# Exécuter les migrations et le jeu de semences
psql -h localhost -p 5432 -U postgres -d parking_mada -f database/migrations/0001_initial_schema.sql
psql -h localhost -p 5432 -U postgres -d parking_mada -f database/seeds/seed.sql
```

### C. Vérification & Compilation
```bash
npm run lint
npm run build
```

---

## 6. Endpoints API REST (/api/v1)

- `GET /api/v1/health` : État de santé du système et compteurs
- `GET /api/v1/sites` : Liste des 3 sites avec coordonnées et responsables
- `GET /api/v1/members` : Annuaire des membres, CIN et soldes en Ariary
- `GET /api/v1/spots` : Plan de stationnement, statuts en direct (`libre`, `occupe`, `reserve`)
- `GET /api/v1/receipts` : Journal d'encaissements certifiés
- `POST /api/v1/receipts` : Émission d'un nouveau reçu numéroté
- `POST /api/v1/access/verify` : Vérification du token QR/NFC d'une carte d'accès et ouverture de barrière

---

## 7. Rôles et Comptes Démo (RBAC)

Le sélecteur de rôle dans l'en-tête permet de basculer instantanément entre les profils :
- **Super Administrateur :** Rajaonarison Hery
- **Président Général :** Rajaonarison Hery
- **Président de Site :** Randriamifidimanana Jean
- **Trésorière Générale :** Rasoanaivo Mirana
- **Trésorier de Site :** Rakotomalala Sitraka
- **Chef de Poste Gardien :** Rasoanaivo Jean
- **Opératrice Caisse :** Razafindrakoto Fara

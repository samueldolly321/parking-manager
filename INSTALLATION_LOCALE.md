# Guide d'Installation Locale — Parking Manager Madagascar

Ce guide décrit étape par étape comment installer, configurer et exécuter l'application en local avec **Node.js**, **Express**, **React/Vite**, **PostgreSQL 16** et **Drizzle ORM**.

---

## 1. Prérequis

Assurez-vous d'avoir installé sur votre machine :
- **Node.js 20 ou supérieur** et **npm** :
  ```bash
  node -v
  npm -v
  ```
- **Option A (recommandée) : Docker et Docker Compose** :
  ```bash
  docker -v
  docker compose version
  ```
- **Option B (sans Docker) : PostgreSQL 16** installé directement sur votre système (Windows, macOS ou Linux).

---

## 2. Étape 1 — Installer les dépendances du projet

Ouvrez un terminal à la racine du projet et exécutez :

```bash
npm install
```

---

## 3. Étape 2 — Configurer le fichier `.env`

Copiez le fichier d'exemple `.env.example` vers `.env` :

- **Linux / macOS :**
  ```bash
  cp .env.example .env
  ```
- **Windows (PowerShell) :**
  ```powershell
  Copy-Item .env.example .env
  ```

Vérifiez que votre fichier `.env` contient bien les paramètres PostgreSQL :

```env
# Connexion PostgreSQL pour Drizzle ORM et le serveur Express
DATABASE_URL="postgres://postgres:postgres@localhost:5432/parking_mada"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="parking_mada"
POSTGRES_PORT="5432"

# Optionnel (si vous utilisez l'API Gemini)
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
```

> **Note :** Si votre PostgreSQL local utilise un autre mot de passe ou un autre port, adaptez `DATABASE_URL` en conséquence.

---

## 4. Étape 3 — Démarrer PostgreSQL

### Option A : Avec Docker Compose (recommandée)

1. Lancez le conteneur PostgreSQL 16 en arrière-plan :
   ```bash
   docker compose up -d
   ```
2. Vérifiez que le conteneur est actif et sain (`healthy`) :
   ```bash
   docker compose ps
   ```

### Option B : Avec PostgreSQL installé en local (sans Docker)

1. Démarrez le service PostgreSQL de votre système.
2. Créez la base de données `parking_mada` :
   ```bash
   psql -U postgres -c "CREATE DATABASE parking_mada;"
   ```

---

## 5. Étape 4 — Créer les tables dans PostgreSQL (Drizzle ORM)

Appliquez le schéma défini dans `src/db/schema.ts` vers votre base PostgreSQL :

```bash
npm run db:push
```

Cette commande crée les 19 tables du système (`sites`, `users`, `members`, `vehicles`, `parking_spaces`, `tariffs`, `subscriptions`, `payment_receipts`, `membership_cards`, `guards`, `cash_registers`, `expenses`, `inventory_items`, `incidents`, `committee_members`, `governance_meetings`, `payrolls`, `audit_logs`, `vehicle_categories`).

> **Peuplement initial (Seed) :** Au premier démarrage de l'application (ou dès la première requête API), le serveur appelle automatiquement `seedDatabaseIfEmpty()` et insère les 3 sites initiaux, les membres, les véhicules, les brigades de gardiens, les membres du bureau et les bulletins de paie si la base est vide.

*(Facultatif)* Pour inspecter vos tables dans une interface web :
```bash
npm run db:studio
```

---

## 6. Étape 5 — Lancer l'application en développement

Démarrez le serveur Express (`/api/v1/*`) + le frontend Vite sur le port `3000` :

```bash
npm run dev
```

Puis ouvrez votre navigateur :
- **Interface Web :** `http://localhost:3000`
- **Vérification API & Base de données :** `http://localhost:3000/api/v1/health`

Lorsque PostgreSQL est bien connecté, `/api/v1/health` retourne :
```json
{
  "status": "UP",
  "storageMode": "postgresql"
}
```

---

## 7. Commandes utiles au quotidien

| Commande | Rôle |
| :--- | :--- |
| `npm run dev` | Lance l'application complète en mode développement (port `3000`) |
| `npm run lint` | Vérifie la compilation TypeScript (`tsc --noEmit`) |
| `npm run build` | Compile le frontend pour la production (`dist/`) |
| `npm start` | Démarre le serveur Express en mode production |
| `npm run db:push` | Synchronise le schéma `src/db/schema.ts` avec PostgreSQL |
| `npm run db:generate` | Génère de nouvelles migrations SQL Drizzle |
| `npm run db:migrate` | Exécute les migrations générées |
| `npm run db:studio` | Ouvre Drizzle Studio pour explorer la base PostgreSQL |

---

## 8. Dépannage rapide

- **`storageMode` affiche `"local"` au lieu de `"postgresql"` :**
  Vérifiez que le fichier `.env` existe bien à la racine et contient `DATABASE_URL="..."`, puis redémarrez `npm run dev`.
- **Erreur `ECONNREFUSED` sur le port `5432` :**
  Vérifiez que Docker tourne (`docker compose ps`) ou que votre service PostgreSQL local est démarré.
- **Port `3000` déjà utilisé :**
  Fermez l'autre processus utilisant le port `3000` ou définissez `PORT=3001` dans `.env`.
- **Réinitialiser complètement la base Docker :**
  ```bash
  docker compose down -v
  docker compose up -d
  npm run db:push
  ```

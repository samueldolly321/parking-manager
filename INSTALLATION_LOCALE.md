# Guide d'Installation Locale — Parking Manager Madagascar

Ce guide décrit étape par étape comment installer, configurer et exécuter l'application en local avec **Node.js**, **Express**, **React/Vite**, **PostgreSQL 16** et **Drizzle ORM**.

Code source : https://github.com/samueldolly321/parking-manager

---

## 1. Prérequis

Assurez-vous d'avoir installé sur votre machine :
- **Git** (pour récupérer le code) :
  ```bash
  git --version
  ```
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

## 2. Étape 1 — Récupérer le code et installer les dépendances

```bash
git clone https://github.com/samueldolly321/parking-manager.git
cd parking-manager
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

Puis ouvrez `.env` et renseignez les valeurs :

```env
# Connexion PostgreSQL
DATABASE_URL="postgres://postgres:postgres@localhost:5432/parking_mada"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="parking_mada"
POSTGRES_PORT="5432"

# Authentification
# Clé de signature des sessions : une longue chaîne aléatoire (au moins 32 caractères)
SESSION_SECRET="remplacez_par_une_longue_chaine_aleatoire"
# Compte administrateur créé au premier démarrage
ADMIN_EMAIL="vous@exemple.mg"
ADMIN_INITIAL_PASSWORD="VotreMotDePasse2026"

# Optionnel
APP_URL="http://localhost:3000"
```

| Variable | Rôle |
| :--- | :--- |
| `DATABASE_URL` | Adresse de la base PostgreSQL. Sans elle, l'application fonctionne en mode « local » (fichier temporaire `.data/`), à réserver aux essais. |
| `SESSION_SECRET` | Signe les sessions de connexion. Sans elle, tout le monde est déconnecté à chaque redémarrage du serveur. |
| `ADMIN_EMAIL` | Email de connexion du compte administrateur. |
| `ADMIN_INITIAL_PASSWORD` | Mot de passe du compte administrateur au **premier** démarrage (8 caractères minimum, avec des lettres et des chiffres). |

Pour générer une clé `SESSION_SECRET` :
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **Sécurité :** le fichier `.env` contient des secrets. Il est exclu de Git (`.gitignore`) : ne le partagez jamais et ne le publiez pas sur GitHub.

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

## 5. Étape 4 — Lancer l'application

```bash
npm run dev
```

Au **premier démarrage sur une base vide**, le serveur fait tout automatiquement :
1. il crée les 19 tables à partir de `database/schema.sql` (généré depuis `src/db/schema.ts`) ;
2. il insère les données de démonstration (3 sites, membres, véhicules, brigades de gardiens, comité, bulletins de paie…) ;
3. il applique `ADMIN_EMAIL` et `ADMIN_INITIAL_PASSWORD` au compte administrateur.

Le terminal affiche alors :
```
[db] Base vide : tables créées depuis database/schema.sql.
[auth] Mot de passe initial appliqué au compte vous@exemple.mg.
[Parking Manager Madagascar] Full-Stack server running on http://0.0.0.0:3000
```

Puis ouvrez votre navigateur :
- **Interface Web :** `http://localhost:3000`
- **État du serveur :** `http://localhost:3000/api/v1/health`

Lorsque PostgreSQL est bien connecté, `/api/v1/health` retourne :
```json
{
  "status": "UP",
  "storageMode": "postgresql"
}
```

---

## 6. Étape 5 — Se connecter

1. Sur la page de connexion, saisissez `ADMIN_EMAIL` et `ADMIN_INITIAL_PASSWORD`.
2. Changez ensuite votre mot de passe : cliquez sur votre photo (en haut à droite) → **Mon compte**.
   Le mot de passe est enregistré chiffré dans la base ; celui du `.env` ne sert plus.
3. **Se déconnecter** se trouve dans le même menu. La session dure 7 jours.

Sécurité intégrée :
- toutes les routes `/api` exigent une session valide (sauf la connexion et `/api/v1/health`) ;
- après 5 essais ratés, les tentatives sont bloquées 15 minutes ;
- le journal d'audit (**Paramètres & Audit**) enregistre les connexions réussies et échouées.

---

## 7. Commandes utiles au quotidien

| Commande | Rôle |
| :--- | :--- |
| `npm run dev` | Lance l'application complète en mode développement (port `3000`) |
| `npm run lint` | Vérifie la compilation TypeScript (`tsc --noEmit`) |
| `npm run build` | Compile le frontend pour la production (`dist/`) |
| `npm start` | Démarre le serveur (avec `NODE_ENV=production` pour servir `dist/`) |
| `npm run db:studio` | Ouvre Drizzle Studio pour explorer la base PostgreSQL |
| `npm run reset-password -- email motdepasse` | Remet le mot de passe d'un compte (mot de passe oublié) |

### Après une modification de `src/db/schema.ts`

Régénérez le schéma complet utilisé pour les nouvelles bases :
```bash
npx drizzle-kit generate --dialect postgresql --schema ./src/db/schema.ts --out ./tmp-schema
```
puis remplacez `database/schema.sql` par le fichier `.sql` produit (et supprimez `tmp-schema/`).
Pour une base **existante**, ajoutez la nouvelle colonne dans `ensureSchemaUpgrades()` (`src/db/repository.ts`) avec `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` : elle sera ajoutée au démarrage, sans toucher aux données.

---

## 8. Mettre à jour le code et le site en ligne

```bash
git pull            # récupérer la dernière version
git add -A
git commit -m "Description de la modification"
git push            # envoie sur GitHub
```

Le site en ligne (Render) se redéploie automatiquement après chaque `git push` sur `main`.
La procédure de déploiement initiale est décrite dans le `README.md` (section « Déploiement sur Render »).

---

## 9. Dépannage rapide

- **`storageMode` affiche `"local"` au lieu de `"postgresql"` :**
  Vérifiez que le fichier `.env` existe à la racine et contient `DATABASE_URL="..."`, puis redémarrez `npm run dev`.
  (Sur Render : onglet **Environment** du service.)
- **« Email ou mot de passe incorrect » alors que les identifiants sont bons :**
  - vérifiez que vous utilisez l'email de `ADMIN_EMAIL` (ou celui choisi dans « Mon compte ») ;
  - au premier démarrage, `ADMIN_INITIAL_PASSWORD` doit respecter la règle (8 caractères, lettres et chiffres), sinon le terminal affiche `[auth] Aucun mot de passe défini…` ;
  - chaque base (locale, en ligne) a ses propres comptes : un mot de passe changé en local ne change pas celui du site en ligne.
- **« Trop de tentatives » :** attendez 15 minutes, ou redémarrez le serveur.
- **Mot de passe oublié :** il n'y a pas d'envoi d'email. Remettez un mot de passe avec la commande ci-dessous (elle agit sur la base de `DATABASE_URL`), puis connectez-vous :
  ```bash
  npm run reset-password -- vous@exemple.mg NouveauMotDePasse2026
  ```
  Pour le **site en ligne**, lancez la commande depuis votre ordinateur en la faisant pointer vers la base en ligne (la Connection string Neon, visible dans l'onglet **Environment** du service Render) :
  ```powershell
  # Windows (PowerShell)
  $env:DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"; npm run reset-password -- vous@exemple.mg NouveauMotDePasse2026
  ```
  ```bash
  # Linux / macOS
  DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" npm run reset-password -- vous@exemple.mg NouveauMotDePasse2026
  ```
- **Erreur `ECONNREFUSED` sur le port `5432` :**
  Vérifiez que Docker tourne (`docker compose ps`) ou que votre service PostgreSQL local est démarré.
- **Port `3000` déjà utilisé :**
  Fermez l'autre processus utilisant le port `3000` ou définissez `PORT=3001` dans `.env`.
- **Réinitialiser complètement la base Docker** (⚠ efface toutes les données) :
  ```bash
  docker compose down -v
  docker compose up -d
  npm run dev
  ```
  Pour seulement vider les données d'exploitation en gardant la configuration, utilisez plutôt
  **Paramètres & Audit → Remettre à zéro** dans l'application.

# Version bureau (Windows .exe) — licences et essai gratuit

La version bureau est la même application que la version web, livrée en installateur Windows :
une fenêtre (Electron), une **base PostgreSQL intégrée** et le serveur, sans Internet ni installation
supplémentaire. Les données restent sur le PC du client.

## 1. Générer l'installateur

```bash
npm run desktop:dist
```

Résultat : `release/Parking-Manager-Setup-<version>.exe` (≈ 165 Mo). La version vient du champ
`version` de `package.json` : augmentez-la à chaque nouvelle livraison.

Pour essayer sans installer : `npm run desktop:start`, ou lancez `release/win-unpacked/Parking Manager.exe`.

## 2. Votre clé de licence (à faire une seule fois — déjà fait)

```bash
npm run license:init
```

- crée `license-keys/private.pem` : **votre clé privée**. Elle sert à fabriquer les clés d'activation.
  **Sauvegardez-la en lieu sûr** (clé USB, coffre-fort de mots de passe). Elle est exclue de git et
  n'est jamais mise dans l'installateur.
  - Si vous la perdez, vous ne pourrez plus créer de clés pour les versions déjà installées.
  - Si quelqu'un la récupère, il pourra créer des clés lui-même.
- écrit la clé publique correspondante dans `src/license/publicKey.ts` (intégrée à l'application).

Ne relancez pas `license:init` : une nouvelle paire de clés rendrait invalides toutes les clés déjà vendues.

## 3. Côté client : essai gratuit puis activation

1. Le client installe et lance l'application. Au premier lancement, il crée le **compte administrateur**
   (email + mot de passe). L'application démarre **sans données de démonstration** (un site à renommer).
2. **7 jours d'essai gratuit**, affichés en bas à gauche (« Essai gratuit : X jours restants »).
3. Pour activer (pendant ou après l'essai) : bouton **Activer** → l'application affiche le
   **code machine** (ex. `FW2X-4D2D-ETRQ-1H0C`) que le client vous envoie.
4. À la fin de l'essai sans activation, l'application est bloquée sur l'écran d'activation.
   Les données sont conservées.

## 4. Créer une clé d'activation pour un client

### Avec le générateur (fenêtre Windows, sans invite de commandes)

Fabriquer le générateur (une fois, puis à chaque mise à jour) :

```bash
npm run license:app:dist
```

Résultat : `release-keygen/Parking-Manager-Licences-<version>.exe`, un programme **portable**
(un seul fichier, sans installation). Copiez-le où vous voulez (bureau, clé USB) et ouvrez-le par double-clic.

1. Au premier lancement, cliquez sur **« Choisir private.pem… »** et sélectionnez `license-keys\private.pem`.
   Le générateur vérifie qu'elle correspond bien à l'application, puis la garde dans votre profil Windows
   (`%APPDATA%\Parking Manager - Licences`). Le programme lui-même ne contient aucune clé :
   s'il circule, il est inutilisable sans votre clé privée.
2. Saisissez le **code machine** envoyé par le client (les tirets se mettent tout seuls) et son **nom**.
3. **Générer la clé** : elle est affichée, **copiée automatiquement**, et peut être enregistrée en `.txt`
   (avec la marche à suivre pour le client).
4. L'**historique** garde toutes les clés délivrées (date, client, code machine, remarque), avec une recherche
   et un bouton « Copier » pour renvoyer une clé à un client.

Pour l'ouvrir pendant le développement : `npm run license:app`.

### En ligne de commande (dépannage)

```bash
npm run license:create -- FW2X-4D2D-ETRQ-1H0C "Nom du client"
```

### Règles des clés

- La clé n'est valable **que pour ce PC** (code machine) : elle ne fonctionne pas sur un autre ordinateur.
- Licence **à vie**.
- Le code machine vient de l'identifiant Windows du PC (MachineGuid) : il reste le même après une
  réinstallation de l'application, mais change si Windows est réinstallé (il faut alors une nouvelle clé).

## 5. Où sont les données chez le client

`%APPDATA%\Parking Manager\` :

| Élément | Rôle |
|---|---|
| `pgdata\` | la base de données (à sauvegarder régulièrement) |
| `license.json` | début de l'essai et clé d'activation |
| `install.json` | mot de passe de la base et clé de session, propres à cette installation |
| `application.log` | journal de démarrage (utile en cas de problème) |

Désinstaller l'application **ne supprime pas** ces données.

## 6. Limites à connaître

- L'essai est enregistré à deux endroits (fichier et base) et résiste au recul de l'horloge du PC.
  Supprimer **les deux** (le dossier `%APPDATA%\Parking Manager`) redémarre l'essai, mais efface aussi
  toutes les données.
- L'installateur n'est **pas signé** (pas de certificat de signature de code). Windows SmartScreen
  affichera « Éditeur inconnu » : le client clique sur « Informations complémentaires » →
  « Exécuter quand même ». Un certificat de signature (payant) supprime cet avertissement.
- La version web (Render) n'est pas concernée par les licences.

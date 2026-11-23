-- Nom du président (du site ou général) qui a accepté l'adhésion d'un membre.
-- Appliquée automatiquement au démarrage du serveur (ensureSchemaUpgrades) ; ce fichier sert de trace.
ALTER TABLE members ADD COLUMN IF NOT EXISTS approved_by_president VARCHAR(150);

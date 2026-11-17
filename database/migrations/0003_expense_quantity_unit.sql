-- Quantité et unité d'une dépense (ex. 20 litre, 3 boîte), facultatives pour les anciennes dépenses.
-- Appliquée automatiquement au démarrage du serveur (ensureSchemaUpgrades) ; ce fichier sert de trace.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity DOUBLE PRECISION;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS unit VARCHAR(30);

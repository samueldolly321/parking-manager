-- Historique des clôtures de caisse (espèces attendues / comptées, écart, Mobile Money, dépenses).
-- Appliquée automatiquement au démarrage du serveur (ensureSchemaUpgrades) ; ce fichier sert de trace.
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS closures JSONB NOT NULL DEFAULT '[]'::jsonb;

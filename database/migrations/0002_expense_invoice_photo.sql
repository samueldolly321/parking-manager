-- Photo de la facture jointe à une dépense (image JPEG en data URL), facultative.
-- Appliquée automatiquement au démarrage du serveur (ensureSchemaUpgrades) ; ce fichier sert de trace.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_photo_url TEXT;

-- Photo de chaque matériel / équipement (image importée depuis l'ordinateur ou prise avec la caméra).
-- Appliquée automatiquement au démarrage du serveur (ensureSchemaUpgrades) ; ce fichier sert de trace.
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS photo_url TEXT;

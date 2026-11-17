-- =============================================================================
-- PARKING MANAGER MADAGASCAR - INITIAL SEED DATA
-- Sites: Analakely Central, Ankorondrano Business, Ivato Aéroport Hub
-- Currency: Malagasy Ariary (Ar)
-- =============================================================================

-- 1. Initial Sites
INSERT INTO sites (id, code, name, address, city, total_capacity, president_name, president_phone, tresorier_name, guard_count, status)
VALUES 
    ('S1', 'S1-ANALAKELY', 'Site 01 - Analakely Central', 'Avenue de l''Indépendance', 'Antananarivo 101', 250, 'Rajaonarison Hery', '+261 34 02 111 01', 'Rasoanaivo Mirana', 4, 'actif'),
    ('S2', 'S2-ANKORONDRANO', 'Site 02 - Ankorondrano Business', 'Zone Tana Waterfront & Galaxy', 'Antananarivo 101', 180, 'Randriamifidimanana Jean', '+261 34 02 222 02', 'Rakotomalala Sitraka', 3, 'actif'),
    ('S3', 'S3-IVATO', 'Site 03 - Ivato Aéroport Hub', 'Zone Fret & Longue Durée, Aéroport', 'Antananarivo 105', 80, 'Ranaivoarisoa Pascal', '+261 34 02 333 03', 'Ratsimbazafy Fidy', 2, 'actif')
ON CONFLICT (id) DO NOTHING;

-- 2. Initial Users
INSERT INTO users (id, username, full_name, email, password_hash, role, site_id, phone, is_active)
VALUES
    ('usr-admin-01', 'superadmin', 'Rajaonarison Hery', 'hery@parkingmada.mg', '$2a$12$e8w.x7Wq5P1kZ5Gg6I6S3O.fFz4D9A0Qy/s/GkUo4W8qTqK7S', 'super_admin', NULL, '+261 34 02 111 01', TRUE),
    ('usr-pres-01', 'pres_analakely', 'Rajaonarison Hery', 'pres.analakely@parkingmada.mg', '$2a$12$e8w.x7Wq5P1kZ5Gg6I6S3O.fFz4D9A0Qy/s/GkUo4W8qTqK7S', 'president_site', 'S1', '+261 34 02 111 01', TRUE),
    ('usr-tres-01', 'tresorier_analakely', 'Rasoanaivo Mirana', 'tresorier.analakely@parkingmada.mg', '$2a$12$e8w.x7Wq5P1kZ5Gg6I6S3O.fFz4D9A0Qy/s/GkUo4W8qTqK7S', 'tresorier_site', 'S1', '+261 34 88 901 24', TRUE),
    ('usr-grd-01', 'gardien_chef', 'Rasoanaivo Jean', 'chef.poste1@parkingmada.mg', '$2a$12$e8w.x7Wq5P1kZ5Gg6I6S3O.fFz4D9A0Qy/s/GkUo4W8qTqK7S', 'chef_poste_gardien', 'S1', '+261 34 88 901 23', TRUE),
    ('usr-sec-01', 'secretaire', 'Razafindrakoto Fara', 'secretaire@parkingmada.mg', '$2a$12$e8w.x7Wq5P1kZ5Gg6I6S3O.fFz4D9A0Qy/s/GkUo4W8qTqK7S', 'secretaire', NULL, '+261 34 12 888 99', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Initial Tariffs
INSERT INTO tariffs (id, name, category, site_id, type_formula, duration, amount_ar, description, is_active)
VALUES
    ('tar-1', 'Abonnement Standard VL (Placement Libre Intérieur)', 'Voiture Légère (VL)', NULL, 'placement_libre_interieur', 'mois', 120000, 'Placement non privatif en zone intérieure partagée. Accès 24/7 par barrière RFID.', TRUE),
    ('tar-2', 'Abonnement Privatif Dédié (Voirie Extérieure Réservée)', 'Voiture Légère (VL)', NULL, 'emplacement_privatif_dedie', 'mois', 180000, 'Emplacement privatif numéroté réservé nominativement sur voirie dédiée.', TRUE),
    ('tar-3', 'Abonnement Deux-Roues Moto (Zone C)', 'Deux-Roues (2R)', NULL, 'deux_roues', 'mois', 40000, 'Place moto en zone clôturée sécurisée avec antivol sabot et surveillance.', TRUE),
    ('tar-4', 'Cotisation Annuelle Membre', 'Voiture Légère (VL)', NULL, 'adhesion_annuelle', 'an', 160000, 'Frais annuels d''adhésion statutaire à l''association gestionnaire des parkings.', TRUE),
    ('tar-5', 'Émission / Duplicata Carte PVC ISO CR80', 'Voiture Légère (VL)', NULL, 'carte_pvc', 'an', 25000, 'Impression carte plastique rigide avec puce RFID intégrée et encodage.', TRUE)
ON CONFLICT (id) DO NOTHING;

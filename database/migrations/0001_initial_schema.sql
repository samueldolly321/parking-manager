-- =============================================================================
-- PARKING MANAGER MADAGASCAR - DATABASE MIGRATION 0001
-- PostgreSQL 16 compatible schema aligned 1:1 with Drizzle ORM (src/db/schema.ts)
-- Currency: Malagasy Ariary (Ar) stored as BIGINT to guarantee arithmetic exactness
-- Timezone: Indian/Antananarivo (UTC+3)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sites (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Antananarivo',
    total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
    president_name VARCHAR(150) NOT NULL,
    president_phone VARCHAR(30) NOT NULL,
    tresorier_name VARCHAR(150) NOT NULL,
    guard_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'actif',
    coordinates JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    site_id VARCHAR(100) REFERENCES sites(id) ON DELETE SET NULL,
    phone VARCHAR(30) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS users_site_id_idx ON users(site_id);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(100) PRIMARY KEY,
    member_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'standard',
    cin VARCHAR(30) NOT NULL,
    cin_issued_date VARCHAR(30),
    cin_issued_location VARCHAR(100),
    phone VARCHAR(30) NOT NULL,
    mobile_money_provider VARCHAR(30),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(30),
    address TEXT NOT NULL,
    primary_site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    joined_date VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'actif',
    current_balance_ar BIGINT NOT NULL DEFAULT 0,
    avatar_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS members_num_idx ON members(member_number);
CREATE INDEX IF NOT EXISTS members_site_idx ON members(primary_site_id);

CREATE TABLE IF NOT EXISTS vehicle_categories (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(100) PRIMARY KEY,
    license_plate VARCHAR(30) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    member_id VARCHAR(100) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    spot_id VARCHAR(50),
    rfid_tag VARCHAR(100),
    barcode VARCHAR(100),
    photo_url TEXT,
    registered_at VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'actif',
    assigned_spot_type VARCHAR(50) DEFAULT 'placement_libre_interieur'
);
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_plate_idx ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS vehicles_member_idx ON vehicles(member_id);
CREATE INDEX IF NOT EXISTS vehicles_site_idx ON vehicles(site_id);

CREATE TABLE IF NOT EXISTS parking_spaces (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(30) NOT NULL,
    site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    zone VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'libre',
    current_vehicle_plate VARCHAR(30),
    current_vehicle_model VARCHAR(100),
    current_driver_name VARCHAR(150),
    entry_time VARCHAR(50),
    duration VARCHAR(50),
    assigned_abonnement VARCHAR(100),
    rfid_uid VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS spots_site_zone_idx ON parking_spaces(site_id, zone);

CREATE TABLE IF NOT EXISTS tariffs (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    site_id VARCHAR(100) REFERENCES sites(id) ON DELETE SET NULL,
    type_formula VARCHAR(50) NOT NULL,
    duration VARCHAR(30) NOT NULL,
    amount_ar BIGINT NOT NULL CHECK (amount_ar >= 0),
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(100) PRIMARY KEY,
    contract_ref VARCHAR(50) NOT NULL UNIQUE,
    member_id VARCHAR(100) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    member_name VARCHAR(150) NOT NULL,
    vehicle_plate VARCHAR(30) NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    tariff_type VARCHAR(150) NOT NULL,
    monthly_amount_ar BIGINT NOT NULL CHECK (monthly_amount_ar >= 0),
    start_date VARCHAR(30) NOT NULL,
    end_date VARCHAR(30) NOT NULL,
    next_due_date VARCHAR(30) NOT NULL,
    days_remaining INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(30) NOT NULL DEFAULT 'a_jour'
);

CREATE TABLE IF NOT EXISTS payment_receipts (
    id VARCHAR(100) PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    date_time VARCHAR(50) NOT NULL,
    member_id VARCHAR(100) NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    member_name VARCHAR(150) NOT NULL,
    vehicle_plate VARCHAR(30),
    site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    site_name VARCHAR(150) NOT NULL,
    purpose TEXT NOT NULL,
    period VARCHAR(100) NOT NULL,
    amount_due_ar BIGINT NOT NULL CHECK (amount_due_ar >= 0),
    amount_paid_ar BIGINT NOT NULL CHECK (amount_paid_ar >= 0),
    remaining_balance_ar BIGINT NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL,
    cashier_name VARCHAR(150) NOT NULL,
    transaction_ref VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'confirme',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS receipts_member_idx ON payment_receipts(member_id);
CREATE INDEX IF NOT EXISTS receipts_site_idx ON payment_receipts(site_id);

CREATE TABLE IF NOT EXISTS membership_cards (
    id VARCHAR(100) PRIMARY KEY,
    card_number VARCHAR(50) NOT NULL UNIQUE,
    member_id VARCHAR(100) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    member_name VARCHAR(150) NOT NULL,
    site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    site_name VARCHAR(150) NOT NULL,
    primary_plate VARCHAR(30) NOT NULL,
    secondary_plate VARCHAR(30),
    issued_date VARCHAR(30) NOT NULL,
    expiration_date VARCHAR(30) NOT NULL,
    rfid_tag VARCHAR(100) NOT NULL,
    nfc_chip_type VARCHAR(100) NOT NULL DEFAULT 'NTAG216',
    qr_token VARCHAR(150) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'actif',
    printed_batch_ref VARCHAR(100),
    last_passage_timestamp VARCHAR(50),
    last_passage_gate VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS guards (
    id VARCHAR(100) PRIMARY KEY,
    matricule VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    title VARCHAR(150) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    team_id VARCHAR(80) NOT NULL,
    team_name VARCHAR(150) NOT NULL,
    is_team_leader BOOLEAN NOT NULL DEFAULT FALSE,
    team_leader_id VARCHAR(100),
    team_leader_name VARCHAR(150),
    rank_order INTEGER NOT NULL DEFAULT 2,
    orders_of_the_day JSONB NOT NULL DEFAULT '[]'::jsonb,
    shift_hours VARCHAR(50) NOT NULL,
    shift_name VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'en_poste',
    phone_flotte VARCHAR(30) NOT NULL,
    cin VARCHAR(30) NOT NULL,
    residence_lot TEXT NOT NULL,
    recruitment_date VARCHAR(30) NOT NULL,
    badge_rfid VARCHAR(80) NOT NULL,
    avatar_url TEXT,
    assigned_equipments JSONB NOT NULL DEFAULT '[]'::jsonb,
    shift_days JSONB NOT NULL,
    today_log JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS guards_site_idx ON guards(site_id);
CREATE INDEX IF NOT EXISTS guards_team_idx ON guards(team_id);

CREATE TABLE IF NOT EXISTS cash_registers (
    id VARCHAR(100) PRIMARY KEY,
    site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    site_name VARCHAR(150) NOT NULL,
    register_code VARCHAR(60) NOT NULL UNIQUE,
    cashier_name VARCHAR(150) NOT NULL,
    opened_at VARCHAR(50) NOT NULL,
    opening_balance_ar BIGINT NOT NULL DEFAULT 0,
    total_cash_collected_ar BIGINT NOT NULL DEFAULT 0,
    total_mobile_money_ar BIGINT NOT NULL DEFAULT 0,
    total_expenses_paid_ar BIGINT NOT NULL DEFAULT 0,
    current_cash_in_hand_ar BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ouverte'
);

CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(100) PRIMARY KEY,
    expense_number VARCHAR(50) NOT NULL UNIQUE,
    date VARCHAR(30) NOT NULL,
    site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    beneficiary VARCHAR(150) NOT NULL,
    amount_ar BIGINT NOT NULL CHECK (amount_ar > 0),
    payment_method VARCHAR(50) NOT NULL,
    requester_name VARCHAR(150) NOT NULL,
    approver_name VARCHAR(150),
    status VARCHAR(30) NOT NULL DEFAULT 'en_attente',
    justificatif_ref VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(100) PRIMARY KEY,
    inventory_code VARCHAR(50) NOT NULL UNIQUE,
    designation VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    model_specs TEXT NOT NULL,
    site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'operationnel',
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    responsible_name VARCHAR(150) NOT NULL,
    commissioning_date VARCHAR(30) NOT NULL,
    estimated_value_ar BIGINT NOT NULL DEFAULT 0,
    total_cycles VARCHAR(100),
    last_audit_date VARCHAR(30) NOT NULL,
    maintenance_history JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(100) PRIMARY KEY,
    ticket_code VARCHAR(50) NOT NULL UNIQUE,
    date VARCHAR(30) NOT NULL,
    site_id VARCHAR(100) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    reporter_name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL DEFAULT 'moyen',
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR(150),
    resolution_status VARCHAR(30) NOT NULL DEFAULT 'ouvert',
    resolution_notes TEXT,
    resolved_at VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS committee_members (
    id VARCHAR(100) PRIMARY KEY,
    role VARCHAR(80) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    site_id VARCHAR(100) REFERENCES sites(id) ON DELETE SET NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    avatar_url TEXT,
    monthly_indemnity_ar BIGINT NOT NULL DEFAULT 0,
    mandate_start VARCHAR(30) NOT NULL,
    mandate_end VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'actif'
);

CREATE TABLE IF NOT EXISTS governance_meetings (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    location VARCHAR(150) NOT NULL,
    agenda TEXT NOT NULL,
    summary_pv TEXT NOT NULL,
    resolutions_count INTEGER NOT NULL DEFAULT 1,
    document_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payrolls (
    id VARCHAR(100) PRIMARY KEY,
    slip_number VARCHAR(50) NOT NULL UNIQUE,
    period_month VARCHAR(50) NOT NULL,
    beneficiary_type VARCHAR(30) NOT NULL,
    beneficiary_id VARCHAR(100) NOT NULL,
    beneficiary_name VARCHAR(150) NOT NULL,
    role_title VARCHAR(150) NOT NULL,
    site_id VARCHAR(50) NOT NULL,
    site_name VARCHAR(150) NOT NULL,
    cin VARCHAR(30) NOT NULL,
    avatar_url TEXT,
    payment_method VARCHAR(50) NOT NULL,
    bank_account_or_phone VARCHAR(120) NOT NULL,
    base_salary_ar BIGINT NOT NULL,
    responsibility_bonus_ar BIGINT NOT NULL DEFAULT 0,
    night_shift_bonus_ar BIGINT NOT NULL DEFAULT 0,
    transport_bonus_ar BIGINT NOT NULL DEFAULT 0,
    performance_bonus_ar BIGINT NOT NULL DEFAULT 0,
    gross_salary_ar BIGINT NOT NULL,
    cnaps_deduction_ar BIGINT NOT NULL DEFAULT 0,
    ostie_deduction_ar BIGINT NOT NULL DEFAULT 0,
    irsa_deduction_ar BIGINT NOT NULL DEFAULT 0,
    advance_deduction_ar BIGINT NOT NULL DEFAULT 0,
    total_deductions_ar BIGINT NOT NULL DEFAULT 0,
    net_salary_ar BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'en_attente',
    generated_date VARCHAR(30) NOT NULL,
    approved_date VARCHAR(30),
    paid_date VARCHAR(30),
    approver_name VARCHAR(150),
    transaction_ref VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS payrolls_period_idx ON payrolls(period_month);
CREATE INDEX IF NOT EXISTS payrolls_type_idx ON payrolls(beneficiary_type);
CREATE INDEX IF NOT EXISTS payrolls_status_idx ON payrolls(status);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp VARCHAR(60) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    site_code VARCHAR(50) NOT NULL,
    module VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50) NOT NULL DEFAULT '127.0.0.1'
);

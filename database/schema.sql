-- Schéma complet de la base, généré depuis src/db/schema.ts (npx drizzle-kit generate).
-- Utilisé automatiquement au premier démarrage sur une base vide (ex. Render).
-- Après une modification de schema.ts : régénérer ce fichier.

CREATE TABLE "audit_logs" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"timestamp" varchar(60) NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"user_name" varchar(150) NOT NULL,
	"action" varchar(100) NOT NULL,
	"site_code" varchar(50) NOT NULL,
	"module" varchar(100) NOT NULL,
	"details" text NOT NULL,
	"ip_address" varchar(50) DEFAULT '127.0.0.1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_registers" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"site_id" varchar(100) NOT NULL,
	"site_name" varchar(150) NOT NULL,
	"register_code" varchar(60) NOT NULL,
	"cashier_name" varchar(150) NOT NULL,
	"opened_at" varchar(50) NOT NULL,
	"opening_balance_ar" bigint DEFAULT 0 NOT NULL,
	"total_cash_collected_ar" bigint DEFAULT 0 NOT NULL,
	"total_mobile_money_ar" bigint DEFAULT 0 NOT NULL,
	"total_expenses_paid_ar" bigint DEFAULT 0 NOT NULL,
	"current_cash_in_hand_ar" bigint DEFAULT 0 NOT NULL,
	"status" varchar(30) DEFAULT 'ouverte' NOT NULL,
	CONSTRAINT "cash_registers_register_code_unique" UNIQUE("register_code")
);
--> statement-breakpoint
CREATE TABLE "committee_members" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"role" varchar(80) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"site_id" varchar(100),
	"phone" varchar(30) NOT NULL,
	"email" varchar(150),
	"avatar_url" text,
	"monthly_indemnity_ar" bigint DEFAULT 0 NOT NULL,
	"mandate_start" varchar(30) NOT NULL,
	"mandate_end" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'actif' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"expense_number" varchar(50) NOT NULL,
	"date" varchar(30) NOT NULL,
	"site_id" varchar(100) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"beneficiary" varchar(150) NOT NULL,
	"amount_ar" bigint NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"requester_name" varchar(150) NOT NULL,
	"approver_name" varchar(150),
	"status" varchar(30) DEFAULT 'en_attente' NOT NULL,
	"justificatif_ref" varchar(100),
	"invoice_photo_url" text,
	"quantity" double precision,
	"unit" varchar(30),
	CONSTRAINT "expenses_expense_number_unique" UNIQUE("expense_number")
);
--> statement-breakpoint
CREATE TABLE "governance_meetings" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"date" varchar(30) NOT NULL,
	"title" varchar(200) NOT NULL,
	"location" varchar(150) NOT NULL,
	"agenda" text NOT NULL,
	"summary_pv" text NOT NULL,
	"resolutions_count" integer DEFAULT 1 NOT NULL,
	"document_pdf_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guards" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"matricule" varchar(50) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"title" varchar(150) NOT NULL,
	"grade" varchar(100) NOT NULL,
	"site_id" varchar(100) NOT NULL,
	"team_id" varchar(80) NOT NULL,
	"team_name" varchar(150) NOT NULL,
	"is_team_leader" boolean DEFAULT false NOT NULL,
	"team_leader_id" varchar(100),
	"team_leader_name" varchar(150),
	"rank_order" integer DEFAULT 2 NOT NULL,
	"orders_of_the_day" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shift_hours" varchar(50) NOT NULL,
	"shift_name" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'en_poste' NOT NULL,
	"phone_flotte" varchar(30) NOT NULL,
	"cin" varchar(30) NOT NULL,
	"residence_lot" text NOT NULL,
	"recruitment_date" varchar(30) NOT NULL,
	"badge_rfid" varchar(80) NOT NULL,
	"avatar_url" text,
	"assigned_equipments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shift_days" jsonb NOT NULL,
	"today_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guards_matricule_unique" UNIQUE("matricule")
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"ticket_code" varchar(50) NOT NULL,
	"date" varchar(30) NOT NULL,
	"site_id" varchar(100) NOT NULL,
	"reporter_name" varchar(150) NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(30) DEFAULT 'moyen' NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"assigned_to" varchar(150),
	"resolution_status" varchar(30) DEFAULT 'ouvert' NOT NULL,
	"resolution_notes" text,
	"resolved_at" varchar(50),
	"member_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vehicle_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "incidents_ticket_code_unique" UNIQUE("ticket_code")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"inventory_code" varchar(50) NOT NULL,
	"designation" varchar(200) NOT NULL,
	"category" varchar(50) NOT NULL,
	"model_specs" text NOT NULL,
	"site_id" varchar(100) NOT NULL,
	"location" varchar(150) NOT NULL,
	"status" varchar(50) DEFAULT 'operationnel' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"responsible_name" varchar(150) NOT NULL,
	"commissioning_date" varchar(30) NOT NULL,
	"estimated_value_ar" bigint DEFAULT 0 NOT NULL,
	"total_cycles" varchar(100),
	"last_audit_date" varchar(30) NOT NULL,
	"maintenance_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "inventory_items_inventory_code_unique" UNIQUE("inventory_code")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"member_number" varchar(50) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"category" varchar(50) DEFAULT 'standard' NOT NULL,
	"cin" varchar(30) NOT NULL,
	"cin_issued_date" varchar(30),
	"cin_issued_location" varchar(100),
	"phone" varchar(30) NOT NULL,
	"mobile_money_provider" varchar(30),
	"emergency_contact_name" varchar(150),
	"emergency_contact_phone" varchar(30),
	"address" text NOT NULL,
	"primary_site_id" varchar(100) NOT NULL,
	"joined_date" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'actif' NOT NULL,
	"current_balance_ar" bigint DEFAULT 0 NOT NULL,
	"avatar_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "members_member_number_unique" UNIQUE("member_number")
);
--> statement-breakpoint
CREATE TABLE "membership_cards" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"card_number" varchar(50) NOT NULL,
	"member_id" varchar(100) NOT NULL,
	"member_name" varchar(150) NOT NULL,
	"site_id" varchar(100) NOT NULL,
	"site_name" varchar(150) NOT NULL,
	"primary_plate" varchar(30) NOT NULL,
	"secondary_plate" varchar(30),
	"issued_date" varchar(30) NOT NULL,
	"expiration_date" varchar(30) NOT NULL,
	"rfid_tag" varchar(100) NOT NULL,
	"nfc_chip_type" varchar(100) DEFAULT 'NTAG216' NOT NULL,
	"qr_token" varchar(150) NOT NULL,
	"status" varchar(30) DEFAULT 'actif' NOT NULL,
	"printed_batch_ref" varchar(100),
	"last_passage_timestamp" varchar(50),
	"last_passage_gate" varchar(100),
	CONSTRAINT "membership_cards_card_number_unique" UNIQUE("card_number"),
	CONSTRAINT "membership_cards_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "parking_spaces" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"site_id" varchar(100) NOT NULL,
	"zone" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'libre' NOT NULL,
	"current_vehicle_plate" varchar(30),
	"current_vehicle_model" varchar(100),
	"current_driver_name" varchar(150),
	"entry_time" varchar(50),
	"duration" varchar(50),
	"assigned_abonnement" varchar(100),
	"rfid_uid" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "payment_receipts" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"date_time" varchar(50) NOT NULL,
	"member_id" varchar(100) NOT NULL,
	"member_name" varchar(150) NOT NULL,
	"vehicle_plate" varchar(30),
	"site_id" varchar(100) NOT NULL,
	"site_name" varchar(150) NOT NULL,
	"purpose" text NOT NULL,
	"period" varchar(100) NOT NULL,
	"amount_due_ar" bigint NOT NULL,
	"amount_paid_ar" bigint NOT NULL,
	"remaining_balance_ar" bigint DEFAULT 0 NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"cashier_name" varchar(150) NOT NULL,
	"transaction_ref" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'confirme' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "payrolls" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"slip_number" varchar(50) NOT NULL,
	"period_month" varchar(50) NOT NULL,
	"beneficiary_type" varchar(30) NOT NULL,
	"beneficiary_id" varchar(100) NOT NULL,
	"beneficiary_name" varchar(150) NOT NULL,
	"role_title" varchar(150) NOT NULL,
	"site_id" varchar(50) NOT NULL,
	"site_name" varchar(150) NOT NULL,
	"cin" varchar(30) NOT NULL,
	"avatar_url" text,
	"payment_method" varchar(50) NOT NULL,
	"bank_account_or_phone" varchar(120) NOT NULL,
	"base_salary_ar" bigint NOT NULL,
	"responsibility_bonus_ar" bigint DEFAULT 0 NOT NULL,
	"night_shift_bonus_ar" bigint DEFAULT 0 NOT NULL,
	"transport_bonus_ar" bigint DEFAULT 0 NOT NULL,
	"performance_bonus_ar" bigint DEFAULT 0 NOT NULL,
	"gross_salary_ar" bigint NOT NULL,
	"cnaps_deduction_ar" bigint DEFAULT 0 NOT NULL,
	"ostie_deduction_ar" bigint DEFAULT 0 NOT NULL,
	"irsa_deduction_ar" bigint DEFAULT 0 NOT NULL,
	"advance_deduction_ar" bigint DEFAULT 0 NOT NULL,
	"total_deductions_ar" bigint DEFAULT 0 NOT NULL,
	"net_salary_ar" bigint NOT NULL,
	"status" varchar(30) DEFAULT 'en_attente' NOT NULL,
	"generated_date" varchar(30) NOT NULL,
	"approved_date" varchar(30),
	"paid_date" varchar(30),
	"approver_name" varchar(150),
	"transaction_ref" varchar(120),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payrolls_slip_number_unique" UNIQUE("slip_number")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(150) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(100) DEFAULT 'Antananarivo' NOT NULL,
	"total_capacity" integer NOT NULL,
	"president_name" varchar(150) NOT NULL,
	"president_phone" varchar(30) NOT NULL,
	"tresorier_name" varchar(150) NOT NULL,
	"guard_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(30) DEFAULT 'actif' NOT NULL,
	"coordinates" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"contract_ref" varchar(50) NOT NULL,
	"member_id" varchar(100) NOT NULL,
	"member_name" varchar(150) NOT NULL,
	"vehicle_plate" varchar(30) NOT NULL,
	"vehicle_model" varchar(100) NOT NULL,
	"site_id" varchar(100) NOT NULL,
	"tariff_type" varchar(150) NOT NULL,
	"monthly_amount_ar" bigint NOT NULL,
	"start_date" varchar(30) NOT NULL,
	"end_date" varchar(30) NOT NULL,
	"next_due_date" varchar(30) NOT NULL,
	"days_remaining" integer DEFAULT 30 NOT NULL,
	"status" varchar(30) DEFAULT 'a_jour' NOT NULL,
	CONSTRAINT "subscriptions_contract_ref_unique" UNIQUE("contract_ref")
);
--> statement-breakpoint
CREATE TABLE "tariffs" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"category" varchar(100) NOT NULL,
	"site_id" varchar(100),
	"type_formula" varchar(50) NOT NULL,
	"duration" varchar(30) NOT NULL,
	"amount_ar" bigint NOT NULL,
	"description" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(50) NOT NULL,
	"site_id" varchar(100),
	"phone" varchar(30) NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_categories" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"label" varchar(100) NOT NULL,
	"description" text,
	CONSTRAINT "vehicle_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"license_plate" varchar(30) NOT NULL,
	"category" varchar(100) NOT NULL,
	"brand" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"color" varchar(50) NOT NULL,
	"member_id" varchar(100) NOT NULL,
	"site_id" varchar(100) NOT NULL,
	"spot_id" varchar(50),
	"rfid_tag" varchar(100),
	"barcode" varchar(100),
	"photo_url" text,
	"registered_at" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'actif' NOT NULL,
	"assigned_spot_type" varchar(50) DEFAULT 'placement_libre_interieur',
	CONSTRAINT "vehicles_license_plate_unique" UNIQUE("license_plate")
);
--> statement-breakpoint
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guards" ADD CONSTRAINT "guards_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_primary_site_id_sites_id_fk" FOREIGN KEY ("primary_site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_cards" ADD CONSTRAINT "membership_cards_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_cards" ADD CONSTRAINT "membership_cards_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking_spaces" ADD CONSTRAINT "parking_spaces_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariffs" ADD CONSTRAINT "tariffs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guards_site_idx" ON "guards" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "guards_team_idx" ON "guards" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_num_idx" ON "members" USING btree ("member_number");--> statement-breakpoint
CREATE INDEX "members_site_idx" ON "members" USING btree ("primary_site_id");--> statement-breakpoint
CREATE INDEX "spots_site_zone_idx" ON "parking_spaces" USING btree ("site_id","zone");--> statement-breakpoint
CREATE INDEX "receipts_member_idx" ON "payment_receipts" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "receipts_site_idx" ON "payment_receipts" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "payrolls_period_idx" ON "payrolls" USING btree ("period_month");--> statement-breakpoint
CREATE INDEX "payrolls_type_idx" ON "payrolls" USING btree ("beneficiary_type");--> statement-breakpoint
CREATE INDEX "payrolls_status_idx" ON "payrolls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_site_id_idx" ON "users" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_idx" ON "vehicles" USING btree ("license_plate");--> statement-breakpoint
CREATE INDEX "vehicles_member_idx" ON "vehicles" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "vehicles_site_idx" ON "vehicles" USING btree ("site_id");--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

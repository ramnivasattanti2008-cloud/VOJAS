-- ============================================================
-- VOJAS 2.0 — M1 Initial Migration
-- PostgreSQL 16 + PostGIS 3.4
--
-- Run via: npx prisma migrate deploy
-- ============================================================

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- ENUM TYPES
-- ────────────────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM (
  'ADMIN', 'OFFICER', 'ANALYST', 'REVIEWER', 'MP',
  'CONTRACTOR', 'CITIZEN', 'FIELD_OFFICER', 'VIEWER'
);

CREATE TYPE "ProjectStatus" AS ENUM (
  'PROPOSED', 'APPROVED', 'SANCTIONED', 'IN_PROGRESS',
  'COMPLETED', 'VERIFIED', 'CANCELLED', 'UNSANCTIONED'
);

CREATE TYPE "ProjectSector" AS ENUM (
  'PUBLIC_INFRASTRUCTURE', 'WATER_SANITATION', 'EDUCATION', 'HEALTH',
  'AGRICULTURE', 'ENVIRONMENT', 'TRANSPORT', 'ENERGY', 'HOUSING',
  'RURAL_DEVELOPMENT', 'SOCIAL_WELFARE', 'PUBLIC_ADMIN',
  'FINANCE_PROCUREMENT', 'JUSTICE', 'LEGISLATIVE', 'PUBLIC_SAFETY'
);

CREATE TYPE "ProjectEventType" AS ENUM (
  'PROPOSAL', 'APPROVAL', 'SANCTION', 'FUND_RELEASE',
  'CONTRACTOR_ASSIGNED', 'WORK_START', 'MILESTONE', 'PROGRESS_REPORT',
  'SATELLITE_OBSERVATION', 'CITIZEN_REPORT', 'FIELD_INSPECTION',
  'AI_ALERT', 'VERIFICATION', 'COMPLETION', 'ABANDONMENT'
);

CREATE TYPE "House" AS ENUM ('LOK_SABHA', 'RAJYA_SABHA');

CREATE TYPE "ConstituencyType" AS ENUM ('LOK_SABHA', 'RAJYA_SABHA', 'STATE_ASSEMBLY');

CREATE TYPE "AnomalyCategory" AS ENUM (
  'DUPLICATE', 'COST_OUTLIER', 'TIMELINE', 'BUDGET_OVERRUN',
  'STALLED', 'GEOGRAPHIC', 'COMPLIANCE', 'FINANCIAL', 'PROGRESS_DISCREPANCY'
);

CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "DataSourceStatus" AS ENUM ('ACTIVE', 'STALE', 'UNAVAILABLE', 'DEPRECATED');

CREATE TYPE "AuditAction" AS ENUM (
  'AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_FAILED_LOGIN', 'AUTH_TOKEN_REFRESH',
  'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_ROLE_CHANGED',
  'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
  'ANOMALY_DETECTED', 'ANOMALY_ACKNOWLEDGED', 'ANOMALY_RESOLVED',
  'ANOMALY_ESCALATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_VERIFIED',
  'DOCUMENT_REJECTED', 'SATELLITE_ANALYSIS_RUN', 'FINANCIAL_UPDATE',
  'VERIFICATION_COMPLETED', 'SYSTEM_CONFIG_CHANGED'
);

-- ────────────────────────────────────────────────────────────
-- TABLES
-- ────────────────────────────────────────────────────────────

-- Users
CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_email_key" UNIQUE ("email")
);

-- Sessions
CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- States
CREATE TABLE "states" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "region" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "states_code_key" UNIQUE ("code")
);

-- Districts
CREATE TABLE "districts" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "state_id" TEXT NOT NULL,
  "lgd_code" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "districts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "districts_lgd_code_key" UNIQUE ("lgd_code"),
  CONSTRAINT "districts_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE
);

-- Constituencies
CREATE TABLE "constituencies" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "district_id" TEXT NOT NULL,
  "type" "ConstituencyType" NOT NULL,
  "house" "House" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "constituencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "constituencies_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE
);

-- MPs
CREATE TABLE "mps" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "house" "House" NOT NULL,
  "constituency" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "term" TEXT NOT NULL,
  "party" TEXT,
  "lgd_code" TEXT,
  "state_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "mps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mps_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL
);

-- LGD Locations
CREATE TABLE "lgd_locations" (
  "id" TEXT NOT NULL,
  "lgd_code" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_canonical" TEXT,
  "parent_code" TEXT,
  "state_name" TEXT,
  "district_name" TEXT,
  "block_name" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "lgd_locations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lgd_locations_lgd_code_key" UNIQUE ("lgd_code")
);

-- Projects
CREATE TABLE "projects" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectStatus" NOT NULL DEFAULT 'PROPOSED',
  "sector" "ProjectSector" NOT NULL,
  "district" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "constituency" TEXT,
  "approved_amount" DOUBLE PRECISION NOT NULL,
  "spent_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "contractor" TEXT,
  "start_date" TIMESTAMPTZ(6),
  "expected_end_date" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "created_by_id" TEXT NOT NULL,
  "district_id" TEXT,
  "state_id" TEXT,
  "constituency_id" TEXT,
  "mp_id" TEXT,
  "source_data_source_id" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "location_source" TEXT,
  "boundary" JSONB,
  "boundary_source" TEXT,
  "boundary_quality" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MPLADS_PORTAL',
  "source_work_id" TEXT,
  "source_ref" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "projects_source_source_work_id_key" UNIQUE ("source", "source_work_id"),
  CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id"),
  CONSTRAINT "projects_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL,
  CONSTRAINT "projects_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL,
  CONSTRAINT "projects_constituency_id_fkey" FOREIGN KEY ("constituency_id") REFERENCES "constituencies"("id") ON DELETE SET NULL,
  CONSTRAINT "projects_mp_id_fkey" FOREIGN KEY ("mp_id") REFERENCES "mps"("id") ON DELETE SET NULL,
  CONSTRAINT "projects_source_data_source_id_fkey" FOREIGN KEY ("source_data_source_id") REFERENCES "data_sources"("id") ON DELETE SET NULL
);

-- Project Events
CREATE TABLE "project_events" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "event_type" "ProjectEventType" NOT NULL,
  "event_date" TIMESTAMPTZ(6) NOT NULL,
  "source" TEXT NOT NULL,
  "source_url" TEXT,
  "dataset" TEXT,
  "description" TEXT NOT NULL,
  "evidence_urls" JSONB,
  "actor" TEXT,
  "confidence" TEXT,
  "retrieval_date" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "project_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
);

-- Project Locations
CREATE TABLE "project_locations" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "label" TEXT,
  "address" TEXT,
  "landmark" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "verified_by_id" TEXT,
  "verified_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "project_locations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_locations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "project_locations_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Satellite Observations
CREATE TABLE "satellite_observations" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "observation_date" TIMESTAMPTZ(6) NOT NULL,
  "target_date" TIMESTAMPTZ(6),
  "target_difference" DOUBLE PRECISION,
  "provider" TEXT NOT NULL,
  "satellite" TEXT NOT NULL,
  "sensor" TEXT NOT NULL DEFAULT 'MSI',
  "dataset" TEXT NOT NULL,
  "scene_id" TEXT,
  "cloud_cover" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "resolution" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "bbox" JSONB,
  "tile_url" TEXT,
  "thumbnail_url" TEXT,
  "center_lat" DOUBLE PRECISION,
  "center_lng" DOUBLE PRECISION,
  "processing_date" TIMESTAMPTZ(6),
  "processing_level" TEXT,
  "quality" TEXT NOT NULL DEFAULT 'RAW',
  "project_coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rejection_reason" TEXT,
  "ndvi" DOUBLE PRECISION,
  "ndbi" DOUBLE PRECISION,
  "bsi" DOUBLE PRECISION,
  "built_up_area" DOUBLE PRECISION,
  "vegetation_area" DOUBLE PRECISION,
  "water_area" DOUBLE PRECISION,
  "construction_score" DOUBLE PRECISION,
  "source_url" TEXT,
  "source_name" TEXT,
  "retrieval_date" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "satellite_observations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "satellite_observations_scene_id_observation_date_key" UNIQUE ("scene_id", "observation_date"),
  CONSTRAINT "satellite_observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
);

-- Analysis Results
CREATE TABLE "analysis_results" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "observation_id" TEXT,
  "progress_id" TEXT,
  "analysis_type" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "score" DOUBLE PRECISION,
  "evidence_urls" JSONB,
  "map_tile_url" TEXT,
  "explanation" TEXT,
  "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
  "limitations" TEXT,
  "model_used" TEXT,
  "processing_time_ms" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "analysis_results_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "analysis_results_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "satellite_observations"("id") ON DELETE SET NULL,
  CONSTRAINT "analysis_results_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "progress_observations"("id") ON DELETE SET NULL
);

-- Progress Observations
CREATE TABLE "progress_observations" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "observation_id" TEXT,
  "report_date" TIMESTAMPTZ(6) NOT NULL,
  "observation_date" TIMESTAMPTZ(6),
  "reported_progress" DOUBLE PRECISION NOT NULL,
  "report_source" TEXT NOT NULL,
  "report_source_url" TEXT,
  "observed_change" DOUBLE PRECISION,
  "observable_area" DOUBLE PRECISION,
  "change_type" TEXT,
  "verification_result" TEXT,
  "confidence_level" TEXT,
  "explanation" TEXT,
  "data_quality" TEXT,
  "quality_factors" JSONB,
  "recommended_action" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "progress_observations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "progress_observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "progress_observations_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "satellite_observations"("id") ON DELETE SET NULL
);

-- Financial Observations
CREATE TABLE "financial_observations" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "date" TIMESTAMPTZ(6) NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "category" TEXT,
  "description" TEXT NOT NULL,
  "vendor" TEXT,
  "vendor_id" TEXT,
  "invoice_no" TEXT,
  "paid_on" TIMESTAMPTZ(6),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "source" TEXT NOT NULL,
  "source_txn_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "financial_observations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "financial_observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "financial_observations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "contractors"("id") ON DELETE SET NULL
);

-- Risk Findings
CREATE TABLE "risk_findings" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" "AnomalySeverity" NOT NULL DEFAULT 'MEDIUM',
  "description" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "assigned_to_id" TEXT,
  "acknowledged_by_id" TEXT,
  "acknowledged_at" TIMESTAMPTZ(6),
  "resolved_by_id" TEXT,
  "resolved_at" TIMESTAMPTZ(6),
  "resolution" TEXT,
  "law_escalation" BOOLEAN NOT NULL DEFAULT false,
  "law_authority" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "risk_findings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "risk_findings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "risk_findings_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "risk_findings_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "risk_findings_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Verification Cases
CREATE TABLE "verification_cases" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "finding_id" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "assigned_to_id" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "verification_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "verification_cases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "verification_cases_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "risk_findings"("id") ON DELETE SET NULL,
  CONSTRAINT "verification_cases_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Field Verifications
CREATE TABLE "field_verifications" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "case_id" TEXT,
  "assigned_to_id" TEXT NOT NULL,
  "location_desc" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "scheduled_date" TIMESTAMPTZ(6),
  "completed_date" TIMESTAMPTZ(6),
  "result" TEXT NOT NULL,
  "checklist" JSONB,
  "photos" JSONB,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "field_verifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "field_verifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "field_verifications_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "verification_cases"("id") ON DELETE SET NULL,
  CONSTRAINT "field_verifications_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id")
);

-- Documents
CREATE TABLE "documents" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "filename" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "verified_by_id" TEXT,
  "verified_at" TIMESTAMPTZ(6),
  "verification_note" TEXT,
  "uploaded_by_id" TEXT NOT NULL,
  "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "extracted_text" TEXT,
  "suggested_type" TEXT,
  "ai_confidence" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id"),
  CONSTRAINT "documents_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Contractors
CREATE TABLE "contractors" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_normalized" TEXT NOT NULL,
  "udayam_reg_no" TEXT,
  "district" TEXT,
  "state" TEXT,
  "total_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "project_count" INTEGER NOT NULL DEFAULT 0,
  "constituency_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "contractors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contractors_name_normalized_state_key" UNIQUE ("name_normalized", "state")
);

-- Contractor Updates
CREATE TABLE "contractor_updates" (
  "id" TEXT NOT NULL,
  "contractor_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "update_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "evidence_urls" JSONB,
  "amount" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "submitted_by_id" TEXT NOT NULL,
  "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMPTZ(6),
  "review_note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "contractor_updates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contractor_updates_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE CASCADE,
  CONSTRAINT "contractor_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "contractor_updates_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id"),
  CONSTRAINT "contractor_updates_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Data Sources
CREATE TABLE "data_sources" (
  "id" TEXT NOT NULL,
  "source_name" TEXT NOT NULL,
  "dataset_name" TEXT NOT NULL,
  "department" TEXT,
  "official_url" TEXT,
  "last_fetched" TIMESTAMPTZ(6),
  "last_updated" TIMESTAMPTZ(6),
  "format" TEXT NOT NULL,
  "api_available" BOOLEAN NOT NULL DEFAULT false,
  "download_available" BOOLEAN NOT NULL DEFAULT false,
  "status" "DataSourceStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "transformation_notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "data_sources_source_name_dataset_name_key" UNIQUE ("source_name", "dataset_name")
);

-- Data Source Records
CREATE TABLE "data_source_records" (
  "id" TEXT NOT NULL,
  "data_source_id" TEXT NOT NULL,
  "external_record_id" TEXT NOT NULL,
  "fetched_at" TIMESTAMPTZ(6) NOT NULL,
  "raw_payload" JSONB NOT NULL,
  "transformation_status" TEXT NOT NULL DEFAULT 'RAW',
  "quality" TEXT,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "data_source_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "data_source_records_data_source_id_external_record_id_key" UNIQUE ("data_source_id", "external_record_id"),
  CONSTRAINT "data_source_records_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id") ON DELETE CASCADE
);

-- Audit Events (APPEND-ONLY — enforced at service layer, not DB level)
CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "actor_type" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "metadata" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- ────────────────────────────────────────────────────────────
-- B-TREE INDEXES (Prisma defaults + extra)
-- ────────────────────────────────────────────────────────────

CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expires_at");

CREATE INDEX "districts_state_id_idx" ON "districts" ("state_id");

CREATE INDEX "constituencies_district_id_idx" ON "constituencies" ("district_id");
CREATE INDEX "constituencies_type_idx" ON "constituencies" ("type");

CREATE INDEX "mps_state_idx" ON "mps" ("state");
CREATE INDEX "mps_constituency_idx" ON "mps" ("constituency");
CREATE INDEX "mps_house_term_idx" ON "mps" ("house", "term");
CREATE INDEX "mps_state_id_idx" ON "mps" ("state_id");

CREATE INDEX "lgd_locations_entity_type_name_canonical_idx" ON "lgd_locations" ("entity_type", "name_canonical");
CREATE INDEX "lgd_locations_parent_code_idx" ON "lgd_locations" ("parent_code");

CREATE INDEX "projects_state_id_idx" ON "projects" ("state_id");
CREATE INDEX "projects_district_id_idx" ON "projects" ("district_id");
CREATE INDEX "projects_constituency_id_idx" ON "projects" ("constituency_id");
CREATE INDEX "projects_mp_id_idx" ON "projects" ("mp_id");
CREATE INDEX "projects_status_idx" ON "projects" ("status");
CREATE INDEX "projects_sector_idx" ON "projects" ("sector");
CREATE INDEX "projects_state_district_idx" ON "projects" ("state", "district");
CREATE INDEX "projects_sector_status_idx" ON "projects" ("sector", "status");
CREATE INDEX "projects_approved_amount_idx" ON "projects" ("approved_amount");
CREATE INDEX "projects_lat_lng_btree_idx" ON "projects" ("latitude", "longitude");

CREATE INDEX "project_events_project_id_event_date_idx" ON "project_events" ("project_id", "event_date");
CREATE INDEX "project_events_project_id_event_type_idx" ON "project_events" ("project_id", "event_type");
CREATE INDEX "project_events_event_type_idx" ON "project_events" ("event_type");
CREATE INDEX "project_events_source_idx" ON "project_events" ("source");

CREATE INDEX "project_locations_project_id_is_primary_idx" ON "project_locations" ("project_id", "is_primary");

CREATE INDEX "satellite_observations_scene_id_observation_date_unique" ON "satellite_observations" ("scene_id", "observation_date");
CREATE INDEX "satellite_observations_project_id_observation_date_idx" ON "satellite_observations" ("project_id", "observation_date");
CREATE INDEX "satellite_observations_project_id_target_date_idx" ON "satellite_observations" ("project_id", "target_date");
CREATE INDEX "satellite_observations_project_id_quality_idx" ON "satellite_observations" ("project_id", "quality");

CREATE INDEX "analysis_results_project_id_analysis_type_idx" ON "analysis_results" ("project_id", "analysis_type");
CREATE INDEX "analysis_results_project_id_created_at_idx" ON "analysis_results" ("project_id", "created_at");

CREATE INDEX "progress_observations_project_id_report_date_idx" ON "progress_observations" ("project_id", "report_date");
CREATE INDEX "progress_observations_project_id_verification_result_idx" ON "progress_observations" ("project_id", "verification_result");

CREATE INDEX "financial_observations_project_id_date_idx" ON "financial_observations" ("project_id", "date");
CREATE INDEX "financial_observations_project_id_type_idx" ON "financial_observations" ("project_id", "type");
CREATE INDEX "financial_observations_vendor_id_idx" ON "financial_observations" ("vendor_id");
CREATE INDEX "financial_observations_source_source_txn_id_idx" ON "financial_observations" ("source", "source_txn_id");

CREATE INDEX "risk_findings_project_id_idx" ON "risk_findings" ("project_id");
CREATE INDEX "risk_findings_status_idx" ON "risk_findings" ("status");
CREATE INDEX "risk_findings_severity_idx" ON "risk_findings" ("severity");
CREATE INDEX "risk_findings_law_escalation_law_authority_idx" ON "risk_findings" ("law_escalation", "law_authority");

CREATE INDEX "verification_cases_project_id_status_idx" ON "verification_cases" ("project_id", "status");
CREATE INDEX "verification_cases_assigned_to_id_idx" ON "verification_cases" ("assigned_to_id");
CREATE INDEX "verification_cases_priority_idx" ON "verification_cases" ("priority");

CREATE INDEX "field_verifications_project_id_idx" ON "field_verifications" ("project_id");
CREATE INDEX "field_verifications_case_id_idx" ON "field_verifications" ("case_id");
CREATE INDEX "field_verifications_assigned_to_id_idx" ON "field_verifications" ("assigned_to_id");
CREATE INDEX "field_verifications_result_idx" ON "field_verifications" ("result");

CREATE INDEX "documents_project_id_type_idx" ON "documents" ("project_id", "type");
CREATE INDEX "documents_project_id_status_idx" ON "documents" ("project_id", "status");
CREATE INDEX "documents_uploaded_at_idx" ON "documents" ("uploaded_at");

CREATE INDEX "contractors_name_normalized_idx" ON "contractors" ("name_normalized");

CREATE INDEX "contractor_updates_contractor_id_status_idx" ON "contractor_updates" ("contractor_id", "status");
CREATE INDEX "contractor_updates_project_id_idx" ON "contractor_updates" ("project_id");

CREATE INDEX "data_sources_status_idx" ON "data_sources" ("status");
CREATE INDEX "data_sources_source_name_idx" ON "data_sources" ("source_name");

CREATE INDEX "data_source_records_data_source_id_external_record_id_unique" ON "data_source_records" ("data_source_id", "external_record_id");
CREATE INDEX "data_source_records_data_source_id_transformation_status_idx" ON "data_source_records" ("data_source_id", "transformation_status");

CREATE INDEX "audit_events_actor_id_idx" ON "audit_events" ("actor_id");
CREATE INDEX "audit_events_action_idx" ON "audit_events" ("action");
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events" ("entity_type", "entity_id");
CREATE INDEX "audit_events_timestamp_idx" ON "audit_events" ("timestamp");

-- ────────────────────────────────────────────────────────────
-- POSTGIS SPATIAL INDEXES
-- ────────────────────────────────────────────────────────────

-- Spatial index on Project centroid (geography GIST — PostGIS)
CREATE INDEX "projects_location_geography_idx" ON "projects" USING GIST (
  ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
) WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

-- Spatial index on ProjectLocation (geography GIST — PostGIS)
CREATE INDEX "project_locations_location_geography_idx" ON "project_locations" USING GIST (
  ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
);

-- Composite indexes for common filter patterns
CREATE INDEX "projects_status_state_idx" ON "projects" ("status", "state");
CREATE INDEX "projects_sector_district_idx" ON "projects" ("sector", "district");
CREATE INDEX "project_events_project_date_idx" ON "project_events" ("project_id", "event_date" DESC);
CREATE INDEX "financial_observations_project_date_idx" ON "financial_observations" ("project_id", "date" DESC);

-- Completes the schema in the database.
-- The 20260101000000_init migration only creates 27 of the ~60 tables the
-- Prisma schema defines, so tables including reports, notifications,
-- anomalies, referrals, risk_signals and vendors did not exist in production.
-- POST /api/v1/reports failed with P2021 'The table public.reports does not
-- exist in the current database'.
--
-- Generated with: prisma migrate diff --from-migrations --to-schema-datamodel
-- Additive: no DROP TABLE. Dropped foreign keys and indexes are re-created
-- below, and the dropped columns are on tables that hold no rows.


-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('CONSTRUCTION_QUALITY', 'FINANCIAL_IRREGULARITY', 'DELAYED_WORK', 'ABANDONED_WORK', 'FAKE_DOCUMENTS', 'VENDOR_MISCONDUCT', 'LOCATION_MISMATCH', 'PROGRESS_MISMATCH', 'ENVIRONMENTAL_VIOLATION', 'SAFETY_HAZARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('SUBMITTED', 'RECEIVED', 'ASSIGNED', 'TRIAGED', 'PROJECT_MATCHED', 'REVIEW_QUEUE', 'UNDER_VERIFICATION', 'VERIFIED', 'RESOLVED', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ReportPrivacyLevel" AS ENUM ('PUBLIC', 'RESTRICTED', 'CONFIDENTIAL', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "ReportTriageStatus" AS ENUM ('PENDING', 'PROCESSING', 'CATEGORY_SUGGESTED', 'PROJECT_MATCHED', 'CLAIMS_EXTRACTED', 'DUPLICATES_CHECKED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportEvidenceQuality" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CitizenClaimType" AS ENUM ('PROJECT_NOT_STARTED', 'PROJECT_INCOMPLETE', 'QUALITY_CONCERN', 'LOCATION_CONCERN', 'DATE_CONCERN', 'FINANCIAL_CONCERN', 'SAFETY_CONCERN', 'CONTRACTOR_CONCERN', 'DOCUMENT_CONCERN', 'PROGRESS_CONCERN', 'OTHER');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('PUBLISH', 'RESTRICT', 'REQUEST_MORE_INFORMATION', 'REJECT', 'ESCALATE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ANOMALY_DETECTED', 'ANOMALY_ACKNOWLEDGED', 'ANOMALY_ESCALATED', 'ANOMALY_ESCALATED_TO_LAW', 'REPORT_SUBMITTED', 'REPORT_RECEIVED', 'REPORT_ASSIGNED', 'REPORT_STATUS_CHANGED', 'REPORT_MORE_INFO_REQUESTED', 'REPORT_VERIFIED', 'REPORT_RESOLVED', 'RISK_THRESHOLD', 'PROJECT_COMPLETED', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLACKLISTED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "ChangeClassification" AS ENUM ('NO_OBSERVABLE_CHANGE', 'LOW_OBSERVABLE_CHANGE', 'MODERATE_OBSERVABLE_CHANGE', 'HIGH_OBSERVABLE_CHANGE');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CheckpointAvailability" AS ENUM ('AVAILABLE', 'NO_USABLE_OBSERVATION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('SATELLITE_CHANGE', 'PROGRESS_FINANCIAL_MISMATCH', 'PROJECT_DELAY', 'COST_ANOMALY', 'DUPLICATE_PROJECT', 'GEOGRAPHIC_INCONSISTENCY', 'DOCUMENT_INCONSISTENCY', 'CITIZEN_OFFICIAL_DISCREPANCY', 'CONTRACTOR_PATTERN', 'ENVIRONMENTAL_RISK', 'INSPECTION_FRESHNESS');

-- CreateEnum
CREATE TYPE "RiskFindingStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'VERIFICATION_REQUIRED', 'RESOLVED', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "RiskRuleStatus" AS ENUM ('ENABLED', 'DISABLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ANOMALY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ANOMALY_DISMISSED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_RESOLVED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_MODERATED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_PROJECT_LINKED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_CLAIMS_EXTRACTED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_MEDIA_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_IDENTITY_ACCESSED';
ALTER TYPE "AuditAction" ADD VALUE 'VENDOR_REGISTERED';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'RISK_FINDING_DETECTED';
ALTER TYPE "AuditAction" ADD VALUE 'RISK_FINDING_ACKNOWLEDGED';
ALTER TYPE "AuditAction" ADD VALUE 'RISK_FINDING_RESOLVED';
ALTER TYPE "AuditAction" ADD VALUE 'RISK_FINDING_DISMISSED';
ALTER TYPE "AuditAction" ADD VALUE 'RISK_FINDING_ESCALATED';
ALTER TYPE "AuditAction" ADD VALUE 'RISK_SIGNAL_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'RISK_RULE_TRIGGERED';
ALTER TYPE "AuditAction" ADD VALUE 'RISK_SCORE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ANOMALY_NOTE_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'ANOMALY_INFO_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'ANOMALY_INSPECTION_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'ANOMALY_CONTRACTOR_RESPONSE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'ANOMALY_VERIFIED';
ALTER TYPE "AuditAction" ADD VALUE 'ANOMALY_REOPENED';
ALTER TYPE "AuditAction" ADD VALUE 'ANOMALY_EVIDENCE_LINKED';
ALTER TYPE "AuditAction" ADD VALUE 'FIELD_VERIFICATION_SCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE 'FIELD_VERIFICATION_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTRACTOR_UPDATE_REVIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'VERIFICATION_CASE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTRACTOR_UPDATE_SUBMITTED';

-- DropForeignKey
ALTER TABLE "analysis_results" DROP CONSTRAINT "analysis_results_observation_id_fkey";

-- DropForeignKey
ALTER TABLE "analysis_results" DROP CONSTRAINT "analysis_results_progress_id_fkey";

-- DropForeignKey
ALTER TABLE "analysis_results" DROP CONSTRAINT "analysis_results_project_id_fkey";

-- DropForeignKey
ALTER TABLE "constituencies" DROP CONSTRAINT "constituencies_district_id_fkey";

-- DropForeignKey
ALTER TABLE "contractor_updates" DROP CONSTRAINT "contractor_updates_contractor_id_fkey";

-- DropForeignKey
ALTER TABLE "contractor_updates" DROP CONSTRAINT "contractor_updates_project_id_fkey";

-- DropForeignKey
ALTER TABLE "contractor_updates" DROP CONSTRAINT "contractor_updates_reviewed_by_id_fkey";

-- DropForeignKey
ALTER TABLE "contractor_updates" DROP CONSTRAINT "contractor_updates_submitted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "data_source_records" DROP CONSTRAINT "data_source_records_data_source_id_fkey";

-- DropForeignKey
ALTER TABLE "districts" DROP CONSTRAINT "districts_state_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_project_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_uploaded_by_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_verified_by_id_fkey";

-- DropForeignKey
ALTER TABLE "field_verifications" DROP CONSTRAINT "field_verifications_assigned_to_id_fkey";

-- DropForeignKey
ALTER TABLE "field_verifications" DROP CONSTRAINT "field_verifications_case_id_fkey";

-- DropForeignKey
ALTER TABLE "field_verifications" DROP CONSTRAINT "field_verifications_project_id_fkey";

-- DropForeignKey
ALTER TABLE "financial_observations" DROP CONSTRAINT "financial_observations_project_id_fkey";

-- DropForeignKey
ALTER TABLE "financial_observations" DROP CONSTRAINT "financial_observations_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "mps" DROP CONSTRAINT "mps_state_id_fkey";

-- DropForeignKey
ALTER TABLE "progress_observations" DROP CONSTRAINT "progress_observations_observation_id_fkey";

-- DropForeignKey
ALTER TABLE "progress_observations" DROP CONSTRAINT "progress_observations_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_events" DROP CONSTRAINT "project_events_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_locations" DROP CONSTRAINT "project_locations_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_locations" DROP CONSTRAINT "project_locations_verified_by_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_constituency_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_district_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_mp_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_source_data_source_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_state_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_findings" DROP CONSTRAINT "risk_findings_acknowledged_by_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_findings" DROP CONSTRAINT "risk_findings_assigned_to_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_findings" DROP CONSTRAINT "risk_findings_project_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_findings" DROP CONSTRAINT "risk_findings_resolved_by_id_fkey";

-- DropForeignKey
ALTER TABLE "satellite_observations" DROP CONSTRAINT "satellite_observations_project_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "verification_cases" DROP CONSTRAINT "verification_cases_assigned_to_id_fkey";

-- DropForeignKey
ALTER TABLE "verification_cases" DROP CONSTRAINT "verification_cases_finding_id_fkey";

-- DropForeignKey
ALTER TABLE "verification_cases" DROP CONSTRAINT "verification_cases_project_id_fkey";

-- DropIndex
DROP INDEX "data_source_records_data_source_id_external_record_id_unique";

-- DropIndex
DROP INDEX "data_source_records_data_source_id_transformation_status_idx";

-- DropIndex
DROP INDEX "financial_observations_project_date_idx";

-- DropIndex
DROP INDEX "project_events_project_date_idx";

-- DropIndex
DROP INDEX "projects_sector_district_idx";

-- DropIndex
DROP INDEX "projects_status_state_idx";

-- DropIndex
DROP INDEX "risk_findings_law_escalation_law_authority_idx";

-- DropIndex
DROP INDEX "satellite_observations_scene_id_observation_date_unique";

-- AlterTable
ALTER TABLE "contractor_updates" DROP COLUMN "review_note",
DROP COLUMN "update_type",
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "updateType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "data_source_records" DROP COLUMN "transformation_status",
ADD COLUMN     "transformationStatus" TEXT NOT NULL DEFAULT 'RAW';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "vendor_id" TEXT;

-- AlterTable
ALTER TABLE "risk_findings" ADD COLUMN     "algorithm_version" TEXT NOT NULL DEFAULT 'rule-engine-v1.0',
ADD COLUMN     "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "first_observed_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_observed_at" TIMESTAMPTZ(6),
ADD COLUMN     "limitations" TEXT,
ADD COLUMN     "recommended_action" TEXT,
ADD COLUMN     "risk_score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "signal_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "evidence" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "RiskFindingStatus" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "satellite_observations" ADD COLUMN     "selection_reason" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "last_login_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "satellite_analyses" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "observation_before_id" TEXT,
    "observation_after_id" TEXT,
    "analysis_type" TEXT NOT NULL,
    "analysis_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseline_date" TIMESTAMPTZ(6),
    "comparison_date" TIMESTAMPTZ(6),
    "change_classification" TEXT NOT NULL,
    "change_area" DOUBLE PRECISION,
    "change_percent" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "methodology" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "limitations" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "satellite_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_analyses" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "observation_before_id" TEXT,
    "observation_after_id" TEXT,
    "analysis_type" TEXT NOT NULL,
    "primary_signal" TEXT NOT NULL,
    "sector" TEXT,
    "comparison_mode" TEXT NOT NULL DEFAULT 'CUSTOM',
    "geometry_type" TEXT NOT NULL,
    "analysis_buffer_m" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "geometry_ref" JSONB,
    "total_area_m2" DOUBLE PRECISION,
    "valid_area_m2" DOUBLE PRECISION,
    "changed_area_m2" DOUBLE PRECISION,
    "change_percent" DOUBLE PRECISION,
    "ndvi_before" DOUBLE PRECISION,
    "ndvi_after" DOUBLE PRECISION,
    "ndvi_delta" DOUBLE PRECISION,
    "ndbi_before" DOUBLE PRECISION,
    "ndbi_after" DOUBLE PRECISION,
    "ndbi_delta" DOUBLE PRECISION,
    "bsi_before" DOUBLE PRECISION,
    "bsi_after" DOUBLE PRECISION,
    "bsi_delta" DOUBLE PRECISION,
    "control_area_change_percent" DOUBLE PRECISION,
    "delta_ratio" DOUBLE PRECISION,
    "cloud_percent_before" DOUBLE PRECISION,
    "cloud_percent_after" DOUBLE PRECISION,
    "valid_pixels_percent" DOUBLE PRECISION,
    "change_classification" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "confidence_factors" JSONB,
    "change_regions" JSONB,
    "change_story" TEXT,
    "reported_progress_comparison" TEXT,
    "evidence_package" JSONB,
    "methodology" TEXT NOT NULL,
    "limitations" TEXT,
    "processing_status" TEXT NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT,
    "algorithm_version" TEXT NOT NULL DEFAULT 'change-v1.0',
    "run_parameters" JSONB,
    "parameters_hash" TEXT,
    "job_id" TEXT,
    "error_message" TEXT,
    "processing_time_ms" INTEGER,
    "analysis_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseline_date" TIMESTAMPTZ(6),
    "comparison_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "change_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satellite_weekly_checkpoints" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "target_date" TIMESTAMPTZ(6) NOT NULL,
    "observation_id" TEXT,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "window_end" TIMESTAMPTZ(6) NOT NULL,
    "availability" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "reason" TEXT,
    "target_difference" INTEGER,
    "methodology" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "satellite_weekly_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "finding_id" TEXT,
    "destination_authority" TEXT NOT NULL,
    "reference_no" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dossier" JSONB NOT NULL,
    "notes" TEXT,
    "prepared_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "referred_at" TIMESTAMPTZ(6),
    "acknowledged_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_signals" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "signalType" "SignalType" NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "detected_at" TIMESTAMPTZ(6) NOT NULL,
    "observation_date" TIMESTAMPTZ(6),
    "severity" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "expectedValue" DOUBLE PRECISION,
    "deviation" DOUBLE PRECISION,
    "explanation" TEXT,
    "evidenceReferences" JSONB,
    "metadata" JSONB,
    "algorithm_version" TEXT NOT NULL DEFAULT 'rule-engine-v1.0',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "risk_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "status" "RiskRuleStatus" NOT NULL DEFAULT 'ENABLED',
    "conditions" JSONB NOT NULL,
    "severityModifier" TEXT NOT NULL,
    "confidenceModifier" TEXT NOT NULL,
    "explanationTemplate" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run" TIMESTAMPTZ(6),
    "match_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "risk_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_rule_versions" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "severityModifier" TEXT NOT NULL,
    "confidenceModifier" TEXT NOT NULL,
    "explanationTemplate" TEXT NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "risk_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_events" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "riskScore" INTEGER,
    "finding_id" TEXT,
    "relatedSignalIds" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomalies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AnomalyCategory" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL DEFAULT 'MEDIUM',
    "risk_score" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "rule_code" TEXT,
    "project_id" TEXT,
    "report_id" TEXT,
    "vendor_id" TEXT,
    "evidence" JSONB,
    "acknowledged_by_id" TEXT,
    "acknowledged_at" TIMESTAMPTZ(6),
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution" TEXT,
    "law_escalation" BOOLEAN NOT NULL DEFAULT false,
    "law_authority" TEXT,
    "law_reference_no" TEXT,
    "law_escalated_at" TIMESTAMPTZ(6),
    "law_escalated_by_id" TEXT,
    "law_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "law_notes" TEXT,
    "ai_explanation" TEXT,
    "ai_confidence" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AnomalyCategory" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL DEFAULT 'MEDIUM',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "params" JSONB,
    "last_run" TIMESTAMPTZ(6),
    "match_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "anomaly_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "report_reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "severity" "ReportSeverity" NOT NULL DEFAULT 'LOW',
    "status" "ReportStatus" NOT NULL DEFAULT 'RECEIVED',
    "reporter_name" TEXT,
    "reporter_email" TEXT,
    "reporter_phone" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "privacy_level" "ReportPrivacyLevel" NOT NULL DEFAULT 'RESTRICTED',
    "location_desc" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location_accuracy_m" DOUBLE PRECISION,
    "incident_date" TIMESTAMPTZ(6),
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triage_status" "ReportTriageStatus" NOT NULL DEFAULT 'PENDING',
    "ai_triage" JSONB,
    "ai_analyzed_at" TIMESTAMPTZ(6),
    "evidence_quality" "ReportEvidenceQuality",
    "project_id" TEXT,
    "assigned_to_id" TEXT,
    "resolution" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "whistleblower_token" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_status_logs" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "from_status" "ReportStatus",
    "to_status" "ReportStatus" NOT NULL,
    "changed_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_media" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "capture_date" TIMESTAMPTZ(6),
    "capture_lat" DOUBLE PRECISION,
    "capture_lng" DOUBLE PRECISION,
    "strip_location" BOOLEAN NOT NULL DEFAULT false,
    "forensic_status" TEXT NOT NULL DEFAULT 'PENDING',
    "forensic_signals" JSONB,
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizen_claims" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "claim_type" "CitizenClaimType" NOT NULL,
    "claim_text" TEXT NOT NULL,
    "extracted_entities" JSONB,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidence_references" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "verification_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citizen_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_moderations" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_moderations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_identities" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone_hash" TEXT,
    "name" TEXT,
    "access_token" TEXT NOT NULL,
    "access_token_exp" TIMESTAMPTZ(6) NOT NULL,
    "notify_email" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reporter_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_report_accesses" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "access_token_exp" TIMESTAMPTZ(6) NOT NULL,
    "can_view_status" BOOLEAN NOT NULL DEFAULT true,
    "can_view_updates" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anonymous_report_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "udyam_reg_no" TEXT,
    "pan" TEXT,
    "gstin" TEXT,
    "district" TEXT,
    "state" TEXT,
    "total_contracts" INTEGER NOT NULL DEFAULT 0,
    "total_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "source" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resource" TEXT,
    "resource_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_risks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "financial_score" INTEGER NOT NULL DEFAULT 0,
    "satellite_score" INTEGER NOT NULL DEFAULT 0,
    "progress_score" INTEGER NOT NULL DEFAULT 0,
    "document_score" INTEGER NOT NULL DEFAULT 0,
    "citizen_score" INTEGER NOT NULL DEFAULT 0,
    "contractor_score" INTEGER NOT NULL DEFAULT 0,
    "geographic_score" INTEGER NOT NULL DEFAULT 0,
    "correlation_score" INTEGER NOT NULL DEFAULT 0,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "primary_driver" TEXT,
    "drivers" JSONB,
    "findings_count" INTEGER NOT NULL DEFAULT 0,
    "signals_count" INTEGER NOT NULL DEFAULT 0,
    "source_diversity" INTEGER NOT NULL DEFAULT 0,
    "algorithm_version" TEXT NOT NULL DEFAULT 'rule-engine-v1.0',
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'DAILY',
    "snapshot_date" TIMESTAMPTZ(6) NOT NULL,
    "metrics" JSONB NOT NULL,
    "dataQuality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "coverage" JSONB,
    "model_version" TEXT NOT NULL DEFAULT 'analytics-v1.0',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_series" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'DAILY',
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "numerator" DOUBLE PRECISION,
    "denominator" DOUBLE PRECISION,
    "change" DOUBLE PRECISION,
    "changePct" DOUBLE PRECISION,
    "rollingAvg7" DOUBLE PRECISION,
    "rollingAvg30" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dataQuality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "observation_count" INTEGER NOT NULL DEFAULT 0,
    "model_version" TEXT NOT NULL DEFAULT 'analytics-v1.0',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "model_type" TEXT NOT NULL,
    "description" TEXT,
    "parameters" JSONB,
    "features" JSONB,
    "training_start" TIMESTAMPTZ(6),
    "training_end" TIMESTAMPTZ(6),
    "data_count" INTEGER NOT NULL DEFAULT 0,
    "evaluation_metrics" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecasts" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "forecast_type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "lower_bound" DOUBLE PRECISION NOT NULL,
    "upper_bound" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "probability" DOUBLE PRECISION,
    "model_version_id" TEXT,
    "model_type" TEXT NOT NULL DEFAULT 'BASELINE',
    "prediction_date" TIMESTAMPTZ(6) NOT NULL,
    "horizon_days" INTEGER NOT NULL DEFAULT 30,
    "observation_count" INTEGER NOT NULL DEFAULT 0,
    "evidence" JSONB,
    "explanation" TEXT,
    "limitations" TEXT,
    "data_quality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "data_freshness" TEXT NOT NULL DEFAULT 'RECENT',
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_observations" (
    "id" TEXT NOT NULL,
    "forecast_id" TEXT NOT NULL,
    "actual_value" DOUBLE PRECISION NOT NULL,
    "prediction_date" TIMESTAMPTZ(6) NOT NULL,
    "actual_date" TIMESTAMPTZ(6) NOT NULL,
    "error" DOUBLE PRECISION NOT NULL,
    "absolute_error" DOUBLE PRECISION NOT NULL,
    "within_interval" BOOLEAN NOT NULL,
    "mape" DOUBLE PRECISION,
    "model_version_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group_type" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "min_projects" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "benchmark_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_results" (
    "id" TEXT NOT NULL,
    "benchmark_group_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "min" DOUBLE PRECISION NOT NULL,
    "p10" DOUBLE PRECISION NOT NULL,
    "p25" DOUBLE PRECISION NOT NULL,
    "median" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION NOT NULL,
    "p90" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,
    "mean" DOUBLE PRECISION NOT NULL,
    "stdDev" DOUBLE PRECISION,
    "count" INTEGER NOT NULL,
    "below_peer_pct" DOUBLE PRECISION,
    "within_peer_pct" DOUBLE PRECISION,
    "above_peer_pct" DOUBLE PRECISION,
    "model_version" TEXT NOT NULL DEFAULT 'analytics-v1.0',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_insights" (
    "id" TEXT NOT NULL,
    "insight_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" TEXT,
    "direction" TEXT,
    "time_window" TEXT NOT NULL,
    "affected_entities" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "recommended_action" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "data_quality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "engine_version" TEXT NOT NULL DEFAULT 'analytics-v1.0',
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_until" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotspots" (
    "id" TEXT NOT NULL,
    "location_type" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "state_code" TEXT,
    "metric" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "intensity" DOUBLE PRECISION NOT NULL,
    "project_count" INTEGER NOT NULL,
    "finding_count" INTEGER NOT NULL DEFAULT 0,
    "avg_risk_score" DOUBLE PRECISION NOT NULL,
    "time_window" TEXT NOT NULL DEFAULT 'last_30_days',
    "trend" TEXT NOT NULL DEFAULT 'STABLE',
    "trend_change" DOUBLE PRECISION,
    "evidence" JSONB NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "data_quality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "model_version" TEXT NOT NULL DEFAULT 'analytics-v1.0',
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotspots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_analyses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "scenario_type" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "baseline_value" DOUBLE PRECISION NOT NULL,
    "scenario_value" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "difference_pct" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assumptions" JSONB NOT NULL,
    "limitations" TEXT,
    "model_version" TEXT NOT NULL DEFAULT 'analytics-v1.0',
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenario_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractor_metrics" (
    "id" TEXT NOT NULL,
    "contractor_id" TEXT NOT NULL,
    "contractor_name" TEXT NOT NULL,
    "total_projects" INTEGER NOT NULL DEFAULT 0,
    "active_projects" INTEGER NOT NULL DEFAULT 0,
    "completed_projects" INTEGER NOT NULL DEFAULT 0,
    "avg_delay_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_utilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "anomaly_count" INTEGER NOT NULL DEFAULT 0,
    "risk_distribution" JSONB,
    "delay_trend" TEXT NOT NULL DEFAULT 'STABLE',
    "risk_trend" TEXT NOT NULL DEFAULT 'STABLE',
    "document_consistency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "satellite_consistency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verification_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "citizen_report_count" INTEGER NOT NULL DEFAULT 0,
    "data_coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model_version" TEXT NOT NULL DEFAULT 'analytics-v1.0',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contractor_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constituency_analytics" (
    "id" TEXT NOT NULL,
    "constituency_id" TEXT NOT NULL,
    "constituency_name" TEXT NOT NULL,
    "district_name" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "project_count" INTEGER NOT NULL DEFAULT 0,
    "active_project_count" INTEGER NOT NULL DEFAULT 0,
    "completed_project_count" INTEGER NOT NULL DEFAULT 0,
    "total_sanctioned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_utilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "high_risk_count" INTEGER NOT NULL DEFAULT 0,
    "critical_risk_count" INTEGER NOT NULL DEFAULT 0,
    "delayed_project_count" INTEGER NOT NULL DEFAULT 0,
    "avg_delay_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "open_anomaly_count" INTEGER NOT NULL DEFAULT 0,
    "citizen_report_count" INTEGER NOT NULL DEFAULT 0,
    "risk_trend" TEXT NOT NULL DEFAULT 'STABLE',
    "delay_trend" TEXT NOT NULL DEFAULT 'STABLE',
    "utilization_trend" TEXT NOT NULL DEFAULT 'STABLE',
    "satellite_coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model_version" TEXT NOT NULL DEFAULT 'analytics-v1.0',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "constituency_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state_analytics" (
    "id" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "state_name" TEXT NOT NULL,
    "district_count" INTEGER NOT NULL DEFAULT 0,
    "constituency_count" INTEGER NOT NULL DEFAULT 0,
    "project_count" INTEGER NOT NULL DEFAULT 0,
    "active_project_count" INTEGER NOT NULL DEFAULT 0,
    "completed_project_count" INTEGER NOT NULL DEFAULT 0,
    "total_sanctioned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_utilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "high_risk_count" INTEGER NOT NULL DEFAULT 0,
    "critical_risk_count" INTEGER NOT NULL DEFAULT 0,
    "delayed_project_count" INTEGER NOT NULL DEFAULT 0,
    "avg_delay_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "open_anomaly_count" INTEGER NOT NULL DEFAULT 0,
    "citizen_report_count" INTEGER NOT NULL DEFAULT 0,
    "risk_trend" TEXT NOT NULL DEFAULT 'STABLE',
    "delay_trend" TEXT NOT NULL DEFAULT 'STABLE',
    "utilization_trend" TEXT NOT NULL DEFAULT 'STABLE',
    "satellite_coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model_version" TEXT NOT NULL DEFAULT 'analytics-v1.0',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "state_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "satellite_analyses_project_id_analysis_type_created_at_idx" ON "satellite_analyses"("project_id", "analysis_type", "created_at");

-- CreateIndex
CREATE INDEX "satellite_analyses_observation_before_id_idx" ON "satellite_analyses"("observation_before_id");

-- CreateIndex
CREATE INDEX "satellite_analyses_observation_after_id_idx" ON "satellite_analyses"("observation_after_id");

-- CreateIndex
CREATE INDEX "satellite_analyses_change_classification_idx" ON "satellite_analyses"("change_classification");

-- CreateIndex
CREATE INDEX "change_analyses_project_id_analysis_type_created_at_idx" ON "change_analyses"("project_id", "analysis_type", "created_at");

-- CreateIndex
CREATE INDEX "change_analyses_project_id_processing_status_idx" ON "change_analyses"("project_id", "processing_status");

-- CreateIndex
CREATE INDEX "change_analyses_observation_before_id_idx" ON "change_analyses"("observation_before_id");

-- CreateIndex
CREATE INDEX "change_analyses_observation_after_id_idx" ON "change_analyses"("observation_after_id");

-- CreateIndex
CREATE INDEX "change_analyses_change_classification_idx" ON "change_analyses"("change_classification");

-- CreateIndex
CREATE INDEX "change_analyses_parameters_hash_idx" ON "change_analyses"("parameters_hash");

-- CreateIndex
CREATE INDEX "satellite_weekly_checkpoints_project_id_target_date_idx" ON "satellite_weekly_checkpoints"("project_id", "target_date");

-- CreateIndex
CREATE INDEX "satellite_weekly_checkpoints_availability_idx" ON "satellite_weekly_checkpoints"("availability");

-- CreateIndex
CREATE UNIQUE INDEX "satellite_weekly_checkpoints_project_id_target_date_key" ON "satellite_weekly_checkpoints"("project_id", "target_date");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_reference_no_key" ON "referrals"("reference_no");

-- CreateIndex
CREATE INDEX "referrals_case_id_idx" ON "referrals"("case_id");

-- CreateIndex
CREATE INDEX "referrals_project_id_idx" ON "referrals"("project_id");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referrals_destination_authority_idx" ON "referrals"("destination_authority");

-- CreateIndex
CREATE INDEX "risk_signals_project_id_idx" ON "risk_signals"("project_id");

-- CreateIndex
CREATE INDEX "risk_signals_signalType_idx" ON "risk_signals"("signalType");

-- CreateIndex
CREATE INDEX "risk_signals_severity_idx" ON "risk_signals"("severity");

-- CreateIndex
CREATE INDEX "risk_signals_confidence_idx" ON "risk_signals"("confidence");

-- CreateIndex
CREATE INDEX "risk_signals_detected_at_idx" ON "risk_signals"("detected_at");

-- CreateIndex
CREATE INDEX "risk_signals_project_id_signalType_detected_at_idx" ON "risk_signals"("project_id", "signalType", "detected_at");

-- CreateIndex
CREATE INDEX "risk_rules_category_idx" ON "risk_rules"("category");

-- CreateIndex
CREATE INDEX "risk_rules_status_idx" ON "risk_rules"("status");

-- CreateIndex
CREATE INDEX "risk_rules_version_idx" ON "risk_rules"("version");

-- CreateIndex
CREATE INDEX "risk_rule_versions_rule_id_version_idx" ON "risk_rule_versions"("rule_id", "version");

-- CreateIndex
CREATE INDEX "risk_rule_versions_rule_id_isActive_idx" ON "risk_rule_versions"("rule_id", "isActive");

-- CreateIndex
CREATE INDEX "risk_events_project_id_created_at_idx" ON "risk_events"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "risk_events_eventType_idx" ON "risk_events"("eventType");

-- CreateIndex
CREATE INDEX "risk_events_finding_id_idx" ON "risk_events"("finding_id");

-- CreateIndex
CREATE INDEX "anomalies_severity_idx" ON "anomalies"("severity");

-- CreateIndex
CREATE INDEX "anomalies_status_idx" ON "anomalies"("status");

-- CreateIndex
CREATE INDEX "anomalies_category_idx" ON "anomalies"("category");

-- CreateIndex
CREATE INDEX "anomalies_project_id_idx" ON "anomalies"("project_id");

-- CreateIndex
CREATE INDEX "anomalies_created_at_idx" ON "anomalies"("created_at");

-- CreateIndex
CREATE INDEX "anomalies_rule_code_idx" ON "anomalies"("rule_code");

-- CreateIndex
CREATE INDEX "anomalies_law_escalation_law_authority_idx" ON "anomalies"("law_escalation", "law_authority");

-- CreateIndex
CREATE INDEX "anomalies_project_id_rule_code_status_idx" ON "anomalies"("project_id", "rule_code", "status");

-- CreateIndex
CREATE UNIQUE INDEX "anomaly_rules_code_key" ON "anomaly_rules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reports_report_reference_key" ON "reports"("report_reference");

-- CreateIndex
CREATE INDEX "reports_report_reference_idx" ON "reports"("report_reference");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_category_idx" ON "reports"("category");

-- CreateIndex
CREATE INDEX "reports_severity_idx" ON "reports"("severity");

-- CreateIndex
CREATE INDEX "reports_triage_status_idx" ON "reports"("triage_status");

-- CreateIndex
CREATE INDEX "reports_project_id_idx" ON "reports"("project_id");

-- CreateIndex
CREATE INDEX "reports_assigned_to_id_idx" ON "reports"("assigned_to_id");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- CreateIndex
CREATE INDEX "reports_submitted_at_idx" ON "reports"("submitted_at");

-- CreateIndex
CREATE INDEX "reports_latitude_longitude_idx" ON "reports"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "reports_source_idx" ON "reports"("source");

-- CreateIndex
CREATE INDEX "report_status_logs_report_id_idx" ON "report_status_logs"("report_id");

-- CreateIndex
CREATE INDEX "report_media_report_id_idx" ON "report_media"("report_id");

-- CreateIndex
CREATE INDEX "citizen_claims_report_id_idx" ON "citizen_claims"("report_id");

-- CreateIndex
CREATE INDEX "citizen_claims_claim_type_idx" ON "citizen_claims"("claim_type");

-- CreateIndex
CREATE INDEX "citizen_claims_status_idx" ON "citizen_claims"("status");

-- CreateIndex
CREATE INDEX "report_moderations_report_id_idx" ON "report_moderations"("report_id");

-- CreateIndex
CREATE INDEX "report_moderations_action_idx" ON "report_moderations"("action");

-- CreateIndex
CREATE UNIQUE INDEX "reporter_identities_email_key" ON "reporter_identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "reporter_identities_access_token_key" ON "reporter_identities"("access_token");

-- CreateIndex
CREATE INDEX "reporter_identities_access_token_idx" ON "reporter_identities"("access_token");

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_report_accesses_access_token_key" ON "anonymous_report_accesses"("access_token");

-- CreateIndex
CREATE INDEX "anonymous_report_accesses_report_id_idx" ON "anonymous_report_accesses"("report_id");

-- CreateIndex
CREATE INDEX "anonymous_report_accesses_access_token_idx" ON "anonymous_report_accesses"("access_token");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_name_normalized_key" ON "vendors"("name_normalized");

-- CreateIndex
CREATE INDEX "vendors_name_normalized_idx" ON "vendors"("name_normalized");

-- CreateIndex
CREATE INDEX "vendors_state_idx" ON "vendors"("state");

-- CreateIndex
CREATE INDEX "vendors_status_idx" ON "vendors"("status");

-- CreateIndex
CREATE INDEX "vendors_flagged_idx" ON "vendors"("flagged");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE UNIQUE INDEX "project_risks_project_id_key" ON "project_risks"("project_id");

-- CreateIndex
CREATE INDEX "project_risks_risk_level_idx" ON "project_risks"("risk_level");

-- CreateIndex
CREATE INDEX "project_risks_risk_score_idx" ON "project_risks"("risk_score");

-- CreateIndex
CREATE INDEX "project_risks_confidence_idx" ON "project_risks"("confidence");

-- CreateIndex
CREATE INDEX "analytics_snapshots_entity_type_entity_id_snapshot_date_idx" ON "analytics_snapshots"("entity_type", "entity_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_entity_type_entity_id_period_snapshot_d_key" ON "analytics_snapshots"("entity_type", "entity_id", "period", "snapshot_date");

-- CreateIndex
CREATE INDEX "metric_series_entity_type_entity_id_metric_type_period_star_idx" ON "metric_series"("entity_type", "entity_id", "metric_type", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "metric_series_entity_type_entity_id_metric_type_period_peri_key" ON "metric_series"("entity_type", "entity_id", "metric_type", "period", "period_start");

-- CreateIndex
CREATE INDEX "model_versions_model_id_status_idx" ON "model_versions"("model_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_model_id_version_key" ON "model_versions"("model_id", "version");

-- CreateIndex
CREATE INDEX "forecasts_entity_type_entity_id_forecast_type_prediction_da_idx" ON "forecasts"("entity_type", "entity_id", "forecast_type", "prediction_date");

-- CreateIndex
CREATE INDEX "forecast_observations_forecast_id_idx" ON "forecast_observations"("forecast_id");

-- CreateIndex
CREATE UNIQUE INDEX "benchmark_groups_name_group_type_key" ON "benchmark_groups"("name", "group_type");

-- CreateIndex
CREATE INDEX "benchmark_results_metric_type_period_start_idx" ON "benchmark_results"("metric_type", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "benchmark_results_benchmark_group_id_metric_type_period_sta_key" ON "benchmark_results"("benchmark_group_id", "metric_type", "period_start");

-- CreateIndex
CREATE INDEX "analytics_insights_insight_type_valid_from_idx" ON "analytics_insights"("insight_type", "valid_from");

-- CreateIndex
CREATE INDEX "analytics_insights_severity_valid_from_idx" ON "analytics_insights"("severity", "valid_from");

-- CreateIndex
CREATE INDEX "hotspots_metric_severity_created_at_idx" ON "hotspots"("metric", "severity", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "hotspots_location_type_location_id_metric_time_window_perio_key" ON "hotspots"("location_type", "location_id", "metric", "time_window", "period_start");

-- CreateIndex
CREATE INDEX "scenario_analyses_entity_type_entity_id_scenario_type_idx" ON "scenario_analyses"("entity_type", "entity_id", "scenario_type");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_metrics_contractor_id_key" ON "contractor_metrics"("contractor_id");

-- CreateIndex
CREATE INDEX "contractor_metrics_avg_risk_score_idx" ON "contractor_metrics"("avg_risk_score");

-- CreateIndex
CREATE INDEX "contractor_metrics_avg_delay_days_idx" ON "contractor_metrics"("avg_delay_days");

-- CreateIndex
CREATE UNIQUE INDEX "constituency_analytics_constituency_id_key" ON "constituency_analytics"("constituency_id");

-- CreateIndex
CREATE INDEX "constituency_analytics_state_code_idx" ON "constituency_analytics"("state_code");

-- CreateIndex
CREATE INDEX "constituency_analytics_avg_risk_score_idx" ON "constituency_analytics"("avg_risk_score");

-- CreateIndex
CREATE UNIQUE INDEX "state_analytics_state_code_key" ON "state_analytics"("state_code");

-- CreateIndex
CREATE INDEX "state_analytics_avg_risk_score_idx" ON "state_analytics"("avg_risk_score");

-- CreateIndex
CREATE INDEX "data_source_records_data_source_id_transformationStatus_idx" ON "data_source_records"("data_source_id", "transformationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "mps_name_constituency_term_key" ON "mps"("name", "constituency", "term");

-- CreateIndex
CREATE INDEX "projects_state_idx" ON "projects"("state");

-- CreateIndex
CREATE INDEX "projects_district_idx" ON "projects"("district");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");

-- CreateIndex
CREATE INDEX "projects_vendor_id_idx" ON "projects"("vendor_id");

-- CreateIndex
CREATE INDEX "risk_findings_status_idx" ON "risk_findings"("status");

-- CreateIndex
CREATE INDEX "risk_findings_risk_score_idx" ON "risk_findings"("risk_score");

-- CreateIndex
CREATE INDEX "risk_findings_confidence_idx" ON "risk_findings"("confidence");

-- CreateIndex
CREATE INDEX "risk_findings_algorithm_version_idx" ON "risk_findings"("algorithm_version");

-- CreateIndex
CREATE INDEX "risk_findings_type_project_id_idx" ON "risk_findings"("type", "project_id");

-- CreateIndex
CREATE INDEX "risk_findings_type_status_severity_idx" ON "risk_findings"("type", "status", "severity");

-- CreateIndex
CREATE INDEX "risk_findings_detected_at_idx" ON "risk_findings"("detected_at");

-- CreateIndex
CREATE INDEX "satellite_observations_project_id_selection_reason_idx" ON "satellite_observations"("project_id", "selection_reason");

-- CreateIndex
CREATE INDEX "satellite_observations_provider_observation_date_idx" ON "satellite_observations"("provider", "observation_date");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constituencies" ADD CONSTRAINT "constituencies_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mps" ADD CONSTRAINT "mps_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_constituency_id_fkey" FOREIGN KEY ("constituency_id") REFERENCES "constituencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_mp_id_fkey" FOREIGN KEY ("mp_id") REFERENCES "mps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_source_data_source_id_fkey" FOREIGN KEY ("source_data_source_id") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_locations" ADD CONSTRAINT "project_locations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_locations" ADD CONSTRAINT "project_locations_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satellite_observations" ADD CONSTRAINT "satellite_observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satellite_analyses" ADD CONSTRAINT "satellite_analyses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satellite_analyses" ADD CONSTRAINT "satellite_analyses_observation_before_id_fkey" FOREIGN KEY ("observation_before_id") REFERENCES "satellite_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satellite_analyses" ADD CONSTRAINT "satellite_analyses_observation_after_id_fkey" FOREIGN KEY ("observation_after_id") REFERENCES "satellite_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_analyses" ADD CONSTRAINT "change_analyses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_analyses" ADD CONSTRAINT "change_analyses_observation_before_id_fkey" FOREIGN KEY ("observation_before_id") REFERENCES "satellite_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_analyses" ADD CONSTRAINT "change_analyses_observation_after_id_fkey" FOREIGN KEY ("observation_after_id") REFERENCES "satellite_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satellite_weekly_checkpoints" ADD CONSTRAINT "satellite_weekly_checkpoints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satellite_weekly_checkpoints" ADD CONSTRAINT "satellite_weekly_checkpoints_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "satellite_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "satellite_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "progress_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_observations" ADD CONSTRAINT "progress_observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_observations" ADD CONSTRAINT "progress_observations_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "satellite_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_observations" ADD CONSTRAINT "financial_observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_observations" ADD CONSTRAINT "financial_observations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_findings" ADD CONSTRAINT "risk_findings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_findings" ADD CONSTRAINT "risk_findings_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_findings" ADD CONSTRAINT "risk_findings_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_findings" ADD CONSTRAINT "risk_findings_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "risk_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_verifications" ADD CONSTRAINT "field_verifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_verifications" ADD CONSTRAINT "field_verifications_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "verification_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_verifications" ADD CONSTRAINT "field_verifications_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "verification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "risk_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_prepared_by_id_fkey" FOREIGN KEY ("prepared_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_updates" ADD CONSTRAINT "contractor_updates_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_updates" ADD CONSTRAINT "contractor_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_updates" ADD CONSTRAINT "contractor_updates_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_updates" ADD CONSTRAINT "contractor_updates_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_source_records" ADD CONSTRAINT "data_source_records_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_signals" ADD CONSTRAINT "risk_signals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_rule_versions" ADD CONSTRAINT "risk_rule_versions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "risk_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_law_escalated_by_id_fkey" FOREIGN KEY ("law_escalated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_status_logs" ADD CONSTRAINT "report_status_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_media" ADD CONSTRAINT "report_media_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_media" ADD CONSTRAINT "report_media_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_claims" ADD CONSTRAINT "citizen_claims_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_claims" ADD CONSTRAINT "citizen_claims_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_moderations" ADD CONSTRAINT "report_moderations_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_moderations" ADD CONSTRAINT "report_moderations_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_results" ADD CONSTRAINT "benchmark_results_benchmark_group_id_fkey" FOREIGN KEY ("benchmark_group_id") REFERENCES "benchmark_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "projects_lat_lng_btree_idx" RENAME TO "projects_latitude_longitude_idx";



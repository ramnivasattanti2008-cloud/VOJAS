-- Adds HIGH_RISK_MILESTONE_OVERRIDE to AuditAction. Backs the new milestone/
-- payment risk gate: accepting a MILESTONE or PAYMENT ContractorUpdate on a
-- project whose current risk level is HIGH or CRITICAL now requires the
-- reviewer to explicitly acknowledge the risk (riskAcknowledged: true) before
-- the update proceeds, and that override is logged under this action so it
-- stays a distinct, queryable event rather than folded into the generic
-- CONTRACTOR_UPDATE_REVIEWED action every other review already uses.
-- Purely additive: existing rows and every other enum value are unaffected.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'HIGH_RISK_MILESTONE_OVERRIDE';

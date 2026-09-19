-- Links a Report to the User account that submitted it, when submitted
-- while logged in and not anonymous (see the field comment on
-- Report.reporterId in schema.prisma). Nullable and additive: existing
-- reports and anonymous/unauthenticated submissions are unaffected.
-- Powers "my reports" scoping for citizen accounts.

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "reporter_id" TEXT;

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

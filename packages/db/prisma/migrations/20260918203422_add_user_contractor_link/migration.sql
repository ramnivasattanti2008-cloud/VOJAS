-- Same admin-controlled pattern as the earlier User<->MP link, for
-- CONTRACTOR-role users. Nullable and unique: most users have no linked
-- contractor, and each contractor record links to at most one user account.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "contractor_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_contractor_id_key" ON "users"("contractor_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

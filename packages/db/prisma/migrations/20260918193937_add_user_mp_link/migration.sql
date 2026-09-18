-- Explicit, admin-controlled link from a User account to the MP record it
-- represents. Nullable and unique: most users have no linked MP, and each
-- MP record can be linked to at most one user account. Never set by the
-- user themselves — only PATCH /users/:id as ADMIN may write it.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mp_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_mp_id_key" ON "users"("mp_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_mp_id_fkey" FOREIGN KEY ("mp_id") REFERENCES "mps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

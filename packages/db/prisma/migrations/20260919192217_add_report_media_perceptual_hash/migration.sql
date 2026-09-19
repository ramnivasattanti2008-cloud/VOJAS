-- Adds a real perceptual-hash column to report_media, backing genuine
-- duplicate-image detection (DCT-based pHash via Jimp) in
-- mediaValidationService.assessMediaForensics() — previously that function
-- always returned a hardcoded duplicateMedia: false regardless of the
-- file's actual contents. Nullable: video/audio/document uploads and any
-- image the hasher fails to decode simply have no hash, which is an
-- honest "not computed" rather than a fabricated one.
-- Purely additive: existing rows are unaffected (perceptual_hash is null
-- for every row already in the table).

-- AlterTable
ALTER TABLE "report_media" ADD COLUMN "perceptual_hash" TEXT;

-- CreateIndex
CREATE INDEX "report_media_perceptual_hash_idx" ON "report_media"("perceptual_hash");

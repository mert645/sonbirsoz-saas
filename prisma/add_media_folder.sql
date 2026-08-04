ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "folder" TEXT NOT NULL DEFAULT 'Genel';
CREATE INDEX IF NOT EXISTS "media_folder_idx" ON "media"("folder");

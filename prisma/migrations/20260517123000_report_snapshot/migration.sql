-- Persist immutable report payload snapshots so share links never rebuild from mutable evidence cards.
ALTER TABLE "safeplan_report"
ADD COLUMN "snapshotJson" JSONB NOT NULL DEFAULT '{"version":0,"generatedAt":"","includedFileIds":[],"pdfSha256":"","fileCount":0,"cards":[]}';

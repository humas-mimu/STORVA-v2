-- Migration: add access_type column to share_links
-- access_type: 'PUBLIC' (anyone with link) | 'USER' (authenticated users only)

ALTER TABLE "share_links"
  ADD COLUMN "access_type" TEXT NOT NULL DEFAULT 'PUBLIC';

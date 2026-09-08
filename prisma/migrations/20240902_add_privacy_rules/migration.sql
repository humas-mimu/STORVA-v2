-- Migration: add PrivacyRule table for folder/file privacy management

CREATE TABLE IF NOT EXISTS "privacy_rules" (
  "id"            TEXT        PRIMARY KEY NOT NULL,
  "relative_path" TEXT        UNIQUE NOT NULL,
  "is_private"    BOOLEAN     NOT NULL DEFAULT true,
  "allowed_users" TEXT        NOT NULL DEFAULT '[]',
  "created_at"    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

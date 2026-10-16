-- ============================================================
--   npx wrangler d1 execute liceum-exams --local  --file clear.sql
--   npx wrangler d1 execute liceum-exams --remote --file clear.sql
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ---------- 1. wipe (children first) ----------
DELETE FROM applications;
DELETE FROM campaigns_to_profiles;
DELETE FROM profiles;
DELETE FROM forms;
DELETE FROM campaigns;
DELETE FROM users;
DELETE FROM sqlite_sequence
 WHERE name IN ('users','forms','profiles','campaigns','applications');

PRAGMA foreign_keys = ON;

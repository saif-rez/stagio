-- Removes ALL Stagio demonstration data (see add-demo-data.sql).
-- Run in Neon -> SQL Editor (database neondb) before opening to real students.
-- Real accounts, reviews and offers (isDemo = false) are never touched.

BEGIN;

-- Demo internships: their reviews, replies, reports and contact requests are deleted with them.
DELETE FROM "Internship"
WHERE "studentId" IN (SELECT "id" FROM "User" WHERE "isDemo");

DELETE FROM "Review" WHERE "isDemo";

-- Demo offers (including the 9 fictional offers created by the initial seed).
DELETE FROM "Offer" WHERE "isDemo";

-- Demo company proposals, unless real data has been attached to them since.
DELETE FROM "Company" c
WHERE c."isDemo"
  AND NOT EXISTS (SELECT 1 FROM "Internship" i WHERE i."companyId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "Review" r WHERE r."companyId" = c."id");

-- Demo accounts (their notifications are deleted with them).
DELETE FROM "User" WHERE "isDemo";

COMMIT;

-- Check: every count below must be 0.
SELECT
  (SELECT count(*) FROM "User" WHERE "isDemo") AS demo_users,
  (SELECT count(*) FROM "Review" WHERE "isDemo") AS demo_reviews,
  (SELECT count(*) FROM "Offer" WHERE "isDemo") AS demo_offers;

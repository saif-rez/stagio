-- Stagio demonstration data (Lovable mock data), clearly labelled on the site:
--   reviews show "Avis de démonstration", offers show "Démo" and cannot be applied to,
--   ratings that include demo reviews say so.
-- Run in Neon -> SQL Editor (database neondb) AFTER the backend has deployed the
-- 20261126000000_demo_flags migration. Safe to run twice (ON CONFLICT DO NOTHING).
-- Remove everything with remove-demo-data.sql before opening to real students.

BEGIN;

-- 1. Demo student accounts: unreachable .invalid addresses, cannot log in, never emailed.
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "emailVerifiedAt", "establishmentId", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-user-0', 'yasmine.benali@demo.stagio.invalid', '!demo-account-cannot-log-in', 'Yasmine Ben Ali', 'STUDENT', now(), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), true, now(), now())
ON CONFLICT DO NOTHING;
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "emailVerifiedAt", "establishmentId", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-user-1', 'ahmed.trabelsi@demo.stagio.invalid', '!demo-account-cannot-log-in', 'Ahmed Trabelsi', 'STUDENT', now(), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), true, now(), now())
ON CONFLICT DO NOTHING;
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "emailVerifiedAt", "establishmentId", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-user-2', 'mariem.gharbi@demo.stagio.invalid', '!demo-account-cannot-log-in', 'Mariem Gharbi', 'STUDENT', now(), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), true, now(), now())
ON CONFLICT DO NOTHING;
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "emailVerifiedAt", "establishmentId", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-user-3', 'aziz.bensalah@demo.stagio.invalid', '!demo-account-cannot-log-in', 'Aziz Ben Salah', 'STUDENT', now(), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), true, now(), now())
ON CONFLICT DO NOTHING;
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "emailVerifiedAt", "establishmentId", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-user-4', 'sarah.bouaziz@demo.stagio.invalid', '!demo-account-cannot-log-in', 'Sarah Bouaziz', 'STUDENT', now(), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), true, now(), now())
ON CONFLICT DO NOTHING;
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "emailVerifiedAt", "establishmentId", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-user-5', 'omar.mansour@demo.stagio.invalid', '!demo-account-cannot-log-in', 'Omar Mansour', 'STUDENT', now(), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), true, now(), now())
ON CONFLICT DO NOTHING;
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "emailVerifiedAt", "establishmentId", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-user-6', 'ines.khelifi@demo.stagio.invalid', '!demo-account-cannot-log-in', 'Inès Khelifi', 'STUDENT', now(), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), true, now(), now())
ON CONFLICT DO NOTHING;
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "emailVerifiedAt", "establishmentId", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-user-7', 'amine.benamor@demo.stagio.invalid', '!demo-account-cannot-log-in', 'Amine Ben Amor', 'STUDENT', now(), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), true, now(), now())
ON CONFLICT DO NOTHING;

-- 2. One declared internship + one review per mock review (25).
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-0', 'demo-user-0', (SELECT "id" FROM "Company" WHERE "name" = 'Vermeg' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2025, 'PFE', 'Informatique', 'DECLARED', now() - interval '0 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-0', 'demo-internship-0', 'demo-user-0', (SELECT "id" FROM "Company" WHERE "name" = 'Vermeg' LIMIT 1), 4, 4, 3, 'Une très belle première expérience professionnelle. Mon encadrant était toujours disponible et les missions m’ont permis de mettre en pratique ce que j’ai appris à l’ISGB. Je recommande !', true, false, 'PUBLISHED', 0, true, now() - interval '0 days', now() - interval '0 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-1', 'demo-user-1', (SELECT "id" FROM "Company" WHERE "name" = 'Telnet' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'SUMMER', 'Informatique', 'DECLARED', now() - interval '1 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-1', 'demo-internship-1', 'demo-user-1', (SELECT "id" FROM "Company" WHERE "name" = 'Telnet' LIMIT 1), 5, 5, 5, 'Une équipe accueillante et des projets stimulants. J’ai gagné en autonomie et découvert des outils que je continue à utiliser aujourd’hui.', false, false, 'PUBLISHED', 0, true, now() - interval '1 days', now() - interval '1 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-2', 'demo-user-2', (SELECT "id" FROM "Company" WHERE "name" = 'Sofrecom' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Informatique', 'DECLARED', now() - interval '2 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-2', 'demo-internship-2', 'demo-user-2', (SELECT "id" FROM "Company" WHERE "name" = 'Sofrecom' LIMIT 1), 5, 5, 5, 'Un stage enrichissant avec un vrai suivi. L’ambiance est agréable et les échanges avec les autres équipes m’ont beaucoup apporté.', false, false, 'PUBLISHED', 0, true, now() - interval '2 days', now() - interval '2 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-3', 'demo-user-3', (SELECT "id" FROM "Company" WHERE "name" = 'BIAT' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Finance', 'DECLARED', now() - interval '3 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-3', 'demo-internship-3', 'demo-user-3', (SELECT "id" FROM "Company" WHERE "name" = 'BIAT' LIMIT 1), 5, 4, 5, 'Des missions concrètes dès la première semaine. Le rythme est soutenu, mais l’équipe prend le temps de nous accompagner.', true, false, 'PUBLISHED', 0, true, now() - interval '3 days', now() - interval '3 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-4', 'demo-user-4', (SELECT "id" FROM "Company" WHERE "name" = 'Sagemcom' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2025, 'SUMMER', 'Informatique', 'DECLARED', now() - interval '4 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-4', 'demo-internship-4', 'demo-user-4', (SELECT "id" FROM "Company" WHERE "name" = 'Sagemcom' LIMIT 1), 4, 5, 5, 'Une très belle première expérience professionnelle. Mon encadrant était toujours disponible et les missions m’ont permis de mettre en pratique ce que j’ai appris à l’ISGB. Je recommande !', false, false, 'PUBLISHED', 0, true, now() - interval '4 days', now() - interval '4 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-5', 'demo-user-5', (SELECT "id" FROM "Company" WHERE "name" = 'Vermeg' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Informatique', 'DECLARED', now() - interval '5 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-5', 'demo-internship-5', 'demo-user-5', (SELECT "id" FROM "Company" WHERE "name" = 'Vermeg' LIMIT 1), 5, 5, 3, 'Une équipe accueillante et des projets stimulants. J’ai gagné en autonomie et découvert des outils que je continue à utiliser aujourd’hui.', false, false, 'PUBLISHED', 0, true, now() - interval '5 days', now() - interval '5 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-6', 'demo-user-6', (SELECT "id" FROM "Company" WHERE "name" = 'Telnet' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Informatique', 'DECLARED', now() - interval '6 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-6', 'demo-internship-6', 'demo-user-6', (SELECT "id" FROM "Company" WHERE "name" = 'Telnet' LIMIT 1), 5, 4, 5, 'Un stage enrichissant avec un vrai suivi. L’ambiance est agréable et les échanges avec les autres équipes m’ont beaucoup apporté.', true, false, 'PUBLISHED', 0, true, now() - interval '6 days', now() - interval '6 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-7', 'demo-user-7', (SELECT "id" FROM "Company" WHERE "name" = 'Sofrecom' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'SUMMER', 'Informatique', 'DECLARED', now() - interval '7 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-7', 'demo-internship-7', 'demo-user-7', (SELECT "id" FROM "Company" WHERE "name" = 'Sofrecom' LIMIT 1), 5, 5, 5, 'Des missions concrètes dès la première semaine. Le rythme est soutenu, mais l’équipe prend le temps de nous accompagner.', false, false, 'PUBLISHED', 0, true, now() - interval '7 days', now() - interval '7 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-8', 'demo-user-0', (SELECT "id" FROM "Company" WHERE "name" = 'BIAT' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2025, 'PFE', 'Finance', 'DECLARED', now() - interval '8 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-8', 'demo-internship-8', 'demo-user-0', (SELECT "id" FROM "Company" WHERE "name" = 'BIAT' LIMIT 1), 4, 5, 5, 'Une très belle première expérience professionnelle. Mon encadrant était toujours disponible et les missions m’ont permis de mettre en pratique ce que j’ai appris à l’ISGB. Je recommande !', false, false, 'PUBLISHED', 0, true, now() - interval '8 days', now() - interval '8 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-9', 'demo-user-1', (SELECT "id" FROM "Company" WHERE "name" = 'Sagemcom' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Informatique', 'DECLARED', now() - interval '9 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-9', 'demo-internship-9', 'demo-user-1', (SELECT "id" FROM "Company" WHERE "name" = 'Sagemcom' LIMIT 1), 5, 4, 5, 'Une équipe accueillante et des projets stimulants. J’ai gagné en autonomie et découvert des outils que je continue à utiliser aujourd’hui.', true, false, 'PUBLISHED', 0, true, now() - interval '9 days', now() - interval '9 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-10', 'demo-user-2', (SELECT "id" FROM "Company" WHERE "name" = 'Vermeg' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'SUMMER', 'Informatique', 'DECLARED', now() - interval '10 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-10', 'demo-internship-10', 'demo-user-2', (SELECT "id" FROM "Company" WHERE "name" = 'Vermeg' LIMIT 1), 5, 5, 3, 'Un stage enrichissant avec un vrai suivi. L’ambiance est agréable et les échanges avec les autres équipes m’ont beaucoup apporté.', false, false, 'PUBLISHED', 0, true, now() - interval '10 days', now() - interval '10 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-11', 'demo-user-3', (SELECT "id" FROM "Company" WHERE "name" = 'Telnet' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Informatique', 'DECLARED', now() - interval '11 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-11', 'demo-internship-11', 'demo-user-3', (SELECT "id" FROM "Company" WHERE "name" = 'Telnet' LIMIT 1), 5, 5, 5, 'Des missions concrètes dès la première semaine. Le rythme est soutenu, mais l’équipe prend le temps de nous accompagner.', false, false, 'PUBLISHED', 0, true, now() - interval '11 days', now() - interval '11 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-12', 'demo-user-4', (SELECT "id" FROM "Company" WHERE "name" = 'Sofrecom' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2025, 'PFE', 'Informatique', 'DECLARED', now() - interval '12 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-12', 'demo-internship-12', 'demo-user-4', (SELECT "id" FROM "Company" WHERE "name" = 'Sofrecom' LIMIT 1), 4, 4, 5, 'Une très belle première expérience professionnelle. Mon encadrant était toujours disponible et les missions m’ont permis de mettre en pratique ce que j’ai appris à l’ISGB. Je recommande !', true, false, 'PUBLISHED', 0, true, now() - interval '12 days', now() - interval '12 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-13', 'demo-user-5', (SELECT "id" FROM "Company" WHERE "name" = 'BIAT' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'SUMMER', 'Finance', 'DECLARED', now() - interval '13 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-13', 'demo-internship-13', 'demo-user-5', (SELECT "id" FROM "Company" WHERE "name" = 'BIAT' LIMIT 1), 5, 5, 5, 'Une équipe accueillante et des projets stimulants. J’ai gagné en autonomie et découvert des outils que je continue à utiliser aujourd’hui.', false, false, 'PUBLISHED', 0, true, now() - interval '13 days', now() - interval '13 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-14', 'demo-user-6', (SELECT "id" FROM "Company" WHERE "name" = 'Sagemcom' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Informatique', 'DECLARED', now() - interval '14 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-14', 'demo-internship-14', 'demo-user-6', (SELECT "id" FROM "Company" WHERE "name" = 'Sagemcom' LIMIT 1), 5, 5, 5, 'Un stage enrichissant avec un vrai suivi. L’ambiance est agréable et les échanges avec les autres équipes m’ont beaucoup apporté.', false, false, 'PUBLISHED', 0, true, now() - interval '14 days', now() - interval '14 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-15', 'demo-user-7', (SELECT "id" FROM "Company" WHERE "name" = 'Primatec' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Informatique', 'DECLARED', now() - interval '15 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-15', 'demo-internship-15', 'demo-user-7', (SELECT "id" FROM "Company" WHERE "name" = 'Primatec' LIMIT 1), 5, 4, 3, 'Des missions concrètes dès la première semaine. Le rythme est soutenu, mais l’équipe prend le temps de nous accompagner.', true, false, 'PUBLISHED', 0, true, now() - interval '15 days', now() - interval '15 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-16', 'demo-user-0', (SELECT "id" FROM "Company" WHERE "name" = 'Wevioo' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2025, 'SUMMER', 'Informatique', 'DECLARED', now() - interval '16 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-16', 'demo-internship-16', 'demo-user-0', (SELECT "id" FROM "Company" WHERE "name" = 'Wevioo' LIMIT 1), 4, 5, 5, 'Une très belle première expérience professionnelle. Mon encadrant était toujours disponible et les missions m’ont permis de mettre en pratique ce que j’ai appris à l’ISGB. Je recommande !', false, false, 'PUBLISHED', 0, true, now() - interval '16 days', now() - interval '16 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-17', 'demo-user-1', (SELECT "id" FROM "Company" WHERE "name" = 'Focus Corporation' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Informatique', 'DECLARED', now() - interval '17 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-17', 'demo-internship-17', 'demo-user-1', (SELECT "id" FROM "Company" WHERE "name" = 'Focus Corporation' LIMIT 1), 5, 5, 5, 'Une équipe accueillante et des projets stimulants. J’ai gagné en autonomie et découvert des outils que je continue à utiliser aujourd’hui.', false, false, 'PUBLISHED', 0, true, now() - interval '17 days', now() - interval '17 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-18', 'demo-user-2', (SELECT "id" FROM "Company" WHERE "name" = 'One Tech' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Informatique', 'DECLARED', now() - interval '18 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-18', 'demo-internship-18', 'demo-user-2', (SELECT "id" FROM "Company" WHERE "name" = 'One Tech' LIMIT 1), 5, 4, 5, 'Un stage enrichissant avec un vrai suivi. L’ambiance est agréable et les échanges avec les autres équipes m’ont beaucoup apporté.', true, false, 'PUBLISHED', 0, true, now() - interval '18 days', now() - interval '18 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-19', 'demo-user-3', (SELECT "id" FROM "Company" WHERE "name" = 'Talan' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'SUMMER', 'Informatique', 'DECLARED', now() - interval '19 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-19', 'demo-internship-19', 'demo-user-3', (SELECT "id" FROM "Company" WHERE "name" = 'Talan' LIMIT 1), 5, 5, 5, 'Des missions concrètes dès la première semaine. Le rythme est soutenu, mais l’équipe prend le temps de nous accompagner.', false, false, 'PUBLISHED', 0, true, now() - interval '19 days', now() - interval '19 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-20', 'demo-user-4', (SELECT "id" FROM "Company" WHERE "name" = 'Cynapsys' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2025, 'PFE', 'Informatique', 'DECLARED', now() - interval '20 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-20', 'demo-internship-20', 'demo-user-4', (SELECT "id" FROM "Company" WHERE "name" = 'Cynapsys' LIMIT 1), 4, 5, 3, 'Une très belle première expérience professionnelle. Mon encadrant était toujours disponible et les missions m’ont permis de mettre en pratique ce que j’ai appris à l’ISGB. Je recommande !', false, false, 'PUBLISHED', 0, true, now() - interval '20 days', now() - interval '20 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-21', 'demo-user-5', (SELECT "id" FROM "Company" WHERE "name" = 'Attijari bank' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Finance', 'DECLARED', now() - interval '21 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-21', 'demo-internship-21', 'demo-user-5', (SELECT "id" FROM "Company" WHERE "name" = 'Attijari bank' LIMIT 1), 5, 4, 5, 'Une équipe accueillante et des projets stimulants. J’ai gagné en autonomie et découvert des outils que je continue à utiliser aujourd’hui.', true, false, 'PUBLISHED', 1, true, now() - interval '21 days', now() - interval '21 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-22', 'demo-user-6', (SELECT "id" FROM "Company" WHERE "name" = 'Primatec' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'SUMMER', 'Informatique', 'DECLARED', now() - interval '22 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-22', 'demo-internship-22', 'demo-user-6', (SELECT "id" FROM "Company" WHERE "name" = 'Primatec' LIMIT 1), 5, 5, 5, 'Un stage enrichissant avec un vrai suivi. L’ambiance est agréable et les échanges avec les autres équipes m’ont beaucoup apporté.', false, false, 'PUBLISHED', 0, true, now() - interval '22 days', now() - interval '22 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-23', 'demo-user-7', (SELECT "id" FROM "Company" WHERE "name" = 'Wevioo' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2026, 'PFE', 'Informatique', 'DECLARED', now() - interval '23 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-23', 'demo-internship-23', 'demo-user-7', (SELECT "id" FROM "Company" WHERE "name" = 'Wevioo' LIMIT 1), 5, 5, 5, 'Des missions concrètes dès la première semaine. Le rythme est soutenu, mais l’équipe prend le temps de nous accompagner.', false, false, 'HIDDEN', 3, true, now() - interval '23 days', now() - interval '23 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Internship" ("id", "studentId", "companyId", "establishmentId", "year", "type", "domain", "status", "createdAt")
VALUES ('demo-internship-24', 'demo-user-0', (SELECT "id" FROM "Company" WHERE "name" = 'Focus Corporation' LIMIT 1), (SELECT "id" FROM "Establishment" WHERE "emailDomain" = 'isgb.ucar.tn'), 2025, 'PFE', 'Informatique', 'DECLARED', now() - interval '24 days')
ON CONFLICT DO NOTHING;
INSERT INTO "Review" ("id", "internshipId", "authorId", "companyId", "ratingSupervision", "ratingAtmosphere", "ratingMissions", "comment", "anonymous", "contactOptIn", "status", "reportCount", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-review-24', 'demo-internship-24', 'demo-user-0', (SELECT "id" FROM "Company" WHERE "name" = 'Focus Corporation' LIMIT 1), 4, 4, 5, 'Une très belle première expérience professionnelle. Mon encadrant était toujours disponible et les missions m’ont permis de mettre en pratique ce que j’ai appris à l’ISGB. Je recommande !', true, false, 'PUBLISHED', 0, true, now() - interval '24 days', now() - interval '24 days')
ON CONFLICT DO NOTHING;

-- 3. A company reply (Vermeg) and reported reviews, to demonstrate moderation.
INSERT INTO "ReviewReply" ("id", "reviewId", "companyId", "body", "createdAt")
VALUES ('demo-reply-0', 'demo-review-0', (SELECT "id" FROM "Company" WHERE "name" = 'Vermeg' LIMIT 1), 'Merci pour votre retour ! Nous sommes ravis de vous avoir accompagnée dans votre parcours. — L’équipe Vermeg', now())
ON CONFLICT DO NOTHING;
INSERT INTO "Report" ("id", "reviewId", "reporterId", "reason", "createdAt")
VALUES ('demo-report-23-0', 'demo-review-23', 'demo-user-0', 'INSULTS', now())
ON CONFLICT DO NOTHING;
INSERT INTO "Report" ("id", "reviewId", "reporterId", "reason", "createdAt")
VALUES ('demo-report-23-1', 'demo-review-23', 'demo-user-1', 'FAKE_REVIEW', now())
ON CONFLICT DO NOTHING;
INSERT INTO "Report" ("id", "reviewId", "reporterId", "reason", "createdAt")
VALUES ('demo-report-23-2', 'demo-review-23', 'demo-user-2', 'INSULTS', now())
ON CONFLICT DO NOTHING;
INSERT INTO "Report" ("id", "reviewId", "reporterId", "reason", "createdAt")
VALUES ('demo-report-21-0', 'demo-review-21', 'demo-user-0', 'FAKE_REVIEW', now())
ON CONFLICT DO NOTHING;

-- 4. The 9 offers created by the initial seed are fictional too: label them as demo.
UPDATE "Offer" SET "isDemo" = true
WHERE "createdById" IS NULL AND "sourceName" = 'LinkedIn' AND "applicationUrl" = 'https://www.linkedin.com/jobs/';

-- 5. The 6 mock offers missing from the seed.
INSERT INTO "Offer" ("id", "title", "description", "companyId", "city", "type", "domain", "applicationMode", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-offer-5', 'Ingénieur tests & validation', 'Rejoignez une équipe passionnée et participez à des projets à fort impact. Vous serez accompagné(e) par un encadrant dédié tout au long de votre stage.

Vos missions : contribuer à la conception des solutions, analyser les besoins, travailler avec l’équipe et présenter vos résultats.

Profil recherché : étudiant(e) ISGB, curieux(se), autonome et motivé(e). Bonne capacité de communication et esprit d’équipe.', (SELECT "id" FROM "Company" WHERE "name" = 'Primatec' LIMIT 1), (SELECT "city" FROM "Company" WHERE "name" = 'Primatec' LIMIT 1), 'PFE', 'Informatique', 'LINK', true, now() - interval '5 hours', now())
ON CONFLICT DO NOTHING;
INSERT INTO "Offer" ("id", "title", "description", "companyId", "city", "type", "domain", "applicationMode", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-offer-7', 'Développement web & mobile', 'Rejoignez une équipe passionnée et participez à des projets à fort impact. Vous serez accompagné(e) par un encadrant dédié tout au long de votre stage.

Vos missions : contribuer à la conception des solutions, analyser les besoins, travailler avec l’équipe et présenter vos résultats.

Profil recherché : étudiant(e) ISGB, curieux(se), autonome et motivé(e). Bonne capacité de communication et esprit d’équipe.', (SELECT "id" FROM "Company" WHERE "name" = 'Focus Corporation' LIMIT 1), (SELECT "city" FROM "Company" WHERE "name" = 'Focus Corporation' LIMIT 1), 'SUMMER', 'Informatique', 'LINK', true, now() - interval '7 hours', now())
ON CONFLICT DO NOTHING;
INSERT INTO "Offer" ("id", "title", "description", "companyId", "city", "type", "domain", "applicationMode", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-offer-8', 'Assistant gestion de production', 'Rejoignez une équipe passionnée et participez à des projets à fort impact. Vous serez accompagné(e) par un encadrant dédié tout au long de votre stage.

Vos missions : contribuer à la conception des solutions, analyser les besoins, travailler avec l’équipe et présenter vos résultats.

Profil recherché : étudiant(e) ISGB, curieux(se), autonome et motivé(e). Bonne capacité de communication et esprit d’équipe.', (SELECT "id" FROM "Company" WHERE "name" = 'One Tech' LIMIT 1), (SELECT "city" FROM "Company" WHERE "name" = 'One Tech' LIMIT 1), 'PFE', 'Gestion', 'LINK', true, now() - interval '8 hours', now())
ON CONFLICT DO NOTHING;
INSERT INTO "Offer" ("id", "title", "description", "companyId", "city", "type", "domain", "applicationMode", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-offer-10', 'Développement applications cloud', 'Rejoignez une équipe passionnée et participez à des projets à fort impact. Vous serez accompagné(e) par un encadrant dédié tout au long de votre stage.

Vos missions : contribuer à la conception des solutions, analyser les besoins, travailler avec l’équipe et présenter vos résultats.

Profil recherché : étudiant(e) ISGB, curieux(se), autonome et motivé(e). Bonne capacité de communication et esprit d’équipe.', (SELECT "id" FROM "Company" WHERE "name" = 'Cynapsys' LIMIT 1), (SELECT "city" FROM "Company" WHERE "name" = 'Cynapsys' LIMIT 1), 'SUMMER', 'Informatique', 'LINK', true, now() - interval '10 hours', now())
ON CONFLICT DO NOTHING;
INSERT INTO "Offer" ("id", "title", "description", "companyId", "city", "type", "domain", "applicationMode", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-offer-12', 'UX/UI Designer', 'Rejoignez une équipe passionnée et participez à des projets à fort impact. Vous serez accompagné(e) par un encadrant dédié tout au long de votre stage.

Vos missions : contribuer à la conception des solutions, analyser les besoins, travailler avec l’équipe et présenter vos résultats.

Profil recherché : étudiant(e) ISGB, curieux(se), autonome et motivé(e). Bonne capacité de communication et esprit d’équipe.', (SELECT "id" FROM "Company" WHERE "name" = 'Vermeg' LIMIT 1), (SELECT "city" FROM "Company" WHERE "name" = 'Vermeg' LIMIT 1), 'PFE', 'Informatique', 'LINK', true, now() - interval '12 hours', now())
ON CONFLICT DO NOTHING;
INSERT INTO "Offer" ("id", "title", "description", "companyId", "city", "type", "domain", "applicationMode", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-offer-13', 'Cybersécurité & réseaux', 'Rejoignez une équipe passionnée et participez à des projets à fort impact. Vous serez accompagné(e) par un encadrant dédié tout au long de votre stage.

Vos missions : contribuer à la conception des solutions, analyser les besoins, travailler avec l’équipe et présenter vos résultats.

Profil recherché : étudiant(e) ISGB, curieux(se), autonome et motivé(e). Bonne capacité de communication et esprit d’équipe.', (SELECT "id" FROM "Company" WHERE "name" = 'Telnet' LIMIT 1), (SELECT "city" FROM "Company" WHERE "name" = 'Telnet' LIMIT 1), 'SUMMER', 'Informatique', 'LINK', true, now() - interval '13 hours', now())
ON CONFLICT DO NOTHING;

-- 6. Companies proposed by a (demo) student, waiting in the admin queue.
INSERT INTO "Company" ("id", "name", "city", "sector", "description", "status", "proposedById", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-company-0', 'Digital Factory', 'Sousse', 'Informatique', '', 'PENDING', 'demo-user-0', true, now(), now())
ON CONFLICT DO NOTHING;
INSERT INTO "Company" ("id", "name", "city", "sector", "description", "status", "proposedById", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-company-1', 'Vermeg Tunisie', 'Tunis', 'Fintech', '', 'PENDING', 'demo-user-0', true, now(), now())
ON CONFLICT DO NOTHING;
INSERT INTO "Company" ("id", "name", "city", "sector", "description", "status", "proposedById", "isDemo", "createdAt", "updatedAt")
VALUES ('demo-company-2', 'Smart Business Solutions', 'Sfax', 'Conseil', '', 'PENDING', 'demo-user-0', true, now(), now())
ON CONFLICT DO NOTHING;

COMMIT;

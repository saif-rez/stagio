// Seed: ISGB establishment, first admin account, starter company pages and external offers
// (spec §8: the admin creates the first pages and offers before launch).
import { existsSync } from "node:fs";
import { PrismaClient, type InternshipType } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

if (existsSync(".env")) process.loadEnvFile(".env");
const prisma = new PrismaClient();

const companies = [
  ["Vermeg", "Fintech & logiciels", "Tunis"],
  ["Telnet", "Ingénierie & technologie", "Tunis"],
  ["Sofrecom", "Télécommunications", "Tunis"],
  ["BIAT", "Banque & finance", "Tunis"],
  ["Sagemcom", "Industrie & électronique", "Bizerte"],
  ["Primatec", "Automobile & logiciels", "Sfax"],
  ["Wevioo", "Conseil & numérique", "Tunis"],
  ["Focus Corporation", "Services informatiques", "Sousse"],
  ["One Tech", "Industrie & technologie", "Bizerte"],
  ["Talan", "Conseil & data", "Tunis"],
  ["Cynapsys", "Logiciels & innovation", "Sfax"],
  ["Attijari bank", "Banque & finance", "Sousse"],
] as const;

const offers: [string, number, InternshipType, string][] = [
  ["Développement Full Stack React / Java", 0, "PFE", "Informatique"],
  ["Ingénieur logiciel embarqué", 1, "SUMMER", "Informatique"],
  ["Data Analyst & Business Intelligence", 2, "PFE", "Data & IA"],
  ["Analyste financier junior", 3, "PFE", "Finance"],
  ["Développement systèmes IoT", 4, "SUMMER", "Informatique"],
  ["Consultant transformation digitale", 6, "PFE", "Informatique"],
  ["Data Science & intelligence artificielle", 9, "PFE", "Data & IA"],
  ["Chargé de marketing digital", 11, "SUMMER", "Marketing"],
  ["Contrôle de gestion", 3, "PFE", "Finance"],
];

async function main() {
  const isgb = await prisma.establishment.upsert({
    where: { emailDomain: "isgb.ucar.tn" },
    update: {},
    create: { name: "ISGB", emailDomain: "isgb.ucar.tn" },
  });

  const adminEmail = process.env["SEED_ADMIN_EMAIL"];
  const adminPassword = process.env["SEED_ADMIN_PASSWORD"];
  if (adminEmail && adminPassword) {
    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: {},
      create: {
        email: adminEmail.toLowerCase(),
        name: "Équipe Stagio",
        role: "ADMIN",
        passwordHash: await hashPassword(adminPassword),
        emailVerifiedAt: new Date(),
      },
    });
  } else {
    console.warn("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set: no admin account created.");
  }

  if ((await prisma.company.count()) === 0) {
    const created = [];
    for (const [name, sector, city] of companies) {
      created.push(
        await prisma.company.create({
          data: {
            name,
            sector,
            city,
            status: "ACTIVE",
            description:
              "Une équipe engagée qui accompagne les jeunes talents dans des projets concrets et innovants.",
          },
        }),
      );
    }
    for (const [i, [title, companyIndex, type, domain]] of offers.entries()) {
      const company = created[companyIndex]!;
      await prisma.offer.create({
        data: {
          title,
          companyId: company.id,
          city: company.city,
          type,
          domain,
          description:
            "Rejoignez une équipe passionnée et participez à des projets à fort impact, accompagné(e) par un encadrant dédié.\n\nProfil recherché : étudiant(e) ISGB, curieux(se), autonome et motivé(e).",
          applicationMode: "LINK",
          applicationUrl: "https://www.linkedin.com/jobs/",
          sourceName: "LinkedIn",
          sourceUrl: "https://www.linkedin.com/jobs/",
          sponsored: i < 2,
        },
      });
    }
  }
  console.info(`Seed done (establishment ${isgb.name}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

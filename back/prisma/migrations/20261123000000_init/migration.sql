-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'COMPANY', 'ADMIN');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'PENDING', 'REFUSED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "InternshipType" AS ENUM ('PFE', 'SUMMER');

-- CreateEnum
CREATE TYPE "InternshipStatus" AS ENUM ('DECLARED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'CHANGES_REQUESTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('FAKE_REVIEW', 'INSULTS', 'PERSONAL_DATA', 'OFF_TOPIC');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('EMAIL', 'LINKEDIN', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ApplicationMode" AS ENUM ('LINK', 'EMAIL');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REVIEW_REPLY', 'CONTACT_REQUEST_RECEIVED', 'CONTACT_REQUEST_ACCEPTED', 'CONTACT_REQUEST_REFUSED', 'REVIEW_HIDDEN', 'REVIEW_REMOVED', 'REVIEW_CHANGES_REQUESTED', 'INTERNSHIP_VERIFIED', 'NEW_OFFERS_DIGEST', 'COMPANY_ACCOUNT_VALIDATED', 'COMPANY_ACCOUNT_REFUSED', 'NEW_REVIEW');

-- CreateTable
CREATE TABLE "Establishment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emailDomain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "establishmentId" TEXT,
    "companyId" TEXT,
    "followedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "digestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastDigestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING',
    "proposedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "rne" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "type" "InternshipType" NOT NULL,
    "domain" TEXT NOT NULL,
    "applicationMode" "ApplicationMode" NOT NULL,
    "applicationUrl" TEXT,
    "applicationEmail" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "sponsoredUntil" TIMESTAMP(3),
    "sponsorRequested" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Internship" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "companyId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" "InternshipType" NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "InternshipStatus" NOT NULL DEFAULT 'DECLARED',
    "certificateKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Internship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "internshipId" TEXT NOT NULL,
    "authorId" TEXT,
    "companyId" TEXT NOT NULL,
    "ratingSupervision" INTEGER NOT NULL,
    "ratingAtmosphere" INTEGER NOT NULL,
    "ratingMissions" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "contactOptIn" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReply" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterId" TEXT,
    "companyId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "message" VARCHAR(300) NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "ContactChannel",
    "channelValue" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Establishment_name_key" ON "Establishment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Establishment_emailDomain_key" ON "Establishment"("emailDomain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_companyId_key" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "OtpCode_userId_purpose_idx" ON "OtpCode"("userId", "purpose");

-- CreateIndex
CREATE INDEX "Company_status_name_idx" ON "Company"("status", "name");

-- CreateIndex
CREATE INDEX "CompanyClaim_status_idx" ON "CompanyClaim"("status");

-- CreateIndex
CREATE INDEX "Offer_active_sponsored_createdAt_idx" ON "Offer"("active", "sponsored", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_domain_idx" ON "Offer"("domain");

-- CreateIndex
CREATE INDEX "Internship_status_idx" ON "Internship"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_internshipId_key" ON "Review"("internshipId");

-- CreateIndex
CREATE INDEX "Review_companyId_status_idx" ON "Review"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReply_reviewId_key" ON "ReviewReply"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reviewId_reporterId_key" ON "Report"("reviewId", "reporterId");

-- CreateIndex
CREATE INDEX "ContactRequest_requesterId_createdAt_idx" ON "ContactRequest"("requesterId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactRequest_status_expiresAt_idx" ON "ContactRequest"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyClaim" ADD CONSTRAINT "CompanyClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyClaim" ADD CONSTRAINT "CompanyClaim_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Internship" ADD CONSTRAINT "Internship_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Internship" ADD CONSTRAINT "Internship_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Internship" ADD CONSTRAINT "Internship_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_internshipId_fkey" FOREIGN KEY ("internshipId") REFERENCES "Internship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Rebuild schema for AddDropper MVP

-- Drop legacy tables/enums if they exist
DROP TABLE IF EXISTS "AlertEvent" CASCADE;
DROP TABLE IF EXISTS "ProviderLog" CASCADE;
DROP TABLE IF EXISTS "WatchItem" CASCADE;
DROP TABLE IF EXISTS "College" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "VerificationToken" CASCADE;

DROP TYPE IF EXISTS "WatchStatus";
DROP TYPE IF EXISTS "ProviderState";
DROP TYPE IF EXISTS "AlertType";
DROP TYPE IF EXISTS "LogLevel";

-- Create enums
CREATE TYPE "WatchStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DELETED');
CREATE TYPE "ProviderState" AS ENUM ('OPEN', 'CLOSED', 'UNKNOWN');
CREATE TYPE "AlertType" AS ENUM ('SEATS_OPENED', 'WAITLIST_CHANGED', 'STATE_CHANGED');
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- Create tables
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "College" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "adapterKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WatchItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "term" TEXT NOT NULL,
  "subject" TEXT,
  "catalogNumber" TEXT,
  "courseTitle" TEXT,
  "sectionLabel" TEXT,
  "externalSectionId" TEXT NOT NULL,
  "externalUrl" TEXT,
  "status" "WatchStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastCheckedAt" TIMESTAMP(3),
  "lastKnownSeats" INTEGER,
  "lastKnownWaitlist" INTEGER,
  "lastKnownState" "ProviderState" NOT NULL DEFAULT 'UNKNOWN',
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "lastErrorAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WatchItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlertEvent" (
  "id" TEXT NOT NULL,
  "watchItemId" TEXT NOT NULL,
  "type" "AlertType" NOT NULL,
  "payload" JSONB NOT NULL,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderLog" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT,
  "watchItemId" TEXT,
  "level" "LogLevel" NOT NULL,
  "message" TEXT NOT NULL,
  "meta" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "College_slug_key" ON "College"("slug");
CREATE INDEX "WatchItem_userId_status_idx" ON "WatchItem"("userId", "status");
CREATE INDEX "WatchItem_collegeId_status_idx" ON "WatchItem"("collegeId", "status");
CREATE INDEX "AlertEvent_watchItemId_createdAt_idx" ON "AlertEvent"("watchItemId", "createdAt");
CREATE INDEX "ProviderLog_createdAt_idx" ON "ProviderLog"("createdAt");

-- Foreign keys
ALTER TABLE "WatchItem" ADD CONSTRAINT "WatchItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WatchItem" ADD CONSTRAINT "WatchItem_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_watchItemId_fkey" FOREIGN KEY ("watchItemId") REFERENCES "WatchItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderLog" ADD CONSTRAINT "ProviderLog_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderLog" ADD CONSTRAINT "ProviderLog_watchItemId_fkey" FOREIGN KEY ("watchItemId") REFERENCES "WatchItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

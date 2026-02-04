-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('active', 'paused', 'error');
CREATE TYPE "ProviderState" AS ENUM ('open', 'closed', 'unknown');
CREATE TYPE "AlertType" AS ENUM ('seats_open', 'waitlist_change', 'state_change');
CREATE TYPE "LogLevel" AS ENUM ('info', 'warn', 'error');

-- CreateTable
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
  "defaultTerm" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WatchItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "term" TEXT,
  "subject" TEXT,
  "catalogNumber" TEXT,
  "sectionLabel" TEXT,
  "sectionId" TEXT NOT NULL,
  "detailUrl" TEXT,
  "status" "WatchStatus" NOT NULL DEFAULT 'active',
  "alertOnWaitlist" BOOLEAN NOT NULL DEFAULT false,
  "lastCheckedAt" TIMESTAMP(3),
  "lastKnownSeats" INTEGER,
  "lastKnownWaitlist" INTEGER,
  "lastKnownState" "ProviderState" NOT NULL DEFAULT 'unknown',
  "lastChangeAt" TIMESTAMP(3),
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "nextCheckAt" TIMESTAMP(3),
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
CREATE INDEX "WatchItem_userId_idx" ON "WatchItem"("userId");
CREATE INDEX "WatchItem_collegeId_idx" ON "WatchItem"("collegeId");
CREATE INDEX "AlertEvent_watchItemId_idx" ON "AlertEvent"("watchItemId");
CREATE INDEX "ProviderLog_collegeId_idx" ON "ProviderLog"("collegeId");
CREATE INDEX "ProviderLog_watchItemId_idx" ON "ProviderLog"("watchItemId");

-- Foreign Keys
ALTER TABLE "WatchItem" ADD CONSTRAINT "WatchItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchItem" ADD CONSTRAINT "WatchItem_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_watchItemId_fkey" FOREIGN KEY ("watchItemId") REFERENCES "WatchItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderLog" ADD CONSTRAINT "ProviderLog_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderLog" ADD CONSTRAINT "ProviderLog_watchItemId_fkey" FOREIGN KEY ("watchItemId") REFERENCES "WatchItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

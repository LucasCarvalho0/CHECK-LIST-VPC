-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');
CREATE TYPE "Shift" AS ENUM ('FIRST', 'SECOND');
CREATE TYPE "ChecklistStatus" AS ENUM ('IN_PROGRESS', 'FINALIZED', 'CANCELED');
CREATE TYPE "ItemResponse" AS ENUM ('OK', 'NOK', 'NA', 'UNANSWERED');
CREATE TYPE "AuditResult" AS ENUM ('APPROVED', 'REPROVED');
CREATE TYPE "RepairStatus" AS ENUM ('OK', 'NOK', 'NOT_APPLICABLE');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'FINALIZE', 'CANCEL', 'CORRECTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "vehicleVersion" TEXT,
    "chassis" TEXT NOT NULL,
    "checklistDate" DATE NOT NULL,
    "checklistTime" TEXT NOT NULL,
    "shift" "Shift",
    "inspectorQA" TEXT,
    "leaderVPC" TEXT,
    "bpc" TEXT,
    "firmwareVersion" TEXT,
    "canbusVersion" TEXT,
    "auditResult" "AuditResult",
    "nonConformityDescription" TEXT,
    "repairStatus" "RepairStatus",
    "repairObservation" TEXT,
    "repairInspectorQA" TEXT,
    "repairLeaderVPC" TEXT,
    "repairDate" DATE,
    "repairTime" TEXT,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChecklistItemResponse" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "itemLabelSnapshot" TEXT NOT NULL,
    "response" "ItemResponse" NOT NULL DEFAULT 'UNANSWERED',
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChecklistItemResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "Checklist_chassis_idx" ON "Checklist"("chassis");
CREATE INDEX "Checklist_checklistDate_shift_idx" ON "Checklist"("checklistDate", "shift");
CREATE INDEX "Checklist_checklistDate_checklistTime_idx" ON "Checklist"("checklistDate", "checklistTime");
CREATE INDEX "Checklist_status_idx" ON "Checklist"("status");
CREATE INDEX "Checklist_auditResult_idx" ON "Checklist"("auditResult");
CREATE INDEX "ChecklistItemResponse_checklistId_idx" ON "ChecklistItemResponse"("checklistId");
CREATE INDEX "ChecklistItemResponse_itemCode_response_idx" ON "ChecklistItemResponse"("itemCode", "response");
CREATE UNIQUE INDEX "ChecklistItemResponse_checklistId_itemCode_key" ON "ChecklistItemResponse"("checklistId", "itemCode");
CREATE INDEX "AuditLog_checklistId_idx" ON "AuditLog"("checklistId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChecklistItemResponse" ADD CONSTRAINT "ChecklistItemResponse_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restrições extras de integridade (CHECK não é expresso no schema Prisma; SQL justificado)
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_chassis_not_blank" CHECK (length(btrim("chassis")) > 0);
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_time_format" CHECK ("checklistTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

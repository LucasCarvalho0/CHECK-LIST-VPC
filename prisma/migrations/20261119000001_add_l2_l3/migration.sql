-- AlterTable: add isL2 and isL3 columns to Checklist
ALTER TABLE "Checklist" ADD COLUMN "isL2" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Checklist" ADD COLUMN "isL3" BOOLEAN NOT NULL DEFAULT false;

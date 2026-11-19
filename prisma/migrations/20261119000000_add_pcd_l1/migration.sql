-- AlterTable: add isPCD and isL1 columns to Checklist
ALTER TABLE "Checklist" ADD COLUMN "isPCD" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Checklist" ADD COLUMN "isL1"  BOOLEAN NOT NULL DEFAULT false;

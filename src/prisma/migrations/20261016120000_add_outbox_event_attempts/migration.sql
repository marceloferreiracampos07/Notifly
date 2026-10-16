-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

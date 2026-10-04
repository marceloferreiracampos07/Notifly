-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "channel" TEXT NOT NULL,
ADD COLUMN     "recipient" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'QUEUED';

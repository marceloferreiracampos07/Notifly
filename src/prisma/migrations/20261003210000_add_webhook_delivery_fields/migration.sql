-- AlterTable
ALTER TABLE "WebhookDelivery" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastError" TEXT;

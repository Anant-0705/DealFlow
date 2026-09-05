-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_PAUSED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_RESUMED';
ALTER TYPE "AuditAction" ADD VALUE 'REPLENISHMENT_SCHEDULED';

-- CreateEnum
CREATE TYPE "BillingPeriodStatus" AS ENUM ('SCHEDULED', 'INVOICED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Stock" ADD COLUMN "reorderPoint" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Stock" ADD COLUMN "reorderQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Stock" ADD COLUMN "maxOnHand" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "pausedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BillingPeriod" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "taxPaise" INTEGER NOT NULL,
    "status" "BillingPeriodStatus" NOT NULL DEFAULT 'SCHEDULED',
    "invoiceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingPeriod_subscriptionId_periodStart_key" ON "BillingPeriod"("subscriptionId", "periodStart");
CREATE INDEX "BillingPeriod_subscriptionId_idx" ON "BillingPeriod"("subscriptionId");
CREATE INDEX "BillingPeriod_invoiceId_idx" ON "BillingPeriod"("invoiceId");
CREATE INDEX "BillingPeriod_status_idx" ON "BillingPeriod"("status");

ALTER TABLE "BillingPeriod" ADD CONSTRAINT "BillingPeriod_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPeriod" ADD CONSTRAINT "BillingPeriod_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

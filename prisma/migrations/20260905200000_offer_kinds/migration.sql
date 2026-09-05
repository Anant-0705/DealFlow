CREATE TYPE "OfferKind" AS ENUM ('UPSELL', 'CROSS_SELL');

ALTER TABLE "ProductPairing" ADD COLUMN IF NOT EXISTS "kind" "OfferKind" NOT NULL DEFAULT 'CROSS_SELL';
ALTER TABLE "ProductPairing" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

UPDATE "ProductPairing" AS pairing
SET "kind" = 'UPSELL'
FROM "Product" AS suggested
WHERE pairing."suggestedProductId" = suggested.id
  AND suggested.sku IN ('SRV-SETUP', 'SRV-WARRANTY', 'SUB-CARE', 'SUB-SLA');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CROSS_SELL_ADDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CROSS_SELL_DISMISSED';

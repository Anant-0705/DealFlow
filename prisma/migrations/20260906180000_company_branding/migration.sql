ALTER TABLE "Customer" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN "gstin" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN "billingAddress" TEXT NOT NULL DEFAULT '';

CREATE TABLE "CompanyProfile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "legalName" TEXT NOT NULL DEFAULT '',
    "tradingName" TEXT NOT NULL DEFAULT 'DealFlow',
    "tagline" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "pincode" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'India',
    "gstin" TEXT NOT NULL DEFAULT '',
    "pan" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankAccountName" TEXT NOT NULL DEFAULT '',
    "bankAccountNo" TEXT NOT NULL DEFAULT '',
    "bankIfsc" TEXT NOT NULL DEFAULT '',
    "logoDataUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CompanyProfile" (
  "id", "legalName", "tradingName", "tagline", "email", "phone",
  "addressLine1", "addressLine2", "city", "state", "pincode", "country",
  "gstin", "pan", "bankName", "bankAccountName", "bankAccountNo", "bankIfsc",
  "createdAt", "updatedAt"
) VALUES (
  1,
  'DealFlow Technologies Pvt. Ltd.',
  'DealFlow',
  'Quote-to-cash that shows its work',
  'billing@dealflow.demo',
  '+91 80 4000 1200',
  '14 Residency Road',
  'Shanthala Nagar',
  'Bengaluru',
  'Karnataka',
  '560025',
  'India',
  '29AABCU9603R1ZM',
  'AABCU9603R',
  'HDFC Bank',
  'DealFlow Technologies Pvt. Ltd.',
  '50100123456789',
  'HDFC0001234',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

UPDATE "Customer" SET
  "phone" = '+91 80 2222 1001',
  "gstin" = '29AABCA1234A1Z5',
  "billingAddress" = 'Acme Tower, MG Road, Bengaluru 560001'
WHERE "code" = 'C-1001';

UPDATE "Customer" SET
  "phone" = '+91 22 4000 2202',
  "gstin" = '27AABCB5678B1Z2',
  "billingAddress" = 'Beta House, Andheri East, Mumbai 400069'
WHERE "code" = 'C-1002';

UPDATE "Customer" SET
  "phone" = '+91 11 4150 3303',
  "gstin" = '07AABCN9012C1Z8',
  "billingAddress" = 'Nova Mart, Connaught Place, New Delhi 110001'
WHERE "code" = 'C-1003';

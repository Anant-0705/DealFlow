-- Fulfillment invoices are created per shipped allocation.
ALTER TYPE "InvoiceKind" ADD VALUE 'FULFILLMENT';

ALTER TABLE "InvoiceLine" ADD COLUMN "allocationId" INTEGER;

CREATE UNIQUE INDEX "InvoiceLine_allocationId_key" ON "InvoiceLine"("allocationId");

ALTER TABLE "InvoiceLine"
ADD CONSTRAINT "InvoiceLine_allocationId_fkey"
FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

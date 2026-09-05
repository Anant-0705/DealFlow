CREATE TABLE "PaymentSession" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "cfOrderId" TEXT,
    "paymentSessionId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentSession_orderId_key" ON "PaymentSession"("orderId");
CREATE INDEX "PaymentSession_invoiceId_idx" ON "PaymentSession"("invoiceId");
CREATE INDEX "PaymentSession_createdById_idx" ON "PaymentSession"("createdById");
CREATE INDEX "PaymentSession_status_idx" ON "PaymentSession"("status");

ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

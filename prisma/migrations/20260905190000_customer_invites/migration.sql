CREATE TABLE "CustomerInvite" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerInvite_tokenHash_key" ON "CustomerInvite"("tokenHash");
CREATE INDEX "CustomerInvite_customerId_email_idx" ON "CustomerInvite"("customerId", "email");
CREATE INDEX "CustomerInvite_expiresAt_idx" ON "CustomerInvite"("expiresAt");

ALTER TABLE "CustomerInvite" ADD CONSTRAINT "CustomerInvite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerInvite" ADD CONSTRAINT "CustomerInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

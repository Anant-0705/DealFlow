CREATE TYPE "CustomerAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "CustomerAccessRequest" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "billingAddress" TEXT NOT NULL,
    "status" "CustomerAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "customerId" INTEGER,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerAccessRequest_email_key" ON "CustomerAccessRequest"("email");
CREATE INDEX "CustomerAccessRequest_status_createdAt_idx" ON "CustomerAccessRequest"("status", "createdAt");
CREATE INDEX "CustomerAccessRequest_customerId_idx" ON "CustomerAccessRequest"("customerId");
CREATE INDEX "CustomerAccessRequest_reviewedById_idx" ON "CustomerAccessRequest"("reviewedById");

ALTER TABLE "CustomerAccessRequest" ADD CONSTRAINT "CustomerAccessRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerAccessRequest" ADD CONSTRAINT "CustomerAccessRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

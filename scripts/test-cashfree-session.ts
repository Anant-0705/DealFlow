import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createCashfreeOrder, fetchCashfreeOrder } from "../src/lib/cashfree";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { code: "INV-1010" },
      include: { order: { include: { quote: { include: { customer: true } } } } },
    });
    const customer = invoice.order.quote.customer;
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const orderId = `dftest${Date.now()}`.slice(0, 45);
    const created = await createCashfreeOrder({
      orderId,
      amountPaise: Math.max(100, invoice.totalPaise - invoice.paidPaise),
      customerId: `cust${customer.id}`,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      returnUrl: "http://localhost:3000/pay/cashfree/return?order_id={order_id}",
      notifyUrl: "http://localhost:3000/api/webhooks/cashfree",
      note: `DealFlow invoice ${invoice.code}`,
    });
    await prisma.paymentSession.create({
      data: {
        invoiceId: invoice.id,
        orderId: created.order_id,
        cfOrderId: created.cf_order_id ? String(created.cf_order_id) : null,
        paymentSessionId: created.payment_session_id,
        amountPaise: invoice.totalPaise - invoice.paidPaise,
        status: "CREATED",
        createdById: admin.id,
      },
    });
    const fetched = await fetchCashfreeOrder(created.order_id);
    console.log(JSON.stringify({
      invoice: invoice.code,
      orderId: created.order_id,
      status: fetched.order_status,
      hasSession: Boolean(created.payment_session_id),
      amount: created.order_amount,
    }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

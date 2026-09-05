import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const [{ prisma }, { settleCashfreeOrder }] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/modules/billing/gateway"),
  ]);
  const session = await prisma.paymentSession.findFirst({ orderBy: { id: "desc" } });
  if (!session) throw new Error("No payment session");
  const result = await settleCashfreeOrder(session.orderId);
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: session.invoiceId }, include: { payments: true } });
  console.log(JSON.stringify({
    settle: result,
    invoice: invoice.code,
    status: invoice.status,
    paidPaise: invoice.paidPaise,
    payments: invoice.payments.map((row) => ({ reference: row.reference, method: row.method, amountPaise: row.amountPaise })),
  }, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedDatabase } from "../prisma/seed";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
class RollbackVerification extends Error {}

async function main() {
 try {
  await client.$transaction(async (db) => {
    await seedDatabase(db);
    const users = await db.user.count();
    const customers = await db.customer.count();
    const quotes = await db.quote.count();
    const stalled = await db.quote.findUnique({ where: { code: "Q-1039" } });
    const anomaly = await db.quote.findUnique({ where: { code: "Q-1042" }, include: { currentRevision: true } });
    const slippage = await db.quote.findUnique({ where: { code: "Q-1043" }, include: { orders: { include: { lines: { include: { backorders: true } } } } } });
    const policy = await db.discountPolicy.findUnique({ where: { id: 1 } });
    if (users !== 8 || customers !== 3 || quotes !== 25) throw new Error(`Unexpected seed counts: ${users} users, ${customers} customers, ${quotes} quotes`);
    if (!policy || !stalled || !anomaly?.currentRevision || !slippage) throw new Error("One or more Phase 3 seed scenarios are missing");
    const idleDays = Math.floor((Date.now() - stalled.lastActivityAt.getTime()) / 86_400_000);
    if (idleDays <= policy.staleAfterDays) throw new Error("Q-1039 is not stale enough");
    const anomalyBps = anomaly.currentRevision.subtotalPaise ? anomaly.currentRevision.discountPaise * 10_000 / anomaly.currentRevision.subtotalPaise : 0;
    if (anomalyBps < 2_000) throw new Error("Q-1042 is not a visible discount anomaly");
    if (!slippage.orders.some((order) => order.lines.some((line) => line.backorders.some((backorder) => !backorder.consolidatedAt)))) throw new Error("Q-1043 has no open backorder");
    console.log("Phase 3 seed verified inside a rollback transaction: 8 users, 3 customers, 25 quotes, and all 3 health scenarios.");
    throw new RollbackVerification("rollback successful verification");
  }, { timeout: 120_000 });
 } catch (error) {
  if (!(error instanceof RollbackVerification)) throw error;
 } finally {
  await client.$disconnect();
 }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

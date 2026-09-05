import "dotenv/config";

import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { evaluateRevision } from "../src/modules/pricing/engine";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);

async function main() {
  const existingUsers = await client.user.count();
  if (existingUsers > 0) {
    console.log(`Seed skipped: database already contains ${existingUsers} user(s).`);
    return;
  }

  await client.$transaction(async (db) => {
  await db.$executeRawUnsafe(`DO $$ DECLARE r RECORD; BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations') LOOP
      EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
    END LOOP;
  END $$;`);

  const passwordHash = await hash("demo1234", 10);
  const [admin, manager, finance, ravi, priya] = await Promise.all([
    db.user.create({ data: { email: "admin@accordflow.demo", name: "Aarav Admin", role: "ADMIN", passwordHash } }),
    db.user.create({ data: { email: "manager@accordflow.demo", name: "Jane Shah", role: "MANAGER", passwordHash } }),
    db.user.create({ data: { email: "finance@accordflow.demo", name: "Rhea Iyer", role: "FINANCE", passwordHash } }),
    db.user.create({ data: { email: "ravi@accordflow.demo", name: "Ravi Rao", role: "REP", passwordHash } }),
    db.user.create({ data: { email: "priya@accordflow.demo", name: "Priya Mehta", role: "REP", passwordHash } }),
  ]);

  const [acme, beta, nova] = await Promise.all([
    db.customer.create({ data: { name: "Acme Corp", code: "C-1001", tier: "GOLD", email: "buyer@acme.demo", notes: "Strategic workplace-modernisation account." } }),
    db.customer.create({ data: { name: "Beta Industries", code: "C-1002", tier: "SILVER", email: "buyer@beta.demo" } }),
    db.customer.create({ data: { name: "Nova Retail", code: "C-1003", tier: "BRONZE", email: "buyer@nova.demo" } }),
  ]);
  await Promise.all([
    db.user.create({ data: { email: "buyer@acme.demo", name: "Acme Buyer", role: "CUSTOMER", customerId: acme.id, passwordHash } }),
    db.user.create({ data: { email: "buyer@beta.demo", name: "Beta Buyer", role: "CUSTOMER", customerId: beta.id, passwordHash } }),
    db.user.create({ data: { email: "buyer@nova.demo", name: "Nova Buyer", role: "CUSTOMER", customerId: nova.id, passwordHash } }),
  ]);

  const [hardware, services, subscription] = await Promise.all([
    db.category.create({ data: { name: "Hardware", discountCeilingBps: 1500 } }),
    db.category.create({ data: { name: "Services", discountCeilingBps: 1000 } }),
    db.category.create({ data: { name: "Subscription", discountCeilingBps: 1000 } }),
  ]);
  const [monthly, quarterly, yearly] = await Promise.all([
    db.subscriptionPlan.create({ data: { name: "Monthly", interval: "MONTHLY", prorateChanges: true, creditOnCancel: true } }),
    db.subscriptionPlan.create({ data: { name: "Quarterly", interval: "QUARTERLY", prorateChanges: true, creditOnCancel: false } }),
    db.subscriptionPlan.create({ data: { name: "Yearly", interval: "YEARLY", prorateChanges: false, creditOnCancel: false } }),
  ]);

  const productRows = [
    ["Laptop Pro 14", "LAP-PRO-14", hardware.id, "each", 1800, 8_500_000, 6_800_000, "Secure, high-performance 14-inch business laptop.", false, null, false],
    ["Docking Station", "DOCK-USBC", hardware.id, "each", 1800, 1_200_000, 850_000, "USB-C dock for a complete desk setup.", false, null, true],
    ["Wireless Mouse", "MOUSE-WL", hardware.id, "each", 1800, 150_000, 90_000, "Ergonomic wireless mouse.", false, null, true],
    ["27-inch Monitor", "MON-27", hardware.id, "each", 1800, 2_200_000, 1_700_000, "QHD productivity monitor.", false, null, false],
    ["Onsite Setup Service", "SRV-SETUP", services.id, "job", 1800, 450_000, 300_000, "Onsite installation and employee handover.", false, null, false],
    ["Extended Warranty 2yr", "SRV-WARRANTY", services.id, "plan", 1800, 600_000, 250_000, "Two years of accidental-damage cover.", false, null, false],
    ["Care Plan", "SUB-CARE", subscription.id, "month", 1800, 300_000, 120_000, "Managed device care billed monthly.", true, monthly.id, false],
    ["Support SLA", "SUB-SLA", subscription.id, "quarter", 1800, 900_000, 400_000, "Priority support response billed quarterly.", true, quarterly.id, false],
  ] as const;
  const products = new Map<string, Awaited<ReturnType<typeof db.product.create>>>();
  for (const [name, sku, categoryId, unit, taxBps, listPricePaise, costPaise, description, isSubscription, planId, isPromoted] of productRows) {
    const product = await db.product.create({ data: { name, sku, categoryId, unit, taxBps, listPricePaise, costPaise, description, isSubscription, planId, isPromoted } });
    products.set(name, product);
  }
  const laptop = products.get("Laptop Pro 14")!;
  const dock = products.get("Docking Station")!;
  const mouse = products.get("Wireless Mouse")!;
  const monitor = products.get("27-inch Monitor")!;
  const setup = products.get("Onsite Setup Service")!;
  const warranty = products.get("Extended Warranty 2yr")!;
  const care = products.get("Care Plan")!;
  const sla = products.get("Support SLA")!;

  const [laptop16, laptop32] = await Promise.all([
    db.productVariant.create({ data: { productId: laptop.id, attributeName: "RAM", attributeValue: "16GB", extraPricePaise: 0 } }),
    db.productVariant.create({ data: { productId: laptop.id, attributeName: "RAM", attributeValue: "32GB", extraPricePaise: 1_500_000 } }),
  ]);
  await Promise.all([
    db.productVariant.create({ data: { productId: monitor.id, attributeName: "Colour", attributeValue: "Black", extraPricePaise: 0 } }),
    db.productVariant.create({ data: { productId: monitor.id, attributeName: "Colour", attributeValue: "Silver", extraPricePaise: 0 } }),
  ]);

  await db.priceList.createMany({ data: [
    { name: "Bronze standard", tier: "BRONZE", currency: "INR", rule: "NONE", valueBps: 0 },
    { name: "Silver preferred", tier: "SILVER", currency: "INR", rule: "PERCENT_OFF", valueBps: 300 },
    { name: "Gold strategic", tier: "GOLD", currency: "INR", rule: "PERCENT_OFF", valueBps: 500 },
  ] });
  const policy = await db.discountPolicy.create({ data: { id: 1 } });

  const [mainWarehouse, eastDepot] = await Promise.all([
    db.warehouse.create({ data: { name: "Main Warehouse", code: "MAIN", shippingCostWeightPaise: 40_000, replenishmentLeadDays: 3 } }),
    db.warehouse.create({ data: { name: "East Depot", code: "EAST", shippingCostWeightPaise: 25_000, replenishmentLeadDays: 5 } }),
  ]);
  await db.stock.createMany({ data: [
    { warehouseId: mainWarehouse.id, productId: laptop.id, variantId: laptop16.id, onHand: 3, reserved: 0 },
    { warehouseId: eastDepot.id, productId: laptop.id, variantId: laptop16.id, onHand: 2, reserved: 0 },
    { warehouseId: mainWarehouse.id, productId: laptop.id, variantId: laptop32.id, onHand: 10, reserved: 0 },
    { warehouseId: mainWarehouse.id, productId: dock.id, onHand: 40, reserved: 4 },
    { warehouseId: eastDepot.id, productId: dock.id, onHand: 15, reserved: 0 },
    { warehouseId: mainWarehouse.id, productId: mouse.id, onHand: 200, reserved: 12 },
    { warehouseId: eastDepot.id, productId: monitor.id, onHand: 12, reserved: 0 },
  ] });
  await db.stockReceipt.create({ data: { warehouseId: eastDepot.id, productId: laptop.id, variantId: laptop16.id, qty: 10, expectedAt: daysFromNow(4) } });
  await db.productPairing.createMany({ data: [
    { productId: laptop.id, suggestedProductId: dock.id, weight: 10 },
    { productId: laptop.id, suggestedProductId: setup.id, weight: 8 },
    { productId: laptop.id, suggestedProductId: care.id, weight: 7 },
    { productId: setup.id, suggestedProductId: care.id, weight: 6 },
    { productId: monitor.id, suggestedProductId: dock.id, weight: 5 },
    { productId: laptop.id, suggestedProductId: mouse.id, weight: 4 },
  ] });

  const categories = new Map([[hardware.id, hardware], [services.id, services], [subscription.id, subscription]]);
  const createQuote = async (args: {
    code: string; customer: typeof acme; owner: typeof ravi; approvalStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "STALE";
    customerStatus: "DRAFT" | "SENT" | "NEGOTIATING" | "CONFIRMED"; products: Array<{ product: typeof laptop; qty?: number; discountBps?: number; variantId?: number | null }>;
    activityAt?: Date; requiredPending?: boolean;
  }) => {
    const priceList = await db.priceList.findUniqueOrThrow({ where: { tier: args.customer.tier } });
    const source = args.products.map(({ product, qty = 1, discountBps = 0, variantId = null }) => {
      const category = categories.get(product.categoryId)!;
      const price = Math.round(product.listPricePaise * (10_000 - priceList.valueBps) / 10_000);
      return { product, variantId, description: product.name, categoryId: category.id, categoryName: category.name, categoryCeilingBps: category.discountCeilingBps, qty, unitPricePaise: price, unitCostPaise: product.costPaise, taxBps: product.taxBps, lineDiscountBps: discountBps };
    });
    const evaluation = evaluateRevision({ customerTier: args.customer.tier, policy, orderDiscountBps: 0, lines: source });
    const quote = await db.quote.create({ data: { code: args.code, customerId: args.customer.id, ownerId: args.owner.id, approvalStatus: args.approvalStatus, customerStatus: args.customerStatus, lastActivityAt: args.activityAt ?? new Date() } });
    const revision = await db.quoteRevision.create({ data: {
      quoteId: quote.id, version: 1, createdById: args.owner.id, submittedAt: args.customerStatus === "DRAFT" ? null : new Date(),
      subtotalPaise: evaluation.subtotalPaise, discountPaise: evaluation.discountPaise, taxPaise: evaluation.taxPaise, totalPaise: evaluation.totalPaise,
      costPaise: evaluation.costPaise, marginPaise: evaluation.marginPaise, marginBps: evaluation.marginBps, maxLineExcessBps: evaluation.maxLineExcessBps,
      blendedExcessBps: evaluation.blendedExcessBps, excessValuePaise: evaluation.excessValuePaise, requiredLevel: evaluation.requiredLevel, reasons: evaluation.reasons,
    } });
    for (let i = 0; i < source.length; i++) {
      const row = source[i]; const calculated = evaluation.lines[i];
      await db.quoteLine.create({ data: { revisionId: revision.id, productId: row.product.id, variantId: row.variantId, description: row.description, qty: row.qty, unitPricePaise: row.unitPricePaise, unitCostPaise: row.unitCostPaise, lineDiscountBps: row.lineDiscountBps, effectiveDiscountBps: calculated.effectiveDiscountBps, allowedDiscountBps: calculated.allowedDiscountBps, excessBps: calculated.excessBps, netPaise: calculated.netPaise, taxPaise: calculated.taxPaise } });
    }
    await db.quote.update({ where: { id: quote.id }, data: { currentRevisionId: revision.id } });
    if (args.requiredPending) await db.approvalStep.create({ data: { revisionId: revision.id, level: "MANAGER", sequence: 1 } });
    await db.auditEvent.create({ data: { entity: "QUOTE", entityId: quote.id, quoteId: quote.id, action: "QUOTE_CREATED", actorId: args.owner.id, meta: { seeded: true } } });
    return { quote, revision };
  };

  for (let i = 0; i < 20; i++) {
    const customer = [acme, beta, nova][i % 3];
    const owner = i % 2 ? priya : ravi;
    const primary = [laptop, dock, monitor, warranty][i % 4];
    const discountBps = owner.id === ravi.id ? 500 + (i % 3) * 100 : 1100 + (i % 4) * 100;
    const { quote, revision } = await createQuote({ code: `Q-${1000 + i}`, customer, owner, approvalStatus: "APPROVED", customerStatus: "CONFIRMED", products: [{ product: primary, qty: 1 + (i % 3), discountBps }], activityAt: daysAgo(4 + i * 3) });
    const quoteLine = await db.quoteLine.findFirstOrThrow({ where: { revisionId: revision.id } });
    const order = await db.order.create({ data: { code: `SO-${1000 + i}`, quoteId: quote.id, revisionId: revision.id, confirmedAt: daysAgo(4 + i * 3), lines: { create: { quoteLineId: quoteLine.id, productId: quoteLine.productId, variantId: quoteLine.variantId, qty: quoteLine.qty, unitPricePaise: quoteLine.unitPricePaise } } } });
    if (i < 12) await db.invoice.create({ data: { code: `INV-${1000 + i}`, orderId: order.id, kind: "ONE_TIME", totalPaise: revision.totalPaise, paidPaise: i % 2 ? revision.totalPaise : 0, status: i % 2 ? "PAID" : "UNPAID", issuedAt: daysAgo(3 + i * 3), dueAt: daysFromNow(14 - i) } });
  }

  await createQuote({ code: "Q-1039", customer: nova, owner: ravi, approvalStatus: "NONE", customerStatus: "DRAFT", products: [{ product: monitor, discountBps: 400 }], activityAt: daysAgo(9) });
  await createQuote({ code: "Q-1040", customer: acme, owner: priya, approvalStatus: "APPROVED", customerStatus: "SENT", products: [{ product: laptop, qty: 2, discountBps: 1000, variantId: laptop16.id }, { product: care }] });
  const pending = await createQuote({ code: "Q-1041", customer: beta, owner: priya, approvalStatus: "PENDING", customerStatus: "DRAFT", products: [{ product: laptop, discountBps: 800, variantId: laptop32.id }, { product: setup, discountBps: 1200 }], requiredPending: true });
  await db.auditEvent.create({ data: { entity: "REVISION", entityId: pending.revision.id, quoteId: pending.quote.id, action: "SUBMITTED", actorId: priya.id, reason: "Seeded approval example", meta: { reasons: pending.revision.reasons } } });

  console.log("Seed complete: 8 users, 3 customers, 8 products, 23 quotes, and a ready approval inbox.");
  void admin; void manager; void finance; void yearly; void sla;
  }, { timeout: 120_000 });
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => client.$disconnect());

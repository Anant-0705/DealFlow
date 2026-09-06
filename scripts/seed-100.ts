import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedDatabase } from "../prisma/seed";
import { evaluateRevision } from "../src/modules/pricing/engine";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);

async function main() {
  const force = process.env.FORCE_SEED === "true" || process.argv.includes("--force");

  await client.$transaction(async (db) => {
    const existingQuotes = await db.quote.count().catch(() => 0);
    if (existingQuotes >= 50 && !force) {
      console.log(`Database already contains ${existingQuotes} quotes. Auto-seed skipped. (Set FORCE_SEED=true or pass --force to re-seed)`);
      return;
    }

    console.log("Starting comprehensive 100+ record dataset generation...");
    const passwordHash = await hash("demo1234", 10);

    // 1. Run baseline seed first
    console.log("Step 1: Populating canonical baseline...");
    await seedDatabase(db);

    const policy = await db.discountPolicy.findUniqueOrThrow({ where: { id: 1 } });
    const users = await db.user.findMany();
    const admin = users.find((u) => u.role === "ADMIN")!;
    const manager = users.find((u) => u.role === "MANAGER")!;
    const finance = users.find((u) => u.role === "FINANCE")!;
    const ravi = users.find((u) => u.email.startsWith("ravi"))!;
    const priya = users.find((u) => u.email.startsWith("priya"))!;

    // 2. Add More Sales Reps
    console.log("Step 2: Adding additional sales reps...");
    const [kabir, ananya] = await Promise.all([
      db.user.create({ data: { email: "kabir@dealflow.demo", name: "Kabir Sen", role: "REP", passwordHash } }),
      db.user.create({ data: { email: "ananya@dealflow.demo", name: "Ananya Roy", role: "REP", passwordHash } }),
    ]);
    const allReps = [ravi, priya, kabir, ananya];

    // 3. Add 9 More Enterprise & Mid-market Customers with Portal Logins
    console.log("Step 3: Creating 9 additional customer accounts with portal buyers...");
    const newCustomerData = [
      { name: "Tata Steel Ltd", code: "C-1004", tier: "GOLD" as const, email: "buyer@tatasteel.demo", phone: "+91 65 7242 4004", gstin: "20AAACT2727Q1ZW", billingAddress: "Bombay House, Homi Mody Street, Mumbai 400001", notes: "Strategic heavy manufacturing client with pan-India plants." },
      { name: "Reliance Digital", code: "C-1005", tier: "GOLD" as const, email: "buyer@reliancedigital.demo", phone: "+91 22 3555 5005", gstin: "27AAACR1234F1Z8", billingAddress: "Maker Chambers IV, Nariman Point, Mumbai 400021", notes: "Enterprise technology procurement for regional offices." },
      { name: "Infosys BPM", code: "C-1006", tier: "SILVER" as const, email: "buyer@infosys.demo", phone: "+91 80 2852 6006", gstin: "29AAACI4567G1Z1", billingAddress: "Electronics City, Hosur Road, Bengaluru 560100", notes: "BPO workstation hardware and care subscriptions." },
      { name: "Wipro Cloud Ops", code: "C-1007", tier: "SILVER" as const, email: "buyer@wipro.demo", phone: "+91 80 2844 7007", gstin: "29AAACW8901H1Z4", billingAddress: "Doddakannelli, Sarjapur Road, Bengaluru 560035", notes: "Data engineering hardware rollout." },
      { name: "Zomato Media", code: "C-1008", tier: "BRONZE" as const, email: "buyer@zomato.demo", phone: "+91 12 4432 8008", gstin: "06AAACZ2345J1Z7", billingAddress: "Ground Floor, Tower C, Pioneer Urban Land, Gurugram 122001", notes: "Fast-growth regional delivery hubs." },
      { name: "Swiggy Bundl", code: "C-1009", tier: "SILVER" as const, email: "buyer@swiggy.demo", phone: "+91 80 4678 9009", gstin: "29AAACB6789K1ZA", billingAddress: "Maruthi Chambers, Outer Ring Road, Bengaluru 560068", notes: "High volume recurring fleet management." },
      { name: "Flipkart Internet", code: "C-1010", tier: "GOLD" as const, email: "buyer@flipkart.demo", phone: "+91 80 4900 1010", gstin: "29AABCF1234L1ZD", billingAddress: "Buildings Alyssa, Begonia & Clover, Embassy Tech Village, Bengaluru 560103", notes: "National fulfillment centre hardware and SLA support." },
      { name: "Delhivery Express", code: "C-1011", tier: "BRONZE" as const, email: "buyer@delhivery.demo", phone: "+91 12 4671 1011", gstin: "06AAACD5678M1ZG", billingAddress: "Plot 5, Sector 44, Gurugram 122002", notes: "Logistics depot scanning units." },
      { name: "Mahindra Logistics", code: "C-1012", tier: "SILVER" as const, email: "buyer@mahindra.demo", phone: "+91 22 2490 1012", gstin: "27AAACM9012N1ZJ", billingAddress: "Techniplex I, Veer Savarkar Flyover, Goregaon West, Mumbai 400062", notes: "Supply chain operations." },
    ];

    const addedCustomers = [];
    for (const data of newCustomerData) {
      const customer = await db.customer.create({ data });
      await db.user.create({
        data: {
          email: data.email,
          name: `${data.name} Procurement`,
          role: "CUSTOMER",
          customerId: customer.id,
          passwordHash,
        },
      });
      addedCustomers.push(customer);
    }

    const allCustomers = await db.customer.findMany();

    // 4. Add West Logistics Warehouse & Additional Products
    console.log("Step 4: Adding West Logistics Hub and expanding catalog products...");
    const westWarehouse = await db.warehouse.create({
      data: {
        name: "West Logistics Hub",
        code: "WEST",
        shippingCostWeightPaise: 30_000,
        replenishmentLeadDays: 4,
        active: true,
      },
    });

    const allWarehouses = await db.warehouse.findMany();
    const categories = await db.category.findMany();
    const hardware = categories.find((c) => c.name === "Hardware")!;
    const services = categories.find((c) => c.name === "Services")!;
    const subscription = categories.find((c) => c.name === "Subscription")!;

    const [monthlyPlan] = await db.subscriptionPlan.findMany();

    const [curvedMon, keyboard, migService, secSuite] = await Promise.all([
      db.product.create({ data: { name: "34-inch UltraWide Display", sku: "MON-34-UW", categoryId: hardware.id, unit: "each", taxBps: 1800, listPricePaise: 4_500_000, costPaise: 3_200_000, description: "WQHD curved IPS monitor for financial traders.", isSubscription: false, isPromoted: true } }),
      db.product.create({ data: { name: "Mechanical Keyboard Pro", sku: "KEY-MECH-PRO", categoryId: hardware.id, unit: "each", taxBps: 1800, listPricePaise: 180_000, costPaise: 100_000, description: "Low profile wireless mechanical keyboard.", isSubscription: false, isPromoted: false } }),
      db.product.create({ data: { name: "Cloud Migration Service", sku: "SRV-MIGRATE", categoryId: services.id, unit: "job", taxBps: 1800, listPricePaise: 1_200_000, costPaise: 700_000, description: "Full tenant data migration and verification service.", isSubscription: false, isPromoted: false } }),
      db.product.create({ data: { name: "Zero Trust Security Suite", sku: "SUB-SEC-ZT", categoryId: subscription.id, unit: "seat/mo", taxBps: 1800, listPricePaise: 450_000, costPaise: 180_000, description: "Endpoint threat detection and compliance logging.", isSubscription: true, planId: monthlyPlan.id, isPromoted: true } }),
    ]);

    const allProducts = await db.product.findMany();
    const laptop = allProducts.find((p) => p.sku === "LAP-PRO-14")!;
    const dock = allProducts.find((p) => p.sku === "DOCK-USBC")!;
    const mouse = allProducts.find((p) => p.sku === "MOUSE-WL")!;
    const monitor = allProducts.find((p) => p.sku === "MON-27")!;
    const setup = allProducts.find((p) => p.sku === "SRV-SETUP")!;
    const warranty = allProducts.find((p) => p.sku === "SRV-WARRANTY")!;
    const care = allProducts.find((p) => p.sku === "SUB-CARE")!;

    const laptopVariants = await db.productVariant.findMany({ where: { productId: laptop.id } });
    const laptop16 = laptopVariants.find((v) => v.attributeValue === "16GB")!;
    const laptop32 = laptopVariants.find((v) => v.attributeValue === "32GB")!;

    // Stock West Warehouse with varied levels
    await db.stock.createMany({
      data: [
        { warehouseId: westWarehouse.id, productId: laptop.id, variantId: laptop16.id, onHand: 6, reserved: 0, reorderPoint: 4, reorderQty: 12, maxOnHand: 30 },
        { warehouseId: westWarehouse.id, productId: laptop.id, variantId: laptop32.id, onHand: 4, reserved: 0, reorderPoint: 2, reorderQty: 8, maxOnHand: 20 },
        { warehouseId: westWarehouse.id, productId: dock.id, onHand: 25, reserved: 2, reorderPoint: 10, reorderQty: 25, maxOnHand: 50 },
        { warehouseId: westWarehouse.id, productId: curvedMon.id, onHand: 8, reserved: 0, reorderPoint: 4, reorderQty: 10, maxOnHand: 25 },
        { warehouseId: westWarehouse.id, productId: keyboard.id, onHand: 80, reserved: 5, reorderPoint: 20, reorderQty: 50, maxOnHand: 150 },
      ],
    });

    // Helper: evaluate and create Quote with Revision
    const priceLists = await db.priceList.findMany();
    const priceListMap = new Map(priceLists.map((p) => [p.tier, p]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const createRichQuote = async (args: {
      code: string;
      customer: typeof allCustomers[0];
      owner: typeof allReps[0];
      approvalStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "STALE";
      customerStatus: "DRAFT" | "SENT" | "NEGOTIATING" | "CONFIRMED";
      products: Array<{ product: typeof allProducts[0]; qty?: number; discountBps?: number; variantId?: number | null }>;
      activityAt?: Date;
      orderDiscountBps?: number;
    }) => {
      const priceList = priceListMap.get(args.customer.tier)!;
      const source = args.products.map(({ product, qty = 1, discountBps = 0, variantId = null }) => {
        const category = categoryMap.get(product.categoryId)!;
        const price = Math.round(product.listPricePaise * (10_000 - priceList.valueBps) / 10_000);
        return {
          product,
          variantId,
          description: product.name,
          categoryId: category.id,
          categoryName: category.name,
          categoryCeilingBps: category.discountCeilingBps,
          qty,
          unitPricePaise: price,
          unitCostPaise: product.costPaise,
          taxBps: product.taxBps,
          lineDiscountBps: discountBps,
        };
      });

      const evaluation = evaluateRevision({
        customerTier: args.customer.tier,
        policy,
        orderDiscountBps: args.orderDiscountBps ?? 0,
        lines: source,
      });

      const quote = await db.quote.create({
        data: {
          code: args.code,
          customerId: args.customer.id,
          ownerId: args.owner.id,
          approvalStatus: args.approvalStatus,
          customerStatus: args.customerStatus,
          lastActivityAt: args.activityAt ?? new Date(),
        },
      });

      const revision = await db.quoteRevision.create({
        data: {
          quoteId: quote.id,
          version: 1,
          createdById: args.owner.id,
          submittedAt: args.customerStatus === "DRAFT" ? null : (args.activityAt ?? new Date()),
          orderDiscountBps: args.orderDiscountBps ?? 0,
          subtotalPaise: evaluation.subtotalPaise,
          discountPaise: evaluation.discountPaise,
          taxPaise: evaluation.taxPaise,
          totalPaise: evaluation.totalPaise,
          costPaise: evaluation.costPaise,
          marginPaise: evaluation.marginPaise,
          marginBps: evaluation.marginBps,
          maxLineExcessBps: evaluation.maxLineExcessBps,
          blendedExcessBps: evaluation.blendedExcessBps,
          excessValuePaise: evaluation.excessValuePaise,
          requiredLevel: evaluation.requiredLevel,
          reasons: evaluation.reasons,
        },
      });

      for (let i = 0; i < source.length; i++) {
        const row = source[i];
        const calculated = evaluation.lines[i];
        await db.quoteLine.create({
          data: {
            revisionId: revision.id,
            productId: row.product.id,
            variantId: row.variantId,
            description: row.description,
            qty: row.qty,
            unitPricePaise: row.unitPricePaise,
            unitCostPaise: row.unitCostPaise,
            lineDiscountBps: row.lineDiscountBps,
            effectiveDiscountBps: calculated.effectiveDiscountBps,
            allowedDiscountBps: calculated.allowedDiscountBps,
            excessBps: calculated.excessBps,
            netPaise: calculated.netPaise,
            taxPaise: calculated.taxPaise,
          },
        });
      }

      await db.quote.update({ where: { id: quote.id }, data: { currentRevisionId: revision.id } });
      await db.auditEvent.create({
        data: {
          entity: "QUOTE",
          entityId: quote.id,
          quoteId: quote.id,
          action: "QUOTE_CREATED",
          actorId: args.owner.id,
          at: args.activityAt ?? new Date(),
          meta: { seeded: true, code: args.code },
        },
      });

      return { quote, revision, evaluation };
    };

    console.log("Step 5: Generating 60+ quotes across all commercial scenarios...");

    // SCENARIO A: 8 Draft Quotes (Under construction by reps)
    for (let i = 0; i < 8; i++) {
      const code = `Q-${1045 + i}`;
      const customer = allCustomers[(i + 3) % allCustomers.length];
      const owner = allReps[i % allReps.length];
      await createRichQuote({
        code,
        customer,
        owner,
        approvalStatus: "NONE",
        customerStatus: "DRAFT",
        products: [
          { product: [laptop, curvedMon, dock][i % 3], qty: 2 + i, discountBps: 200 + i * 50, variantId: i % 2 === 0 ? laptop16.id : null },
          { product: keyboard, qty: 2 },
        ],
        activityAt: daysAgo(i + 1),
      });
    }

    // SCENARIO B: 10 Pending Manager Approval Quotes (Exceeding category ceiling)
    for (let i = 0; i < 10; i++) {
      const code = `Q-${1053 + i}`;
      const customer = allCustomers[(i + 5) % allCustomers.length];
      const owner = allReps[(i + 1) % allReps.length];
      const { quote, revision } = await createRichQuote({
        code,
        customer,
        owner,
        approvalStatus: "PENDING",
        customerStatus: "DRAFT",
        products: [
          { product: laptop, qty: 3, discountBps: 1800, variantId: laptop32.id }, // 18% on Hardware (ceiling 15%)
          { product: setup, qty: 1, discountBps: 1400 }, // 14% on Services (ceiling 10%)
        ],
        activityAt: daysAgo(i % 5),
      });

      await db.approvalStep.create({
        data: {
          revisionId: revision.id,
          level: "MANAGER",
          sequence: 1,
          status: "PENDING",
        },
      });

      await db.auditEvent.create({
        data: {
          entity: "REVISION",
          entityId: revision.id,
          quoteId: quote.id,
          action: "SUBMITTED",
          actorId: owner.id,
          reason: "Line discount crossed category ceiling; manager review requested.",
          at: daysAgo(i % 5),
        },
      });
    }

    // SCENARIO C: 6 Pending Finance Approval Quotes (High value >₹5L excess discount)
    for (let i = 0; i < 6; i++) {
      const code = `Q-${1063 + i}`;
      const customer = allCustomers[i % allCustomers.length];
      const owner = allReps[(i + 2) % allReps.length];
      const { quote, revision } = await createRichQuote({
        code,
        customer,
        owner,
        approvalStatus: "PENDING",
        customerStatus: "DRAFT",
        products: [
          { product: laptop, qty: 15, discountBps: 2200, variantId: laptop32.id }, // High volume + high excess value
          { product: curvedMon, qty: 10, discountBps: 2000 },
          { product: migService, qty: 2, discountBps: 1500 },
        ],
        activityAt: daysAgo(2),
      });

      // Manager already approved, now waiting for Finance
      await db.approvalStep.createMany({
        data: [
          { revisionId: revision.id, level: "MANAGER", sequence: 1, status: "APPROVED", actorId: manager.id, actedAt: daysAgo(1), reason: "Strategic enterprise volume approved by Sales VP." },
          { revisionId: revision.id, level: "FINANCE", sequence: 2, status: "PENDING" },
        ],
      });

      await db.auditEvent.createMany({
        data: [
          { entity: "REVISION", entityId: revision.id, quoteId: quote.id, action: "SUBMITTED", actorId: owner.id, at: daysAgo(2) },
          { entity: "REVISION", entityId: revision.id, quoteId: quote.id, action: "APPROVED", actorId: manager.id, reason: "Strategic enterprise volume approved by Sales VP.", at: daysAgo(1) },
        ],
      });
    }

    // SCENARIO D: 4 Rejected Quotes (With recorded audit reason)
    for (let i = 0; i < 4; i++) {
      const code = `Q-${1069 + i}`;
      const customer = allCustomers[(i + 4) % allCustomers.length];
      const owner = allReps[i % allReps.length];
      const { quote, revision } = await createRichQuote({
        code,
        customer,
        owner,
        approvalStatus: "REJECTED",
        customerStatus: "DRAFT",
        products: [
          { product: laptop, qty: 5, discountBps: 2800, variantId: laptop32.id },
        ],
        activityAt: daysAgo(5 + i),
      });

      await db.approvalStep.create({
        data: {
          revisionId: revision.id,
          level: "MANAGER",
          sequence: 1,
          status: "REJECTED",
          actorId: manager.id,
          actedAt: daysAgo(4 + i),
          reason: "Margin below minimum commercial hurdle rate of 12%. Counter with 14% max.",
        },
      });

      await db.auditEvent.create({
        data: {
          entity: "REVISION",
          entityId: revision.id,
          quoteId: quote.id,
          action: "REJECTED",
          actorId: manager.id,
          reason: "Margin below minimum commercial hurdle rate of 12%. Counter with 14% max.",
          at: daysAgo(4 + i),
        },
      });
    }

    // SCENARIO E: 8 Approved & Sent Quotes (Ready for customer in portal)
    for (let i = 0; i < 8; i++) {
      const code = `Q-${1073 + i}`;
      const customer = allCustomers[(i + 2) % allCustomers.length];
      const owner = allReps[(i + 1) % allReps.length];
      const { quote } = await createRichQuote({
        code,
        customer,
        owner,
        approvalStatus: "APPROVED",
        customerStatus: "SENT",
        products: [
          { product: laptop, qty: 4, discountBps: 400, variantId: laptop16.id },
          { product: dock, qty: 4 },
          { product: warranty, qty: 4 },
        ],
        activityAt: daysAgo(1 + i),
      });

      await db.auditEvent.create({
        data: {
          entity: "QUOTE",
          entityId: quote.id,
          quoteId: quote.id,
          action: "SENT",
          actorId: owner.id,
          reason: "Quotation officially delivered to customer procurement team.",
          at: daysAgo(1 + i),
        },
      });
    }

    // SCENARIO F: 5 Counter-offered / Negotiating Quotes (With portal conversation thread)
    for (let i = 0; i < 5; i++) {
      const code = `Q-${1081 + i}`;
      const customer = allCustomers[(i + 6) % allCustomers.length];
      const owner = allReps[i % allReps.length];
      const customerUser = await db.user.findFirst({ where: { customerId: customer.id } });
      const { quote, revision } = await createRichQuote({
        code,
        customer,
        owner,
        approvalStatus: "APPROVED",
        customerStatus: "NEGOTIATING",
        products: [
          { product: laptop, qty: 10, discountBps: 500, variantId: laptop32.id },
          { product: curvedMon, qty: 10, discountBps: 300 },
        ],
        activityAt: daysAgo(3),
      });

      if (customerUser) {
        // Customer posted a negotiation message proposing counter-terms
        await db.portalMessage.createMany({
          data: [
            {
              quoteId: quote.id,
              revisionId: revision.id,
              customerUserId: customerUser.id,
              message: "We have approval for 10 units if we can get a combined 8% discount on the hardware package.",
              proposedDiscountBps: 800,
              createdAt: daysAgo(2),
            },
            {
              quoteId: quote.id,
              revisionId: revision.id,
              customerUserId: customerUser.id,
              message: "Also checking if West Depot can deliver before next Monday?",
              createdAt: daysAgo(1),
            },
          ],
        });
      }

      await db.auditEvent.create({
        data: {
          entity: "QUOTE",
          entityId: quote.id,
          quoteId: quote.id,
          action: "COUNTER_PROPOSED",
          actorId: customerUser?.id,
          reason: "Customer requested counter terms in the collaboration thread.",
          at: daysAgo(2),
        },
      });
    }

    // SCENARIO G: 16 Confirmed Orders with Orders, Fulfillments, Invoices & Subscriptions
    console.log("Step 6: Creating 16 confirmed sales orders with multi-warehouse fulfillment, backorders, and invoices...");
    for (let i = 0; i < 16; i++) {
      const code = `Q-${1086 + i}`;
      const orderCode = `SO-${1046 + i}`;
      const invCode = `INV-${1046 + i}`;
      const customer = allCustomers[i % allCustomers.length];
      const owner = allReps[i % allReps.length];
      const confirmedDate = daysAgo(3 + i * 2);

      const hasBackorder = i % 4 === 1; // 25% of orders have an intentional backorder
      const hasSplit = i % 3 === 0; // 33% of orders have a multi-warehouse split
      const orderQty = hasBackorder ? 18 : (3 + (i % 4));

      const { quote, revision } = await createRichQuote({
        code,
        customer,
        owner,
        approvalStatus: "APPROVED",
        customerStatus: "CONFIRMED",
        products: [
          { product: laptop, qty: orderQty, discountBps: 400, variantId: laptop32.id },
          { product: dock, qty: Math.min(orderQty, 5) },
          { product: care, qty: Math.min(orderQty, 5) }, // Subscription line
        ],
        activityAt: confirmedDate,
      });

      const quoteLines = await db.quoteLine.findMany({ where: { revisionId: revision.id } });
      const laptopLine = quoteLines.find((l) => l.productId === laptop.id)!;
      const dockLine = quoteLines.find((l) => l.productId === dock.id)!;
      const careLine = quoteLines.find((l) => l.productId === care.id)!;

      const order = await db.order.create({
        data: {
          code: orderCode,
          quoteId: quote.id,
          revisionId: revision.id,
          confirmedAt: confirmedDate,
          promisedDeliveryDate: daysFromNow(4),
          lines: {
            create: quoteLines.map((l) => ({
              quoteLineId: l.id,
              productId: l.productId,
              variantId: l.variantId,
              qty: l.qty,
              unitPricePaise: l.unitPricePaise,
            })),
          },
        },
      });

      const orderLines = await db.orderLine.findMany({ where: { orderId: order.id } });
      const oLaptop = orderLines.find((l) => l.productId === laptop.id)!;
      const oDock = orderLines.find((l) => l.productId === dock.id)!;
      const oCare = orderLines.find((l) => l.productId === care.id)!;

      // Warehouse Allocation & Backorder Logic
      if (hasBackorder) {
        // Shipped available (e.g. 10 from Main), 8 on backorder
        await db.allocation.create({
          data: {
            orderLineId: oLaptop.id,
            warehouseId: allWarehouses[0].id,
            qty: 10,
            reserved: true,
            reason: "Main Warehouse available stock reserved.",
            shippedAt: i % 2 === 0 ? daysAgo(1) : null,
          },
        });
        await db.backorder.create({
          data: {
            orderLineId: oLaptop.id,
            qty: 8,
            expectedAt: daysFromNow(5),
          },
        });
        await db.quote.update({ where: { id: quote.id }, data: { fulfillmentStatus: "PARTIAL" } });
      } else if (hasSplit) {
        // Multi-warehouse split: 2 from Main, rest from West
        await db.allocation.createMany({
          data: [
            { orderLineId: oLaptop.id, warehouseId: allWarehouses[0].id, qty: 2, reserved: true, reason: "Main Warehouse allocation", shippedAt: daysAgo(1) },
            { orderLineId: oLaptop.id, warehouseId: westWarehouse.id, qty: orderQty - 2, reserved: true, reason: "West Logistics Hub allocation", shippedAt: daysAgo(1) },
          ],
        });
        await db.quote.update({ where: { id: quote.id }, data: { fulfillmentStatus: "FULFILLED" } });
      } else {
        // Single warehouse allocation
        await db.allocation.create({
          data: {
            orderLineId: oLaptop.id,
            warehouseId: allWarehouses[0].id,
            qty: orderQty,
            reserved: true,
            reason: "Primary single warehouse fulfillment.",
            shippedAt: i > 8 ? daysAgo(2) : null,
          },
        });
        await db.quote.update({ where: { id: quote.id }, data: { fulfillmentStatus: i > 8 ? "FULFILLED" : "PLANNED" } });
      }

      // Create Active Subscription for the recurring line
      const subscriptionRow = await db.subscription.create({
        data: {
          orderId: order.id,
          orderLineId: oCare.id,
          planId: monthlyPlan.id,
          qty: oCare.qty,
          unitPricePaise: oCare.unitPricePaise,
          startsAt: confirmedDate,
          nextBillingAt: daysFromNow(25),
          status: i === 15 ? "PAUSED" : "ACTIVE",
          pausedAt: i === 15 ? daysAgo(2) : null,
        },
      });

      // Scheduled billing period
      await db.billingPeriod.create({
        data: {
          subscriptionId: subscriptionRow.id,
          periodStart: confirmedDate,
          periodEnd: daysFromNow(30),
          qty: oCare.qty,
          unitPricePaise: oCare.unitPricePaise,
          amountPaise: oCare.unitPricePaise * oCare.qty,
          taxPaise: Math.round(oCare.unitPricePaise * oCare.qty * 0.18),
          status: "SCHEDULED",
        },
      });

      // Create Invoices across various payment statuses
      const isPaid = i % 4 === 0;
      const isPartial = i % 4 === 2;
      const isOverdue = i % 4 === 3;
      const isUnpaid = i % 4 === 1;

      const issuedAt = isOverdue ? daysAgo(40) : daysAgo(3 + i);
      const dueAt = isOverdue ? daysAgo(20) : daysFromNow(15);
      const status = isPaid ? "PAID" : isPartial ? "PARTIAL" : "UNPAID";
      const paidPaise = isPaid ? revision.totalPaise : isPartial ? Math.round(revision.totalPaise / 2) : 0;

      const invoice = await db.invoice.create({
        data: {
          code: invCode,
          orderId: order.id,
          kind: i % 5 === 0 ? "RECURRING" : "ONE_TIME",
          totalPaise: revision.totalPaise,
          paidPaise,
          status,
          issuedAt,
          dueAt,
          lines: {
            create: quoteLines.map((l) => ({
              orderLineId: orderLines.find((ol) => ol.quoteLineId === l.id)?.id,
              description: l.description,
              qty: l.qty,
              unitPaise: l.unitPricePaise,
              taxPaise: l.taxPaise,
              totalPaise: l.netPaise + l.taxPaise,
            })),
          },
        },
      });

      // Record payment if paid or partial
      if (paidPaise > 0) {
        await db.payment.create({
          data: {
            invoiceId: invoice.id,
            amountPaise: paidPaise,
            reference: `PAY-${invCode}-ONLINE-${i + 1}`,
            method: i % 2 === 0 ? "NEFT / RTGS" : "Cashfree UPI",
            receivedAt: new Date(issuedAt.getTime() + 86_400_000 * 2),
            recordedById: finance.id,
          },
        });
      }

      // Add Credit Note for select invoice to test credit ledger
      if (i === 7) {
        await db.creditNote.create({
          data: {
            code: `CN-${1001 + i}`,
            invoiceId: invoice.id,
            amountPaise: 50_000,
            reason: "Commercial goodwill credit applied for warehouse delay.",
          },
        });
      }

      // Update quote payment status
      await db.quote.update({
        where: { id: quote.id },
        data: { paymentStatus: isPaid ? "PAID" : isPartial ? "PARTIAL" : "UNPAID" },
      });
    }

    // SCENARIO H: 8 Operational Tasks
    console.log("Step 7: Creating operational follow-up tasks...");
    const sampleQuotes = await db.quote.findMany({ take: 8, orderBy: { id: "desc" } });
    for (let i = 0; i < sampleQuotes.length; i++) {
      await db.task.create({
        data: {
          quoteId: sampleQuotes[i].id,
          assigneeId: allReps[i % allReps.length].id,
          createdById: manager.id,
          kind: i % 2 === 0 ? "NUDGE" : "ESCALATION",
          message: i % 2 === 0 ? "Customer reviewed quote in portal; follow up on commercial terms." : "Deal has been pending review for over 3 days. Check hurdle rate with Finance.",
          done: i % 3 === 0,
        },
      });
    }

    console.log("Step 8: Verifying complete dataset counts...");
    const finalCounts = {
      users: await db.user.count(),
      customers: await db.customer.count(),
      warehouses: await db.warehouse.count(),
      products: await db.product.count(),
      quotes: await db.quote.count(),
      revisions: await db.quoteRevision.count(),
      orders: await db.order.count(),
      allocations: await db.allocation.count(),
      backorders: await db.backorder.count(),
      invoices: await db.invoice.count(),
      payments: await db.payment.count(),
      subscriptions: await db.subscription.count(),
      portalMessages: await db.portalMessage.count(),
      auditEvents: await db.auditEvent.count(),
      tasks: await db.task.count(),
    };

    console.log("\n=======================================================");
    console.log("✅ COMPREHENSIVE DATASET GENERATION COMPLETE!");
    console.log("=======================================================");
    console.table(finalCounts);
  }, { timeout: 180_000 });
}

main()
  .catch((e) => {
    console.error("Error generating comprehensive dataset:", e);
    process.exitCode = 1;
  })
  .finally(() => client.$disconnect());

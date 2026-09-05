import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildInvoicePdf, buildQuotePdf } from "../src/modules/documents/pdf";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const logo = readFileSync(join(process.cwd(), "public/branding/logo.png"));
    const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;
    await prisma.companyProfile.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        legalName: "DealFlow Technologies Pvt. Ltd.",
        tradingName: "DealFlow",
        tagline: "Quote-to-cash that shows its work",
        email: "billing@dealflow.demo",
        phone: "+91 80 4000 1200",
        addressLine1: "14 Residency Road",
        addressLine2: "Shanthala Nagar",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560025",
        country: "India",
        gstin: "29AABCU9603R1ZM",
        pan: "AABCU9603R",
        bankName: "HDFC Bank",
        bankAccountName: "DealFlow Technologies Pvt. Ltd.",
        bankAccountNo: "50100123456789",
        bankIfsc: "HDFC0001234",
        logoDataUrl,
      },
      update: { logoDataUrl },
    });
    const company = await prisma.companyProfile.findUniqueOrThrow({ where: { id: 1 } });
    const quote = await prisma.quote.findFirst({
      where: { customerStatus: "CONFIRMED", currentRevision: { isNot: null } },
      include: {
        customer: true,
        owner: true,
        currentRevision: { include: { lines: { include: { variant: true } } } },
        orders: { select: { code: true, confirmedAt: true }, orderBy: { confirmedAt: "desc" }, take: 1 },
      },
      orderBy: { currentRevision: { lines: { _count: "desc" } } },
    });
    const invoice = await prisma.invoice.findFirst({
      where: { status: "UNPAID" },
      include: {
        lines: true,
        payments: true,
        creditNotes: true,
        order: { include: { quote: { include: { customer: true, currentRevision: { include: { lines: true } } } } } },
      },
      orderBy: { id: "desc" },
    });
    if (invoice && invoice.lines.length === 0 && invoice.order.quote.currentRevision?.lines.length) {
      await prisma.invoiceLine.createMany({
        data: invoice.order.quote.currentRevision.lines.map((line) => ({
          invoiceId: invoice.id,
          description: line.description,
          qty: line.qty,
          unitPaise: line.unitPricePaise,
          taxPaise: line.taxPaise,
          totalPaise: line.netPaise + line.taxPaise,
        })),
      });
      invoice.lines = await prisma.invoiceLine.findMany({ where: { invoiceId: invoice.id } });
    }
    if (!quote?.currentRevision) throw new Error("No confirmed quotation found");
    if (!invoice) throw new Error("No unpaid invoice found");
    const outDir = join(process.cwd(), "docs/samples");
    mkdirSync(outDir, { recursive: true });
    const quotePath = join(outDir, `DealFlow-quotation-${quote.code}.pdf`);
    const invoicePath = join(outDir, `DealFlow-invoice-${invoice.code}.pdf`);
    writeFileSync(quotePath, await buildQuotePdf(quote, company));
    writeFileSync(invoicePath, await buildInvoicePdf(invoice, company));
    console.log(quotePath);
    console.log(invoicePath);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

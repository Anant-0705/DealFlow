import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
function formatPercent(bps: number, digits = 1) {
  return `${(bps / 100).toFixed(digits)}%`;
}

function filledLines(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

function companyAddressLines(company: Company) {
  return filledLines([
    company.addressLine1,
    company.addressLine2,
    [company.city, company.state, company.pincode].filter(Boolean).join(", "),
    company.country,
    company.phone ? `Phone ${company.phone}` : "",
    company.email,
    company.gstin ? `GSTIN ${company.gstin}` : "",
    company.pan ? `PAN ${company.pan}` : "",
  ]);
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 42;
const INK = rgb(0.19, 0.16, 0.15);
const MUTED = rgb(0.43, 0.39, 0.36);
const LINE = rgb(0.84, 0.8, 0.75);
const HEADER = rgb(0.45, 0.35, 0.31);
const BAND = rgb(0.95, 0.92, 0.9);
const STAMP_BG = rgb(0.87, 0.94, 0.89);
const STAMP_FG = rgb(0.18, 0.4, 0.25);

export function formatPdfMoney(paise: number) {
  return `Rs ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100)}`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type Company = {
  legalName: string;
  tradingName: string;
  tagline: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin: string;
  pan: string;
  logoDataUrl: string | null;
  bankName: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankIfsc: string;
};

type QuoteDoc = {
  code: string;
  customerStatus: string;
  lastActivityAt: Date;
  promisedDeliveryDate: Date | null;
  customer: { name: string; email: string; phone: string; gstin: string; billingAddress: string };
  owner: { name: string };
  currentRevision: {
    version: number;
    subtotalPaise: number;
    discountPaise: number;
    taxPaise: number;
    totalPaise: number;
    lines: Array<{ description: string; qty: number; unitPricePaise: number; lineDiscountBps: number; taxPaise: number; netPaise: number; variant: { attributeValue: string } | null }>;
  } | null;
  orders: Array<{ code: string; confirmedAt: Date }>;
};

type InvoiceDoc = {
  code: string;
  kind: string;
  status: string;
  issuedAt: Date;
  dueAt: Date;
  totalPaise: number;
  paidPaise: number;
  lines: Array<{ description: string; qty: number; unitPaise: number; taxPaise: number; totalPaise: number }>;
  payments: Array<{ reference: string; method: string; amountPaise: number; receivedAt: Date }>;
  creditNotes: Array<{ amountPaise: number }>;
  order: { code: string; quote: { code: string; customer: { name: string; email: string; phone: string; gstin: string; billingAddress: string } } };
};

async function embedLogo(doc: PDFDocument, logoDataUrl: string | null) {
  const fromData = logoDataUrl?.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (fromData) {
    const bytes = Buffer.from(fromData[2], "base64");
    return fromData[1] === "image/png" ? doc.embedPng(bytes) : doc.embedJpg(bytes);
  }
  try {
    const png = readFileSync(join(process.cwd(), "public/branding/logo.png"));
    return doc.embedPng(png);
  } catch {
    return null;
  }
}

function drawWrapped(page: PDFPage, text: string, font: PDFFont, size: number, x: number, y: number, maxWidth: number, color = INK) {
  const words = text.split(/\s+/);
  let line = "";
  let cursor = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      page.drawText(line, { x, y: cursor, size, font, color });
      cursor -= size + 3;
      line = word;
    } else line = next;
  }
  if (line) {
    page.drawText(line, { x, y: cursor, size, font, color });
    cursor -= size + 3;
  }
  return cursor;
}

async function startDocument(title: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setAuthor("DealFlow");
  doc.setCreator("DealFlow");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  return { doc, page, regular, bold };
}

async function drawHeader(
  doc: PDFDocument,
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  company: Company,
  heading: string,
  code: string,
  kicker: string,
  stamp: string,
  meta: string[],
) {
  const logo = await embedLogo(doc, company.logoDataUrl);
  let y = PAGE_H - MARGIN;
  if (logo) {
    page.drawImage(logo, { x: MARGIN, y: y - 48, width: 48, height: 48 });
  }
  const textX = MARGIN + (logo ? 60 : 0);
  page.drawText(company.tradingName || "DealFlow", { x: textX, y: y - 12, size: 9, font: fonts.bold, color: HEADER });
  page.drawText(`${heading} ${code}`, { x: textX, y: y - 30, size: 16, font: fonts.bold, color: INK });
  page.drawText(kicker, { x: textX, y: y - 46, size: 9, font: fonts.regular, color: MUTED });

  const stampWidth = fonts.bold.widthOfTextAtSize(stamp.toUpperCase(), 8) + 16;
  page.drawRectangle({ x: PAGE_W - MARGIN - stampWidth, y: y - 18, width: stampWidth, height: 16, color: STAMP_BG, borderColor: rgb(0.62, 0.76, 0.66), borderWidth: 0.8 });
  page.drawText(stamp.toUpperCase(), { x: PAGE_W - MARGIN - stampWidth + 8, y: y - 13, size: 8, font: fonts.bold, color: STAMP_FG });
  meta.forEach((line, index) => {
    page.drawText(line, { x: PAGE_W - MARGIN - fonts.regular.widthOfTextAtSize(line, 9), y: y - 34 - index * 12, size: 9, font: fonts.regular, color: MUTED });
  });

  y -= 64;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1.4, color: HEADER });
  return y - 16;
}

function drawParties(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, y: number, fromLabel: string, fromName: string, fromLines: string[], toLabel: string, toName: string, toLines: string[]) {
  const col = (PAGE_W - MARGIN * 2 - 24) / 2;
  page.drawText(fromLabel.toUpperCase(), { x: MARGIN, y, size: 8, font: fonts.bold, color: MUTED });
  page.drawText(toLabel.toUpperCase(), { x: MARGIN + col + 24, y, size: 8, font: fonts.bold, color: MUTED });
  y -= 14;
  page.drawText(fromName, { x: MARGIN, y, size: 11, font: fonts.bold, color: INK });
  page.drawText(toName, { x: MARGIN + col + 24, y, size: 11, font: fonts.bold, color: INK });
  y -= 14;
  const leftEnd = fromLines.reduce((cursor, line) => drawWrapped(page, line, fonts.regular, 9, MARGIN, cursor, col, MUTED), y);
  const rightEnd = toLines.reduce((cursor, line) => drawWrapped(page, line, fonts.regular, 9, MARGIN + col + 24, cursor, col, MUTED), y);
  return Math.min(leftEnd, rightEnd) - 10;
}

function drawTable(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  y: number,
  headers: string[],
  rows: string[][],
  widths: number[],
) {
  const startX = MARGIN;
  const rowH = 18;
  const drawRow = (cells: string[], top: number, header: boolean) => {
    page.drawRectangle({ x: startX, y: top - rowH + 4, width: widths.reduce((sum, width) => sum + width, 0), height: rowH, color: header ? BAND : undefined });
    let x = startX;
    cells.forEach((cell, index) => {
      const font = header ? fonts.bold : fonts.regular;
      const size = 8;
      const text = cell.length > 42 ? `${cell.slice(0, 40)}…` : cell;
      const alignRight = index > 0;
      const tx = alignRight ? x + widths[index] - 6 - font.widthOfTextAtSize(text, size) : x + 6;
      page.drawText(text, { x: Math.max(x + 2, tx), y: top - 8, size, font, color: INK });
      x += widths[index];
    });
    page.drawLine({ start: { x: startX, y: top - rowH + 4 }, end: { x: startX + widths.reduce((sum, width) => sum + width, 0), y: top - rowH + 4 }, thickness: 0.4, color: LINE });
    return top - rowH;
  };
  y = drawRow(headers, y, true);
  for (const row of rows) y = drawRow(row, y, false);
  return y - 8;
}

function drawTotals(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, y: number, rows: Array<[string, string, boolean?]>) {
  const x = PAGE_W - MARGIN - 200;
  for (const [label, value, grand] of rows) {
    const font = grand ? fonts.bold : fonts.regular;
    const size = grand ? 11 : 9;
    if (grand) page.drawLine({ start: { x, y: y + 12 }, end: { x: PAGE_W - MARGIN, y: y + 12 }, thickness: 1.2, color: HEADER });
    page.drawText(label, { x, y, size, font, color: grand ? INK : MUTED });
    page.drawText(value, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(value, size), y, size, font, color: INK });
    y -= grand ? 18 : 14;
  }
  return y - 8;
}

function drawBank(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, y: number, company: Company) {
  page.drawText("BANK DETAILS", { x: MARGIN, y, size: 8, font: fonts.bold, color: MUTED });
  y -= 13;
  [`${company.bankName}`, company.bankAccountName, `A/c ${company.bankAccountNo}`, `IFSC ${company.bankIfsc}`].forEach((line) => {
    page.drawText(line, { x: MARGIN, y, size: 9, font: fonts.regular, color: INK });
    y -= 12;
  });
  return y;
}

export async function buildQuotePdf(quote: QuoteDoc, company: Company) {
  const revision = quote.currentRevision;
  if (!revision) throw new Error("Quotation has no current revision.");
  const confirmed = quote.customerStatus === "CONFIRMED";
  const stamp = confirmed ? "Confirmed" : quote.customerStatus === "SENT" || quote.customerStatus === "NEGOTIATING" ? "Sent" : "Draft";
  const { doc, page, regular, bold } = await startDocument(`Quotation ${quote.code}`);
  let y = await drawHeader(doc, page, { regular, bold }, company, "Quotation", quote.code, `Revision v${revision.version} · Prepared by ${quote.owner.name}`, stamp, [
    confirmed && quote.orders[0] ? `Confirmed ${formatDate(quote.orders[0].confirmedAt)}` : `Updated ${formatDate(quote.lastActivityAt)}`,
  ]);
  y = drawParties(
    page, { regular, bold }, y,
    "From", company.legalName || company.tradingName, companyAddressLines(company),
    "Quoted to", quote.customer.name,
    [quote.customer.billingAddress, quote.customer.email, quote.customer.phone ? `Phone ${quote.customer.phone}` : "", quote.customer.gstin ? `GSTIN ${quote.customer.gstin}` : ""].filter(Boolean),
  );
  y = drawTable(page, { regular, bold }, y,
    ["Description", "Qty", "Unit", "Discount", "Tax", "Net"],
    revision.lines.map((line) => [
      line.variant ? `${line.description} (${line.variant.attributeValue})` : line.description,
      String(line.qty),
      formatPdfMoney(line.unitPricePaise),
      formatPercent(line.lineDiscountBps, 1),
      formatPdfMoney(line.taxPaise),
      formatPdfMoney(line.netPaise + line.taxPaise),
    ]),
    [168, 36, 78, 58, 72, 82],
  );
  y = drawTotals(page, { regular, bold }, y, [
    ["Subtotal", formatPdfMoney(revision.subtotalPaise)],
    ["Discount", `-${formatPdfMoney(revision.discountPaise)}`],
    ["Tax", formatPdfMoney(revision.taxPaise)],
    ["Total", formatPdfMoney(revision.totalPaise), true],
  ]);
  page.drawText("TERMS", { x: MARGIN, y, size: 8, font: bold, color: MUTED });
  y -= 13;
  y = drawWrapped(page, confirmed
    ? `This document is the confirmed commercial agreement for ${quote.code}. Prices are in INR. Confirmation created an order and invoice(s); this quotation is not a tax invoice.`
    : "This quotation is an offer. It becomes binding when the customer confirms it in the DealFlow portal. Prices are in INR. Confirmation creates an order and invoice(s).",
  regular, 9, MARGIN, y, PAGE_W - MARGIN * 2, MUTED);
  if (!confirmed) drawBank(page, { regular, bold }, y - 8, company);
  return doc.save();
}

export async function buildInvoicePdf(invoice: InvoiceDoc, company: Company) {
  const credits = invoice.creditNotes.reduce((sum, note) => sum + note.amountPaise, 0);
  const balance = Math.max(0, invoice.totalPaise - invoice.paidPaise - credits);
  const customer = invoice.order.quote.customer;
  const { doc, page, regular, bold } = await startDocument(`Invoice ${invoice.code}`);
  let y = await drawHeader(doc, page, { regular, bold }, company, "Invoice", invoice.code, `Quote ${invoice.order.quote.code} · Order ${invoice.order.code} · ${invoice.kind.replaceAll("_", " ")}`, invoice.status.replaceAll("_", " "), [
    `Issued ${formatDate(invoice.issuedAt)}`,
    `Due ${formatDate(invoice.dueAt)}`,
  ]);
  y = drawParties(
    page, { regular, bold }, y,
    "From", company.legalName || company.tradingName, companyAddressLines(company),
    "Bill to", customer.name,
    [customer.billingAddress, customer.email, customer.phone ? `Phone ${customer.phone}` : "", customer.gstin ? `GSTIN ${customer.gstin}` : ""].filter(Boolean),
  );
  y = drawTable(page, { regular, bold }, y,
    ["Description", "Qty", "Unit", "Tax", "Total"],
    invoice.lines.map((line) => [line.description, String(line.qty), formatPdfMoney(line.unitPaise), formatPdfMoney(line.taxPaise), formatPdfMoney(line.totalPaise)]),
    [210, 40, 82, 82, 80],
  );
  y = drawTotals(page, { regular, bold }, y, [
    ["Total", formatPdfMoney(invoice.totalPaise)],
    ["Paid", formatPdfMoney(invoice.paidPaise)],
    ["Credits", formatPdfMoney(credits)],
    ["Balance", formatPdfMoney(balance), true],
  ]);
  if (invoice.payments.length) {
    page.drawText("PAYMENTS", { x: MARGIN, y, size: 8, font: bold, color: MUTED });
    y -= 13;
    for (const payment of invoice.payments) {
      page.drawText(`${payment.reference} · ${payment.method} · ${formatPdfMoney(payment.amountPaise)} · ${formatDate(payment.receivedAt)}`, { x: MARGIN, y, size: 9, font: regular, color: INK });
      y -= 12;
    }
    y -= 6;
  }
  if (balance > 0) drawBank(page, { regular, bold }, y, company);
  return doc.save();
}

export function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

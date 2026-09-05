export function creditedPaise(creditNotes: Array<{ amountPaise: number }>) {
  return creditNotes.reduce((sum, note) => sum + note.amountPaise, 0);
}

export function taxOnNet(netPaise: number, taxBps: number) {
  return Math.round(netPaise * taxBps / 10_000);
}

export function grossPaise(netPaise: number, taxBps: number) {
  return netPaise + taxOnNet(netPaise, taxBps);
}

export function invoiceRemainingPaise(invoice: {
  totalPaise: number;
  paidPaise: number;
  creditNotes?: Array<{ amountPaise: number }>;
}) {
  return Math.max(0, invoice.totalPaise - invoice.paidPaise - creditedPaise(invoice.creditNotes ?? []));
}

export function invoiceStatusFromBalances(
  invoice: { totalPaise: number; paidPaise: number },
  credited: number,
) {
  const remaining = Math.max(0, invoice.totalPaise - invoice.paidPaise - credited);
  if (remaining > 0) return invoice.paidPaise > 0 || credited > 0 ? "PARTIAL" as const : "UNPAID" as const;
  if (invoice.paidPaise <= 0 && credited > 0) return "CREDITED" as const;
  return "PAID" as const;
}

export function quotePaymentStatusFromInvoices(invoices: Array<{
  totalPaise: number;
  paidPaise: number;
  creditedPaise: number;
}>) {
  if (!invoices.length) return "UNPAID" as const;
  if (invoices.every((invoice) => invoiceRemainingPaise({ ...invoice, creditNotes: [{ amountPaise: invoice.creditedPaise }] }) === 0)) {
    return "PAID" as const;
  }
  if (invoices.some((invoice) => invoice.paidPaise > 0 || invoice.creditedPaise > 0)) return "PARTIAL" as const;
  return "UNPAID" as const;
}

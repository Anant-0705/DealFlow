const roundDiv = (numerator: number, denominator: number) =>
  Math.floor((numerator + denominator / 2) / denominator);

export function shipmentCharge(input: {
  orderedQty: number;
  shipmentQty: number;
  previouslyInvoicedQty: number;
  quotedNetPaise: number;
  quotedTaxPaise: number;
  previouslyInvoicedNetPaise: number;
  previouslyInvoicedTaxPaise: number;
}) {
  const {
    orderedQty,
    shipmentQty,
    previouslyInvoicedQty,
    quotedNetPaise,
    quotedTaxPaise,
    previouslyInvoicedNetPaise,
    previouslyInvoicedTaxPaise,
  } = input;
  if (!Number.isInteger(orderedQty) || orderedQty <= 0) throw new Error("Ordered quantity must be positive.");
  if (!Number.isInteger(shipmentQty) || shipmentQty <= 0) throw new Error("Shipment quantity must be positive.");
  if (!Number.isInteger(previouslyInvoicedQty) || previouslyInvoicedQty < 0) throw new Error("Previously invoiced quantity is invalid.");
  const cumulativeQty = previouslyInvoicedQty + shipmentQty;
  if (cumulativeQty > orderedQty) throw new Error("Shipment invoice exceeds the ordered quantity.");

  const cumulativeNetPaise = roundDiv(quotedNetPaise * cumulativeQty, orderedQty);
  const cumulativeTaxPaise = roundDiv(quotedTaxPaise * cumulativeQty, orderedQty);
  const netPaise = cumulativeNetPaise - previouslyInvoicedNetPaise;
  const taxPaise = cumulativeTaxPaise - previouslyInvoicedTaxPaise;
  if (netPaise < 0 || taxPaise < 0) throw new Error("Existing invoices exceed the quotation value for this line.");

  return {
    qty: shipmentQty,
    unitPaise: roundDiv(netPaise, shipmentQty),
    netPaise,
    taxPaise,
    totalPaise: netPaise + taxPaise,
  };
}

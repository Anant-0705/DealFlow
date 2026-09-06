import { describe, expect, it } from "vitest";
import { shipmentCharge } from "./fulfillment-charge";

describe("shipmentCharge", () => {
  it("invoices only the first fulfilled quantity", () => {
    expect(shipmentCharge({
      orderedQty: 100,
      shipmentQty: 15,
      previouslyInvoicedQty: 0,
      quotedNetPaise: 8_500_000,
      quotedTaxPaise: 1_530_000,
      previouslyInvoicedNetPaise: 0,
      previouslyInvoicedTaxPaise: 0,
    })).toEqual({
      qty: 15,
      unitPaise: 85_000,
      netPaise: 1_275_000,
      taxPaise: 229_500,
      totalPaise: 1_504_500,
    });
  });

  it("invoices a later backorder shipment as a separate remainder", () => {
    expect(shipmentCharge({
      orderedQty: 100,
      shipmentQty: 85,
      previouslyInvoicedQty: 15,
      quotedNetPaise: 8_500_000,
      quotedTaxPaise: 1_530_000,
      previouslyInvoicedNetPaise: 1_275_000,
      previouslyInvoicedTaxPaise: 229_500,
    })).toEqual({
      qty: 85,
      unitPaise: 85_000,
      netPaise: 7_225_000,
      taxPaise: 1_300_500,
      totalPaise: 8_525_500,
    });
  });

  it("preserves the exact quoted total across rounded partial shipments", () => {
    const first = shipmentCharge({
      orderedQty: 3,
      shipmentQty: 1,
      previouslyInvoicedQty: 0,
      quotedNetPaise: 100,
      quotedTaxPaise: 18,
      previouslyInvoicedNetPaise: 0,
      previouslyInvoicedTaxPaise: 0,
    });
    const second = shipmentCharge({
      orderedQty: 3,
      shipmentQty: 2,
      previouslyInvoicedQty: 1,
      quotedNetPaise: 100,
      quotedTaxPaise: 18,
      previouslyInvoicedNetPaise: first.netPaise,
      previouslyInvoicedTaxPaise: first.taxPaise,
    });
    expect(first.totalPaise + second.totalPaise).toBe(118);
  });

  it("rejects billing more than the ordered quantity", () => {
    expect(() => shipmentCharge({
      orderedQty: 100,
      shipmentQty: 86,
      previouslyInvoicedQty: 15,
      quotedNetPaise: 8_500_000,
      quotedTaxPaise: 1_530_000,
      previouslyInvoicedNetPaise: 1_275_000,
      previouslyInvoicedTaxPaise: 229_500,
    })).toThrow("exceeds the ordered quantity");
  });
});

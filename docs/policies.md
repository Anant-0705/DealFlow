# DealFlow business policies

1. The customer tier ceiling and product-category ceiling are both enforced. The lower ceiling wins for each quote line.
2. Any line above its allowed ceiling requires Sales Manager approval.
3. Finance follows the manager when the maximum line excess is at least 8 points, blended excess is at least 3%, or excess discount value is at least ₹5,000.
4. New quote lines begin with the customer tier default—Bronze 5%, Silver 10%, Gold 15%—and remain editable. Catalog price lists are retained as reference configuration and are not applied a second time.
5. Offer suggestions must meet the configured 20% margin floor. Settings pairings are tagged upsell or cross-sell; same-product variant upgrades are always upsell. Ranking uses pairing weight, co-purchase evidence, and promotion status.
6. Stock-tracked one-time lines are invoiced only when an allocation is marked shipped. Every shipment or later backorder shipment creates a separate invoice for that shipped quantity under the original customer order. Non-stock one-time lines are invoiced at confirmation; all invoices are due in 15 days.
7. Recurring lines bill in calendar periods. The first period and mid-period quantity changes are prorated by inclusive calendar days and rounded to paise.
8. Cancellation credits unused days only when the subscription plan enables `creditOnCancel`. An unpaid invoice is reduced; paid invoices retain a customer credit note.
9. Inventory is reserved only when operations accepts a suggested or manual fulfillment split. Confirmation itself never reserves stock.
10. Payment references, recurring period starts, and shipment allocations are treated as idempotency keys so retries do not create duplicate money records.

All thresholds are stored in Settings and every approval, rejection, revision, quote edit, customer message, counter-offer, fulfillment decision, billing change, payment, upsell decision, and settings change is auditable.

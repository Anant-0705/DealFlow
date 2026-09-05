# AccordFlow business policies

1. The customer tier ceiling and product-category ceiling are both enforced. The lower ceiling wins for each quote line.
2. Any line above its allowed ceiling requires Sales Manager approval.
3. Finance follows the manager when the maximum line excess is at least 8 points, blended excess is at least 3%, or excess discount value is at least ₹5,000.
4. Customer price-list reductions set the unit price and do not count as discretionary discount.
5. Upsell suggestions must meet the configured 20% margin floor and are ranked by pairing strength, co-purchase evidence, and promotion status.
6. One-time order lines are invoiced when the customer confirms and are due in 15 days.
7. Recurring lines bill in calendar periods. The first period and mid-period quantity changes are prorated by inclusive calendar days and rounded to paise.
8. Cancellation credits unused days only when the subscription plan enables `creditOnCancel`. An unpaid invoice is reduced; paid invoices retain a customer credit note.
9. Inventory is reserved only when operations accepts a suggested or manual fulfillment split. Confirmation itself never reserves stock.
10. Payment references and recurring period starts are treated as idempotency keys so retries do not create duplicate money records.

All thresholds are stored in Settings and every approval, rejection, revision, quote edit, customer message, counter-offer, fulfillment decision, billing change, payment, upsell decision, and settings change is auditable.

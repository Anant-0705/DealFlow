# AccordFlow (DealFlow360) — PHASE 2 README
## Negotiation + Execution · Hours 9–17

> Source of truth: `DealFlow360.pdf`. Phase 2 covers B6 (Fulfillment & Warehouse Split), B7 (Subscription & Billing), B8 (Customer Portal Negotiation), §9 steps 5–8 (split, hybrid billing, portal counter → re-approval, confirm → payment), and §7's rule that the portal is "a real, separate, restricted view."

> Precondition: every Phase 1 exit criterion passed on one laptop from `db:reset`. If not, stop and fix Phase 1. Phase 2 reads Phase 1's revisions, approval steps, audit log, stock rows and plans directly.

---

## 0. What Phase 2 delivers

This is the phase where the demo happens. At the end, the deal leaves the company (portal), comes back changed (counter-offer → automatic re-approval), gets confirmed (order pinned to an approved revision), moves stock (split + reservation + backorder + consolidation), and produces money records (one-time invoice, subscription, proration, credit note, payment).

**Phase 2 exit criteria (all must pass from `db:reset`):**
1. Customer `buyer@acme.demo` logs in, sees only Acme quotes, and gets a 404 on any Beta quote URL.
2. Customer submits a 20% counter on laptops → new revision created from portal → quote automatically back in Pending Approval with the reason text → old approvals shown as Stale.
3. Manager + Finance approve the new revision; rep clicks Send; customer clicks Confirm → Order SO-1042 created, pointing at that revision.
4. Confirming from a stale tab (older revision) is refused with a clear message.
5. Fulfillment shows suggested split 3 (Main) + 2 (East) + 1 backordered with reasons; Accept reserves stock atomically; stock grid shows reserved counts.
6. Recording a stock receipt at East triggers the Consolidate prompt; accepting allocates only the remaining 1.
7. Billing shows one-time invoice and Care Plan subscription separately; adding one seat mid-month produces a proration invoice with the math visible; cancelling produces a credit note.
8. Record Payment updates invoice balance and status; sending the same reference twice creates one payment.
9. Deal Timeline on Q-1042 shows every event above in order.
10. Impact Preview shows before/after (total, margin, approval, stock, first bill) before a change is saved.

---

## 1. Dependencies on Phase 1 (do not rewrite these)

| Phase 1 artefact | How Phase 2 uses it |
|---|---|
| `pricing/engine.ts` `evaluateRevision()` | Evaluates portal counter-offers; drives Impact Preview |
| `approvals/route.ts` + `submitForApproval` logic | Re-routes counter-offer revisions automatically |
| `QuoteRevision` snapshots + `reasons` | Timeline, revision diff, "Stale" display |
| `AuditEvent` with `quoteId` and action enum | Timeline is one query over this table |
| `Stock` (onHand, reserved), `Warehouse` (shippingCostWeightPaise, replenishmentLeadDays), `StockReceipt` | Allocation engine, reservation, consolidate prompt |
| `SubscriptionPlan` (interval, prorateChanges, creditOnCancel), `Product.isSubscription` | Subscription creation, proration, cancellation |
| Four status columns on `Quote` | Confirm sets customer/fulfillment/payment; fulfillment and payment actions update their own column |
| `requireRole`, middleware `/portal` group, `User.customerId` | Portal scoping |
| `lib/audit.ts`, `lib/codes.ts`, `lib/money.ts` | Every new action logs, every new record gets a code, every amount is paise |

New tables used (already in schema since Phase 1): `PortalMessage`, `Order`, `OrderLine`, `Allocation`, `Backorder`, `StockReceipt`, `Subscription`, `SubscriptionChange`, `Invoice`, `InvoiceLine`, `Payment`, `CreditNote`.

**One schema addition allowed in Phase 2** (agree before hour 9, migrate once, everyone pulls): add `dismissedUpsellIds` to `QuoteRevision` if it wasn't done in P1, and add `shippedAt` to `Allocation`. Nothing else.

---

## 2. File structure additions

```
src/
├── modules/
│   ├── negotiation/
│   │   ├── actions.ts            ← sendToCustomer, postMessage, proposeCounter, acceptCounter, replyAndRevise
│   │   ├── queries.ts            ← portal-scoped queries (ALL take customerId)
│   │   ├── confirm.ts            ← confirmQuotation transaction (the most important function in the app)
│   │   ├── diff.ts               ← diffRevisions(a, b) → line-by-line changes
│   │   └── schemas.ts
│   ├── orders/
│   │   ├── actions.ts            ← createOrderFromRevision (called by confirm.ts only)
│   │   └── queries.ts
│   ├── inventory/
│   │   ├── allocate.ts           ← THE ALLOCATION ENGINE (pure)
│   │   ├── allocate.test.ts
│   │   ├── reserve.ts            ← reserveAllocations(plan) transaction with row locks
│   │   ├── receipts.ts           ← recordReceipt, findConsolidatableBackorders
│   │   └── actions.ts            ← acceptSuggestedSplit, manualOverride, consolidateBackorder, markShipped, recordStockReceipt
│   ├── billing/
│   │   ├── onConfirm.ts          ← generateInitialBilling(order) → one-time invoice + subscriptions + first recurring invoice
│   │   ├── prorate.ts            ← THE PRORATION ENGINE (pure)
│   │   ├── prorate.test.ts
│   │   ├── schedule.ts           ← upcomingSchedule(subscription, n) preview
│   │   ├── runBilling.ts         ← generateDuePeriods(asOfDate) idempotent
│   │   ├── actions.ts            ← modifySubscription, cancelSubscription, recordPayment, issueCreditNote, runBillingAsOf
│   │   └── queries.ts
│   ├── timeline/
│   │   └── queries.ts            ← getTimeline(quoteId) with joins for actor names
│   └── preview/
│       └── impact.ts             ← computeImpact(current, proposed, ctx) → before/after (pure, composes engines)
├── components/
│   ├── layout/PortalShell.tsx    ← customer nav: My Quotations · Messages · Profile
│   ├── portal/
│   │   ├── PortalQuoteList.tsx
│   │   ├── PortalQuoteView.tsx   ← lines, totals, status, revision, "what changed"
│   │   ├── LineCommentBox.tsx
│   │   ├── CounterOfferForm.tsx  ← proposed % + customer-safe Impact Preview
│   │   ├── ConfirmButton.tsx     ← with stale-revision guard
│   │   └── MessageThread.tsx
│   ├── quotes/
│   │   ├── DealTimeline.tsx
│   │   ├── RevisionDiff.tsx
│   │   ├── ImpactPreview.tsx     ← internal version (shows margin, stock, approval)
│   │   └── SendToCustomerButton.tsx
│   ├── fulfillment/
│   │   ├── StockTable.tsx        ← warehouse × product: on hand / reserved / available
│   │   ├── SplitPlanTable.tsx    ← warehouse / qty / shipments / cost + reasons
│   │   ├── ManualOverrideGrid.tsx
│   │   ├── ConsolidatePrompt.tsx ← the auto-appearing banner
│   │   └── StockReceiptForm.tsx
│   ├── billing/
│   │   ├── OneTimeLines.tsx
│   │   ├── RecurringLines.tsx
│   │   ├── UpcomingSchedule.tsx
│   │   ├── ModifySubscriptionDialog.tsx  ← shows proration math before confirm
│   │   ├── CancelSubscriptionDialog.tsx  ← shows credit math before confirm
│   │   ├── InvoiceCard.tsx
│   │   ├── RecordPaymentDialog.tsx
│   │   └── InvoiceStepper.tsx    ← Order Confirmed → Shipped → Invoiced → Paid
│   └── shared/
│       └── BeforeAfter.tsx       ← two-column diff strip used by ImpactPreview
└── app/
    ├── (portal)/portal/
    │   ├── layout.tsx            ← PortalShell; requires CUSTOMER
    │   ├── page.tsx              ← My Quotations
    │   ├── quotes/[code]/page.tsx
    │   ├── messages/page.tsx
    │   └── profile/page.tsx
    └── (internal)/app/
        ├── fulfillment/
        │   ├── page.tsx          ← stock table + orders awaiting fulfillment
        │   └── [orderCode]/page.tsx
        ├── billing/
        │   ├── page.tsx          ← subscriptions list
        │   └── [orderCode]/page.tsx
        ├── invoices/
        │   ├── page.tsx
        │   └── [code]/page.tsx
        └── quotations/[code]/    ← existing page gains: Timeline tab, Messages panel, Send button, Impact Preview on edit
```

Rule from Phase 1 still applies: nothing in `app/` computes money or stock. Pages call module functions.

---

## 3. Customer portal (PDF B8, §7)

### 3.1 Scoping — the non-negotiable part
Every function in `negotiation/queries.ts` takes `customerId` as its first argument and puts it in the `where` clause. The page never passes a customerId from the URL — it reads it from the session. A quote code in the URL that belongs to another customer returns null → the page renders 404. There is no "list all quotes" function reachable from the portal module.

The portal layout imports **nothing** from `components/quotes/` except `Money`, `Percent`, `StatusBadge`, `ReasonList`. In particular it never imports `TotalsPanel` (shows margin) or `DecisionPanel` (shows internal routing).

Middleware: `/portal/*` requires role CUSTOMER; a CUSTOMER hitting `/app/*` is redirected to `/portal`. Server actions in `negotiation/actions.ts` that customers call start with `requireRole(session, ['CUSTOMER'])` and then re-verify that the quote belongs to `session.customerId`. Two checks, not one.

### 3.2 What the customer sees
| Screen | Content |
|---|---|
| **My Quotations** | Own quotes with customerStatus in SENT / NEGOTIATING / CONFIRMED (never DRAFT). Columns: code, date, total, status, revision "v3". |
| **Quote view** | Header (status badge, revision number, valid-until if set), lines (description, variant, qty, unit price, discount %, net), totals (subtotal, discount, tax, total). **No cost, no margin, no allowed %, no excess, no rep notes, no approval steps.** If revision > 1, a "What changed" block from `diff.ts`: "Laptop Pro 14 discount 12% → 15%", "Care Plan 12 months → 24 months". |
| **Per-line comment** | Text box per line + "Request change" → PortalMessage (lineId set). |
| **Counter-discount** | One field: proposed discount %, applied to all lines or to a selected line. Beneath it the **customer Impact Preview**: current total → proposed total, savings ₹. Nothing about approval or margin. Button **Submit Request**. |
| **Confirm Quotation** | Big green button. Disabled with explanation when: approval pending ("Your latest request is under review"), or status already CONFIRMED. |
| **Messages** | Thread per quote: customer messages and rep replies, time-stamped. |
| **Profile** | Company, tier label (Gold), contact email. Read-only. |

Status wording matches the PDF exactly: **Sent**, **Under Negotiation**, **Confirmed**.

### 3.3 Actions (customer)
- **postMessage(quoteCode, lineId?, text)** — inserts PortalMessage; audit PORTAL_MESSAGE; bumps `lastActivityAt`; customerStatus → NEGOTIATING if it was SENT.
- **proposeCounter(quoteCode, proposal)** — the important one:
  1. Load current revision; verify ownership.
  2. Create revision v+1: copy lines, apply proposed discount(s), `createdVia = PORTAL`, `createdById = customer user`.
  3. Run `evaluateRevision` server-side (re-reading catalog + policy, never trusting the client).
  4. Run the router. If required level is NONE → approvalStatus APPROVED, audit AUTO_APPROVED. If MANAGER/FINANCE → create ApprovalSteps, approvalStatus PENDING, mark previous revision's steps STALE, audit SUBMITTED with reasons and audit REVISED (v→v+1, via PORTAL).
  5. customerStatus → NEGOTIATING. Store the proposal text as a PortalMessage with `proposedDiscountBps` so the rep sees "Customer proposed 20% on laptops."
  6. All in one transaction.
  This is the PDF's "if final terms exceed thresholds, the quotation automatically re-enters the approval flow."
- **confirmQuotation(quoteCode, revisionId)** — see §4.

### 3.4 Actions (rep, internal side)
- **sendToCustomer(quoteCode)** — allowed when approvalStatus is APPROVED (or NONE required); sets customerStatus SENT; audit SENT. Button on the quote page. Also allowed from NEGOTIATING to re-send a new revision.
- **acceptCounter** — no data change; the portal-created revision is already current. Rep just clicks Send once approvals clear. (Button exists for clarity; it logs COUNTER_ACCEPTED.)
- **replyAndRevise(quoteCode, changes, message)** — creates v+1 from rep with changes, posts a message, runs engine + router as in Phase 1's Revise; then rep sends. Audit REVISED + PORTAL_MESSAGE.
- Messages panel on the internal quote page shows the thread; rep can reply without revising.

---

## 4. Confirm → Order (the critical transaction) — `negotiation/confirm.ts`

Single database transaction. Order of checks matters; each failure returns a specific message.

| Step | Check / action | Failure message |
|---|---|---|
| 1 | Quote belongs to session customer | 404 |
| 2 | `revisionId` from the button equals `quote.currentRevisionId` | "This quotation was updated (now v3). Please review the latest version." |
| 3 | customerStatus ≠ CONFIRMED | "Already confirmed." |
| 4 | approvalStatus = APPROVED **for this revision** (all required steps APPROVED, none PENDING/RETURNED/REJECTED/STALE) | "Awaiting internal approval." |
| 5 | Create `Order` (code SO-next, quoteId, revisionId, confirmedAt, promisedDeliveryDate = today + max warehouse lead days, or rep-set) | — |
| 6 | Copy each QuoteLine → OrderLine (snapshot again: qty, unit price, cost, discount, net, tax, isSubscription, planId) | — |
| 7 | Set customerStatus CONFIRMED, fulfillmentStatus PLANNED, paymentStatus UNPAID | — |
| 8 | Call `billing/onConfirm.ts` → invoices + subscriptions (§7) | — |
| 9 | Audit CONFIRMED (actor = customer user), ORDER_CREATED, INVOICE_ISSUED, SUBSCRIPTION_CREATED | — |

Stock is **not** reserved here. The order goes to Fulfillment where ops accepts the split (§5). Reason: the brief separates confirmation from fulfillment, and ops may override the plan.

Rep-side equivalent: an internal **Confirm on behalf of customer** button (for phone/email acceptances) runs the same function with `requireRole(['REP','MANAGER','ADMIN'])` and audit actor = rep, `meta.onBehalf = true`. Same checks, same transaction. Do not write a second confirm path.

---

## 5. Fulfillment and warehouse split (PDF A4, B6)

### 5.1 Allocation engine — `inventory/allocate.ts` (pure, tested)

**Input:** order lines (id, productId, variantId, qty) · stock snapshot (per warehouse × product × variant: available = onHand − reserved) · warehouses (id, name, shippingCostWeightPaise).

**Per line, algorithm:**
1. Candidate warehouses = those with available > 0 for this product/variant.
2. Enumerate every non-empty subset of candidate warehouses (2 → 3 subsets, 3 → 7, 4 → 15 — fine).
3. For each subset: fill greedily from the warehouse with the most available, then next; shipped = min(qty, sum available in subset); shipments = number of warehouses actually used; cost = sum of shippingCostWeightPaise for warehouses used.
4. Pick the subset maximizing shipped; tie-break fewest shipments; tie-break lowest cost; final tie-break warehouse id (deterministic).
5. backorderQty = qty − shipped.

**Output:** per line: allocations [{warehouseId, qty}], backorderQty; per order: total shipments (distinct warehouses used across lines), total estimated cost, and `reasons[]`:
- "Laptop Pro 14 (16GB) ×6: Main 3 available, East 2 available → ship 3 + 2, backorder 1. Chosen: cheapest 2-shipment option (₹650)."
- "Docking Station ×6: Main has 40 → ship 6 from Main. Single shipment."
- "Onsite Setup Service ×1: service line, no stock required."

Service and subscription lines are skipped (no stock) and say so.

**Tests (vitest, 20 min):** 6 laptops with 3+2 → 3+2+1; 4 laptops with 3+2 → 3 from Main + 1 from East (2 shipments) vs — if East alone had 4 — East only (1 shipment) wins; equal shipments → lower cost wins; zero stock everywhere → all backorder; service line ignored; two lines sharing a warehouse count one shipment.

### 5.2 Screens
- **Fulfillment list** `/app/fulfillment`: top = live stock table (warehouse, product/variant, on hand, reserved, available — available computed in the query); bottom = orders with fulfillmentStatus PLANNED/PARTIAL (code, customer, status, warehouses involved). Row → detail.
- **Fulfillment detail** `/app/fulfillment/[orderCode]`: the plan table (warehouse, qty fulfilled, est. shipments, cost), backorder rows, reasons list, buttons **Accept Suggested Split** / **Manual Override**, and — when applicable — the **Consolidate Remaining Backorder** banner.
- **Preview on the quote page**: once approvalStatus = APPROVED, the quote's Fulfillment tab shows the same plan computed live, labelled "Preview — nothing reserved until confirmation."

### 5.3 Actions — `inventory/actions.ts` (FINANCE/OPS, ADMIN; MANAGER read-only)
- **acceptSuggestedSplit(orderCode)**:
  1. Transaction. Lock the Stock rows involved (select … for update).
  2. Recompute the plan against the locked, fresh stock (never trust the plan the page showed 30 seconds ago).
  3. For each allocation: `reserved += qty`; insert Allocation (reserved = true, reason string).
  4. Insert Backorder rows for shortfalls with `expectedAt` = earliest matching StockReceipt.expectedAt, else null.
  5. fulfillmentStatus = FULFILLED if no backorders else PARTIAL. Audit SPLIT_ACCEPTED with the plan in meta.
- **manualOverride(orderCode, grid)**: same transaction shape, but the plan comes from the user's grid. Validation: each qty ≤ available for that warehouse (checked after locking), sum per line ≤ line qty; remainder → backorder. Audit SPLIT_OVERRIDDEN with before/after. A quantity above available is rejected with "East Depot has only 2 available."
- **recordStockReceipt(warehouseId, productId, variantId?, qty, receiptId?)**: transaction: `onHand += qty`; set `receivedAt` on the StockReceipt (or create an ad-hoc one). Then call `findConsolidatableBackorders(productId, variantId)` → list of open Backorders (consolidatedAt null) for which available now > 0. Audit STOCK_RECEIVED. The order pages for those backorders render the banner on next load (no push needed; a page refresh or the Reload Data button surfaces it — PDF says "prompt appears automatically," and rendering it whenever the condition holds satisfies that).
- **consolidateBackorder(backorderId)**: transaction: lock stock; qty = min(backorder.qty, available); reserve; insert Allocation; if fully covered set `consolidatedAt`, else reduce backorder qty; recompute fulfillmentStatus. Audit BACKORDER_CONSOLIDATED. Touches **only** the outstanding remainder — existing allocations are never rewritten.
- **markShipped(allocationId)** (optional, 20 min): `onHand −= qty`, `reserved −= qty`, `shippedAt = now`. Audit SHIPPED. Gives the invoice stepper its "Shipped" state.

### 5.4 Must avoid
- Reserving at approval or at confirm.
- Reserving without a row lock and a fresh availability check.
- Storing `available`.
- Letting the override grid exceed available.
- Consolidation that re-allocates already-reserved quantities.

---

## 6. Deal Timeline and revision diff (PDF A3 "all … logged", mockup audit blocks)

- **`timeline/queries.ts`**: AuditEvents where quoteId = X, ordered by `at`, joined to actor name. Also include events whose entity is the order/invoice/payment linked to that quote (they already carry `quoteId` — Phase 1 rule).
- **DealTimeline component**: vertical list; icon by action enum (submit, approve, return, reject, revise, portal message, counter, sent, confirmed, split, backorder, receipt, consolidated, invoice, proration, credit note, payment); actor; time; reason; expandable meta (before/after for edits, plan for splits, math for proration).
- **RevisionDiff** (`negotiation/diff.ts`): compare two revisions line-by-line by productId+variantId: added, removed, qty changed, discount changed, price changed, order discount changed; plus total delta and margin delta. Rendered on the internal quote page ("v2 → v3") and, without margin, in the portal ("What changed").

Tab on the quote page: Overview · Timeline · Messages · Fulfillment (preview/plan) · Billing (preview/schedule). This is the "one deal workspace" your research recommended, built as tabs on the existing page.

---

## 7. Billing on confirmation (PDF B7, §9 step 6) — `billing/onConfirm.ts`

Called inside the confirm transaction.

**Policy (documented in `docs/policies.md`):** one-time lines are invoiced at confirmation, due +15 days. Subscriptions bill on calendar months (period = 1st → last day). The first period is prorated from confirmation date to month end. Renewals bill for full months on the 1st. Proration is daily: amount × remaining days ÷ days in that month, rounded half-up to paise. Cancellation credits unused days of the current period if the plan has `creditOnCancel`; an unpaid invoice is reduced instead of cash being refunded.

**Steps:**
1. Split OrderLines into one-time (product not subscription) and recurring (isSubscription).
2. One-time → `Invoice` kind ONE_TIME, code INV-next, InvoiceLines copied (description, qty, unit price, discount, net, tax), totalPaise, paidPaise 0, status UNPAID, issuedAt now, dueAt +15d. Skip if no one-time lines.
3. Each recurring line → `Subscription` (orderId, orderLineId, planId, qty, unitPricePaise = line net unit price after discount, startsAt = confirm date, nextBillingAt = 1st of next month, status ACTIVE). For QUARTERLY/YEARLY plans, period = 3 or 12 calendar months; nextBillingAt advances accordingly.
4. First RECURRING invoice per subscription covering startsAt → period end, prorated via `prorate.ts`. Invoice kind RECURRING, periodStart/periodEnd set, InvoiceLine description "Care Plan ×6 · 16–30 Sep (15/30 days)".
5. Audit INVOICE_ISSUED (one per invoice), SUBSCRIPTION_CREATED (one per subscription).

### 7.1 Proration engine — `billing/prorate.ts` (pure, tested)

**Input:** monthly (or per-period) unit amount in paise, qty delta (can be negative), effective date, period start, period end, plan `prorateChanges` flag.
**Output:** amountPaise (positive = charge, negative = credit), daysRemaining, daysInPeriod, reason string:
- "1 seat × ₹3,000 × 15 remaining days ÷ 30 days in September = ₹1,500"
- "−2 seats × ₹3,000 × 10 ÷ 31 = −₹1,935.48 → credit"
If `prorateChanges` is false: change takes effect next period; amount 0; reason "Plan does not prorate; new quantity applies from 1 Oct."

Day counting: remaining days **include** the effective date; period end is inclusive. Days in period = calendar days of that month (or quarter/year). Use date-only values in IST; never use timestamps for day math.

**Tests:** 15/30 → ₹1,500 exactly; effective on the 1st → full month; effective on the last day → 1 day; February; quarterly plan; negative delta; prorate off → 0; rounding case producing .5 paise.

### 7.2 Screens
- **Billing list** `/app/billing`: all subscriptions (customer, plan, qty, cycle, next bill, status) with counts Active / Paused / Cancelled.
- **Billing detail** `/app/billing/[orderCode]`: **One-Time Lines** block (from originating order, with invoice link and status) · **Recurring Lines** block (plan, cycle, qty, next billing date, amount) · **Upcoming Schedule** (next 3 periods with dates and amounts, from `schedule.ts`) · buttons **Modify Subscription**, **Cancel Subscription** · and a small **Run billing as of [date]** control (admin/finance) for demoing renewals.
- **Preview on the quote page** (approved, not yet confirmed): Billing tab shows what confirmation *would* create, labelled "Preview — not issued."

### 7.3 Actions — `billing/actions.ts` (FINANCE, ADMIN)
- **modifySubscription(subscriptionId, newQty, effectiveDate)**: transaction: compute proration for delta; insert SubscriptionChange (qtyDelta, effectiveAt, prorationPaise, reason); update subscription qty; if amount > 0 → Invoice kind PRORATION with one line and the reason as description; if amount < 0 → CreditNote against the current period's invoice (reduce its balance; if already PAID, credit note stands as a customer credit shown on the invoice); audit SUBSCRIPTION_MODIFIED with the math. The dialog shows the proration math **before** the user confirms.
- **cancelSubscription(subscriptionId, effectiveDate)**: transaction: status CANCELLED, `cancelledAt`; if plan.creditOnCancel → CreditNote for unused days (via prorate with delta = −qty); audit SUBSCRIPTION_CANCELLED. Dialog shows the credit math first.
- **runBillingAsOf(date)**: for every ACTIVE subscription with nextBillingAt ≤ date: if an invoice already exists for (subscriptionId, periodStart) skip — this is the idempotency key; else create full-period RECURRING invoice, advance nextBillingAt. Audit BILLING_RUN with counts. Returns "Generated 2 invoices, skipped 1 (already billed)."
- **issueCreditNote(invoiceId, amount, reason)**: manual credit; code CN-next; reduces balance; audit CREDIT_NOTE_ISSUED. Used rarely; exists so Finance's "reconciles credit notes" role is real.

### 7.4 Must avoid
- Timestamps in proration math.
- Refunding cash for an unpaid invoice.
- Generating the same period twice.
- A cron or background job — the "Run billing as of" button is the demo control.
- Recomputing subscription price from the catalog; use the snapshotted line price.

---

## 8. Invoices and payments (PDF §9 step 8, mockup screens 12–13)

- **Invoices list** `/app/invoices`: badges Unpaid / Partial / Paid; table: code, customer, kind (One-time / Recurring / Proration), period, amount, paid, balance, status, due date, overdue flag (due < today and balance > 0).
- **Invoice detail** `/app/invoices/[code]`: header with balance; **InvoiceStepper** Order Confirmed → Shipped → Invoiced → Paid (Shipped lights up only if any allocation has shippedAt — otherwise show it grey with tooltip "not yet shipped"; do not fake it); lines; credit notes applied; payments received; button **Record Payment**; link "Download / Print" → print-styled page (Phase 3 makes it pretty).
- **recordPayment(invoiceCode, amountPaise, reference, method, receivedAt)** (FINANCE, ADMIN):
  1. Transaction. If a Payment with this `reference` exists → return it unchanged with message "Payment already recorded" (idempotent; `reference` is unique in the schema).
  2. amount > 0 and ≤ balance (allow exact overpayment? No — reject with "exceeds balance ₹X"; keep it simple).
  3. Insert Payment; `invoice.paidPaise += amount`; status PARTIAL or PAID.
  4. Roll up to order: paymentStatus = PAID if all invoices for the order are PAID, PARTIAL if any payment exists, else UNPAID. Roll up to quote (same column).
  5. Audit PAYMENT_RECORDED (with reference).
  The dialog pre-fills a generated reference (e.g. PAY-<timestamp>) so double-clicks send the same reference.

Kanban (Phase 1's `stages.ts`) already derives "Invoiced / Paid" from these columns — no change needed.

---

## 9. Impact Preview — `preview/impact.ts` (the signature feature)

A pure composition of engines you already have. **Input:** current revision lines + a proposed set of lines (or a proposed discount change), customer tier, policy, category ceilings, current stock snapshot, warehouses, plans. **Output:** two columns (current / proposed) each with: total, tax, margin ₹, margin %, required approval level + reasons, stock outcome (Ships in full / Partial: X backordered / All backordered), first-month bill (one-time + prorated recurring), and deltas.

**Where it appears:**
- Internal quote page, when the rep edits an approved/sent quote (before Save): full strip.
- Approval review page, for a portal counter: "v2 (customer proposal) vs v1 (approved)": full strip — the manager sees exactly what the counter costs.
- Portal counter form: **customer-safe subset only** — current total, proposed total, savings. The component receives a `mode = 'customer'` flag and the portal page never passes stock or cost data into it; the customer-mode function signature literally doesn't accept those fields.

Because the engines are pure, this is a client-side call for instant feedback plus the same server-side recomputation on save. No new tables, no new state.

---

## 10. State transitions reference (pin this above every desk)

| Event | Approval | Customer | Fulfillment | Payment |
|---|---|---|---|---|
| Submit (breach) | PENDING | — | — | — |
| Submit (clean) | APPROVED | — | — | — |
| Manager/Finance approve last step | APPROVED | — | — | — |
| Return / Reject | NONE / REJECTED | — | — | — |
| Revise (rep or portal) | STALE → PENDING/APPROVED after re-eval | NEGOTIATING if was SENT | — | — |
| Send to customer | — | SENT | — | — |
| Customer message / counter | — | NEGOTIATING | — | — |
| Confirm | must be APPROVED | CONFIRMED | PLANNED | UNPAID |
| Accept split / override | — | — | PARTIAL or FULFILLED | — |
| Consolidate | — | — | recomputed | — |
| Record payment | — | — | — | PARTIAL / PAID |

No event writes a column outside its row. If you find yourself setting fulfillment status inside a billing action, stop.

---

## 11. Ownership and hour plan

| Hours | Person A (Deal/UI) | Person B (Negotiation) | Person C (Ops/Billing) |
|---|---|---|---|
| 9–10 | Send to Customer, Messages panel on internal quote page | PortalShell, portal layout, scoped queries, My Quotations, Quote view (no internals) | `allocate.ts` + tests |
| 10–11 | `timeline/queries.ts` + DealTimeline component + tabs | Line comments, counter-offer form, `proposeCounter` → revision → re-route | Fulfillment list + stock table, `reserve.ts` |
| 11–12 | `diff.ts` + RevisionDiff (internal + portal variant) | `confirm.ts` transaction + ConfirmButton with stale guard; rep "confirm on behalf" | Accept split / override actions + detail screen |
| 12–13 | Billing screen UI (blocks, schedule) against C's queries | Portal 404 tests: Beta URL as Acme, curl the actions as wrong role | `prorate.ts` + tests; `onConfirm.ts` wired into confirm |
| 13–14 | Invoices list + detail + stepper | `impact.ts` + ImpactPreview (internal) | Modify / cancel subscription + dialogs with math |
| 14–15 | RecordPayment dialog + roll-ups UI | ImpactPreview on approval review page (v2 vs v1) | `recordPayment`, `runBillingAsOf`, credit notes |
| 15–16 | Quote page Fulfillment/Billing preview tabs | Customer-mode ImpactPreview in portal | Stock receipt form, consolidate prompt + action, markShipped |
| 16–17 | **All three: run §0 exit criteria from `db:reset`. Then run the messy flow: breach → counter → finance → confirm → split → receipt → consolidate → add seat → cancel seat → pay.** |||

Merges to `main` at 11, 13, 15, 17. Branch names `a/timeline`, `b/portal`, `c/fulfillment`, etc.

Shared contracts to agree at hour 9 (15 minutes, one screen): the `AllocationPlan` type (C defines, A renders, B feeds into impact), the `ProrationResult` type (C defines, A renders), the `TimelineEvent` shape (A defines from AuditEvent), the `ImpactResult` type (B defines, A renders).

---

## 12. Phase 2 test checklist (hour 17)

| # | Check | Pass = |
|---|---|---|
| 1 | Log in as `buyer@acme.demo` | Lands on `/portal`; `/app/quotations` redirects back |
| 2 | Open Beta's quote URL as Acme | 404 |
| 3 | Portal quote view page source / network response | No cost, margin, allowed %, excess, approval steps anywhere in the payload |
| 4 | Customer posts line comment | Appears in rep's Messages panel and Timeline; status Under Negotiation |
| 5 | Customer counters 20% on laptops (allowed 15%) | v2 created via PORTAL; quote PENDING; reason text shows "5 pts over"; v1 steps STALE |
| 6 | Manager review page | Shows v2 vs v1 Impact Preview with margin delta |
| 7 | Customer clicks Confirm while PENDING | Refused: "Awaiting internal approval" |
| 8 | Manager + Finance approve; rep Sends; customer Confirms from an old tab pointing at v1 | Refused: "quotation was updated (now v2)" |
| 9 | Confirm from fresh tab | SO-1042 created with revisionId = v2; statuses CONFIRMED/PLANNED/UNPAID; INV-1042 (one-time) + subscription + first prorated recurring invoice exist |
| 10 | Fulfillment detail | Plan 3 (Main) + 2 (East) + 1 backorder with reasons; est. 2 shipments ₹650 |
| 11 | Accept Suggested Split | Stock table: Main laptop reserved 3, East reserved 2; status PARTIAL |
| 12 | Open same order in two tabs, accept in both | Second fails with fresh plan / "already allocated" |
| 13 | Manual override 5 from East | Rejected: "East Depot has only 2 available" |
| 14 | Record receipt: 10 laptops at East | Consolidate banner appears on SO-1042 |
| 15 | Consolidate | 1 more reserved at East; backorder closed; status FULFILLED; earlier allocations unchanged |
| 16 | Billing detail | One-time block and recurring block separate; schedule shows next 3 dates |
| 17 | Modify subscription +1 seat effective today | Dialog shows math; PRORATION invoice created with that math; Timeline event |
| 18 | Cancel 1 seat | Credit note created; balance reduced; Timeline event |
| 19 | Run billing as of next month's 2nd | One RECURRING invoice per active subscription; run again → "skipped, already billed" |
| 20 | Record payment on INV-1042 with reference R1; click again with R1 | One Payment row; status PAID; Kanban card in Invoiced/Paid |
| 21 | Record payment > balance | Rejected |
| 22 | Timeline on Q-1042 | Every event from 4–20 in order with actors |
| 23 | Refresh every page; Wi-Fi off | Nothing lost; still works |
| 24 | `pnpm test` | Pricing, allocation, proration tests green |

---

## 13. What is NOT needed in Phase 2

- Email, magic links, notifications of any kind (portal users just log in).
- Payment gateway. "Record a payment" is the requirement.
- Cron / background billing. The "Run billing as of" button is the control.
- PDF generation library. Print-styled page in Phase 3.
- Shipping carrier integration, tracking numbers, packing slips.
- Multi-currency. `currency` stays "INR".
- Partial shipments per allocation beyond the optional markShipped.
- Real-time push for the consolidate banner. Render-on-load is enough.
- Deal health, dashboard numbers, reports, reset button (Phase 3).
- Drag-and-drop anywhere.

---

## 14. Must-avoid list for Phase 2

1. **A portal query without `customerId` in the where-clause.** This is the single fastest way to fail the brief's §7.
2. **Confirming a stale revision.** The revisionId must come from the page and be compared to `currentRevisionId` inside the transaction.
3. **Reserving stock anywhere except the accept/override/consolidate transactions, and never without a lock + fresh availability check.**
4. **Two confirm paths.** Customer confirm and rep confirm-on-behalf call the same function.
5. **Timestamps in day math.** Proration uses date-only values.
6. **Cash refunds for unpaid invoices.** Reduce the invoice; credit note otherwise.
7. **Non-idempotent payment or billing runs.** Reference is unique; period is the billing key.
8. **Recomputing prices from the catalog after confirmation.** Orders, invoices and subscriptions use snapshots.
9. **Faking the stepper.** "Shipped" lights only if something shipped.
10. **Impact Preview in the portal receiving cost/stock data "but hiding it."** The customer-mode function must not accept those fields at all.
11. **Starting Phase 3 features before the hour-17 gate passes.** The demo is Phase 2; Phase 3 is decoration and paperwork.

---

## 15. Handoff contract to Phase 3

| Artefact | Used by in Phase 3 |
|---|---|
| `Quote.lastActivityAt` bumped by every action in P1 and P2 | Stalled-deal rule |
| Seeded historical orders + revisions with discount snapshots | Rep discount baseline for anomaly rule |
| `Backorder.expectedAt`, `StockReceipt.expectedAt`, `Order.promisedDeliveryDate` | Delivery-slippage rule |
| `AuditEvent` across all entities | Dashboard "Recent Activity", nudge/escalate events |
| `Invoice` / `Payment` / `Subscription` tables populated | Reports and dashboard counts |
| Print-friendly invoice route | PDF export |
| `db:reset` | Reset Demo Data button |
| Every screen in the Excalidraw existing by name | Polish pass and parity check |

If the hour-17 gate passes, the demo already exists. Phase 3 makes it look finished and gets the paperwork done.

---

*Phase 3 README (Intelligence + Delivery) follows on request.*

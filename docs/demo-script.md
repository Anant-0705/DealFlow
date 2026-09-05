# Five-minute demo script

## Setup

Reset Demo Data from Settings → System. Prepare four sessions: Ravi, Manager, Finance, and Acme customer. Keep `docs/judge-qa.md` open separately. The target is under five minutes; the timings below are checkpoints, not application claims.

## Flow A — clean quote to cash (0:00–1:40)

1. Ravi: Dashboard → New quotation → Acme Corp.
2. Add Laptop Pro 14 ×2 at the Gold tier default and Care Plan ×2. Show the live total, margin, and decision panel.
3. Add Docking Station from the upsell suggestion. Submit the quote and show its approval result.
4. Open the quotation and click Send to customer; the button changes through “Sending…” to “Sent to customer”.
5. Acme customer: My Quotations → open the quote → Confirm quotation.
6. Operations: Fulfillment → order → Accept Suggested Split.
7. Finance: Invoices → open invoice → Record payment. Show the Paid status and quotation Timeline.

## Flow B — governed negotiation and execution (1:40–4:10)

1. Ravi: create an Acme quote with Laptop ×6 at 12%, Setup at 18%, and Care Plan ×6. Point out the exact Manager → Finance reason.
2. Manager: Approval inbox → open the quote → approve with a reason.
3. Finance: open the now-unlocked step → approve. Ravi sends it.
4. Acme customer: request 20% on the laptop line with a comment. Show the customer-safe savings preview.
5. Manager: compare the new revision with the previous revision and return it with a plain-language reason.
6. Ravi: revise, settle the discount, submit, and send. Acme confirms the current revision.
7. Operations: accept the split/backorder and record the expected stock receipt. Open Deal Health to show the delivery-slippage explanation.
8. Billing: modify a subscription quantity, show proration, then record a payment.

## Phase 3 proof (4:10–4:45)

1. Dashboard: click each number to show that it opens the filtered records it counts.
2. Deal Health: open the stalled, anomaly, and slippage records; Nudge Rep and show the task on the rep dashboard.
3. Reports: apply a rep/category filter, export XLSX, and open Print / Save PDF.

## Architecture and honesty (4:45–5:00)

Open `docs/architecture.png`: deterministic engines, one Next.js process, PostgreSQL, and offline operation. State the known boundaries: no payment gateway, no outbound notifications, INR/single-company, and browser-rendered PDF.

## Failure protocol

Do not debug on stage. Explain the record the action should create, show the timeline/database evidence if available, and continue. Reset before every reviewer round so previous clicks cannot change the story.

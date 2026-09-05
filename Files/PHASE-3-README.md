# AccordFlow (DealFlow360) — PHASE 3 README
## Intelligence + Delivery · Hours 17–24

> Source of truth: `DealFlow360.pdf`. Phase 3 covers B9 (Deal Health & Anomaly Dashboard), A7 (Reporting & Dashboard, PDF/XLS export), the Sales Dashboard (mockup screen 2), and §8 Deliverables (working app + seed, 5-minute demo with two full flows, one-page architecture/data-model diagram, "what next" note).

> Precondition: the hour-17 gate passed — the PDF's 8-step flow and the messy flow both run from `db:reset`. If they don't, Phase 3 is *only* fixing that until they do. Nothing here is worth more than a working demo.

---

## 0. What Phase 3 delivers

The product already works. Phase 3 makes it **watchable** (health, dashboard, reports), **repeatable** (reset button, empty states, polish), **defensible** (edge-case sweep, cheat sheet), and **submittable** (architecture page, README, whats-next). Then it rehearses the demo until it's boring.

**Hard rule: feature freeze at hour 22.** After 22:00 only bug fixes, docs, and rehearsal.

**Phase 3 exit criteria:**
1. Deal Health lists the seeded stalled quote, the seeded anomaly quote, and the live slippage from Phase 2's backorder — each with a reason sentence; clicking opens the quote; Nudge and Escalate write real records.
2. Dashboard numbers come from queries; clicking each number lands on the matching filtered list.
3. Reports filter by period / rep / approval status / category, show totals, export XLSX, and print to PDF.
4. Admin "Reset Demo Data" restores the seed in < 10 seconds and the app is immediately usable.
5. Every screen in the Excalidraw exists under the same name, with a sensible empty state.
6. All 15 edge cases in §7 pass.
7. `docs/architecture.md` + image, `docs/whats-next.md`, root `README.md` with run steps, credentials, and both demo scripts are committed.
8. Both demo flows rehearsed 3× from Reset, under 5:00 each time, by the person who will drive on stage.

---

## 1. Dependencies on Phases 1–2

| Artefact | Phase 3 use |
|---|---|
| `Quote.lastActivityAt` (bumped by every P1/P2 action) | Stalled rule |
| Seeded historical confirmed quotes with per-revision discount snapshots, split across `ravi@` (~6%) and `priya@` (~13%) | Rep baseline for the anomaly rule |
| `Backorder` (qty, expectedAt, consolidatedAt), `StockReceipt.expectedAt`, `Order.promisedDeliveryDate` | Slippage rule |
| `AuditEvent` with action enum + `quoteId` | Recent Activity, nudge/escalate events, avg approval time |
| `Invoice`, `Payment`, `Subscription`, `Order`, `QuoteRevision` totals | Dashboard cards, reports |
| `DiscountPolicy.staleAfterDays`, `anomalyDeltaBps` | Thresholds (editable in Settings → Policy since P1) |
| `db:reset` script | Reset button |
| Invoice detail route | Print-styled PDF |

**Schema changes allowed in Phase 3:** one small table `Task` (id, quoteId, assigneeId, createdById, kind NUDGE/ESCALATION, message, done, createdAt) if not already present. Migrate once at hour 17, everyone pulls. Nothing else.

---

## 2. File structure additions

```
src/
├── modules/
│   ├── health/
│   │   ├── rules.ts              ← stalled(), discountAnomaly(), deliverySlippage() — pure over inputs
│   │   ├── rules.test.ts
│   │   ├── queries.ts            ← loads inputs (quotes, rep baselines, backorders) and runs rules
│   │   └── actions.ts            ← nudgeRep, escalateToManager, dismissAlert
│   ├── dashboard/
│   │   └── queries.ts            ← role-aware counts + recent activity
│   └── reports/
│       ├── queries.ts            ← filtered rows + aggregates (uses Prisma raw for 2 aggregates)
│       ├── filters.ts            ← zod schema for filter params (period, repId, approvalStatus, categoryId)
│       ├── exportXlsx.ts         ← builds a workbook from rows
│       └── actions.ts            ← exportXlsx server action
├── modules/admin/
│   └── actions.ts                ← resetDemoData (ADMIN only) — calls the seed transaction
├── components/
│   ├── health/
│   │   ├── HealthSummaryCards.tsx
│   │   ├── AlertTable.tsx        ← deal / issue / reason / flagged since / action taken
│   │   └── AlertActions.tsx      ← Nudge Rep · Escalate · Dismiss (with reason)
│   ├── dashboard/
│   │   ├── StatCard.tsx          ← number + label + link
│   │   ├── RecentActivity.tsx
│   │   └── MyTasks.tsx           ← nudges/escalations assigned to me
│   ├── reports/
│   │   ├── ReportFilters.tsx
│   │   ├── ReportTable.tsx       ← with totals row
│   │   ├── ReportAggregates.tsx  ← quotes created · avg approval time · top upsold product
│   │   └── ExportButtons.tsx     ← Export XLSX · Print / Save PDF
│   ├── shared/
│   │   ├── EmptyState.tsx        ← icon + one sentence + optional CTA
│   │   ├── PageHeader.tsx
│   │   └── Skeletons.tsx
│   └── print/
│       ├── InvoicePrint.tsx
│       └── ReportPrint.tsx
├── app/
│   ├── (internal)/app/
│   │   ├── dashboard/page.tsx    ← replaces P1 placeholder
│   │   ├── deal-health/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/system/page.tsx   ← Reset Demo Data (ADMIN)
│   │   └── print/
│   │       ├── invoice/[code]/page.tsx  ← no shell, print CSS
│   │       └── report/page.tsx          ← no shell, print CSS, reads same filter params
│   └── globals.css               ← + @media print rules
├── docs/
│   ├── architecture.md           ← one page + exported image
│   ├── architecture.png          ← exported diagram
│   ├── whats-next.md
│   ├── demo-script.md            ← both flows, timed, with the exact clicks
│   └── judge-qa.md               ← cheat sheet: likely questions + answers + where in code
└── README.md                     ← run steps, credentials, demo summary, links to docs
```

---

## 3. Deal Health & Anomaly Dashboard (PDF B9)

### 3.1 Rules — `health/rules.ts` (pure, tested, computed on page load)
No background workers. The page loads inputs and runs three functions. Each returns `alerts[]` with: quoteId, code, customer, rep, kind, severity, reason string, flaggedSince, and a `insufficientHistory` flag where relevant.

**Stalled deal**
- Input: quotes not in CONFIRMED/REJECTED customer status and not fulfillment FULFILLED; `lastActivityAt`; policy `staleAfterDays`; now.
- Rule: days since lastActivityAt > staleAfterDays.
- Reason: "No activity for 9 days (limit 5). Last event: Draft saved by Ravi on 27 Aug."
- Severity: > 2× limit → high, else medium.

**Discount anomaly** (PDF: "a discount well above a rep's historical average")
- Input: for each rep, the blended effective discount of every historical confirmed quote (from the current revision's `discountPaise ÷ subtotalPaise`); the current open quotes' blended discount; policy `anomalyDeltaBps`.
- Rule: quote's blended discount − rep's average > anomalyDeltaBps.
- Reason: "Priya's average discount is 13% across 9 confirmed deals; this quote is 22% (+9 pts, limit +5)."
- If rep has < 3 historical confirmed quotes: still compute, but set `insufficientHistory = true` and phrase it "Only 2 historical deals — baseline unreliable." Severity low. Never hide it; never pretend the baseline is solid.

**Delivery slippage**
- Input: orders with fulfillment PLANNED/PARTIAL; open backorders (consolidatedAt null); expected receipts (receivedAt null) per product/variant/warehouse; `promisedDeliveryDate`.
- Rule: any open backorder for which no expected receipt with expectedAt ≤ promisedDeliveryDate exists, OR expectedAt > promisedDeliveryDate.
- Reason: "SO-1042: 1 × Laptop Pro 14 backordered; next expected receipt 12 Sep at East Depot; promised 10 Sep (2 days late)." or "…no receipt scheduled."
- Severity: no receipt → high; late receipt → medium.

**Tests (15 min):** stalled exactly at limit (not flagged), one day over (flagged); anomaly with 3+ history vs < 3; slippage with receipt on time / late / none; confirmed quotes never stalled.

### 3.2 Screen `/app/deal-health` (MANAGER, FINANCE, ADMIN; REP sees only own quotes)
- Three summary cards: Stalled (count, "5 quotes idle 7+ days"), Discount Anomalies (count, "2 above rep average"), Delivery Slippage (count, "3 promise dates at risk"). Card click filters the table.
- AlertTable: Deal (code + customer), Issue (badge), Reason (full sentence), Flagged since, Action taken (last nudge/escalation from AuditEvent), Actions.
- Row click → `/app/quotations/[code]` (PDF: "clicking an alert opens the related quotation directly").
- Empty state: "No deals at risk. Thresholds: stale after 5 days, anomaly +5 pts — edit in Settings → Policy."

### 3.3 Actions — `health/actions.ts`
- **nudgeRep(quoteId, message)**: insert `Task` (kind NUDGE, assignee = quote owner); audit NUDGE_SENT; bump `lastActivityAt`? **No** — a nudge is not deal activity; leave it so the stall persists until the rep acts. Rep sees it in Dashboard → My Tasks.
- **escalateToManager(quoteId, reason)**: set `quote.ownerId` = acting manager (or a chosen manager), insert Task (kind ESCALATION), audit ESCALATED with previous owner in meta. Rep loses edit rights; Timeline shows it.
- **dismissAlert(quoteId, kind, reason)**: insert audit ALERT_DISMISSED; the rules function receives the set of (quoteId, kind) dismissed in the last N days and suppresses them. Optional — build only if 20 minutes free.

Both nudge and escalate change real data — this is what "automated nudge or escalation action can be triggered" means in a way a judge can inspect.

---

## 4. Sales Dashboard (mockup screen 2) — `/app/dashboard`

Replaces the Phase 1 placeholder. Role-aware; every number is a query; every card links to the filtered list it counts.

| Card | Query | Link |
|---|---|---|
| Pending Approvals | ApprovalSteps PENDING visible to this role (manager: level MANAGER; finance: level FINANCE with manager approved; admin: all; rep: own quotes pending) | `/app/approvals` |
| Open Quotations | Quotes not CONFIRMED/REJECTED (rep: own) | `/app/quotations?status=open` |
| At-Risk Deals | count of health alerts (reuse `health/queries.ts`) | `/app/deal-health` |
| Awaiting Fulfillment | Orders PLANNED/PARTIAL | `/app/fulfillment` |
| Unpaid Invoices | Invoices UNPAID/PARTIAL, sum of balance | `/app/invoices?status=unpaid` |
| Revenue This Month | sum of Payments.receivedAt in current month | `/app/reports?period=month` |

Below: **Recent Activity** (last 10 AuditEvents across all quotes the role may see, with actor + link), **My Tasks** (Tasks assigned to me, not done, with "Mark done"), and two buttons **+ New Quotation**, **View Approvals**. Reload Data (P1 menu) refreshes this page too.

Not needed: charts. A single bar of "quotes by stage" is fine if 20 minutes spare; otherwise numbers beat pretty.

---

## 5. Reporting (PDF A7) — `/app/reports`

### 5.1 Filters (`reports/filters.ts`, in the URL so exports and print reuse them)
- **Period**: Today · This week · This month · Custom (from/to). Applies to quote creation date (quotes) or confirmation date (orders) — one toggle "Quotations / Orders".
- **Sales Rep / Team**: dropdown of internal users with role REP (+ "All").
- **Approval Status**: All · Auto-approved · Pending · Approved · Rejected · Returned.
- **Product / Category**: category dropdown; optional product dropdown filtered by category. Matches quotes whose current revision has a line in that category/product.

### 5.2 Table (`reports/queries.ts`)
Columns: code, date, customer, tier, rep, stage (from `stages.ts`), lines, subtotal, discount ₹, discount %, total, margin ₹, margin %, approval level, days to approval. Totals row: count, sum totals, sum margin, weighted avg discount %. Sorted by date desc. Page size 50.

### 5.3 Aggregates (`ReportAggregates`, 3 tiles)
- **Quotes created** in period.
- **Avg approval time**: for revisions with SUBMITTED and final APPROVED audit events, mean of (approved.at − submitted.at). Use Prisma raw SQL for this one.
- **Top upsold product**: count of UPSELL_ADDED audit events grouped by productId in meta. Raw SQL.
- Optional 4th: **Most discounted category** (avg effective discount by category over lines).

### 5.4 Exports
- **Export XLSX**: server action builds one workbook with a "Report" sheet (the table + totals row, header row bold, currency columns formatted) and a "Filters" sheet (the applied filters and generated-at time). Returns a file download. One library (SheetJS or ExcelJS — whichever someone has used). Filename `accordflow-report-<period>.xlsx`.
- **Print / Save as PDF**: opens `/app/print/report?<same params>` — a shell-less page with print CSS (A4, no nav, table repeats headers) and a "Print" button that calls the browser print dialog. Users choose "Save as PDF". Zero libraries, zero risk. Same pattern for `/app/print/invoice/[code]` (company block, customer block, lines, totals, payments, balance).

If a judge asks "is that real PDF export?", the answer is: the browser renders our print stylesheet to PDF; a server-side renderer is in whats-next. Honest and fine.

---

## 6. Reset Demo Data + polish pass

### 6.1 Reset — `/app/settings/system` (ADMIN only)
Button **Reset Demo Data** with a confirm dialog ("This wipes all records and restores the seed. Continue?"). Action: `requireRole(['ADMIN'])`, run the seed's wipe-and-recreate transaction (same code as `db:seed`), revalidate everything, redirect to dashboard with toast "Demo data restored — 20 historical orders, 3 live quotes." Time it; must be < 10 s. Log it as audit RESET (first event in the fresh log — nice touch).

Use before **every** reviewer visit and before the final demo.

### 6.2 Polish checklist (hours 19–21, Person A drives)
- **Excalidraw parity**: walk screens 1–18; each exists with the same title and the same buttons by name (Accept Suggested Split, Manual Override, Modify Subscription, Cancel Subscription, Submit Request, Confirm Quotation, Escalate, Nudge Rep, Export PDF, Export XLS, Save configuration…).
- **Empty states** on every list (quotations, approvals, fulfillment, billing, invoices, health, reports, portal): one sentence + CTA. Never a blank table.
- **Loading skeletons** on dashboard, lists, timeline.
- **Status badges** consistent colours: grey Draft, amber Pending, green Approved/Paid/Fulfilled, blue Sent/Negotiating, red Rejected/Overdue, purple Stale.
- **Form errors name the fix**: "Discount must be between 0 and 100%", "East Depot has only 2 available", "Reference already used".
- **Role badge** in every shell; portal header says "Acme Corp · Customer Portal".
- **Responsive**: check at 390px width — builder stacks, tables scroll horizontally, Kanban scrolls.
- **Keyboard**: dialogs close on Esc, forms submit on Enter, focus visible.
- **Reload Data** toast works on every page.
- **Numbers**: ₹ formatting with Indian grouping (₹1,25,000), percentages one decimal, dates "12 Sep 2026".
- **Timeline icons + copy** read like sentences, not enum names.
- **No console errors** on any page.

---

## 7. Edge-case sweep (hour 21–22, Person B drives, all three watch)

Run from `Reset`. Each must pass; if one fails, it's the only thing anyone works on.

| # | Case | Expected |
|---|---|---|
| 1 | Gold quote: Laptop ×10 @12% (₹8.5L) + Setup @18% (₹4.5k) | Routes to Manager (+Finance since 8 ≥ 8) — small breach not hidden |
| 2 | Edit an APPROVED quote's qty | v+1 DRAFT, v steps STALE, status STALE; re-submit re-evaluates |
| 3 | Finance calls approve on a step whose manager step is PENDING | Refused server-side |
| 4 | Acme opens Beta quote URL; Acme calls portal actions with Beta's quote code | 404 / refused |
| 5 | Two tabs accept split for the last laptops | One succeeds; other gets fresh plan / error |
| 6 | Record payment twice with same reference | One Payment row |
| 7 | Stock receipt with open backorder | Consolidate only remainder; prior allocations unchanged |
| 8 | Proration effective on the 1st, on the last day, in February | Full month / 1 day / 28-day denominator |
| 9 | Run billing twice for same date | Second run skips all |
| 10 | Customer confirms from stale tab | Refused with version message |
| 11 | Rep submits with zero lines | Validation error, no revision frozen |
| 12 | Line discount 101%, qty 0, negative price | Validation errors, nothing saved |
| 13 | Customer role hits `/app/settings`, `/app/approvals` | Redirected to portal |
| 14 | Refresh mid-builder after Save Draft | Lines intact |
| 15 | Wi-Fi off, full Flow A | Works |

Also: `pnpm test` green (pricing, allocation, proration, health), `pnpm build` succeeds with zero type errors (judges may run it).

---

## 8. Deliverables (hours 22–23, Person C drives)

### 8.1 `docs/architecture.md` + `architecture.png` (one page — PDF §8)
Top half: **module diagram** — boxes for Identity, Catalog & Policy (Settings), Quotes & Revisions, Pricing Engine, Approvals & Audit, Negotiation Portal, Orders & Fulfillment (Allocation Engine), Billing (Proration Engine), Health & Reports; arrows labelled with the data that flows (revision → engine → routing; confirm → order → allocation + billing; every action → audit → timeline). Note the three pure engines in a different colour.

Bottom half: **data model** — the ~24 tables grouped Identity / Config / Deal / Governance / Execution / Billing with key relations (Quote 1–n Revision 1–n Line; Revision 1–n ApprovalStep; Order → Revision; OrderLine 1–n Allocation, 1–n Backorder; Subscription 1–n Change; Invoice 1–n Payment, 1–n CreditNote). Generate from `schema.prisma` with a Prisma ERD generator, or draw in Excalidraw in 30 minutes. Export PNG.

Sidebar: the five policies in one line each, and the four status tracks.

### 8.2 `docs/whats-next.md` (PDF §8 "short note")
Half a page, honest, prioritized:
1. Multi-currency and multi-company (bonus in brief).
2. Notifications: email quote links, Slack approval pings, WhatsApp invoice reminders.
3. Online payment (Razorpay test mode) reconciled to invoices, with webhook idempotency.
4. Server-side PDF rendering for quotes/invoices.
5. LLM-drafted quotations from pasted customer requests, validated by the existing engines; explanation of blockers in plain English.
6. Upsell rule config UI (A6) if skipped; pairings learned from real co-purchase history.
7. Accounting export (journal entries) to Odoo Accounting / Zoho Books.
8. Drag-and-drop pipeline with guarded transitions; scheduled billing runs; carrier integration.

### 8.3 Root `README.md`
- One-paragraph product description + the tagline.
- Run steps: clone, `docker compose up -d`, copy `.env.example`, `db:reset`, `dev`, open localhost:3000. Node version.
- Seeded credentials table (5 internal + 3 customers, password `demo1234`).
- The two demo flows as numbered click lists (link to `docs/demo-script.md`).
- The five business policies (link to `docs/policies.md`).
- Links to architecture and whats-next.
- Team members and who owned what (git prefixes a/ b/ c/).
- Known limitations (3–5 bullets, honest).

### 8.4 `docs/judge-qa.md` (cheat sheet, kept open on the standby laptop)
Likely questions and one-line answers with file paths: How is blended risk computed? (`pricing/engine.ts` §10.3) · What stops double reservation? (`inventory/reserve.ts` row lock) · How do you prevent the customer seeing margin? (portal module scoping + customer-mode preview type) · Why Postgres/Prisma/Next? (§ tech rationale) · What's faked? (nothing; billing runs are button-triggered instead of cron; PDF is print CSS) · What would break at scale? (subset enumeration beyond ~6 warehouses → switch to greedy/ILP; health rules on page load → schedule) · Who wrote what? (git log by prefix).

---

## 9. Demo rehearsal (hours 23–24)

### 9.1 `docs/demo-script.md` — timed, click-level
**Setup (before walking up):** Reset Demo Data. Four browser windows pre-logged: Rep (Ravi), Manager, Finance, Customer (Acme). Zoom 110%. Close every other tab.

**0:00–0:20 — Frame.** "Acme wants 6 laptops, installation, and a monthly support plan. Every sales tool can quote that. Watch what happens when someone gives 3 points too much discount." Show the Dashboard, point at the role badge.

**0:20–1:40 — Flow A (clean).** Rep: New Quotation → Acme → Laptop ×2 @12%, Care Plan ×2. Decision Panel: "auto-approved". Add Docking Station from upsell — margin jumps. Submit → Approved instantly. Send. Customer window: Confirm. Ops window: Fulfillment → split 2 from Main → Accept. Billing: one-time invoice + subscription schedule. Invoices: Record Payment → Paid. Kanban card in Paid. *~80 seconds if rehearsed.*

**1:40–4:00 — Flow B (messy).** Rep: New Quotation → Acme → Laptop ×6 @12%, Setup @18%, Care Plan ×6. Decision Panel reads the 8-pts reason → "Manager → Finance". Submit. Manager window: review page, "Why this quote was flagged", approve with reason. Finance window: appears only now; approve. Rep: Send. Customer window: counter 20% on laptops with comment; show customer-side preview (savings only). Submit — status Under Negotiation. Manager window: v2 vs v1 Impact Preview; return with "20% only with 24-month plan". Rep: Revise → 15% + 24 months → auto-approved → Send. Customer: Confirm. Ops: split 3+2+1 backorder with reason → Accept; record receipt 10 at East → Consolidate banner → accept. Billing: add 1 seat → proration ₹1,500 with math; cancel 1 → credit note. Record payment.

**4:00–4:40 — Proof.** Q-1042 Timeline top to bottom. Deal Health: the stalled seed quote and Priya's anomaly with sentences. Hand the judge the mouse: "change any discount on this draft — the panel will tell you who has to approve and why."

**4:40–5:00 — Architecture + honesty.** Architecture page for 10 seconds. "Deterministic engines, one process, Postgres, runs offline. Not built: gateway, email, multi-currency — in whats-next."

### 9.2 Roles on stage
- **Driver** (Person A): clicks. Rehearses the script 3× solo, then 2× with the team watching.
- **Narrator** (Person B): speaks; never touches the keyboard.
- **Standby** (Person C): judge-qa.md open, ready to open code or a DB table on request.

### 9.3 Failure protocol
If something breaks: narrator says what the record *would* be, standby opens the table or the Timeline, driver moves on. Do not debug on stage. Last year's #2 team lost their payment demo live and still placed — because they explained it calmly.

### 9.4 Between reviewer rounds (throughout the 24 h)
Every reviewer visit: Reset first; show what works *now*; write their feedback down; fix it before their next visit; tell them you fixed it. Last year's #2 credited this loop directly.

---

## 10. Ownership and hour plan

| Hours | Person A (UI / demo driver) | Person B (Logic / narrator) | Person C (Ops / docs) |
|---|---|---|---|
| 17–18 | Dashboard page + StatCards + Recent Activity + My Tasks | `health/rules.ts` + tests | `reports/queries.ts` + filters + table |
| 18–19 | Deal Health screen (cards, table) against B's queries | `health/queries.ts`, nudge / escalate / Task | XLSX export, print routes + print CSS, Reset button |
| 19–20 | Polish: Excalidraw parity, empty states, badges | Polish: form errors, role guards audit, portal copy | `architecture.md` + PNG |
| 20–21 | Polish: responsive, skeletons, number formats | Write `judge-qa.md` | `whats-next.md`, root README, `demo-script.md` |
| 21–22 | **Edge-case sweep (§7), all three. Fix only.** |||
| 22:00 | **FEATURE FREEZE.** Tag `v1.0-submission`. |||
| 22–23 | Rehearse Flow A ×3 | Rehearse narration | Final commit, verify clone-and-run on a clean folder, submit form |
| 23–24 | Rehearse Flow B ×3, full run ×2 timed | Q&A drills with C | Sleep 40 min, then swap |

---

## 11. What is NOT needed in Phase 3

- Charts library, fancy dashboards, animations, dark mode.
- Background jobs, cron, websockets, real-time alerts.
- Predictive win-probability or any ML on seed data.
- Server-side PDF rendering.
- New business features of any kind. Not one.
- Deployment to a host. Localhost + Docker is the brief's preference; bring a laptop with it working.
- Test coverage beyond the four engines.
- Rewriting anything that works but looks imperfect.

---

## 12. Must-avoid list for Phase 3

1. **Breaking the freeze.** After 22:00, a new feature is a new bug you'll demo.
2. **Hardcoded dashboard numbers.** Reviewers click them.
3. **Health rules that hide weak data.** "Insufficient history" is a label, not a reason to suppress.
4. **Nudges that don't write anything.** A toast is not an action.
5. **Polishing before the sweep passes.** Correct beats pretty; pretty is hours 19–21 only if 17–19 shipped.
6. **Demoing without Reset.** Stale data from the last reviewer's clicks will confuse the next one.
7. **Debugging on stage.** Narrate, show the record, move on.
8. **A README that doesn't run on a clean clone.** Person C verifies in a fresh folder at hour 22.
9. **Overclaiming.** Print-CSS PDF is fine; call it what it is. Manual payment is fine; call it what it is.
10. **Everyone awake at hour 24.** Someone has to be sharp at 9 AM.

---

## 13. Submission checklist (hour 23)

- [ ] `main` tagged `v1.0-submission`; `pnpm build` passes; `pnpm test` green
- [ ] Fresh clone → `docker compose up` → `db:reset` → `dev` works on a teammate's laptop
- [ ] `README.md` with credentials, run steps, demo flows
- [ ] `docs/architecture.md` + `architecture.png`
- [ ] `docs/whats-next.md`
- [ ] `docs/policies.md` current with the settings defaults
- [ ] Both demo flows timed under 5:00 combined, from Reset
- [ ] Laptop charged, HDMI/USB-C adapter, four windows pre-logged, Wi-Fi off test done
- [ ] Git log shows all three names with meaningful commits across the 24 h
- [ ] Odoo submission form filled with repo link, team, and the one-line pitch: *"DealFlow — quote-to-cash that shows its work."*

---

*End of Phase 3. If Phase 1 was the foundation and Phase 2 was the demo, Phase 3 is the reason the demo goes smoothly.*

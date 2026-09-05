# Judge Q&A cheat sheet

| Question | Short answer | Evidence |
|---|---|---|
| How is discount risk computed? | A pure engine compounds line and order discounts, applies the lower tier/category ceiling, and returns reasons plus required approval level. | `src/modules/pricing/engine.ts` |
| What prevents double stock reservation? | Serializable transactions lock the order and product stock rows before writing allocations. | `src/modules/inventory/reserve.ts`, `src/modules/inventory/actions.ts` |
| Can one customer open another customer’s quote? | Portal reads and actions include the authenticated `customerId`; mismatches return no quotation or are refused. | `src/modules/negotiation/queries.ts`, `src/modules/negotiation/actions.ts` |
| Do customers sign themselves up? | No. Admin/manager creates the company and emails a Resend invitation. The buyer sets their own password. Open signup is closed. | `src/modules/customers/actions.ts`, `src/app/(auth)/signup/page.tsx` |
| Can Finance approve before Manager? | The server re-reads the locked step and refuses it unless every prior step is approved. | `src/modules/approvals/actions.ts` |
| How do stale tabs behave? | Confirmation checks the submitted revision ID against the quote’s current revision inside a serializable transaction. | `src/modules/negotiation/confirm.ts` |
| How are stalled/anomaly/slippage alerts produced? | Three tested pure rules run over role-scoped database inputs; weak anomaly history is labelled rather than hidden. | `src/modules/health/rules.ts`, `src/modules/health/queries.ts` |
| Are Nudge and Escalate real? | They create `Task` and `AuditEvent` records; escalation also transfers quote ownership. | `src/modules/health/actions.ts` |
| How is the dashboard trustworthy? | Every card is derived from a database query and links to the corresponding filtered list. | `src/modules/dashboard/queries.ts` |
| Is XLSX export real? | ExcelJS creates a workbook with formatted Report and Filters sheets from the same URL filters as the screen. | `src/modules/reports/exportXlsx.ts` |
| Is PDF export real? | Yes. PDF-lib generates downloadable branded quotation and invoice files; dedicated A4 browser print previews are also available. | `src/modules/documents/pdf.ts`, `src/app/(print)/app/print` |
| How are online payments trusted? | Checkout orders are created server-side, successful payments are re-fetched from Cashfree, webhook signatures use the raw body, references are idempotent, and customer ownership is checked at the action and return boundaries. | `src/lib/cashfree.ts`, `src/modules/billing/gateway.ts`, `src/app/api/webhooks/cashfree/route.ts` |
| Why PostgreSQL, Prisma, and Next.js? | PostgreSQL supplies transactions/locks, Prisma supplies typed access and migrations, and Next.js keeps role-scoped reads and authenticated mutations in one offline app. | `prisma/schema.prisma`, `src/lib/auth.ts` |
| What is faked? | No business record is faked. Billing runs are button-triggered, Slack/WhatsApp are in-app tasks, Cashfree defaults to sandbox, and invite email is skipped when Resend is not configured. | `docs/whats-next.md` |
| What changes at scale? | Precompute health/report aggregates and replace warehouse subset enumeration with greedy or ILP allocation. | `src/modules/inventory/allocate.ts`, `docs/whats-next.md` |
| Who wrote what? | Use the repository’s signed authorship rather than a manually claimed ownership list. | `git shortlog -sne --all`, `git log --stat` |

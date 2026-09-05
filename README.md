# AccordFlow (DealFlow360)

AccordFlow is an explainable, self-governing sales-operations platform. The implemented workflow now covers the governed deal core plus Phase 2 execution: credentials auth, role protection, configuration CRUD, snapshot quote revisions, live pricing and margin, manager/finance routing, a customer-scoped negotiation portal, stale-safe confirmation, warehouse splits and backorders, subscriptions and proration, invoices, credits, payments, and a complete deal timeline.

## Run locally

Prerequisites: Node 20+ and Docker. For a fresh clone, one command installs dependencies, starts Postgres, rebuilds the local database, and seeds the full demo:

```bash
npm run setup
```

Then start the workspace:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`db:reset` replaces all local DealFlow records and recreates the demo story. Use it only with the local development database.

## Demo credentials

Every seeded account uses password `demo1234`.

| Role | Email |
|---|---|
| Administrator | `admin@accordflow.demo` |
| Sales Manager | `manager@accordflow.demo` |
| Finance | `finance@accordflow.demo` |
| Sales Rep | `ravi@accordflow.demo` |
| Sales Rep | `priya@accordflow.demo` |
| Acme customer | `buyer@acme.demo` |

## Verification

```bash
npm test
npm run lint
npm run build
```

The pricing suite covers the PDF example, blended/value finance routing, compounded discounts, tier-vs-category precedence, hidden service breaches, and empty revisions.

## End-to-end demo path

1. Sign in as Ravi and create an Acme Corp quote.
2. Add Laptop Pro 14 at 12% and Onsite Setup Service at 18%.
3. Observe the live 8-point Services breach and Manager → Finance route before submitting.
4. Submit; sign in as the manager and approve with a reason.
5. Sign in as Finance, approve, and verify the Approved Kanban column and audit trail.
6. Send the approved quote to the customer, counter from the customer portal, and approve the new revision.
7. Confirm the latest revision to create an order, one-time invoice, and recurring subscription records.
8. Accept the live warehouse split, record receipts, and consolidate any remaining backorder.
9. Modify or cancel a subscription to see proration and credit math before saving.
10. Record an invoice payment and inspect the complete deal timeline.

Business thresholds are documented in [docs/policies.md](docs/policies.md). Phase 3 deal-health and reporting routes remain intentionally isolated from the complete transactional flow.

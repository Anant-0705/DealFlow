# AccordFlow (DealFlow360)

AccordFlow is an explainable, self-governing sales-operations platform. Phase 1 delivers the complete foundation and deal core: credentials auth, role protection, configuration CRUD, snapshot quote revisions, a live pricing and margin engine, automatic manager/finance routing, approval inboxes, audit history, a derived Kanban pipeline, and deterministic upsells.

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

## Phase 1 demo path

1. Sign in as Ravi and create an Acme Corp quote.
2. Add Laptop Pro 14 at 12% and Onsite Setup Service at 18%.
3. Observe the live 8-point Services breach and Manager → Finance route before submitting.
4. Submit; sign in as the manager and approve with a reason.
5. Sign in as Finance, approve, and verify the Approved Kanban column and audit trail.
6. Revise the quote to create v2 and stale v1’s steps.
7. Add a suggested upsell and watch total and margin change immediately.

Business thresholds are documented in [docs/policies.md](docs/policies.md). Phase 2/3 database tables and protected route placeholders are intentionally present so subsequent work can build on stable records without another foundational migration.

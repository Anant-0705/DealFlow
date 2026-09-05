# AccordFlow (DealFlow360)

**AccordFlow — quote-to-cash that shows its work.** AccordFlow is an offline-capable sales-operations workspace that turns a quotation into an approved, customer-confirmed, stock-aware, billed, and auditable deal. Deterministic pricing, approval, allocation, and proration engines explain every result; Phase 3 adds role-aware dashboards, deal-health alerts, operational tasks, reports, XLSX downloads, print-to-PDF views, and repeatable demo reset.

## Run locally

Prerequisites: Node.js 20+, npm, and Docker Desktop.

```bash
git clone https://github.com/Anant-0705/DealFlow.git
cd DealFlow
copy .env.example .env
docker compose up -d postgres
npm install
npm run db:reset
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To run the complete app in Docker, use `docker compose up --build`. `npm run db:reset` and Settings → System → Reset Demo Data delete all current DealFlow records before recreating the seed; use them only with the demo database.

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
| Beta customer | `buyer@beta.demo` |
| Nova customer | `buyer@nova.demo` |

Customer self-registration is closed. Administrators and managers create customer companies and portal invitations from Settings → Customers.

## Demo flows

1. Clean flow: Ravi creates an Acme quote, confirms its policy route, sends it, the customer confirms, Operations accepts the stock split, and Finance records payment.
2. Messy flow: a high-discount quote goes through Manager and Finance, the customer counters, a revised version is approved, a backorder slips, and billing creates proration and credit records.

The exact timed clicks and reset instructions are in [docs/demo-script.md](docs/demo-script.md).

## Verification

```bash
npm test
npm run lint
npm run build
```

The test suite covers authentication helpers, pricing and approval routing, stock allocation, billing dates, proration, and all three deal-health rules.

## Documentation

- [Architecture and data model](docs/architecture.md)
- [Architecture image](docs/architecture.png)
- [Business policies](docs/policies.md)
- [Demo script](docs/demo-script.md)
- [Judge Q&A](docs/judge-qa.md)
- [What comes next](docs/whats-next.md)

## Contributors

Repository contributors are `satvik-svg`, `aaditya3301`, and `Anant-0705`. Exact ownership and review history are preserved in `git log`; no authorship has been inferred beyond the repository evidence.

## Known limitations

- Email, Slack, and WhatsApp notifications are represented by in-app tasks and audit records; no external provider is connected.
- PDF export uses the browser’s print renderer and an A4 print stylesheet, not a server-side PDF service.
- Billing runs are user-triggered rather than scheduled by a worker or cron service.
- Currency and company scope are currently INR and one workspace.
- Deal-health rules run when the page/dashboard loads; a large deployment should precompute them asynchronously.

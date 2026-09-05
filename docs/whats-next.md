# What comes next

The current release deliberately favors a dependable offline demo and deterministic business rules. The next work, in priority order, is:

1. Add multi-company isolation and multi-currency price, tax, and reporting support.
2. Send quote links by email, approval nudges through Slack, and invoice reminders through WhatsApp, while preserving in-app audit records. Customer invitations and password resets already use Resend.
3. Promote the completed Cashfree sandbox integration to production keys, a whitelisted HTTPS origin, monitored webhooks, refunds, and reconciliation exception handling.
4. Add email delivery and archival for the completed server-generated quotation and invoice PDFs.
5. Draft quotations from pasted customer requests with an LLM, then validate every proposed line and discount through the existing deterministic engines.
6. Learn upsell pairings from co-purchase history and expose rule confidence/configuration to administrators.
7. Export journal entries to Odoo Accounting or Zoho Books.
8. Add guarded drag-and-drop pipeline transitions, scheduled billing runs, carrier tracking, and background health-rule evaluation.

At scale, allocation subset enumeration should move to a greedy or integer-programming strategy, and dashboard/report aggregates should be cached or materialized. None of those changes require weakening the current role, audit, version, or idempotency boundaries.

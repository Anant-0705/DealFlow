import { requireSession } from "@/lib/auth";
import { listPortalMessages } from "@/modules/negotiation/queries";
import { CollapsibleMessageGroup } from "@/components/portal/CollapsibleMessageGroup";

export default async function PortalMessagesPage() {
  const session = await requireSession();
  const quotes = await listPortalMessages(session.customerId!);

  return (
    <div className="portal-page">
      <div className="eyebrow">Customer portal</div>
      <h1>Messages</h1>
      <p className="muted">Every conversation stays attached to its quotation.</p>

      <div className="message-groups" style={{ display: "grid", gap: "12px", marginTop: "20px" }}>
        {quotes.map((quote, idx) => (
          <CollapsibleMessageGroup
            key={quote.code}
            quote={quote}
            defaultOpen={idx === 0 && quotes.length === 1}
          />
        ))}
        {!quotes.length && (
          <div className="panel empty-note">
            No message conversations yet. You can send questions directly on any active quotation.
          </div>
        )}
      </div>
    </div>
  );
}


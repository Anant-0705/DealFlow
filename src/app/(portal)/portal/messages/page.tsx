import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listPortalMessages } from "@/modules/negotiation/queries";
import { MessageThread } from "@/components/portal/MessageThread";

export default async function PortalMessagesPage() { const session = await requireSession(); const quotes = await listPortalMessages(session.customerId!); return <div className="portal-page"><div className="eyebrow">Customer portal</div><h1>Messages</h1><p className="muted">Every conversation stays attached to its quotation.</p><div className="message-groups">{quotes.map((quote) => <section className="panel" key={quote.code}><div className="panel-heading"><h2>{quote.code}</h2><Link href={`/portal/quotes/${quote.code}`}>Open quotation →</Link></div><MessageThread messages={quote.messages}/></section>)}</div></div>; }

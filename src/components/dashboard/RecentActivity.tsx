import Link from "next/link";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

const labels: Record<string, string> = { QUOTE_CREATED: "created the quotation", SUBMITTED: "submitted for approval", AUTO_APPROVED: "was approved automatically", APPROVED: "approved the quotation", RETURNED: "returned it for revision", REJECTED: "rejected the quotation", SENT: "sent it to the customer", CONFIRMED: "confirmed the quotation", CONFIRMATION_DISPUTED: "reported an unauthorized confirmation", NUDGE_SENT: "sent a nudge", ESCALATED: "escalated the deal", PAYMENT_RECORDED: "recorded a payment" };

type ActivityRow = { id: number; action: string; at: Date; reason: string | null; actor: { name: string } | null; quote: { code: string; customer: { name: string } } | null };

export function RecentActivity({ events }: { events: ActivityRow[] }) {
  if (!events.length) return <EmptyState icon={Activity} title="No recent activity" description="Actions across visible quotations will appear here."/>;
  return <ol className="recent-activity">{events.map((event) => <li key={event.id}><span/><div><p><strong>{event.actor?.name ?? "System"}</strong> {labels[event.action] ?? event.action.replaceAll("_", " ").toLowerCase()} {event.quote && <>on <Link href={`/app/quotations/${event.quote.code}`}>{event.quote.code}</Link></>}</p><small>{event.quote?.customer.name}{event.quote && " · "}{event.at.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</small>{event.reason && <em>{event.reason}</em>}</div></li>)}</ol>;
}

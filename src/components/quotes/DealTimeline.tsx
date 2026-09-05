const labels: Record<string, string> = { PORTAL_MESSAGE: "Message", COUNTER_PROPOSED: "Counter-offer", SPLIT_ACCEPTED: "Warehouse split", BACKORDER_CONSOLIDATED: "Backorder consolidated", PAYMENT_RECORDED: "Payment", INVOICE_ISSUED: "Invoice", SUBSCRIPTION_CREATED: "Subscription" };

export function DealTimeline({ events }: { events: Array<{ id: number; action: string; actor: string; at: Date; reason: string | null; meta: unknown }> }) {
  if (!events.length) return <div className="empty-note">No activity yet.</div>;
  return <ol className="deal-timeline">{events.map((event) => { const hasMeta = Boolean(event.meta && typeof event.meta === "object" && Object.keys(event.meta as object).length > 0); return <li key={event.id}><i/><div><div className="split"><strong>{labels[event.action] ?? event.action.replaceAll("_", " ").toLowerCase()}</strong><time>{new Date(event.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</time></div><small>{event.actor}</small>{event.reason && <p>{event.reason}</p>}{hasMeta ? <details><summary>Technical detail</summary><pre>{JSON.stringify(event.meta, null, 2)}</pre></details> : null}</div></li>; })}</ol>;
}

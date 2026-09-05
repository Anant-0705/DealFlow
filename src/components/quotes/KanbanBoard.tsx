import Link from "next/link";
import { deriveStage, pipelineStages } from "@/modules/quotes/stages";
import { formatMoney } from "@/lib/money";

type PipelineQuote = { id: number; code: string; approvalStatus: string; customerStatus: string; fulfillmentStatus: string; paymentStatus: string; lastActivityAt: Date; customer: { name: string }; owner: { name: string }; currentRevision: { totalPaise: number; requiredLevel: string; version: number } | null };

export function KanbanBoard({ quotes }: { quotes: PipelineQuote[] }) {
  const renderCard = (quote: PipelineQuote) => {
    const initials = quote.owner.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
    const activityDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(quote.lastActivityAt);
    const approval = quote.currentRevision?.requiredLevel === "FINANCE" ? "Manager → Finance" : quote.currentRevision?.requiredLevel === "MANAGER" ? "Manager review" : "Within policy";
    return <Link href={`/app/quotations/${quote.code}`} className="kanban-card" key={quote.id}>
      <div className="kanban-card-top"><span>{quote.code}</span><b>v{quote.currentRevision?.version ?? 1}</b></div>
      <h3>{quote.customer.name}</h3>
      <strong className="kanban-value">{formatMoney(quote.currentRevision?.totalPaise ?? 0)}</strong>
      <div className={`kanban-risk risk-${quote.currentRevision?.requiredLevel?.toLowerCase() ?? "none"}`}>{approval}</div>
      <footer><div className="kanban-owner"><span className="avatar">{initials}</span><span>{quote.owner.name.split(" ")[0]}</span></div><small>Updated {activityDate}</small></footer>
    </Link>;
  };

  return <div className="kanban-shell"><div className="kanban-scroll"><div className="kanban">
    {pipelineStages.map((stage) => {
      const cards = quotes.filter((quote) => deriveStage(quote) === stage);
      const valuePaise = cards.reduce((total, quote) => total + (quote.currentRevision?.totalPaise ?? 0), 0);
      return <section key={stage} className={`kanban-column ${stage === "Rejected" ? "rejected-column" : ""}`} data-stage={stage}>
        <header className="kanban-column-header"><div><i/><strong>{stage}</strong></div><span>{cards.length}</span><small>{cards.length ? formatMoney(valuePaise) : "No value"}</small></header>
        <div className="kanban-cards">{cards.map(renderCard)}{!cards.length && <div className="column-empty"><span>＋</span><p>No deals in this stage</p></div>}</div>
      </section>;
    })}
  </div></div><p className="kanban-hint">Scroll sideways to view every stage. Each column scrolls independently.</p></div>;
}

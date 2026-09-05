"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Inbox, LayoutGrid, List, Search } from "lucide-react";
import { deriveStage, pipelineStages } from "@/modules/quotes/stages";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { DataTable } from "@/components/shared/DataTable";

type PipelineQuote = { id: number; code: string; approvalStatus: string; customerStatus: string; fulfillmentStatus: string; paymentStatus: string; lastActivityAt: Date; customer: { name: string }; owner: { name: string }; currentRevision: { totalPaise: number; requiredLevel: string; version: number } | null };

export function KanbanBoard({ quotes }: { quotes: PipelineQuote[] }) {
  const [view, setView] = useState<"board" | "list">("board");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => quotes.filter((quote) => `${quote.code} ${quote.customer.name} ${quote.owner.name}`.toLowerCase().includes(query.toLowerCase())), [quotes, query]);
  const renderCard = (quote: PipelineQuote) => {
    const initials = quote.owner.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
    const activityDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(quote.lastActivityAt);
    const approval = quote.currentRevision?.requiredLevel === "FINANCE" ? "Manager → Finance" : quote.currentRevision?.requiredLevel === "MANAGER" ? "Manager review" : "Within policy";
    return <Link href={`/app/quotations/${quote.code}`} className="kanban-card" key={quote.id}><div className="kanban-card-top"><span>{quote.code}</span><b>v{quote.currentRevision?.version ?? 1}</b></div><h3>{quote.customer.name}</h3><strong className="kanban-value">{formatMoney(quote.currentRevision?.totalPaise ?? 0)}</strong><div className={`kanban-risk risk-${quote.currentRevision?.requiredLevel?.toLowerCase() ?? "none"}`}>{approval}</div><footer><div className="kanban-owner"><span className="avatar">{initials}</span><span>{quote.owner.name.split(" ")[0]}</span></div><small>Updated {activityDate}</small></footer></Link>;
  };
  const rows = filtered.map((quote) => ({ id: quote.id, href: `/app/quotations/${quote.code}`, quotation: quote.code, customer: quote.customer.name, stage: deriveStage(quote), total: formatMoney(quote.currentRevision?.totalPaise ?? 0), owner: quote.owner.name }));
  return <div className="kanban-shell"><div className="pipeline-tools"><InputGroup className="pipeline-search"><InputGroupAddon><Search/></InputGroupAddon><InputGroupInput data-page-search aria-label="Search pipeline" placeholder="Search deals…" value={query} onChange={(event) => setQuery(event.target.value)}/></InputGroup><div className="view-toggle" role="group" aria-label="Pipeline view"><Button variant={view === "board" ? "secondary" : "ghost"} size="sm" aria-pressed={view === "board"} onClick={() => setView("board")}><LayoutGrid/>Board</Button><Button variant={view === "list" ? "secondary" : "ghost"} size="sm" aria-pressed={view === "list"} onClick={() => setView("list")}><List/>List</Button></div></div>{view === "list" ? <DataTable columns={[{ key: "quotation", label: "Quotation" }, { key: "customer", label: "Customer" }, { key: "stage", label: "Stage" }, { key: "total", label: "Total" }, { key: "owner", label: "Owner" }]} rows={rows} empty="No deals match this search."/> : <><div className="kanban-scroll"><div className="kanban">{pipelineStages.map((stage) => { const cards = filtered.filter((quote) => deriveStage(quote) === stage); const valuePaise = cards.reduce((total, quote) => total + (quote.currentRevision?.totalPaise ?? 0), 0); return <section key={stage} className={`kanban-column ${stage === "Rejected" ? "rejected-column" : ""}`} data-stage={stage}><header className="kanban-column-header"><div><i/><strong>{stage}</strong></div><span>{cards.length}</span><small>{cards.length ? formatMoney(valuePaise) : "No value"}</small></header><div className="kanban-cards">{cards.map(renderCard)}{!cards.length && <div className="column-empty"><Inbox/><p>No deals in this stage</p></div>}</div></section>; })}</div></div><p className="kanban-hint">Use List view for a compact, keyboard-friendly pipeline.</p></>}</div>;
}

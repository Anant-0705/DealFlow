import Link from "next/link";
import { List } from "lucide-react";
import { KanbanBoard } from "@/components/quotes/KanbanBoard";
import { listForKanban } from "@/modules/quotes/queries";
import { deriveStage } from "@/modules/quotes/stages";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function PipelinePage() {
  const quotes = await listForKanban();
  const activeStages = new Set(quotes.map(deriveStage)).size;
  return <div className="pipeline-page">
    <PageHeader eyebrow="Live commercial workspace" title="Deal pipeline" description="Deals move automatically when approval, customer, fulfillment, or payment status changes." actions={<div className="pipeline-header-actions"><div className="pipeline-summary"><strong>{quotes.length}</strong><span>total deals</span><i/><strong>{activeStages}</strong><span>active stages</span></div><Link className="button secondary" href="/app/quotations"><List size={16}/>Table view</Link></div>} />
    <KanbanBoard quotes={quotes}/>
  </div>;
}

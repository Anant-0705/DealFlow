import Link from "next/link";
import { KanbanBoard } from "@/components/quotes/KanbanBoard";
import { listForKanban } from "@/modules/quotes/queries";
export default async function PipelinePage() { const quotes = await listForKanban(); return <div><div className="page-header"><div><div className="eyebrow">Derived from real statuses</div><h1>Deal pipeline</h1><p>Stages cannot be dragged; they move when the underlying business state changes.</p></div><Link className="button secondary" href="/app/quotations">Switch to Table View</Link></div><KanbanBoard quotes={quotes}/></div>; }

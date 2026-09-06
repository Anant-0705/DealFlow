import Link from "next/link";
import { ListChecks } from "lucide-react";
import { completeTask } from "@/modules/health/actions";
import { EmptyState } from "@/components/shared/EmptyState";
import { SubmitButton } from "@/components/ui/submit-button";

type TaskRow = { id: number; kind: string; message: string; createdAt: Date; quote: { code: string; customer: { name: string } }; createdBy: { name: string } };

export function MyTasks({ tasks }: { tasks: TaskRow[] }) {
  if (!tasks.length) return <EmptyState icon={ListChecks} title="You’re all caught up" description="Nudges, escalations, and customer confirmation reports assigned to you will appear here."/>;
  return <div className="task-list">{tasks.map((task) => <article key={task.id}><div><span className="eyebrow">{task.kind}</span><strong><Link href={`/app/quotations/${task.quote.code}`}>{task.quote.code} · {task.quote.customer.name}</Link></strong><p>{task.message}</p><small>From {task.createdBy.name} · {task.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small></div><form action={completeTask}><input type="hidden" name="taskId" value={task.id}/><SubmitButton size="sm" variant="outline" pendingLabel="Saving…">Mark done</SubmitButton></form></article>)}</div>;
}

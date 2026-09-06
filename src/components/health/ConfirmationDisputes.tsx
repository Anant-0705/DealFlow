import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

type DisputeRow = { quoteId: number; code: string; customer: string; rep: string; message: string; createdAt: Date };

export function ConfirmationDisputes({ disputes }: { disputes: DisputeRow[] }) {
  return (
    <section className="panel section-gap">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Customer trust</span>
          <h2>Unauthorized confirmation reports</h2>
        </div>
      </div>
      {disputes.length ? (
        <div className="table-scroll">
          <table>
            <thead><tr><th>Deal</th><th>Report</th><th>Received</th></tr></thead>
            <tbody>
              {disputes.map((dispute) => (
                <tr key={dispute.quoteId}>
                  <td>
                    <Link href={`/app/quotations/${dispute.code}`}>
                      <strong>{dispute.code}</strong>
                      <small>{dispute.customer} · {dispute.rep}</small>
                    </Link>
                  </td>
                  <td className="health-reason">{dispute.message}</td>
                  <td>{dispute.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={ShieldAlert} title="No open reports" description="If a customer says they did not authorize a confirmation, it appears here and fulfillment pauses until the review is closed."/>
      )}
    </section>
  );
}

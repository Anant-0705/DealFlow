import { AlertTable } from "@/components/health/AlertTable";
import { ConfirmationDisputes } from "@/components/health/ConfirmationDisputes";
import { ExpectedReceipts } from "@/components/health/ExpectedReceipts";
import { HealthSummaryCards } from "@/components/health/HealthSummaryCards";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireInternal } from "@/lib/auth";
import { getDealHealth } from "@/modules/health/queries";

const kinds = ["STALLED", "DISCOUNT_ANOMALY", "DELIVERY_SLIPPAGE"] as const;

export default async function DealHealthPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const [session, query] = await Promise.all([requireInternal(), searchParams]);
  const data = await getDealHealth(session);
  const kind = kinds.includes(query.kind as typeof kinds[number]) ? query.kind as typeof kinds[number] : undefined;
  const visible = kind ? data.alerts.filter((alert) => alert.kind === kind) : data.alerts;
  const canAct = ["MANAGER", "FINANCE", "ADMIN"].includes(session.role);
  const canSchedule = ["FINANCE", "ADMIN"].includes(session.role);
  return (
    <div>
      <PageHeader eyebrow="Commercial intelligence" title="Deal Health" description="Explainable alerts derived from live quotation, discount, inventory, and delivery data."/>
      <HealthSummaryCards counts={data.counts} active={kind}/>
      <section className="panel section-gap">
        <div className="panel-heading"><div><span className="eyebrow">Live risk register</span><h2>{kind ? kind.replaceAll("_", " ").toLowerCase() : "All alerts"}</h2></div></div>
        <AlertTable alerts={visible} canAct={canAct} canSchedule={canSchedule} emptyDescription={`Thresholds: stale after ${data.policy.staleAfterDays} days, anomaly +${data.policy.anomalyDeltaBps / 100} pts — edit in Settings → Policy.`}/>
      </section>
      <ConfirmationDisputes disputes={data.confirmationDisputes}/>
      <ExpectedReceipts receipts={data.expectedReceipts}/>
    </div>
  );
}

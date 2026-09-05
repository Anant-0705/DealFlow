import Link from "next/link";
import { AlertTriangle, Clock3, Truck } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function HealthSummaryCards({ counts, active }: { counts: { stalled: number; anomalies: number; slippage: number }; active?: string }) {
  const cards = [
    { key: "STALLED", label: "Stalled", count: counts.stalled, description: `${counts.stalled} ${counts.stalled === 1 ? "quote" : "quotes"} idle beyond policy`, icon: Clock3 },
    { key: "DISCOUNT_ANOMALY", label: "Discount anomalies", count: counts.anomalies, description: `${counts.anomalies} above rep average`, icon: AlertTriangle },
    { key: "DELIVERY_SLIPPAGE", label: "Delivery slippage", count: counts.slippage, description: `${counts.slippage} promise dates at risk`, icon: Truck },
  ];
  return <div className="stats-grid health-summary">{cards.map(({ key, label, count, description, icon: Icon }) => <Link href={active === key ? "/app/deal-health" : `/app/deal-health?kind=${key}`} key={key} aria-current={active === key ? "true" : undefined}><Card className={active === key ? "active-filter" : ""}><CardHeader><CardTitle>{label}</CardTitle><CardDescription>{description}</CardDescription><CardAction><Icon aria-hidden="true"/></CardAction></CardHeader><CardContent><strong>{count}</strong></CardContent></Card></Link>)}</div>;
}

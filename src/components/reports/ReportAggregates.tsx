import { Clock3, PackagePlus, ScrollText } from "lucide-react";

export function ReportAggregates({ values }: { values: { quotesCreated: number; averageApprovalHours: number | null; topUpsoldProduct: string } }) {
  const cards = [{ label: "Quotes created", value: values.quotesCreated, detail: "Matching the current filters", icon: ScrollText }, { label: "Average approval time", value: values.averageApprovalHours == null ? "—" : `${values.averageApprovalHours.toFixed(1)} hours`, detail: "Submitted to final approval", icon: Clock3 }, { label: "Top upsold product", value: values.topUpsoldProduct, detail: "Accepted upsell suggestions", icon: PackagePlus }];
  return <div className="stats-grid report-aggregates">{cards.map(({ label, value, detail, icon: Icon }) => <article key={label}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><Icon aria-hidden="true"/></article>)}</div>;
}

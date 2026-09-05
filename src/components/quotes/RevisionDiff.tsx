import { formatMoney } from "@/lib/money";

export function RevisionDiff({ diff, customer = false }: { diff: { fromVersion: number; toVersion: number; changes: string[]; totalDeltaPaise: number; marginDeltaPaise: number }; customer?: boolean }) {
  return <section className="panel revision-diff"><span className="eyebrow">What changed · v{diff.fromVersion} → v{diff.toVersion}</span>{diff.changes.length ? <ul>{diff.changes.map((change) => <li key={change}>{change}</li>)}</ul> : <p className="muted">No line-level changes.</p>}<div className="diff-totals"><span>Total delta <b>{formatMoney(diff.totalDeltaPaise)}</b></span>{!customer && <span>Margin delta <b>{formatMoney(diff.marginDeltaPaise)}</b></span>}</div></section>;
}

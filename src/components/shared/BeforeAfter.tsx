export function BeforeAfter({ before, after, children }: { before: string; after: string; children?: React.ReactNode }) {
  return <div className="before-after"><div><span>Before</span><strong>{before}</strong></div><div className="change-arrow">→</div><div><span>After</span><strong>{after}</strong></div>{children}</div>;
}

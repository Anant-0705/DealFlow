export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return <div aria-label="Loading page" aria-busy="true"><div className="skeleton skeleton-title"/><div className="stats-grid">{Array.from({ length: cards }, (_, index) => <div className="skeleton skeleton-card" key={index}/>)}</div><div className="skeleton skeleton-table"/></div>;
}

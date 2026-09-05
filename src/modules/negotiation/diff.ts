export type DiffLine = {
  productId: number;
  variantId: number | null;
  description: string;
  qty: number;
  lineDiscountBps: number;
  unitPricePaise: number;
};

export type DiffRevision = { version: number; orderDiscountBps: number; totalPaise: number; marginPaise?: number; lines: DiffLine[] };

export function diffRevisions(previous: DiffRevision, current: DiffRevision) {
  const key = (line: DiffLine) => `${line.productId}:${line.variantId ?? "base"}`;
  const before = new Map(previous.lines.map((line) => [key(line), line]));
  const after = new Map(current.lines.map((line) => [key(line), line]));
  const changes: string[] = [];
  for (const [lineKey, line] of after) {
    const old = before.get(lineKey);
    if (!old) changes.push(`${line.description} added ×${line.qty}`);
    else {
      if (old.qty !== line.qty) changes.push(`${line.description} quantity ${old.qty} → ${line.qty}`);
      if (old.lineDiscountBps !== line.lineDiscountBps) changes.push(`${line.description} discount ${old.lineDiscountBps / 100}% → ${line.lineDiscountBps / 100}%`);
      if (old.unitPricePaise !== line.unitPricePaise) changes.push(`${line.description} unit price changed`);
    }
  }
  for (const [lineKey, line] of before) if (!after.has(lineKey)) changes.push(`${line.description} removed`);
  if (previous.orderDiscountBps !== current.orderDiscountBps) changes.push(`Order discount ${previous.orderDiscountBps / 100}% → ${current.orderDiscountBps / 100}%`);
  return {
    fromVersion: previous.version,
    toVersion: current.version,
    changes,
    totalDeltaPaise: current.totalPaise - previous.totalPaise,
    marginDeltaPaise: (current.marginPaise ?? 0) - (previous.marginPaise ?? 0),
  };
}

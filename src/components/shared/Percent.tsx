import { formatPercent } from "@/lib/money";
export function Percent({ value, digits = 0 }: { value: number; digits?: number }) { return <span>{formatPercent(value, digits)}</span>; }

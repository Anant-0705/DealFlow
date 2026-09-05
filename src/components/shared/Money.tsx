import { formatMoney } from "@/lib/money";
export function Money({ value, className }: { value: number; className?: string }) { return <span className={className}>{formatMoney(value)}</span>; }

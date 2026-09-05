import { CheckCircle2 } from "lucide-react";
export function ReasonList({ reasons }: { reasons: string[] }) { return <ul className="reason-list">{reasons.map((reason) => <li key={reason}><CheckCircle2 size={15} aria-hidden="true"/><span>{reason}</span></li>)}</ul>; }

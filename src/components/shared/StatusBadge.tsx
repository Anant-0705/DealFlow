import { Badge } from "@/components/ui/badge";

type BadgeTone = "default" | "secondary" | "destructive" | "outline";
const tones: Record<string, BadgeTone> = { APPROVED: "default", PAID: "default", PARTIAL: "secondary", UNPAID: "secondary", PENDING: "secondary", FINANCE: "destructive", MANAGER: "secondary", REJECTED: "destructive", STALE: "outline", DRAFT: "outline", NONE: "outline", SENT: "secondary", NEGOTIATING: "secondary", CONFIRMED: "default", ACTIVE: "default", CANCELLED: "outline", CREDITED: "secondary" };
const labels: Record<string, string> = { NEGOTIATING: "Under Negotiation", ONE_TIME: "One-time" };
export function StatusBadge({ status }: { status: string }) { return <Badge variant={tones[status] ?? "secondary"}>{labels[status] ?? status.replaceAll("_", " ")}</Badge>; }

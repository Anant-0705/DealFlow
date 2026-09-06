import { Badge } from "@/components/ui/badge";

type BadgeTone = "default" | "secondary" | "destructive" | "outline";
const tones: Record<string, BadgeTone> = { APPROVED: "default", PAID: "default", PARTIAL: "secondary", UNPAID: "secondary", PENDING: "secondary", FINANCE: "destructive", MANAGER: "secondary", REJECTED: "destructive", STALE: "outline", DRAFT: "outline", NONE: "outline", SENT: "secondary", NEGOTIATING: "secondary", CONFIRMED: "default", ACTIVE: "default", PAUSED: "secondary", CANCELLED: "outline", CREDITED: "secondary", SCHEDULED: "secondary", INVOICED: "default", SKIPPED: "outline" };
const labels: Record<string, string> = { NEGOTIATING: "Under Negotiation", ONE_TIME: "One-time", FULFILLMENT: "Fulfillment" };
export function StatusBadge({ status }: { status: string }) { return <Badge className={`status-badge status-${status.toLowerCase()}`} variant={tones[status] ?? "secondary"}>{labels[status] ?? status.replaceAll("_", " ")}</Badge>; }

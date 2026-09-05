import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({ label, value, description, href, icon: Icon }: { label: string; value: string | number; description: string; href: string; icon: LucideIcon }) {
  return <Link className="stat-card-link" href={href}><Card><CardHeader><CardTitle>{label}</CardTitle><CardDescription>{description}</CardDescription><CardAction><Icon aria-hidden="true"/></CardAction></CardHeader><CardContent><strong>{value}</strong></CardContent></Card></Link>;
}

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: { href: string; label: string } }) {
  return <div className="empty-state"><Icon aria-hidden="true"/><strong>{title}</strong><p>{description}</p>{action && <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={action.href}>{action.label}</Link>}</div>;
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { visibleNavigation } from "./navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SideNav({ pendingCount, role, mobile = false, onNavigate }: { pendingCount: number; role: UserRole; mobile?: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  const groups = visibleNavigation(role);

  return (
    <aside className={cn("sidebar", mobile && "sidebar-mobile")}>
      <Link className="brand" href="/app/dashboard">
        <span className="brand-mark" aria-hidden="true">A</span>
        <span>
          AccordFlow
          <small>Deal governance</small>
        </span>
      </Link>
      <nav aria-label="Primary navigation">
        {groups.map((group) => <div className="nav-group" key={group.label}>
          <span className="nav-group-label">{group.label}</span>
          {group.items.map(({ label, href, icon: Icon, shortcut }) => {
            const active = path.startsWith(href);
            const link = <Link href={href} className={cn(active && "active")} aria-current={active ? "page" : undefined} onClick={onNavigate}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {label === "Approvals" && pendingCount > 0 && <Badge variant="secondary">{pendingCount}</Badge>}
              <kbd>{shortcut}</kbd>
            </Link>;
            return <Tooltip key={href}><TooltipTrigger render={link}/><TooltipContent side="right">{label}</TooltipContent></Tooltip>;
          })}
        </div>)}
      </nav>
      <div className="sidebar-foot">
        <span className="live-dot" />
        All systems operational
      </div>
    </aside>
  );
}

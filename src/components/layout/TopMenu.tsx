"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, FileText, LogOut, Menu, RefreshCw, Search, Settings2, UserPlus } from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import { logout } from "@/modules/identity/actions";
import { reloadWorkspace } from "@/modules/quotes/actions";
import { visibleNavigation } from "./navigation";
import { SideNav } from "./SideNav";
import { Button, buttonVariants } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type CommandQuote = { code: string; customer: { name: string } };

export function TopMenu({ name, role, canConfigure, approvalCount, customerRequestCount, quotes }: { name: string; role: UserRole; canConfigure: boolean; approvalCount: number; customerRequestCount: number; quotes: CommandQuote[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [message, setMessage] = useState("");
  const sequence = useRef(false);
  const previousPath = useRef(pathname);
  const groups = visibleNavigation(role);
  const destinations = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const notificationCount = approvalCount + customerRequestCount;
  const notificationHref = customerRequestCount > 0 ? "/app/settings/customers#access-requests" : role === "REP" ? "/app/quotations?status=pending" : "/app/approvals";
  const navigate = useCallback((href: string) => { setOpen(false); setMobileOpen(false); router.push(href); }, [router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.matches("input, textarea, select, [contenteditable='true']");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); return; }
      if (event.key === "Escape") { setOpen(false); sequence.current = false; return; }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "/") { event.preventDefault(); document.querySelector<HTMLElement>("[data-page-search]")?.focus(); return; }
      if (event.key.toLowerCase() === "n" && (role === "REP" || role === "ADMIN")) { event.preventDefault(); navigate("/app/quotations/new"); return; }
      if (event.key.toLowerCase() === "g") { sequence.current = true; window.setTimeout(() => { sequence.current = false; }, 900); return; }
      if (sequence.current) { const item = destinations.find((destination) => destination.shortcut.toLowerCase() === event.key.toLowerCase()); if (item) navigate(item.href); sequence.current = false; }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [destinations, navigate, role]);

  useEffect(() => {
    if (previousPath.current !== pathname) { previousPath.current = pathname; document.getElementById("main-content")?.focus(); }
  }, [pathname]);

  const refresh = async () => { await reloadWorkspace(); router.refresh(); setMessage("Workspace data refreshed"); window.setTimeout(() => setMessage(""), 2600); };
  const currentLabel = destinations.find((item) => pathname.startsWith(item.href))?.label ?? "Workspace";
  const crumbs = pathname.split("/").filter(Boolean).slice(1).map((part) => part.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase()));

  return <>
    <div className="context-bar">
      <div className="context-heading">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="mobile-menu-trigger" aria-label="Open navigation" />}><Menu /></SheetTrigger>
          <SheetContent side="left" className="mobile-nav-sheet"><SheetHeader><SheetTitle>DealFlow</SheetTitle><SheetDescription>Navigate your deal workspace.</SheetDescription></SheetHeader><SideNav mobile approvalCount={approvalCount} customerRequestCount={customerRequestCount} role={role} onNavigate={() => setMobileOpen(false)}/></SheetContent>
        </Sheet>
        <div><span className="context-kicker">{currentLabel}</span><div className="breadcrumbs"><Link href="/app/dashboard">Workspace</Link>{crumbs.map((crumb, index) => <Fragment key={`${crumb}-${index}`}><span>/</span><span>{crumb}</span></Fragment>)}</div></div>
      </div>
      <div className="context-actions">
        <Button variant="outline" className="command-trigger" onClick={() => setOpen(true)}><Search data-icon="inline-start"/><span>Search workspace</span><kbd>⌘K</kbd></Button>
        <Link href={notificationHref} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "approval-trigger")} aria-label={`${approvalCount} pending approvals and ${customerRequestCount} customer account requests`}><Bell/>{notificationCount > 0 && <span>{notificationCount}</span>}</Link>
        <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" className="identity-trigger" />}><span className="identity-mini">{name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="menu-label">{name}</span></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuLabel>{name} · {role}</DropdownMenuLabel><DropdownMenuItem onClick={refresh}><RefreshCw/>Refresh workspace</DropdownMenuItem>{canConfigure && <DropdownMenuItem onClick={() => navigate("/app/settings")}><Settings2/>Settings</DropdownMenuItem>}</DropdownMenuGroup><DropdownMenuSeparator/><form action={logout} className="dropdown-signout"><DropdownMenuGroup><DropdownMenuItem nativeButton render={<button type="submit" />}><LogOut/>Sign out</DropdownMenuItem></DropdownMenuGroup></form></DropdownMenuContent></DropdownMenu>
      </div>
    </div>
    {message && <div className="toast" role="status">{message}</div>}
    <CommandDialog open={open} onOpenChange={setOpen} title="Search DealFlow" description="Navigate, search quotations, or start a new quotation.">
      <CommandInput placeholder="Search destinations and quotations…" />
      <CommandList><CommandEmpty>No matching workspace action.</CommandEmpty><CommandGroup heading="Navigate">{destinations.map((item) => <CommandItem key={item.href} value={`${item.label} ${item.href}`} onSelect={() => navigate(item.href)}><item.icon/><span>{item.label}</span><CommandShortcut>G {item.shortcut}</CommandShortcut></CommandItem>)}</CommandGroup>{(role === "REP" || role === "ADMIN") && <CommandGroup heading="Actions"><CommandItem onSelect={() => navigate("/app/quotations/new")}><FileText/><span>New quotation</span><CommandShortcut>N</CommandShortcut></CommandItem>{role === "ADMIN" && customerRequestCount > 0 && <CommandItem onSelect={() => navigate("/app/settings/customers#access-requests")}><UserPlus/><span>Review {customerRequestCount} account request{customerRequestCount === 1 ? "" : "s"}</span></CommandItem>}</CommandGroup>}<CommandGroup heading="Recent quotations">{quotes.map((quote) => <CommandItem key={quote.code} value={`${quote.code} ${quote.customer.name}`} onSelect={() => navigate(`/app/quotations/${quote.code}`)}><FileText/><span>{quote.code} · {quote.customer.name}</span></CommandItem>)}</CommandGroup></CommandList>
    </CommandDialog>
  </>;
}

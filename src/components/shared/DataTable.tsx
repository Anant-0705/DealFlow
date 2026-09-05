"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type TableColumn = { key: string; label: string; priority?: "primary" | "secondary" };
type Row = Record<string, string | number> & { href?: string; id?: string | number };

export function DataTable({ columns, rows, empty = "No records found" }: { columns: TableColumn[]; rows: Row[]; empty?: string }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: columns[0]?.key ?? "", direction: "asc" as "asc" | "desc" });
  const visible = useMemo(() => {
    const filtered = rows.filter((row) => Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase()));
    return filtered.sort((a, b) => {
      const result = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), undefined, { numeric: true });
      return sort.direction === "asc" ? result : -result;
    });
  }, [rows, query, sort]);
  const toggleSort = (key: string) => setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  const openRow = (row: Row) => { if (row.href) window.location.assign(row.href); };
  const isInteractive = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest("a,button,input,select,textarea,[role='button']"));

  return <div className="table-shell"><div className="table-tools"><InputGroup className="table-search"><InputGroupAddon><Search/></InputGroupAddon><InputGroupInput data-page-search aria-label="Filter records" placeholder="Filter records…" value={query} onChange={(event) => setQuery(event.target.value)}/></InputGroup><span>{visible.length} records</span></div><div className="table-scroll"><Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key} className={column.priority === "secondary" ? "column-secondary" : undefined} aria-sort={sort.key === column.key ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" onClick={() => toggleSort(column.key)}>{column.label}{sort.key === column.key ? sort.direction === "asc" ? <ArrowUp/> : <ArrowDown/> : <ChevronsUpDown/>}</button></TableHead>)}</TableRow></TableHeader><TableBody>{visible.map((row, index) => <TableRow key={String(row.id ?? index)} className={row.href ? "table-row-link" : undefined} tabIndex={row.href ? 0 : undefined} onClick={(event) => { if (!isInteractive(event.target)) openRow(row); }} onKeyDown={(event) => { if (row.href && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openRow(row); } }}>{columns.map((column, cell) => <TableCell key={column.key} className={column.priority === "secondary" ? "column-secondary" : undefined}>{cell === 0 && row.href ? <Link href={row.href}>{row[column.key]}</Link> : row[column.key]}</TableCell>)}</TableRow>)}{!visible.length && <TableRow><TableCell colSpan={columns.length}><Empty><EmptyHeader><EmptyTitle>No matching records</EmptyTitle><EmptyDescription>{empty}</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>}</TableBody></Table></div></div>;
}

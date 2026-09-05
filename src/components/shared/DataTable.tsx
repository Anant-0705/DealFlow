"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type TableColumn = { key: string; label: string };
export function DataTable({ columns, rows, empty = "No records found" }: { columns: TableColumn[]; rows: Array<Record<string, string | number> & { href?: string }>; empty?: string }) {
  const [query, setQuery] = useState(""); const [sort, setSort] = useState(columns[0]?.key ?? "");
  const visible = useMemo(() => rows.filter((row) => Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase())).sort((a, b) => String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), undefined, { numeric: true })), [rows, query, sort]);
  return <div className="table-shell"><div className="table-tools"><Input aria-label="Filter records" placeholder="Filter records…" value={query} onChange={(event) => setQuery(event.target.value)}/><span>{visible.length} records</span></div><Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key}><button onClick={() => setSort(column.key)}>{column.label}</button></TableHead>)}</TableRow></TableHeader><TableBody>{visible.map((row, index) => <TableRow key={String(row.id ?? index)}>{columns.map((column, cell) => <TableCell key={column.key}>{cell === 0 && row.href ? <Link href={String(row.href)}>{row[column.key]}</Link> : row[column.key]}</TableCell>)}</TableRow>)}{!visible.length && <TableRow><TableCell colSpan={columns.length}><Empty><EmptyHeader><EmptyTitle>No matching records</EmptyTitle><EmptyDescription>{empty}</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>}</TableBody></Table></div>;
}

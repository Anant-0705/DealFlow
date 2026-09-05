"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export type TableColumn = { key: string; label: string };
export function DataTable({ columns, rows, empty = "No records found" }: { columns: TableColumn[]; rows: Array<Record<string, string | number> & { href?: string }>; empty?: string }) {
  const [query, setQuery] = useState(""); const [sort, setSort] = useState(columns[0]?.key ?? "");
  const visible = useMemo(() => rows.filter((row) => Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase())).sort((a, b) => String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), undefined, { numeric: true })), [rows, query, sort]);
  return <div className="table-shell"><div className="table-tools"><label><Search size={16}/><input aria-label="Filter records" placeholder="Filter records…" value={query} onChange={(e) => setQuery(e.target.value)}/></label><span>{visible.length} records</span></div><div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column.key}><button onClick={() => setSort(column.key)}>{column.label}</button></th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={String(row.id ?? index)}>{columns.map((column, cell) => <td key={column.key}>{cell === 0 && row.href ? <Link href={String(row.href)}>{row[column.key]}</Link> : row[column.key]}</td>)}</tr>)}{!visible.length && <tr><td colSpan={columns.length} className="empty-cell">{empty}</td></tr>}</tbody></table></div></div>;
}

"use client";
import { Button } from "@/components/ui/button";

export function PrintButton() { return <Button type="button" className="no-print" variant="outline" onClick={() => window.print()}>Download / Print</Button>; }

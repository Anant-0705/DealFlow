"use client";

import { Button } from "@/components/ui/button";

export function PrintTrigger() { return <Button type="button" className="no-print" onClick={() => window.print()}>Print / Save PDF</Button>; }

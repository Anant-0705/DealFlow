"use client";

import { SubmitButton } from "@/components/ui/submit-button";

export function ResetDemoForm({ action }: { action: () => Promise<void> }) {
  return <form action={action} onSubmit={(event) => { if (!window.confirm("This wipes all records and restores the demo seed. Continue?")) event.preventDefault(); }}><SubmitButton variant="destructive" pendingLabel="Restoring demo data…">Reset Demo Data</SubmitButton></form>;
}

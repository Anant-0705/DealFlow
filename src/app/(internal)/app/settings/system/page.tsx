import { DatabaseBackup } from "lucide-react";
import { ResetDemoForm } from "@/components/settings/ResetDemoForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requirePageRole } from "@/lib/auth";
import { resetDemoData } from "@/modules/admin/actions";

export default async function SystemSettingsPage() {
  await requirePageRole(["ADMIN"]);
  return <section className="panel system-settings"><div className="panel-heading"><div><span className="eyebrow">Demo operations</span><h2>System</h2></div><DatabaseBackup aria-hidden="true"/></div><Alert variant="destructive"><AlertTitle>Reset the complete workspace</AlertTitle><AlertDescription>This deletes current demo records and recreates all users, customers, quotes, approvals, inventory, billing history, and Phase 3 risk examples from the canonical seed.</AlertDescription></Alert><ResetDemoForm action={resetDemoData}/></section>;
}

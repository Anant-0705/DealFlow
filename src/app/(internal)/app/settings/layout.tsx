import { requirePageRole } from "@/lib/auth";
import { SETTINGS_ROLES } from "@/lib/roles";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsNav } from "@/components/layout/SettingsNav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageRole(SETTINGS_ROLES);
  return <div><PageHeader eyebrow="Administration" title="Settings" description="Stored rules drive every calculation and approval decision."/><div className="settings-workspace"><SettingsNav role={session.role}/><section className="settings-content">{children}</section></div></div>;
}

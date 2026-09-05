import { requireInternal } from "@/lib/auth";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireInternal();
  return <main className="print-shell">{children}</main>;
}

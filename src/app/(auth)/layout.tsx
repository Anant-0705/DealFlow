import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { destinationFor } from "@/lib/roles";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session) redirect(destinationFor(session.role, undefined));
  return <main className="auth-page">{children}</main>;
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { destinationFor } from "@/lib/roles";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session) redirect(destinationFor(session.role, undefined));
  return (
    <main className="auth-page">
      <Link href="/" className="auth-top-back-btn" aria-label="Back to home page">
        <ArrowLeft aria-hidden="true" />
        <span>Back to home</span>
      </Link>
      {children}
    </main>
  );
}

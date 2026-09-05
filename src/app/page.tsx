import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function Home() {
  const session = await getSession();
  if (session) redirect(session.role === "CUSTOMER" ? "/portal" : "/app/dashboard");
  return <LandingPage />;
}

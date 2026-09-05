import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="auth-brand">
          <span className="brand-mark">D</span>
          <div>
            <strong>DealFlow</strong>
            <small>Rep onboarding</small>
          </div>
        </div>
        <CardTitle>Account access is invitation-only</CardTitle>
        <CardDescription>Sales team accounts are created through your company’s administrator. Customer accounts are created only from an emailed invitation.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="destructive"><AlertTitle>Account access</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="panel"><p className="muted">Ask a DealFlow administrator to add you to the workspace, or ask them to email you a customer invitation so you can choose your own password.</p></div>
      </CardContent>
      <CardFooter>
        <p className="auth-foot">Already have access? <Link href="/login">Sign in</Link></p>
      </CardFooter>
    </Card>
  );
}

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="auth-brand">
          <span className="brand-mark">A</span>
          <div>
            <strong>AccordFlow</strong>
            <small>Rep onboarding</small>
          </div>
        </div>
        <CardTitle>Account access is invitation-only</CardTitle>
        <CardDescription>Sales team accounts are created through your company’s administrator. Customer accounts are created from a customer invitation.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="destructive"><AlertTitle>Account access</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="panel"><p className="muted">Ask an AccordFlow administrator to add you to the workspace, or ask your business contact to resend your customer invitation.</p></div>
      </CardContent>
      <CardFooter>
        <p className="auth-foot">Already have access? <Link href="/login">Sign in</Link></p>
      </CardFooter>
    </Card>
  );
}

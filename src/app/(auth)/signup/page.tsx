import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerAccessRequestForm } from "@/components/auth/CustomerAccessRequestForm";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <div className="auth-brand">
          <span className="brand-mark">D</span>
          <div>
            <strong>DealFlow</strong>
            <small>Customer onboarding</small>
          </div>
        </div>
        <CardTitle>Request customer portal access</CardTitle>
        <CardDescription>Share your company name, contact, and billing address. An administrator will verify the request, create your customer record, and email a secure activation link.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="destructive"><AlertTitle>Account access</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        <CustomerAccessRequestForm />
      </CardContent>
      <CardFooter>
        <p className="auth-foot">Already have an account or invitation? <Link href="/login">Sign in</Link></p>
      </CardFooter>
    </Card>
  );
}

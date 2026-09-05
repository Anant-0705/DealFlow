import Link from "next/link";
import { signup } from "@/modules/identity/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
        <CardTitle>Join the sales team</CardTitle>
        <CardDescription>New workspace accounts receive the Sales Rep role. Administrators assign every other role.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Could not create account</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form action={signup} className="form-stack">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} />
            </Field>
            <Field>
              <FieldLabel htmlFor="signup-email">Email</FieldLabel>
              <Input id="signup-email" name="email" type="email" autoComplete="username" required maxLength={254} />
            </Field>
            <Field>
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <Input id="signup-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
            </Field>
          </FieldGroup>
          <Button size="lg">Create account</Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="auth-foot">Already registered? <Link href="/login">Sign in</Link></p>
      </CardFooter>
    </Card>
  );
}

import Link from "next/link";
import { requestPasswordReset } from "@/modules/identity/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { error, sent } = await searchParams;
  return (
    <main className="auth-page">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="auth-brand">
            <span className="brand-mark">D</span>
            <div>
              <strong>DealFlow</strong>
              <small>Account recovery</small>
            </div>
          </div>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>If this email has a DealFlow account, we will send a one-hour reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not send a reset email</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {sent === "1" && (
            <Alert>
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>If that address has an account, a reset link is on its way. The link expires in one hour.</AlertDescription>
            </Alert>
          )}
          <form action={requestPasswordReset} className="form-stack">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reset-email">Email</FieldLabel>
                <Input id="reset-email" name="email" type="email" autoComplete="username" required maxLength={254} />
              </Field>
            </FieldGroup>
            <Button type="submit" size="lg">Send reset link</Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="auth-foot">Remembered it? <Link href="/login">Sign in</Link></p>
        </CardFooter>
      </Card>
    </main>
  );
}

import Link from "next/link";
import { resetPassword } from "@/modules/identity/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = "", error } = await searchParams;
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
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>This link is one-time and expires after one hour.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Reset unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form action={resetPassword} className="form-stack">
            <input type="hidden" name="token" value={token} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
                <FieldDescription>Minimum eight characters.</FieldDescription>
              </Field>
            </FieldGroup>
            <Button type="submit" size="lg" disabled={!token}>Update password</Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="auth-foot">Need a new link? <Link href="/forgot-password">Request another reset</Link></p>
        </CardFooter>
      </Card>
    </main>
  );
}

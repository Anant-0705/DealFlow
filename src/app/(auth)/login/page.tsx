import Link from "next/link";
import { login } from "@/modules/identity/actions";
import { safeNextPath } from "@/lib/roles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const nextPath = safeNextPath(next);
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="auth-brand">
          <span className="brand-mark">D</span>
          <div>
            <strong>DealFlow</strong>
            <small>Self-governing sales operations</small>
          </div>
        </div>
        <CardTitle>Sign in to your workspace</CardTitle>
        <CardDescription>Use a workspace account, or a customer invitation you received by email. Sessions are signed and re-checked against the database on every request.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Could not sign in</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form action={login} className="form-stack">
          {nextPath && <input type="hidden" name="next" value={nextPath} />}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" defaultValue="ravi@dealflow.demo" autoComplete="username" required maxLength={254} />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" name="password" type="password" defaultValue="demo1234" autoComplete="current-password" required minLength={8} maxLength={72} />
              <FieldDescription>Minimum eight characters. <Link href="/forgot-password">Forgot password?</Link></FieldDescription>
            </Field>
          </FieldGroup>
          <Button type="submit" size="lg">Sign in</Button>
        </form>
        <div className="demo-credentials">
          <strong>Demo access</strong>
          <span>admin@dealflow.demo · manager@dealflow.demo</span>
          <span>finance@dealflow.demo · ravi@dealflow.demo</span>
          <span>buyer@acme.demo · Password: demo1234</span>
        </div>
      </CardContent>
      <CardFooter>
        <p className="auth-foot">Customer access is invitation-only. <Link href="/signup">Need an account?</Link></p>
      </CardFooter>
    </Card>
  );
}

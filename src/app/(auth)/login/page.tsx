import Link from "next/link";
import { login } from "@/modules/identity/actions";
import { safeNextPath } from "@/lib/roles";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const nextPath = safeNextPath(next);
  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark">A</span>
        <div>
          <strong>AccordFlow</strong>
          <small>Self-governing sales operations</small>
        </div>
      </div>
      <div className="eyebrow">Welcome back</div>
      <h1>Sign in to your workspace</h1>
      <p className="muted">Use your internal or customer credentials. Sessions are signed and re-checked against the database on every request.</p>
      {error && <div className="alert danger">{error}</div>}
      <form action={login} className="form-stack">
        {nextPath && <input type="hidden" name="next" value={nextPath} />}
        <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={72} /></label>
        <button className="button primary">Sign in</button>
      </form>
      <div className="demo-credentials">
        <strong>Demo access</strong>
        <span>admin@accordflow.demo · manager@accordflow.demo</span>
        <span>finance@accordflow.demo · ravi@accordflow.demo</span>
        <span>buyer@acme.demo · Password: demo1234</span>
      </div>
      <p className="auth-foot">New sales rep? <Link href="/signup">Create an account</Link></p>
    </div>
  );
}

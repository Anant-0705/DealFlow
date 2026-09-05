import Link from "next/link";
import { signup } from "@/modules/identity/actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark">A</span>
        <div>
          <strong>AccordFlow</strong>
          <small>Rep onboarding</small>
        </div>
      </div>
      <div className="eyebrow">New workspace account</div>
      <h1>Join the sales team</h1>
      <p className="muted">New signups receive the Sales Rep role. Administrators assign every other role.</p>
      {error && <div className="alert danger">{error}</div>}
      <form action={signup} className="form-stack">
        <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>
        <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
        <label>Password<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></label>
        <button className="button primary">Create account</button>
      </form>
      <p className="auth-foot">Already registered? <Link href="/login">Sign in</Link></p>
    </div>
  );
}

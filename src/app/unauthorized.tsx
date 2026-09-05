import Link from "next/link";

export default function Unauthorized() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="eyebrow">401</div>
        <h1>Sign in required</h1>
        <p className="muted">That action needs a signed-in workspace session.</p>
        <Link className="button primary" href="/login">Go to sign in</Link>
      </div>
    </main>
  );
}

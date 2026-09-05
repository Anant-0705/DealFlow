import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="eyebrow">403</div>
        <h1>You do not have access</h1>
        <p className="muted">Your current role cannot perform that action. Sign in with the right account, or return to the workspace.</p>
        <div className="header-actions">
          <Link className="button secondary" href="/login">Switch account</Link>
          <Link className="button primary" href="/app/dashboard">Back to workspace</Link>
        </div>
      </div>
    </main>
  );
}

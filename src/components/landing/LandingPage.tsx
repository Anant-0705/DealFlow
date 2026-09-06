"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileText,
  PackageCheck,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";

import { login } from "@/modules/identity/actions";
import { evaluateRevision } from "@/modules/pricing/engine";
import { mountLandingScroll } from "./scrollcraft";
import { DealFlowLogo } from "@/components/shared/DealFlowLogo";

const policy = {
  tierCeilingBronzeBps: 500,
  tierCeilingSilverBps: 1000,
  tierCeilingGoldBps: 1500,
  financeLineExcessBps: 800,
  financeBlendedExcessBps: 300,
  financeExcessValuePaise: 500000,
};

const stages = [
  { label: "Quote", icon: FileText, reason: "The revision records the line, quantity, price, and discount before it moves.", code: "Q-1042 · REVISION 07" },
  { label: "Approval", icon: FileCheck2, reason: "The policy route names the next human when a ceiling is crossed.", code: "MANAGER → FINANCE" },
  { label: "Negotiation", icon: SlidersHorizontal, reason: "A counter offer creates a revision, so the decision history remains visible.", code: "REVISION · AUDIT" },
  { label: "Fulfillment", icon: PackageCheck, reason: "The order keeps allocation and backorder state beside the confirmed quote.", code: "MAIN + EAST" },
  { label: "Billing", icon: CreditCard, reason: "Subscription changes calculate their first bill against the active period.", code: "PRORATION · INR" },
  { label: "Payment", icon: Check, reason: "The invoice closes with a recorded payment state, not a hidden status change.", code: "INV-1042 · PAID" },
];

const roles = [
  ["Rep", "Build the quote, see the policy result, and send the right revision."],
  ["Manager", "Review the exception with the reason that caused the route."],
  ["Finance", "Approve value-heavy exceptions after the manager step."],
  ["Customer", "Review terms, comment on lines, and respond in the portal."],
  ["Admin", "Keep products, pricing, policy, and operational rules current."],
];

const demoAccounts = [
  ["Rep", "ravi@accordflow.demo", "Ravi Rao"],
  ["Manager", "manager@accordflow.demo", "Jane Shah"],
  ["Finance", "finance@accordflow.demo", "Rhea Iyer"],
  ["Customer", "buyer@acme.demo", "Acme Buyer"],
];

function routeLabel(level: string) {
  if (level === "FINANCE") return "Manager + Finance";
  if (level === "MANAGER") return "Sales Manager";
  return "Auto-approved";
}

export function LandingPage() {
  const [discount, setDiscount] = useState(12);
  const [activeStage, setActiveStage] = useState(0);
  const rootRef = useRef<HTMLElement>(null);

  const evaluation = useMemo(
    () =>
      evaluateRevision({
        customerTier: "GOLD",
        policy,
        orderDiscountBps: 0,
        lines: [
          {
            description: "Revenue operations bundle",
            categoryId: 1,
            categoryName: "Hardware",
            categoryCeilingBps: 1500,
            qty: 2,
            unitPricePaise: 8_500_000,
            unitCostPaise: 6_800_000,
            taxBps: 1800,
            lineDiscountBps: Math.round(discount * 100),
          },
        ],
      }),
    [discount],
  );

  useEffect(() => {
    if (!rootRef.current) return;
    return mountLandingScroll(rootRef.current, setActiveStage);
  }, []);

  const lineReason = evaluation.detailReasons[0] ?? "No quote lines yet → no approval required.";
  const excessValue = evaluation.excessValuePaise.toLocaleString("en-IN");

  return (
    <main ref={rootRef} className="landing-page" data-sc-mode="live-surface" data-sc-signature="approval-ladder">
      <header className="landing-header">
        <Link className="landing-wordmark" href="/" aria-label="DealFlow home">
          <span className="landing-mark" aria-hidden="true"><DealFlowLogo size={30} /></span>
          <span>DealFlow</span>
        </Link>
        <nav className="landing-nav" aria-label="Landing page navigation">
          <a href="#thread">How it reasons</a>
          <a href="#roles">Roles</a>
          <a href="#access">Demo access</a>
          <Link className="landing-nav-action" href="/login">Sign in <ArrowRight data-icon="inline-end" /></Link>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title" data-landing-reveal>
        <div className="landing-hero-copy">
          <h1 id="landing-title">Quote-to-cash <span>that shows its work.</span></h1>
          <p className="landing-lede">Every exception has a reason, every handoff has an owner, and every revision keeps its history.</p>
          <div className="landing-hero-actions">
            <a className="landing-primary-link" href="#access">Open the demo <ArrowRight data-icon="inline-end" /></a>
            <a className="landing-thread-link" href="#thread">See how it reasons</a>
          </div>
          <p className="landing-note"><span className="engine-pulse" /> Actual pricing logic · revision-level audit trail · runs offline</p>
        </div>

        <div className="decision-demo" aria-label="Interactive pricing decision demo">
          <div className="decision-demo-header">
            <div>
              <div className="decision-demo-title">Revenue operations bundle</div>
              <div className="decision-demo-meta">Q-1042 · Gold tier · 15% ceiling</div>
            </div>
            <span className={`decision-status-pill ${evaluation.requiredLevel === "NONE" ? "is-approved" : "is-manager"}`}>
              {evaluation.requiredLevel === "NONE" ? (
                <>
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>Auto-approved</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} aria-hidden="true" />
                  <span>Manager Review</span>
                </>
              )}
            </span>
          </div>

          <div className="decision-slider-row">
            <div className="decision-slider-labels">
              <label htmlFor="discount-slider">Line discount</label>
              <strong>{discount}%</strong>
            </div>
            <input
              id="discount-slider"
              className="decision-slider"
              type="range"
              min="12"
              max="18"
              step="1"
              value={discount}
              style={{ "--slider-pct": `${((discount - 12) / (18 - 12)) * 100}%` } as React.CSSProperties}
              onChange={(event) => setDiscount(Number(event.target.value))}
            />
            <div className="decision-slider-scale">
              <span>12%</span>
              <span className="ceiling-mark">15% ceiling</span>
              <span>18%</span>
            </div>
          </div>

          <p className="decision-simple-reason" aria-live="polite">
            <span className={`reason-dot ${evaluation.requiredLevel === "NONE" ? "dot-green" : "dot-amber"}`} />
            <span>{lineReason}</span>
          </p>

          <div className="decision-simple-metrics">
            <div>
              <span>Requires</span>
              <strong className={evaluation.requiredLevel === "NONE" ? "text-green" : "text-amber"}>
                {routeLabel(evaluation.requiredLevel)}
              </strong>
            </div>
            <div>
              <span>Excess</span>
              <strong className={evaluation.maxLineExcessBps > 0 ? "text-amber" : ""}>
                {evaluation.maxLineExcessBps > 0 ? `+${(evaluation.maxLineExcessBps / 100).toFixed(0)}%` : "0%"}
              </strong>
            </div>
            <div>
              <span>At risk</span>
              <strong className={evaluation.excessValuePaise > 0 ? "text-amber" : ""}>
                ₹{excessValue}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-proof" aria-label="Product thesis">
        <span>One quote</span><span>One decision thread</span><span>No hidden status changes</span>
      </section>

      <section className="landing-thread" id="thread" aria-labelledby="thread-title" data-landing-reveal>
        <div className="thread-intro"><p className="landing-kicker">The operating thread</p><h2 id="thread-title">Every handoff carries its reason forward.</h2><p>Scroll through the stages. The same thread connects commercial judgment to the cash event.</p><div className="thread-controls" role="tablist" aria-label="Decision stages">{stages.map((stage, index) => <button key={stage.label} type="button" role="tab" aria-selected={activeStage === index} className={activeStage === index ? "is-active" : ""} onClick={() => document.querySelector(`[data-landing-stage="${index}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{String(index + 1).padStart(2, "0")} {stage.label}</button>)}</div></div>
        <div className="thread-stages"><Image className="thread-art" src="/landing/decision-thread.png" alt="" width={190} height={760} loading="lazy" aria-hidden="true" />{stages.map((stage, index) => { const Icon = stage.icon; return <article key={stage.label} className="thread-stage" data-landing-stage={index} aria-labelledby={`stage-${index}`}><div className="thread-stage-marker"><Icon aria-hidden="true" /></div><div className="thread-stage-content"><span className="stage-index">0{index + 1} / 06</span><h3 id={`stage-${index}`}>{stage.label}</h3><p>{stage.reason}</p><code>{stage.code}</code></div></article>; })}</div>
      </section>

      <section className="landing-quiet-band" data-landing-reveal><p>“Why this quote was flagged” is not a tooltip. It is part of the record.</p><div className="quiet-art"><Image src="/landing/empty-state.png" alt="" width={150} height={112} loading="lazy" aria-hidden="true" /><span>Reason strings stay close to the action that produced them.</span></div></section>

      <section className="landing-roles" id="roles" aria-labelledby="roles-title" data-landing-reveal><div className="section-heading"><p className="landing-kicker">One system, five views</p><h2 id="roles-title">There is a clear view for every handoff.</h2></div><div className="roles-grid">{roles.map(([role, description], index) => <article className="role-card" key={role}><span className="role-index">0{index + 1}</span><UsersRound aria-hidden="true" /><h3>{role}</h3><p>{description}</p></article>)}</div></section>

      <section className="landing-access" id="access" aria-labelledby="access-title" data-landing-reveal><div className="section-heading"><p className="landing-kicker">Open the workspace</p><h2 id="access-title">Choose a role. Start inside the real flow.</h2><p>No signup funnel and no staged screenshots. These accounts use the application&apos;s real authentication path.</p></div><div className="demo-grid">{demoAccounts.map(([role, email, name], index) => <form action={login} className="demo-card" key={email}><input type="hidden" name="email" value={email} /><input type="hidden" name="password" value="demo1234" /><span className="demo-index">0{index + 1}</span><span className="demo-role">{role}</span><strong>{name}</strong><code>{email}</code><button type="submit">Enter workspace <ArrowRight data-icon="inline-end" /></button></form>)}</div></section>

      <footer className="landing-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <DealFlowLogo size={32} />
          <div>
            <strong>DealFlow</strong>
            <span>Quote-to-cash with an audit trail.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startCashfreeCheckout, settleCashfreeOrder } from "@/modules/billing/gateway-actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type CashfreeCheckout = (options: { paymentSessionId: string; redirectTarget?: string }) => Promise<{ error?: { message?: string }; paymentDetails?: unknown }>;

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => { checkout: CashfreeCheckout };
  }
}

function loadCashfreeSdk() {
  if (window.Cashfree) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-cashfree-sdk]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Cashfree checkout.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.dataset.cashfreeSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Cashfree checkout."));
    document.body.appendChild(script);
  });
}

export function CashfreePayButton({ invoiceCode, amountLabel }: { invoiceCode: string; amountLabel: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setError("");
    setPending(true);
    try {
      const session = await startCashfreeCheckout(invoiceCode);
      await loadCashfreeSdk();
      if (!window.Cashfree) throw new Error("Cashfree checkout did not load.");
      const cashfree = window.Cashfree({ mode: session.mode });
      const result = await cashfree.checkout({ paymentSessionId: session.paymentSessionId, redirectTarget: "_modal" });
      if (result?.error?.message) throw new Error(result.error.message);
      const settled = await settleCashfreeOrder(session.orderId);
      if (!settled.ok) throw new Error(settled.message);
      router.refresh();
      router.push(`${window.location.pathname}?notice=${encodeURIComponent(settled.duplicate ? "Payment already recorded" : "Cashfree payment recorded")}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment could not be completed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="form-stack">
      {error && <Alert variant="destructive"><AlertTitle>Payment failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <Button type="button" onClick={() => void pay()} disabled={pending}>
        {pending ? "Opening Cashfree…" : `Pay ${amountLabel} with Cashfree`}
      </Button>
      <p className="muted">Sandbox checkout. Use Cashfree test cards or UPI after the payment window opens.</p>
    </div>
  );
}

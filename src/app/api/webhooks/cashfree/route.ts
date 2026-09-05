import { NextResponse } from "next/server";
import { verifyCashfreeWebhook } from "@/lib/cashfree";
import { settleCashfreeOrder } from "@/modules/billing/gateway";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");
  if (!verifyCashfreeWebhook(raw, signature, timestamp)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }
  let orderId = "";
  try {
    const payload = JSON.parse(raw) as { data?: { order?: { order_id?: string }; order_id?: string } };
    orderId = payload.data?.order?.order_id ?? payload.data?.order_id ?? "";
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  if (!orderId) return NextResponse.json({ ok: true, ignored: true });
  await settleCashfreeOrder(orderId);
  return NextResponse.json({ ok: true });
}

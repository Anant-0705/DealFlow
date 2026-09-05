"use server";

import { getSession } from "@/lib/auth";
import {
  cashfreeGatewayStatus as gatewayStatus,
  settleCashfreeOrderForActor as settleOrderForActor,
  startCashfreeCheckout as startCheckout,
} from "./gateway";

export async function cashfreeGatewayStatus() {
  return gatewayStatus();
}

export async function startCashfreeCheckout(invoiceCode: string) {
  const session = await getSession();
  if (!session) throw new Error("Sign in to pay this invoice.");
  return startCheckout(invoiceCode, session);
}

export async function settleCashfreeOrder(orderId: string) {
  const session = await getSession();
  if (!session) throw new Error("Sign in to confirm this payment.");
  return settleOrderForActor(orderId, session);
}

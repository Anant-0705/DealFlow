import type { EvaluationPolicy } from "@/modules/pricing/types";

export type RouteSignals = {
  maxLineExcessBps: number;
  blendedExcessBps: number;
  excessValuePaise: number;
};

export function routeRevision(signals: RouteSignals, policy: EvaluationPolicy) {
  if (signals.maxLineExcessBps <= 0) return "NONE" as const;
  if (
    signals.maxLineExcessBps >= policy.financeLineExcessBps ||
    signals.blendedExcessBps >= policy.financeBlendedExcessBps ||
    signals.excessValuePaise >= policy.financeExcessValuePaise
  ) return "FINANCE" as const;
  return "MANAGER" as const;
}

export type ProrationInput = {
  unitAmountPaise: number;
  qtyDelta: number;
  effectiveDate: Date | string;
  periodStart: Date | string;
  periodEnd: Date | string;
  prorateChanges: boolean;
};

export type ProrationResult = {
  amountPaise: number;
  daysRemaining: number;
  daysInPeriod: number;
  reason: string;
};

const DAY_MS = 86_400_000;

function dateOnly(value: Date | string) {
  if (typeof value === "string") {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  }
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function label(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(dateOnly(value)));
}

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
}

function roundHalfAwayFromZero(value: number) {
  return Math.sign(value) * Math.floor(Math.abs(value) + 0.5);
}

export function prorate(input: ProrationInput): ProrationResult {
  const start = dateOnly(input.periodStart);
  const end = dateOnly(input.periodEnd);
  const effective = Math.max(start, Math.min(end, dateOnly(input.effectiveDate)));
  const daysInPeriod = Math.floor((end - start) / DAY_MS) + 1;
  const daysRemaining = Math.floor((end - effective) / DAY_MS) + 1;
  if (!input.prorateChanges) {
    const next = new Date(end + DAY_MS);
    return {
      amountPaise: 0,
      daysRemaining,
      daysInPeriod,
      reason: `Plan does not prorate; new quantity applies from ${label(next)}.`,
    };
  }
  const amountPaise = roundHalfAwayFromZero(input.unitAmountPaise * input.qtyDelta * daysRemaining / daysInPeriod);
  const sign = input.qtyDelta < 0 ? "−" : "";
  const reason = `${sign}${Math.abs(input.qtyDelta)} seat${Math.abs(input.qtyDelta) === 1 ? "" : "s"} × ${money(input.unitAmountPaise)} × ${daysRemaining} remaining days ÷ ${daysInPeriod} days = ${money(amountPaise)}${amountPaise < 0 ? " → credit" : ""}`;
  return { amountPaise, daysRemaining, daysInPeriod, reason };
}

export function calendarPeriod(date: Date | string, interval: "MONTHLY" | "QUARTERLY" | "YEARLY") {
  const source = new Date(dateOnly(date));
  const months = interval === "MONTHLY" ? 1 : interval === "QUARTERLY" ? 3 : 12;
  const periodStart = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 0));
  const nextBillingAt = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  return { periodStart, periodEnd, nextBillingAt, months };
}

export function subscriptionPeriod(startsAt: Date | string, effectiveAt: Date | string, interval: "MONTHLY" | "QUARTERLY" | "YEARLY") {
  const start = new Date(dateOnly(startsAt));
  const effective = new Date(dateOnly(effectiveAt));
  const months = interval === "MONTHLY" ? 1 : interval === "QUARTERLY" ? 3 : 12;
  const startIndex = start.getUTCFullYear() * 12 + start.getUTCMonth();
  const effectiveIndex = effective.getUTCFullYear() * 12 + effective.getUTCMonth();
  const block = Math.max(0, Math.floor((effectiveIndex - startIndex) / months));
  const periodStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + block * months, 1));
  const periodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + months, 0));
  const nextBillingAt = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + months, 1));
  return { periodStart, periodEnd, nextBillingAt, months };
}

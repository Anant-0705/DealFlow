import { calendarPeriod } from "./prorate";
import { taxOnNet } from "./invoice-balance";

export type ScheduleSubscription = {
  nextBillingAt: Date;
  unitPricePaise: number;
  qty: number;
  plan: { interval: "MONTHLY" | "QUARTERLY" | "YEARLY" };
};

export type ScheduleRow = {
  periodStart: Date;
  periodEnd: Date;
  amountPaise: number;
  taxPaise?: number;
  status?: "SCHEDULED" | "INVOICED" | "SKIPPED";
};

export function periodCharge(qty: number, unitPricePaise: number, taxBps: number) {
  const amountPaise = qty * unitPricePaise;
  const taxPaise = taxOnNet(amountPaise, taxBps);
  return { amountPaise, taxPaise, totalPaise: amountPaise + taxPaise };
}

export function projectUpcomingPeriods(
  subscription: ScheduleSubscription,
  taxBps: number,
  count = 3,
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let cursor = subscription.nextBillingAt;
  for (let index = 0; index < count; index++) {
    const period = calendarPeriod(cursor, subscription.plan.interval);
    const charge = periodCharge(subscription.qty, subscription.unitPricePaise, taxBps);
    rows.push({
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      amountPaise: charge.totalPaise,
      taxPaise: charge.taxPaise,
      status: "SCHEDULED",
    });
    cursor = period.nextBillingAt;
  }
  return rows;
}

export function upcomingSchedule(subscription: ScheduleSubscription, count = 3): ScheduleRow[] {
  return projectUpcomingPeriods(subscription, 0, count).map((row) => ({ ...row, amountPaise: subscription.unitPricePaise * subscription.qty, taxPaise: 0 }));
}

export function upcomingScheduleFromPeriods(
  periods: Array<{ periodStart: Date; periodEnd: Date; amountPaise: number; taxPaise: number; status: "SCHEDULED" | "INVOICED" | "SKIPPED" }>,
  count = 3,
): ScheduleRow[] {
  return periods
    .filter((period) => period.status !== "INVOICED")
    .slice(0, count)
    .map((period) => ({
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      amountPaise: period.amountPaise + period.taxPaise,
      taxPaise: period.taxPaise,
      status: period.status,
    }));
}

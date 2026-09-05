import { calendarPeriod } from "./prorate";

export type ScheduleSubscription = {
  nextBillingAt: Date;
  unitPricePaise: number;
  qty: number;
  plan: { interval: "MONTHLY" | "QUARTERLY" | "YEARLY" };
};

export function upcomingSchedule(subscription: ScheduleSubscription, count = 3) {
  const rows: Array<{ periodStart: Date; periodEnd: Date; amountPaise: number }> = [];
  let cursor = subscription.nextBillingAt;
  for (let index = 0; index < count; index++) {
    const period = calendarPeriod(cursor, subscription.plan.interval);
    rows.push({ periodStart: period.periodStart, periodEnd: period.periodEnd, amountPaise: subscription.unitPricePaise * subscription.qty });
    cursor = period.nextBillingAt;
  }
  return rows;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(paise: number) {
  const hasFraction = Math.abs(paise % 100) > 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatPercent(bps: number, digits = 0) {
  return `${(bps / 100).toFixed(digits)}%`;
}

export function parseRupees(value: FormDataEntryValue | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function parsePercent(value: FormDataEntryValue | null) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return 0;
  return Math.round(percent * 100);
}

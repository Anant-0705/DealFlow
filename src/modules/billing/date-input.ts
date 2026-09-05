const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateInput(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  const match = DATE_PATTERN.exec(text);
  if (!match) throw new Error("Choose a valid date.");

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("Choose a valid date.");
  }
  return date;
}

export function utcDateKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

export function utcTodayKey() {
  return utcDateKey(new Date());
}

export function assertEffectiveToday(effectiveAt: Date) {
  if (utcDateKey(effectiveAt) !== utcTodayKey()) {
    throw new Error("Changes take effect today. Choose today's date.");
  }
}

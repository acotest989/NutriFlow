// Local-timezone calendar-date helpers.
//
// IMPORTANT: never derive a YYYY-MM-DD calendar date via `toISOString()`. That
// converts to UTC and shifts the day for anyone not on UTC (e.g. a user at UTC+2
// stepping to "yesterday" would store a date one day off). When that happens the
// logged entry no longer lines up with the day the charts bucket it under. All
// date strings in the app must be produced from LOCAL parts via these helpers.

// Format a Date as YYYY-MM-DD using its LOCAL year/month/day.
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Today's local calendar date as YYYY-MM-DD.
export function todayStr(): string {
  return toDateStr(new Date());
}

// Shift a YYYY-MM-DD string by `days`, staying in local time (no UTC drift).
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00"); // parsed as LOCAL midnight
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/**
 * Calendar days in the goalie's own time zone.
 *
 * `toISOString()` always reports UTC, so on an evening in North America it
 * names tomorrow, and a game played on Oct 4 was filed under Oct 5 (and a
 * Knowledge Check taken Oct 27 under Oct 26 from the other side of the
 * boundary). Anything that groups, labels or defaults a date should use these
 * so every screen lands on the same day.
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** `YYYY-MM-DD` for the local calendar day of `date`. */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DDTHH:mm`, the value format of an `<input type="datetime-local">`, in local time. */
export function toLocalDateTimeInputValue(date: Date = new Date()): string {
  return `${toLocalDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses a `YYYY-MM-DD` key back to local midnight (not UTC midnight, which is the previous evening in the Americas). */
export function fromLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Whole calendar days between `date` and `now`: 0 for anything earlier today, 1 for anything
 * yesterday. Counting 24-hour blocks instead said "Today" for last night's activity.
 */
export function calendarDaysAgo(date: Date, now: Date = new Date()): number {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  // Rounded, not floored: a day with a clock change is 23 or 25 hours long.
  return Math.round((startOf(now) - startOf(date)) / 86400000);
}

/**
 * How a goal's deadline reads on its card.
 *
 * A deadline is stored as the end of the day the goalie picked (23:59:59 their time), so
 * counting 24-hour blocks from "now" is wrong all day long: at lunchtime on the due day it
 * says "Due tomorrow", the day before it says "Due in 2 day(s)", and the morning after it
 * says "Due today" on a card that is already red. Count calendar days instead.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole calendar days from today to the deadline's day. Negative once that day has passed. */
export function daysUntilDeadline(deadline: Date, now: Date = new Date()): number {
  // Rounded, not floored: a day with a clock change is 23 or 25 hours long.
  return Math.round((startOfLocalDay(deadline) - startOfLocalDay(now)) / DAY_MS);
}

export function formatDeadline(deadline: Date, now: Date = new Date()): string {
  const days = daysUntilDeadline(deadline, now);
  if (days < 0) return `Overdue by ${Math.abs(days)} day(s)`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 7) return `Due in ${days} day(s)`;
  return `Due ${deadline.toLocaleDateString()}`;
}

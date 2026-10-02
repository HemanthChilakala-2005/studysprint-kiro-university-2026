// src/scheduler/dateUtils.ts
// Local-calendar date helpers. No UTC conversion anywhere.
// Req 5

import type { DateString } from "../types";

/**
 * Format a Date as YYYY-MM-DD using LOCAL calendar components.
 * Never uses toISOString() (which returns UTC). [Req 5.2]
 */
export function formatLocalDate(d: Date): DateString {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Derive today's local date as YYYY-MM-DD.
 * For UI use ONLY — the scheduler never calls this. [Req 5.1]
 */
export function getTodayLocal(): DateString {
  return formatLocalDate(new Date());
}

/**
 * Validate that a string is a real calendar date.
 * Rejects overflows such as 2024-02-30 by checking round-trip. [Req 1.15]
 */
export function isValidCalendarDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // Local constructor — intentional: we want local calendar semantics
  const dt = new Date(y, mo - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === mo - 1 &&
    dt.getDate() === d
  );
}

/**
 * Add n calendar days to a YYYY-MM-DD date using local arithmetic.
 * Internal helper used only by enumerateDays.
 */
function addDays(date: DateString, n: number): DateString {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  return formatLocalDate(new Date(y, mo - 1, d + n));
}

/**
 * Produce an ordered array of YYYY-MM-DD strings from `from` through `to` inclusive.
 * Comparison is lexicographic (valid because dates are zero-padded). [Req 3.1, 5]
 */
export function enumerateDays(from: DateString, to: DateString): DateString[] {
  const days: DateString[] = [];
  let cur = from;
  while (cur <= to) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

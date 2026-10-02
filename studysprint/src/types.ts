// src/types.ts
// Central TypeScript types for StudySprint.
// Req 1, Req 3

/** YYYY-MM-DD string derived from local calendar components. Never a UTC timestamp. */
export type DateString = string;

export type Priority = "High" | "Medium" | "Low";

/** Numeric weight used for sort tie-breaking. Lower = scheduled first. */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  High: 1,
  Medium: 2,
  Low: 3,
};

/** A unit of study work. id is stable, auto-incrementing, never reused. [Req 1.1] */
export interface Task {
  id: number;
  title: string;            // 1–200 chars (trimmed)
  subject: string;          // 1–100 chars (trimmed)
  deadline: DateString;     // YYYY-MM-DD local
  estimatedMinutes: number; // 1–1440 positive integer
  priority: Priority;
  completed: boolean;
}

/** Map from YYYY-MM-DD to available study minutes (0–1440). */
export type Availability = Record<DateString, number>;

/** One block of scheduled work for a task on a day. */
export interface ScheduleEntry {
  taskId: number;
  taskTitle: string;
  subject: string;
  date: DateString;
  allocatedMinutes: number; // positive integer, 1–1440
}

/**
 * Output of the pure scheduler function.
 * Invariant: for every incomplete Task with estimatedMinutes > 0,
 *   sum(entries where taskId) + (unschedulable[taskId] ?? 0) === estimatedMinutes
 * [Req 9.3]
 */
export interface ScheduleResult {
  entries: ScheduleEntry[];
  /** taskId → minutes that could not be placed before the deadline */
  unschedulable: Record<number, number>;
}

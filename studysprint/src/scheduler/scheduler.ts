// src/scheduler/scheduler.ts
// Pure deterministic scheduling engine.
//
// Design note (per user request): instead of enumerating every calendar day
// from today through the latest deadline, we build a sorted list of only the
// availability dates that fall in the relevant window and have positive
// capacity. This avoids touching thousands of empty days when a deadline is
// far away while preserving all ordering, deadline, and conservation
// invariants. [Req 3, 4, 9]
//
// The scheduler NEVER calls new Date(), Date.now(), or any global.
// today is derived by the UI and passed explicitly. [Req 5.1]

import type { Availability, DateString, ScheduleEntry, ScheduleResult, Task } from "../types";
import { PRIORITY_WEIGHT } from "../types";

/**
 * Generate a deterministic study schedule.
 *
 * @param tasks      - Full task list (completed tasks are ignored).
 * @param availability - Map of YYYY-MM-DD → available minutes.
 * @param today      - Today's local date (YYYY-MM-DD), supplied by the UI.
 * @returns ScheduleResult with entries and per-task unschedulable minutes.
 *
 * Conservation invariant (Req 9.3):
 *   For every eligible task t:
 *     sum(entries where taskId === t.id, e => e.allocatedMinutes)
 *     + (unschedulable[t.id] ?? 0)
 *     === t.estimatedMinutes
 */
export function schedule(
  tasks: Task[],
  availability: Availability,
  today: DateString
): ScheduleResult {
  // --- 1. Filter eligible tasks ---
  // Exclude completed tasks and tasks with non-positive estimatedMinutes. [Req 3.2, 3.12]
  const eligible = tasks.filter(
    (t) => !t.completed && t.estimatedMinutes > 0
  );

  if (eligible.length === 0) {
    return { entries: [], unschedulable: {} }; // [Req 3.10, 9.8]
  }

  // --- 2. Sort tasks ---
  // Primary: deadline ASC (lexicographic), Secondary: priority weight ASC, Tertiary: id ASC
  // [Req 3.3]
  const sorted = [...eligible].sort((a, b) => {
    if (a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
    const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (pw !== 0) return pw;
    return a.id - b.id;
  });

  const latestDeadline = sorted[sorted.length - 1]!.deadline; // safe: sorted is non-empty

  // --- 3. Build a sorted list of candidate days ---
  // Only include days that are:
  //   (a) on or after today [Req 3.1]
  //   (b) on or before the latest deadline
  //   (c) present in the availability map with positive capacity
  // Sorted ascending (lexicographic = chronological for YYYY-MM-DD). [Req 3.4, 3.5]
  const candidateDays: DateString[] = Object.keys(availability)
    .filter((d) => d >= today && d <= latestDeadline && availability[d]! > 0)
    .sort(); // lexicographic sort is chronological for YYYY-MM-DD

  if (candidateDays.length === 0) {
    // No usable days at all — everything is unschedulable. [Req 4.2]
    const unschedulable: Record<number, number> = {};
    for (const t of sorted) {
      unschedulable[t.id] = t.estimatedMinutes;
    }
    return { entries: [], unschedulable };
  }

  // --- 4. Mutable remaining capacity per candidate day ---
  const remaining: Record<DateString, number> = {};
  for (const d of candidateDays) {
    remaining[d] = availability[d]!;
  }

  // --- 5. Allocate ---
  const entries: ScheduleEntry[] = [];
  const unschedulable: Record<number, number> = {};

  for (const task of sorted) {
    let taskRemaining = task.estimatedMinutes;

    // Overdue: deadline strictly before today — all minutes unschedulable. [Req 4.1, 9.7]
    if (task.deadline < today) {
      unschedulable[task.id] = taskRemaining;
      continue;
    }

    // Walk candidate days in chronological order, allocating only on days
    // that are on or before this task's deadline. [Req 3.6]
    for (const day of candidateDays) {
      if (taskRemaining === 0) break;
      if (day > task.deadline) break; // past deadline — stop for this task [Req 3.6]
      const cap = remaining[day]!;
      if (cap <= 0) continue; // already exhausted (shouldn't occur: candidateDays filtered, but defensive)

      const alloc = Math.min(taskRemaining, cap);
      entries.push({
        taskId: task.id,
        taskTitle: task.title,
        subject: task.subject,
        date: day,
        allocatedMinutes: alloc, // always > 0 [Req 9.6]
      });
      remaining[day] = cap - alloc;
      taskRemaining -= alloc;
    }

    // Conservation: record whatever could not be placed. [Req 3.8, 9.3]
    if (taskRemaining > 0) {
      unschedulable[task.id] = taskRemaining;
    }
  }

  return { entries, unschedulable };
}

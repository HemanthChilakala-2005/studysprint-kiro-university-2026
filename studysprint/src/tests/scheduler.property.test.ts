// src/tests/scheduler.property.test.ts
// All 8 property-based tests for the pure scheduler.
// Uses fc.uniqueArray with selector: t => t.id to guarantee unique task IDs
// (learned from Context7 fast-check docs). [Req 9]
//
// Each test uses fc.assert with { numRuns: 100 } as the required minimum.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { schedule } from "../scheduler/scheduler";
import type { Task, Availability, DateString } from "../types";
import { PRIORITY_WEIGHT } from "../types";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const PRIORITIES = Object.keys(PRIORITY_WEIGHT) as Array<keyof typeof PRIORITY_WEIGHT>;

/** Valid YYYY-MM-DD date in a safe window around a fixed reference year. */
const arbDateString: fc.Arbitrary<DateString> = fc
  .integer({ min: 0, max: 364 * 4 }) // up to ~4 years of offsets
  .map((offset) => {
    const base = new Date(2028, 0, 1); // 2028-01-01 local
    const d = new Date(2028, 0, 1 + offset);
    void base; // used for type narrowing only
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}` as DateString;
  });

/** Single task arbitrary. ID is supplied externally by uniqueArray. */
const arbTaskBase = (id: number): fc.Arbitrary<Task> =>
  fc.record({
    id: fc.constant(id),
    title: fc.string({ minLength: 1, maxLength: 20 }),
    subject: fc.string({ minLength: 1, maxLength: 20 }),
    deadline: arbDateString,
    estimatedMinutes: fc.integer({ min: 1, max: 1440 }),
    priority: fc.constantFrom(...PRIORITIES),
    completed: fc.boolean(),
  });

/**
 * Generates an array of tasks with guaranteed unique IDs.
 * Uses fc.uniqueArray with selector on a pool of ID'd arbitraries.
 * (Context7 fast-check lookup: fc.uniqueArray with selector for unique IDs)
 */
const arbTaskList: fc.Arbitrary<Task[]> = fc
  .array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 20 })
  .chain((ids) => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return fc.constant([]);
    return fc.tuple(...uniqueIds.map(arbTaskBase));
  });

/** Availability map: YYYY-MM-DD keys, 0–1440 minutes values. */
const arbAvailability: fc.Arbitrary<Availability> = fc
  .array(fc.tuple(arbDateString, fc.integer({ min: 0, max: 1440 })), {
    minLength: 0,
    maxLength: 30,
  })
  .map((pairs) => Object.fromEntries(pairs));

// ---------------------------------------------------------------------------
// Feature: studysprint, Property 1: Daily Capacity
// ---------------------------------------------------------------------------
describe("Property 1: Daily Capacity [Req 9.1]", () => {
  it("sum of allocatedMinutes per date never exceeds available minutes", () => {
    fc.assert(
      fc.property(arbTaskList, arbAvailability, arbDateString, (tasks, availability, today) => {
        const result = schedule(tasks, availability, today);
        const byDate = new Map<string, number>();
        for (const e of result.entries) {
          byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.allocatedMinutes);
        }
        for (const [date, total] of byDate) {
          const cap = availability[date] ?? 0;
          expect(total).toBeLessThanOrEqual(cap);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: studysprint, Property 2: Deadline Compliance
// ---------------------------------------------------------------------------
describe("Property 2: Deadline Compliance [Req 9.2]", () => {
  it("no entry date is later than its task deadline", () => {
    fc.assert(
      fc.property(arbTaskList, arbAvailability, arbDateString, (tasks, availability, today) => {
        const result = schedule(tasks, availability, today);
        const deadlineMap = new Map(tasks.map((t) => [t.id, t.deadline]));
        for (const e of result.entries) {
          const deadline = deadlineMap.get(e.taskId)!;
          expect(e.date <= deadline).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: studysprint, Property 3: Conservation of Minutes
// ---------------------------------------------------------------------------
describe("Property 3: Conservation of Minutes [Req 9.3]", () => {
  it("allocated + unschedulable === estimatedMinutes for every eligible task", () => {
    fc.assert(
      fc.property(arbTaskList, arbAvailability, arbDateString, (tasks, availability, today) => {
        const result = schedule(tasks, availability, today);
        const eligible = tasks.filter((t) => !t.completed && t.estimatedMinutes > 0);
        for (const task of eligible) {
          const allocated = result.entries
            .filter((e) => e.taskId === task.id)
            .reduce((s, e) => s + e.allocatedMinutes, 0);
          const unsch = result.unschedulable[task.id] ?? 0;
          expect(allocated + unsch).toBe(task.estimatedMinutes);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: studysprint, Property 4: Determinism
// ---------------------------------------------------------------------------
describe("Property 4: Determinism [Req 9.4]", () => {
  it("two calls with identical inputs return deeply equal ScheduleResult", () => {
    fc.assert(
      fc.property(arbTaskList, arbAvailability, arbDateString, (tasks, availability, today) => {
        const r1 = schedule(tasks, availability, today);
        const r2 = schedule(tasks, availability, today);
        expect(r1.entries).toEqual(r2.entries);
        expect(r1.unschedulable).toEqual(r2.unschedulable);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: studysprint, Property 5: Exclusion of Completed Tasks
// ---------------------------------------------------------------------------
describe("Property 5: Exclusion of Completed Tasks [Req 9.5]", () => {
  it("no entry or unschedulable entry for completed tasks", () => {
    fc.assert(
      fc.property(arbTaskList, arbAvailability, arbDateString, (tasks, availability, today) => {
        const result = schedule(tasks, availability, today);
        const completedIds = new Set(tasks.filter((t) => t.completed).map((t) => t.id));
        for (const e of result.entries) {
          expect(completedIds.has(e.taskId)).toBe(false);
        }
        for (const idStr of Object.keys(result.unschedulable)) {
          expect(completedIds.has(Number(idStr))).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: studysprint, Property 6: Non-negativity
// ---------------------------------------------------------------------------
describe("Property 6: Non-negativity [Req 9.6]", () => {
  it("every allocatedMinutes value is a positive integer > 0", () => {
    fc.assert(
      fc.property(arbTaskList, arbAvailability, arbDateString, (tasks, availability, today) => {
        const result = schedule(tasks, availability, today);
        for (const e of result.entries) {
          expect(e.allocatedMinutes).toBeGreaterThan(0);
          expect(Number.isInteger(e.allocatedMinutes)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: studysprint, Property 7: Overdue Tasks Have Zero Entries
// ---------------------------------------------------------------------------
describe("Property 7: Overdue Tasks Have Zero Entries [Req 9.7]", () => {
  it("tasks with deadline < today have no entries; their minutes are all unschedulable", () => {
    fc.assert(
      fc.property(arbTaskList, arbAvailability, arbDateString, (tasks, availability, today) => {
        const result = schedule(tasks, availability, today);
        const overdue = tasks.filter(
          (t) => !t.completed && t.estimatedMinutes > 0 && t.deadline < today
        );
        const overdueIds = new Set(overdue.map((t) => t.id));
        for (const e of result.entries) {
          expect(overdueIds.has(e.taskId)).toBe(false);
        }
        for (const task of overdue) {
          expect(result.unschedulable[task.id]).toBe(task.estimatedMinutes);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: studysprint, Property 8: Empty Input
// ---------------------------------------------------------------------------
describe("Property 8: Empty Input [Req 9.8]", () => {
  it("empty or all-completed task list returns empty entries and empty unschedulable", () => {
    fc.assert(
      fc.property(arbAvailability, arbDateString, (availability, today) => {
        // Case A: empty list
        const r1 = schedule([], availability, today);
        expect(r1.entries).toHaveLength(0);
        expect(Object.keys(r1.unschedulable)).toHaveLength(0);

        // Case B: all completed
        const allCompleted: Task[] = [
          { id: 1, title: "T", subject: "S", deadline: "2030-01-01", estimatedMinutes: 60, priority: "High", completed: true },
          { id: 2, title: "T", subject: "S", deadline: "2030-01-02", estimatedMinutes: 30, priority: "Low",  completed: true },
        ];
        const r2 = schedule(allCompleted, availability, today);
        expect(r2.entries).toHaveLength(0);
        expect(Object.keys(r2.unschedulable)).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });
});

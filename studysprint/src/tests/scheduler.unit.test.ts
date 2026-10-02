// src/tests/scheduler.unit.test.ts
// Unit tests for the pure scheduler: edge cases and boundary conditions.
// Req 3, 4

import { describe, it, expect, beforeEach } from "vitest";
import { schedule } from "../scheduler/scheduler";
import type { Task, Availability } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 1;
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: nextId++,
    title: "Test Task",
    subject: "Math",
    deadline: "2030-12-31",
    estimatedMinutes: 60,
    priority: "Medium",
    completed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("scheduler – unit tests", () => {
  beforeEach(() => { nextId = 1; });

  it("returns empty schedule when task list is empty [Req 3.10]", () => {
    const result = schedule([], {}, "2030-01-01");
    expect(result.entries).toHaveLength(0);
    expect(result.unschedulable).toEqual({});
  });

  it("returns empty schedule when all tasks are completed [Req 3.2, 9.8]", () => {
    const task = makeTask({ completed: true });
    const avail: Availability = { "2030-12-30": 60 };
    const result = schedule([task], avail, "2030-12-29");
    expect(result.entries).toHaveLength(0);
    expect(result.unschedulable).toEqual({});
  });

  it("skips task with estimatedMinutes <= 0 [Req 3.12]", () => {
    const task = makeTask({ estimatedMinutes: 0 });
    const avail: Availability = { "2030-12-30": 120 };
    const result = schedule([task], avail, "2030-12-29");
    expect(result.entries).toHaveLength(0);
    expect(result.unschedulable).toEqual({});
  });

  it("marks overdue task entirely unschedulable, conservation holds [Req 4.1, 9.3, 9.7]", () => {
    const task = makeTask({ deadline: "2020-01-01", estimatedMinutes: 90 });
    const avail: Availability = { "2030-01-02": 120 };
    const result = schedule([task], avail, "2030-01-02");
    expect(result.entries).toHaveLength(0);
    expect(result.unschedulable[task.id]).toBe(90);
  });

  it("allocates exactly the right minutes on one day [Req 3.4]", () => {
    const task = makeTask({ deadline: "2030-06-02", estimatedMinutes: 45 });
    const avail: Availability = { "2030-06-01": 120 };
    const result = schedule([task], avail, "2030-06-01");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.allocatedMinutes).toBe(45);
    expect(result.unschedulable[task.id] ?? 0).toBe(0);
  });

  it("splits task across multiple days [Req 3.4, 3.7, 3.8]", () => {
    const task = makeTask({ deadline: "2030-06-03", estimatedMinutes: 90 });
    const avail: Availability = { "2030-06-01": 60, "2030-06-02": 60 };
    const result = schedule([task], avail, "2030-06-01");
    const total = result.entries
      .filter((e) => e.taskId === task.id)
      .reduce((s, e) => s + e.allocatedMinutes, 0);
    expect(total).toBe(90);
    expect(result.unschedulable[task.id] ?? 0).toBe(0);
    expect(result.entries.length).toBeGreaterThan(1);
  });

  it("does not allocate past task deadline [Req 3.6]", () => {
    const task = makeTask({ deadline: "2030-06-01", estimatedMinutes: 60 });
    // Only day available is AFTER the deadline
    const avail: Availability = { "2030-06-02": 120 };
    const result = schedule([task], avail, "2030-06-01");
    expect(result.entries).toHaveLength(0);
    expect(result.unschedulable[task.id]).toBe(60);
  });

  it("records unschedulable minutes when capacity is insufficient [Req 3.8, 9.3]", () => {
    const task = makeTask({ deadline: "2030-06-02", estimatedMinutes: 90 });
    const avail: Availability = { "2030-06-01": 30 }; // only 30 of 90 fit
    const result = schedule([task], avail, "2030-06-01");
    const allocated = result.entries.reduce((s, e) => s + e.allocatedMinutes, 0);
    expect(allocated).toBe(30);
    expect(result.unschedulable[task.id]).toBe(60);
    expect(allocated + (result.unschedulable[task.id] ?? 0)).toBe(90); // conservation
  });

  it("returns empty schedule when availability is empty [Req 4.2]", () => {
    const task = makeTask({ estimatedMinutes: 60 });
    const result = schedule([task], {}, "2030-01-01");
    expect(result.entries).toHaveLength(0);
    expect(result.unschedulable[task.id]).toBe(60);
  });

  it("exactly fills a day with no leftover capacity [Req 3.5, 9.6]", () => {
    const task = makeTask({ deadline: "2030-06-02", estimatedMinutes: 60 });
    const avail: Availability = { "2030-06-01": 60 };
    const result = schedule([task], avail, "2030-06-01");
    expect(result.entries[0]!.allocatedMinutes).toBe(60);
    // No second task in test — but verify capacity is now exhausted
    const secondTask = { ...makeTask(), deadline: "2030-06-02", estimatedMinutes: 1 };
    const result2 = schedule([task, secondTask], avail, "2030-06-01");
    const day1Alloc = result2.entries
      .filter((e) => e.date === "2030-06-01")
      .reduce((s, e) => s + e.allocatedMinutes, 0);
    expect(day1Alloc).toBeLessThanOrEqual(60);
  });

  it("respects sort order: earlier deadline before later [Req 3.3]", () => {
    const taskA = makeTask({ deadline: "2030-06-03", estimatedMinutes: 60 });
    const taskB = makeTask({ deadline: "2030-06-01", estimatedMinutes: 60 });
    const avail: Availability = { "2030-05-31": 60 }; // only one slot
    const result = schedule([taskA, taskB], avail, "2030-05-31");
    // taskB has the earlier deadline — it should get the only slot
    const allocatedB = result.entries
      .filter((e) => e.taskId === taskB.id)
      .reduce((s, e) => s + e.allocatedMinutes, 0);
    expect(allocatedB).toBe(60);
    expect(result.unschedulable[taskA.id]).toBe(60);
  });

  it("breaks deadline ties by priority weight, then id [Req 3.3]", () => {
    const taskLow  = makeTask({ deadline: "2030-06-02", priority: "Low",  estimatedMinutes: 60 });
    const taskHigh = makeTask({ deadline: "2030-06-02", priority: "High", estimatedMinutes: 60 });
    const avail: Availability = { "2030-06-01": 60 };
    const result = schedule([taskLow, taskHigh], avail, "2030-06-01");
    // High priority wins the slot
    const allocatedHigh = result.entries
      .filter((e) => e.taskId === taskHigh.id)
      .reduce((s, e) => s + e.allocatedMinutes, 0);
    expect(allocatedHigh).toBe(60);
    expect(result.unschedulable[taskLow.id]).toBe(60);
  });

  it("all allocatedMinutes values are positive integers [Req 9.6]", () => {
    const tasks = [
      makeTask({ deadline: "2030-06-03", estimatedMinutes: 90 }),
      makeTask({ deadline: "2030-06-03", estimatedMinutes: 30 }),
    ];
    const avail: Availability = { "2030-06-01": 60, "2030-06-02": 60 };
    const result = schedule(tasks, avail, "2030-06-01");
    for (const e of result.entries) {
      expect(e.allocatedMinutes).toBeGreaterThan(0);
      expect(Number.isInteger(e.allocatedMinutes)).toBe(true);
    }
  });
});


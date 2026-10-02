// src/tests/storage.unit.test.ts
// Focused tests for StorageManager: recovery and task-ID persistence.
// Req 6.4, 6.5, 6.6, 6.7

import { describe, it, expect } from "vitest";
import { StorageManager } from "../storage/storageManager";
import type { Task } from "../types";

// ---------------------------------------------------------------------------
// localStorage mock helpers
// ---------------------------------------------------------------------------

function makeMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    _store: store,
  };
}

function withMockStorage<T>(
  setup: (s: ReturnType<typeof makeMockStorage>) => void,
  fn: () => T,
): T {
  const mock = makeMockStorage();
  setup(mock);
  const orig = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", { value: mock, configurable: true, writable: true });
  try { return fn(); }
  finally {
    Object.defineProperty(globalThis, "localStorage", { value: orig, configurable: true, writable: true });
  }
}

function withThrowingStorage<T>(fn: () => T): T {
  const throwing = {
    getItem: () => { throw new DOMException("SecurityError"); },
    setItem: () => { throw new DOMException("SecurityError"); },
    removeItem: () => { throw new DOMException("SecurityError"); },
    clear: () => { throw new DOMException("SecurityError"); },
  };
  const orig = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", { value: throwing, configurable: true, writable: true });
  try { return fn(); }
  finally {
    Object.defineProperty(globalThis, "localStorage", { value: orig, configurable: true, writable: true });
  }
}

function makeTask(id: number): Task {
  return { id, title: "T", subject: "S", deadline: "2030-01-01", estimatedMinutes: 60, priority: "High", completed: false };
}

// ---------------------------------------------------------------------------
// Task-ID persistence [Req 6.7, 1.1]
// ---------------------------------------------------------------------------

describe("StorageManager – task-ID persistence", () => {
  it("nextId after restore is always > max existing task id", () => {
    withMockStorage(() => {}, () => {
      const sm = new StorageManager();
      sm.saveTasks([makeTask(1), makeTask(5)], 6);
      const { nextId } = sm.loadTasks();
      expect(nextId).toBeGreaterThan(5);
    });
  });

  it("deleting tasks does not lower the nextId counter", () => {
    withMockStorage(() => {}, () => {
      const sm = new StorageManager();
      sm.saveTasks([makeTask(3)], 4);
      sm.saveTasks([], 4); // simulate deletion, keep counter
      const { tasks, nextId } = sm.loadTasks();
      expect(tasks).toHaveLength(0);
      expect(nextId).toBeGreaterThanOrEqual(4);
    });
  });

  it("nextId counter is never reset to a lower value even with empty task list", () => {
    withMockStorage(() => {}, () => {
      const sm = new StorageManager();
      sm.saveTasks([], 42);
      const { nextId } = sm.loadTasks();
      expect(nextId).toBeGreaterThanOrEqual(42);
    });
  });

  it("restores nextId from dedicated key when tasks key is absent", () => {
    withMockStorage((s) => {
      s.setItem("studysprint_next_id", JSON.stringify(10));
    }, () => {
      const sm = new StorageManager();
      const { nextId } = sm.loadTasks();
      expect(nextId).toBeGreaterThanOrEqual(10);
    });
  });

  it("IDs in fresh session never collide with IDs from previous session", () => {
    withMockStorage(() => {}, () => {
      const sm1 = new StorageManager();
      sm1.saveTasks([makeTask(1), makeTask(2)], 3);

      // Simulate refresh — new StorageManager instance reads from same mock storage
      const sm2 = new StorageManager();
      const { nextId } = sm2.loadTasks();
      expect(nextId).toBeGreaterThan(2);
    });
  });
});

// ---------------------------------------------------------------------------
// Storage recovery [Req 6.4, 6.6]
// ---------------------------------------------------------------------------

describe("StorageManager – corrupt key recovery", () => {
  it("corrupt tasks JSON: discards tasks, warning names the key, other state unaffected", () => {
    withMockStorage((s) => {
      s.setItem("studysprint_tasks", "{invalid json");
      s.setItem("studysprint_availability", JSON.stringify({ "2030-01-01": 60 }));
    }, () => {
      const sm = new StorageManager();
      const { tasks, warning } = sm.loadTasks();
      const { data: avail } = sm.loadAvailability();
      expect(tasks).toHaveLength(0);
      expect(warning).not.toBeNull();
      expect(warning).toContain("studysprint_tasks");
      expect(avail["2030-01-01"]).toBe(60); // other key untouched
    });
  });

  it("tasks key with invalid schema (not array): discards, warning returned", () => {
    withMockStorage((s) => {
      s.setItem("studysprint_tasks", JSON.stringify({ notAnArray: true }));
    }, () => {
      const sm = new StorageManager();
      const { tasks, warning } = sm.loadTasks();
      expect(tasks).toHaveLength(0);
      expect(warning).toContain("studysprint_tasks");
    });
  });

  it("corrupt availability JSON: discards, warning names the key", () => {
    withMockStorage((s) => {
      s.setItem("studysprint_availability", "not-json!!!");
    }, () => {
      const sm = new StorageManager();
      const { data, warning } = sm.loadAvailability();
      expect(data).toEqual({});
      expect(warning).toContain("studysprint_availability");
    });
  });

  it("missing tasks key: silent empty init, no warning [Req 6.6]", () => {
    withMockStorage(() => {}, () => {
      const sm = new StorageManager();
      const { tasks, warning } = sm.loadTasks();
      expect(tasks).toHaveLength(0);
      expect(warning).toBeNull();
    });
  });

  it("missing availability key: silent empty init, no warning [Req 6.6]", () => {
    withMockStorage(() => {}, () => {
      const sm = new StorageManager();
      const { data, warning } = sm.loadAvailability();
      expect(data).toEqual({});
      expect(warning).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// localStorage unavailable [Req 6.5]
// ---------------------------------------------------------------------------

describe("StorageManager – localStorage unavailable", () => {
  it("isAvailable() returns false when localStorage throws", () => {
    withThrowingStorage(() => {
      const sm = new StorageManager();
      expect(sm.isAvailable()).toBe(false);
    });
  });

  it("operates in-memory: save then load returns same data", () => {
    withThrowingStorage(() => {
      const sm = new StorageManager();
      sm.saveTasks([makeTask(1)], 2);
      const { tasks, nextId } = sm.loadTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]!.id).toBe(1);
      expect(nextId).toBeGreaterThanOrEqual(2);
    });
  });

  it("availability in-memory: save then load returns same map", () => {
    withThrowingStorage(() => {
      const sm = new StorageManager();
      sm.saveAvailability({ "2030-01-01": 120 });
      const { data } = sm.loadAvailability();
      expect(data["2030-01-01"]).toBe(120);
    });
  });
});
// src/storage/storageManager.ts
// Persistent storage over localStorage with graceful degradation.
// Req 6

import type { Task, Availability } from "../types";

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

function isTask(v: unknown): v is Task {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t["id"] === "number" &&
    typeof t["title"] === "string" &&
    typeof t["subject"] === "string" &&
    typeof t["deadline"] === "string" &&
    typeof t["estimatedMinutes"] === "number" &&
    (t["priority"] === "High" || t["priority"] === "Medium" || t["priority"] === "Low") &&
    typeof t["completed"] === "boolean"
  );
}

function isTaskArray(v: unknown): v is Task[] {
  return Array.isArray(v) && v.every(isTask);
}

function isAvailability(v: unknown): v is Availability {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.entries(v as Record<string, unknown>).every(
    ([k, val]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && typeof val === "number"
  );
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const KEY_TASKS = "studysprint_tasks";
const KEY_AVAILABILITY = "studysprint_availability";
const KEY_NEXT_ID = "studysprint_next_id";

// ---------------------------------------------------------------------------
// LoadResult carries optional warnings back to the UI
// ---------------------------------------------------------------------------

export interface LoadResult<T> {
  data: T;
  warning: string | null; // non-null when a key was discarded [Req 6.4]
}

export interface LoadTasksResult {
  tasks: Task[];
  nextId: number;
  warning: string | null;
}

// ---------------------------------------------------------------------------
// StorageManager
// ---------------------------------------------------------------------------

export class StorageManager {
  /** false when localStorage is blocked (SecurityError / QuotaExceededError) [Req 6.5] */
  private _available = true;

  /** In-memory fallback when localStorage is unavailable */
  private _memTasks: Task[] = [];
  private _memAvailability: Availability = {};
  private _memNextId = 1;

  constructor() {
    try {
      const probe = "__studysprint_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
    } catch {
      this._available = false;
    }
  }

  isAvailable(): boolean {
    return this._available;
  }

  // --------------------------------------------------------------------------
  // Tasks
  // --------------------------------------------------------------------------

  loadTasks(): LoadTasksResult {
    if (!this._available) {
      return { tasks: this._memTasks, nextId: this._memNextId, warning: null };
    }

    let tasks: Task[] = [];
    let warning: string | null = null;

    const rawTasks = localStorage.getItem(KEY_TASKS);
    if (rawTasks === null) {
      tasks = [];
    } else {
      try {
        const parsed: unknown = JSON.parse(rawTasks);
        if (isTaskArray(parsed)) {
          tasks = parsed;
        } else {
          tasks = [];
          warning = `Discarded corrupted data for key "${KEY_TASKS}".`;
          console.warn(warning);
        }
      } catch {
        tasks = [];
        warning = `Discarded corrupted data for key "${KEY_TASKS}".`;
        console.warn(warning);
      }
    }

    const rawNextId = localStorage.getItem(KEY_NEXT_ID);
    let storedNextId = 1;
    if (rawNextId !== null) {
      try {
        const parsed: unknown = JSON.parse(rawNextId);
        if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 1) {
          storedNextId = Math.floor(parsed);
        }
      } catch {
        // ignore
      }
    }

    const maxExistingId = tasks.reduce((m, t) => Math.max(m, t.id), 0);
    const nextId = Math.max(storedNextId, maxExistingId + 1);

    return { tasks, nextId, warning };
  }

  saveTasks(tasks: Task[], nextId: number): void {
    if (!this._available) {
      this._memTasks = tasks;
      this._memNextId = nextId;
      return;
    }
    try {
      localStorage.setItem(KEY_TASKS, JSON.stringify(tasks));
      localStorage.setItem(KEY_NEXT_ID, JSON.stringify(nextId));
    } catch {
      this._available = false;
      this._memTasks = tasks;
      this._memNextId = nextId;
    }
  }

  // --------------------------------------------------------------------------
  // Availability
  // --------------------------------------------------------------------------

  loadAvailability(): LoadResult<Availability> {
    if (!this._available) {
      return { data: this._memAvailability, warning: null };
    }

    const raw = localStorage.getItem(KEY_AVAILABILITY);
    if (raw === null) {
      return { data: {}, warning: null };
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (isAvailability(parsed)) {
        return { data: parsed, warning: null };
      }
      const warning = `Discarded corrupted data for key "${KEY_AVAILABILITY}".`;
      console.warn(warning);
      return { data: {}, warning };
    } catch {
      const warning = `Discarded corrupted data for key "${KEY_AVAILABILITY}".`;
      console.warn(warning);
      return { data: {}, warning };
    }
  }

  saveAvailability(availability: Availability): void {
    if (!this._available) {
      this._memAvailability = availability;
      return;
    }
    try {
      localStorage.setItem(KEY_AVAILABILITY, JSON.stringify(availability));
    } catch {
      this._available = false;
      this._memAvailability = availability;
    }
  }
}

export const storageManager = new StorageManager();
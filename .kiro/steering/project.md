---
inclusion: always
---

# StudySprint – Project Steering

## Stack

React 18, TypeScript (strict mode), Vite, Vitest, fast-check. Plain CSS with CSS custom properties — no CSS framework or UI library.

## Non-negotiable rules

1. **Strict TypeScript** — `"strict": true` in tsconfig. No `any`, no type assertions without a comment justifying them.
2. **Pure scheduler** — the scheduler is a pure function with signature:
   ```ts
   function schedule(
     tasks: Task[],
     availability: Availability,
     today: DateString   // YYYY-MM-DD, derived and passed by the UI
   ): ScheduleResult
   ```
   It never calls `new Date()`, `Date.now()`, or reads any global state. The UI derives today's local date and passes it explicitly.
3. **Local calendar dates only** — all `YYYY-MM-DD` strings are derived from local year/month/day components (never `toISOString()`). Date comparisons are lexicographic string comparisons.
4. **Validated storage** — every `localStorage` read is JSON-parsed and schema-validated before use. Corrupt or missing keys initialize to empty state silently (missing) or with a warning (corrupt). The next-task-ID counter is persisted under `studysprint_next_id` and never reset.
5. **Accessible controls** — every interactive element has a visible label or `aria-label`. Validation errors are linked to their input with `aria-describedby`. All controls are reachable by keyboard in visual reading order.

## Why the scheduler is separate

Isolating the scheduler from React state means its eight correctness properties can be tested as pure functions with Vitest + fast-check — no DOM, no hooks, no mocking. UI components are tested separately for rendering and interaction. This separation is the primary architectural constraint; do not blur it.

## Key localStorage keys

| Key | Contents |
|---|---|
| `studysprint_tasks` | `Task[]` as JSON |
| `studysprint_availability` | `Availability` map as JSON |
| `studysprint_next_id` | next integer task ID as JSON number |

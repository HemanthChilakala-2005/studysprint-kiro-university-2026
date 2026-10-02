# Implementation Plan: StudySprint

## Overview

This plan builds StudySprint incrementally: project scaffolding first, then the pure scheduling engine and validation helpers, then persistence, then the React UI, then the full test suite, and finally a build verification pass. Each task builds on the previous ones; no code is left unintegrated.

## Tasks

- [x] 1. Project Setup
  - [x] 1.1 Initialise Vite + React 18 + TypeScript project with `"strict": true` in tsconfig
    - Run `npm create vite@latest` with the `react-ts` template; verify tsconfig has `"strict": true`
    - _Requirements: general scaffold_
  - [x] 1.2 Install and configure Vitest and fast-check as devDependencies
    - Add `vitest`, `@vitest/ui`, and `fast-check` to `devDependencies`; add a `test` script to `package.json`; create `vitest.config.ts`
    - _Requirements: general scaffold_
  - [x] 1.3 Create `src/types.ts` with full TypeScript types
    - Define `DateString`, `Priority`, `PRIORITY_WEIGHT`, `Task`, `Availability`, `ScheduleEntry`, `ScheduleResult`
    - _Requirements: [Req 1], [Req 3]_
  - [x] 1.4 Create folder structure: `src/scheduler/`, `src/storage/`, `src/components/`, `src/hooks/`
    - Add an `index.ts` barrel export in each folder
    - _Requirements: general scaffold_
  - [x] 1.5 Set up plain CSS global styles with CSS custom properties for theming; ensure viewport meta tag is present
    - Define colour, spacing, and font-size tokens as CSS custom properties in `src/index.css`; confirm `<meta name="viewport" ...>` is in `index.html`
    - _Requirements: [Req 8]_

- [x] 2. Scheduling Engine and Validation
  - [x] 2.1 Implement `isValidCalendarDate(s: string): boolean` using local component round-trip check
    - Rejects strings like `2024-02-30`, `2023-13-01`, and non-date strings; place in `src/scheduler/dateUtils.ts`
    - _Requirements: [Req 1.15], [Req 5]_
  - [x] 2.2 Implement `formatLocalDate(d: Date): DateString` producing zero-padded YYYY-MM-DD from local components
    - Uses `getFullYear()`, `getMonth()`, `getDate()` — never `toISOString()`; place in `src/scheduler/dateUtils.ts`
    - _Requirements: [Req 5.1], [Req 5.2], [Req 5.3]_
  - [x] 2.3 Implement `getTodayLocal(): DateString` for UI use only — never called inside the scheduler
    - Derives local year/month/day and calls `formatLocalDate`; place in `src/scheduler/dateUtils.ts`
    - _Requirements: [Req 5.1]_
  - [x] 2.4 Implement `enumerateDays(from: DateString, to: DateString): DateString[]` using local Date constructor and lexicographic loop
    - Uses `addDays` helper that increments via local constructor; stops when `cur > to` lexicographically; place in `src/scheduler/dateUtils.ts`
    - _Requirements: [Req 3.1], [Req 5]_
  - [x] 2.5 Implement `schedule(tasks, availability, today): ScheduleResult` as a pure function in `src/scheduler/scheduler.ts`
    - Filter to incomplete tasks with `estimatedMinutes > 0`
    - Sort: deadline ASC, priority weight ASC, id ASC [Req 3.3]
    - Build capacity map from today through latest deadline using `enumerateDays` [Req 3.1]
    - Allocate greedily day-by-day per task; record unschedulable remainder [Req 3.4–3.8]
    - Return `{ entries, unschedulable }` such that `allocated + unschedulable = estimatedMinutes` for every eligible task [Req 9.3]
    - Function never calls `Date.now()`, `new Date()` without arguments, or reads global state [Req 3.9]
    - _Requirements: [Req 3], [Req 4], [Req 9]_
  - [x] 2.6 Implement field validation helpers in `src/scheduler/validation.ts`
    - `validateTitle`: trimmed length 1–200 [Req 1.3, 1.7]
    - `validateSubject`: trimmed length 1–100 [Req 1.4, 1.8]
    - `validateEstimatedMinutes`: finite safe integer 1–1440 [Req 1.5, 2.2, 2.5]
    - `validatePriority`: one of `'High' | 'Medium' | 'Low'` [Req 1.6]
    - `validateDeadline`: delegates to `isValidCalendarDate` [Req 1.15]
    - `validateAvailableMinutes`: finite safe integer 0–1440 [Req 2.2, 2.5]
    - Each returns `string | null` (null = valid)
    - _Requirements: [Req 1.3]–[Req 1.8], [Req 1.15], [Req 2.2], [Req 2.5]_

- [x] 3. Persistence Layer
  - [x] 3.1 Implement `StorageManager` in `src/storage/storageManager.ts`
    - Expose `loadTasks()`, `saveTasks(tasks, nextId)`, `loadAvailability()`, `saveAvailability(availability)`, `isAvailable()`
    - _Requirements: [Req 6]_
  - [x] 3.2 Handle `localStorage` unavailable (SecurityError / QuotaExceededError)
    - Catch errors on any read/write; set internal `_available = false`; fall back to in-memory maps; expose via `isAvailable()`
    - _Requirements: [Req 6.5]_
  - [x] 3.3 Handle JSON parse failure or schema mismatch for `studysprint_tasks` or `studysprint_availability`
    - Discard the corrupt key, initialise the corresponding state as empty, emit a warning (via `console.warn` and a returned warning string) identifying the key
    - _Requirements: [Req 6.4]_
  - [x] 3.4 Handle missing keys at init: silently init empty, no warning
    - `JSON.parse(null)` path: treat as absent; no warning emitted
    - _Requirements: [Req 6.6]_
  - [x] 3.5 Persist and restore `studysprint_next_id`; ensure the counter only ever increases; never reuse a task ID
    - On `saveTasks`, write `nextId` to both `studysprint_tasks` payload and `studysprint_next_id` key; on `loadTasks`, take the max of both values
    - _Requirements: [Req 6.7], [Req 1.1]_
  - [x] 3.6 Ensure writes complete within 500 ms of changes and restore completes within 1000 ms of app init
    - `localStorage` is synchronous; document SLA in a comment; validate with a unit test measuring mock call ordering
    - _Requirements: [Req 6.1]–[Req 6.3]_

- [x] 4. React UI
  - [x] 4.1 Implement `useTaskManager` hook in `src/hooks/useTaskManager.ts`
    - CRUD operations, ID assignment from persisted counter, validation (delegates to `src/scheduler/validation.ts`), overdue flag, completion toggle
    - Calls `storageManager.saveTasks` after every mutation
    - _Requirements: [Req 1]_
  - [x] 4.2 Implement `useAvailabilityManager` hook in `src/hooks/useAvailabilityManager.ts`
    - Set/update per-date minutes, validation, overwrite semantics
    - Calls `storageManager.saveAvailability` after every mutation
    - _Requirements: [Req 2]_
  - [x] 4.3 Implement `App` component in `src/App.tsx`
    - Holds `tasks`, `availability`, `scheduleResult | null`, `isScheduleStale` flag
    - Calls `getTodayLocal()` at schedule-generation time and passes the result to `schedule()`
    - Wires `useTaskManager`, `useAvailabilityManager`, and `StorageManager` together on mount
    - _Requirements: [Req 3.1], [Req 5.1]_
  - [x] 4.4 Implement schedule invalidation logic in `App`
    - Set `isScheduleStale = true` and `scheduleResult = null` on any task or availability change
    - Pass `isScheduleStale` to `SchedulePanel` for stale indicator display
    - _Requirements: [Req 3.13]_
  - [x] 4.5 Implement `TaskForm` component in `src/components/TaskForm.tsx`
    - Add/edit form with per-field inline validation errors linked via `aria-describedby`
    - Accept past deadlines but display overdue indicator text beside the deadline field
    - Clear field error as soon as the user corrects that field
    - _Requirements: [Req 1], [Req 8.6]_
  - [x] 4.6 Implement `TaskList` + `TaskItem` components in `src/components/`
    - `TaskList` renders a list of `TaskItem`; passes callbacks for complete/incomplete/edit/delete
    - `TaskItem` shows an overdue badge when `deadline < today`; renders complete/incomplete toggle, edit and delete buttons with descriptive `aria-label`
    - _Requirements: [Req 1.9], [Req 1.12]–[Req 1.14], [Req 4.4]_
  - [x] 4.7 Implement `AvailabilityPanel` in `src/components/AvailabilityPanel.tsx`
    - Date + minutes input with inline validation errors; calls `useAvailabilityManager` to update map
    - _Requirements: [Req 2]_
  - [x] 4.8 Implement `SchedulePanel` in `src/components/SchedulePanel.tsx`
    - "Generate Schedule" button; renders `ScheduleGrid` (entries grouped by day) and `UnschedulableWarning` (unschedulable minutes grouped by task name) when result is present
    - Shows stale indicator when `isScheduleStale` is true
    - _Requirements: [Req 3], [Req 4.4]_
  - [x] 4.9 Implement `ExportButton` in `src/components/ExportButton.tsx`
    - Triggers JSON download of all `ScheduleEntry` objects as `studysprint-schedule-YYYY-MM-DD.json` using today's local date
    - Inline message when schedule is empty; error message on download failure
    - _Requirements: [Req 7]_
  - [x] 4.10 Implement `StorageBanner` in `src/components/StorageBanner.tsx`
    - Persistent banner rendered when `storageManager.isAvailable()` returns false
    - _Requirements: [Req 6.5]_
  - [x] 4.11 Apply responsive layout and accessibility polish across all components
    - Layout correct at 320–1920 px with no horizontal scrolling [Req 8.1]
    - All interactive controls keyboard-reachable in visual reading order [Req 8.3]
    - Visible focus indicators ≥ 3 px outline, contrast ≥ 3:1 [Req 8.4]
    - WCAG 2.1 AA contrast ratios for all text [Req 8.5]
    - Touch targets ≥ 44×44 px [Req 8.8]
    - _Requirements: [Req 8]_

- [x] 5. Tests
  - [x] 5.1 Write property test – Property 1 (Daily Capacity)
    - `// Feature: studysprint, Property 1: Daily Capacity`
    - For any tasks/availability/today, sum of `allocatedMinutes` per date ≤ `availableMinutes` for that date; absent dates receive no allocations
    - `fc.assert(..., { numRuns: 100 })`
    - _Requirements: [Req 9.1]_
  - [x] 5.2 Write property test – Property 2 (Deadline Compliance)
    - `// Feature: studysprint, Property 2: Deadline Compliance`
    - No `ScheduleEntry` date is lexicographically after its task's deadline
    - `fc.assert(..., { numRuns: 100 })`
    - _Requirements: [Req 9.2]_
  - [x] 5.3 Write property test – Property 3 (Conservation of Minutes)
    - `// Feature: studysprint, Property 3: Conservation of Minutes`
    - For every incomplete task with `estimatedMinutes > 0`: `allocatedMinutes + unschedulable === estimatedMinutes` (holds for overdue, partial, and full cases)
    - `fc.assert(..., { numRuns: 100 })`
    - _Requirements: [Req 9.3]_
  - [x] 5.4 Write property test – Property 4 (Determinism)
    - `// Feature: studysprint, Property 4: Determinism`
    - Two calls with identical inputs return deeply equal `ScheduleResult`
    - `fc.assert(..., { numRuns: 100 })`
    - _Requirements: [Req 9.4]_
  - [x] 5.5 Write property test – Property 5 (Exclusion of Completed Tasks)
    - `// Feature: studysprint, Property 5: Exclusion of Completed Tasks`
    - No `ScheduleEntry` `taskId` matches a completed task; completed tasks absent from `unschedulable` map
    - `fc.assert(..., { numRuns: 100 })`
    - _Requirements: [Req 9.5]_
  - [x] 5.6 Write property test – Property 6 (Non-negativity)
    - `// Feature: studysprint, Property 6: Non-negativity`
    - Every `allocatedMinutes` value is a positive integer strictly greater than zero
    - `fc.assert(..., { numRuns: 100 })`
    - _Requirements: [Req 9.6]_
  - [x] 5.7 Write property test – Property 7 (Overdue Tasks Have Zero Entries)
    - `// Feature: studysprint, Property 7: Overdue Tasks Have Zero Entries`
    - Tasks with `deadline < today` have zero `ScheduleEntry` objects; their `estimatedMinutes` appear entirely in `unschedulable`
    - `fc.assert(..., { numRuns: 100 })`
    - _Requirements: [Req 9.7]_
  - [x] 5.8 Write property test – Property 8 (Empty Input)
    - `// Feature: studysprint, Property 8: Empty Input`
    - Empty task list or all-completed tasks → empty `entries` and empty `unschedulable`
    - `fc.assert(..., { numRuns: 100 })`
    - _Requirements: [Req 9.8]_
  - [x] 5.9 Write unit tests – StorageManager recovery
    - Corrupt JSON for each key: correct key discarded, other key preserved, warning emitted
    - Missing key: silent empty init, no warning
    - Unavailable localStorage (mocked): `isAvailable()` returns false, in-memory fallback works
    - _Requirements: [Req 6.4]–[Req 6.6]_
  - [x] 5.10 Write unit tests – task-ID persistence
    - After saving and restoring state, next ID is always greater than the highest existing task ID
    - Deleting tasks does not reset or lower the counter
    - _Requirements: [Req 6.7], [Req 1.1]_
  - [x] 5.11 Write unit tests – scheduler edge cases
    - Overdue task (all minutes unschedulable), exactly-filled day (no overflow), task spanning multiple days, `estimatedMinutes ≤ 0` skipped, all tasks complete returns empty result, empty availability returns all unschedulable
    - _Requirements: [Req 3], [Req 4]_
  - [x] 5.12 Write unit tests – field validation boundary values
    - Title 200 chars (valid) vs 201 chars (invalid); `estimatedMinutes` 1 (valid), 1440 (valid), 0 (invalid), 1441 (invalid)
    - Invalid dates: `2024-02-30`, `2023-13-01`, `""`, non-date strings
    - Whitespace-only title and subject rejected
    - Non-safe-integer minutes rejected
    - _Requirements: [Req 1.3]–[Req 1.8], [Req 1.15], [Req 2.2], [Req 2.5]_
  - [x] 5.13 Write unit tests – `isValidCalendarDate`
    - `2024-02-29` valid (leap year), `2023-02-29` invalid (non-leap year), month-end overflow (e.g. `2024-04-31`), non-string-formatted inputs
    - _Requirements: [Req 1.15]_
  - [x] 5.14 Run full test suite; confirm all tests pass
    - Execute `vitest --run`; address any failures before proceeding
    - _Requirements: [Req 9]_

- [ ] 6. Final Verification
  - [x] 6.1 Run `vite build`; build succeeds with zero TypeScript errors
    - Fix any type errors surfaced by `tsc --noEmit` or the build step before marking done
    - _Requirements: general_
  - [ ] 6.2 Manually verify: add task with past deadline → accepted, overdue indicator shown; generate schedule → overdue task appears in unschedulable panel
    - _Requirements: [Req 1.9], [Req 4.1]_
  - [ ] 6.3 Manually verify: change a task after generating schedule → stale indicator appears, old schedule discarded
    - _Requirements: [Req 3.13]_
  - [ ] 6.4 Manually verify: corrupt `studysprint_tasks` value in DevTools → app loads with empty task list and non-blocking warning banner naming the key
    - _Requirements: [Req 6.4]_
  - [ ] 6.5 Manually verify: export button with populated schedule → correct JSON file downloaded, filename matches `studysprint-schedule-YYYY-MM-DD.json`, structure matches spec
    - _Requirements: [Req 7.1], [Req 7.2]_
  - [ ] 6.6 Manually verify: keyboard-only navigation (Tab, Shift+Tab, Enter, Space) reaches all controls in visual reading order; focus indicators are visible
    - _Requirements: [Req 8.3], [Req 8.4]_
  - [ ] 6.7 Confirm `studysprint_next_id` increments correctly and is never reset after task deletion (inspect DevTools → Application → Local Storage)
    - _Requirements: [Req 6.7]_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP (none in this plan are optional — all are required for a correct, production-ready build)
- Each task references specific requirements for traceability
- Checkpoints (5.14, 6.1) ensure incremental validation before moving forward
- Property tests validate universal correctness properties of the pure scheduler; unit tests validate specific examples and edge cases
- The scheduler (`src/scheduler/scheduler.ts`) must never call `Date.now()`, `new Date()` without arguments, or read any global state — the UI always passes `today` explicitly

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["2.5", "2.6", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6"] },
    { "id": 5, "tasks": ["4.1", "4.2"] },
    { "id": 6, "tasks": ["4.3", "4.5", "4.7"] },
    { "id": 7, "tasks": ["4.4", "4.6", "4.8", "4.9", "4.10"] },
    { "id": 8, "tasks": ["4.11", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8"] },
    { "id": 9, "tasks": ["5.9", "5.10", "5.11", "5.12", "5.13"] },
    { "id": 10, "tasks": ["5.14"] },
    { "id": 11, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7"] }
  ]
}
```

---

## Challenge Demonstrations

These items demonstrate specific Kiro platform capabilities for the University Challenge. None are implemented yet.

- [ ] **Command hook** — configure a `.kiro/hooks` entry that runs automatically on a relevant event (e.g. pre-task or file-save) during development
- [ ] **Installed Power (actually used)** — install a Power from the Power registry and invoke one of its tools during a real task; document which Power and which tool
- [ ] **MCP tool call** — connect an MCP server and make at least one real tool call from within the workspace; document the server and call
- [ ] **Custom agent (actually used)** — define a custom agent in `.kiro/agents/` and invoke it on a real task during development; document what it did
- [ ] **Package a custom Power** — create a Power with `plugin.json`, at least one skill (`.md` file in `skills/`), and verify it can be installed; the skill should provide genuinely useful guidance for this project

# StudySprint

A pure, deterministic study scheduler built with React, TypeScript, and Vite. StudySprint lets users add tasks with deadlines and priorities, define weekly availability, and generates an optimized schedule that respects capacity constraints, meets deadlines, and handles overdue and completed tasks correctly.

## Features

- **Pure scheduler** — Testable scheduling logic isolated from UI state
- **Deterministic output** — Same inputs always produce the same schedule
- **Conservation invariant** — Every task's minutes are either scheduled or marked unschedulable; nothing is lost
- **Deadline & capacity compliance** — Respects per-date capacity limits and never schedules past deadlines
- **Accessibility-first** — All controls keyboard-navigable with visible labels and ARIA descriptions
- **Property-based testing** — Eight correctness properties verified with fast-check (100+ test cases each)

## Quick Start

### Setup

```bash
npm --prefix studysprint ci
```

### Development

```bash
npm --prefix studysprint run dev
```

Starts the Vite dev server at `http://localhost:5173`.

### Tests

```bash
npm --prefix studysprint test
```

Runs all tests (unit, property, and validation) via Vitest.

### Build

```bash
npm --prefix studysprint run build
```

Produces optimized production build in `studysprint/dist/`.

## Challenge Topics & Implementation

| Topic | What It Demonstrates | Files |
|-------|---------------------|-------|
| **1. Specs** | Structured requirements → design → tasks workflow for complex features | `.kiro/specs/studysprint/` |
| **2. Steering** | Project-level rules, constraints, and conventions | `.kiro/steering/project.md` |
| **3. Hooks** | Agent automation on events (e.g., type checking on stop) | `.kiro/hooks/typecheck-on-stop.json` |
| **4. Property-based testing** | Eight correctness properties verified with fast-check (100+ runs each) | `studysprint/src/tests/scheduler.property.test.ts` |
| **5. Powers** | Installed Context7 usage: resolved fast-check library, queried documentation | `docs/kiro-evidence.md` (3 MCP tool calls) |
| **6. MCP** | Actual resolve-library-id and query-docs calls against Context7 server | `docs/kiro-evidence.md` (recorded outcomes) |
| **7. Custom agents** | `studysprint-reviewer` agent for code review and bug analysis | `.kiro/agents/studysprint-reviewer.json`, `docs/reviewer-report.md` |
| **Bonus 2: Reusable Kiro Power** | `scheduler-correctness` power for auditing deterministic schedulers | `powers/scheduler-correctness/`, `docs/power-review.md` |

## Using the scheduler-correctness Power

The **scheduler-correctness** Power is a reusable review skill for auditing deterministic schedulers against eight correctness properties.

### Installation & Usage

The power was installed through the Kiro IDE:

1. **Powers panel** → **Add Custom Power** → **Import power from a folder**
2. Selected `powers/scheduler-correctness` directory
3. Power imported and available for activation

To use it:
- Open a chat session with the default agent
- Request to activate and use the installed `scheduler-correctness` Power
- The agent activates the power and applies the `review-scheduler` skill to audit a scheduler

The power provides:
- **review-scheduler skill** — 8-step review process for correctness properties
- **reference scenarios** — Concrete test cases with expected outputs
- **Guidance** — Distinguish code inspection from test evidence

Example: See `docs/power-review.md` for the actual review of StudySprint's scheduler using this power.

## Project Structure

```
.
├── README.md                              # This file
├── .gitignore                             # VCS exclusions
├── docs/
│   ├── kiro-evidence.md                   # Challenge demonstrations
│   ├── reviewer-report.md                 # Schedule invalidation bug analysis
│   └── power-review.md                    # Scheduler correctness review (Power output)
├── powers/
│   └── scheduler-correctness/
│       ├── plugin.json                    # Power manifest
│       ├── README.md                      # Power documentation
│       └── skills/review-scheduler/
│           ├── SKILL.md                   # 8-step review process
│           └── references/scenarios.md    # Test scenarios & expected outputs
└── studysprint/
    ├── package.json                       # Dependencies & scripts
    ├── tsconfig.json                      # Strict TypeScript config
    ├── vite.config.ts                     # Vite config
    ├── vitest.config.ts                   # Test runner config
    ├── index.html                         # App entry point
    └── src/
        ├── types.ts                       # Central type definitions
        ├── App.tsx                        # React root component
        ├── index.css                      # Global styles
        ├── main.tsx                       # React DOM mount
        ├── scheduler/
        │   ├── scheduler.ts               # Pure scheduler (Lesson 2)
        │   ├── dateUtils.ts               # Local date helpers (Lesson 3)
        │   └── validation.ts              # Input validation
        ├── storage/
        │   └── storageManager.ts          # Validated localStorage (Lesson 4)
        ├── hooks/
        │   ├── useTaskManager.ts          # Task state management
        │   └── useAvailabilityManager.ts  # Availability state management
        ├── components/
        │   ├── TaskForm.tsx               # Task creation form (Lesson 5)
        │   ├── TaskList.tsx               # Task list display
        │   ├── SchedulePanel.tsx          # Schedule output
        │   ├── AvailabilityPanel.tsx      # Availability editor (Lesson 5)
        │   └── StorageBanner.tsx          # Storage status indicator
        └── tests/
            ├── scheduler.unit.test.ts     # Edge cases & boundaries
            ├── scheduler.property.test.ts # 8 properties × 100 runs (Lesson 6)
            ├── storage.unit.test.ts       # Storage layer tests
            ├── validation.unit.test.ts    # Input validation tests
            └── schedule-invalidation.test.ts # Regression: stale schedule handling
```

## Development Notes

- **Strict TypeScript:** All files enforce `"strict": true`. No type assertions without comments.
- **Pure scheduler:** The `schedule()` function is deterministic and testable. UI derives `today` locally and passes it explicitly.
- **Date handling:** All dates are YYYY-MM-DD strings (never UTC). Comparisons are lexicographic.
- **Storage validation:** Every `localStorage` read is JSON-parsed and schema-validated. Missing keys silently initialize; corrupt keys log a warning. The `studysprint_next_id` counter is never reset.
- **Accessibility:** Every interactive element has a visible label or `aria-label`. Form errors are linked with `aria-describedby`.
- **Availability:** Stored as a map of YYYY-MM-DD date strings to available minutes (0–1440 per date). The scheduler respects per-date capacity limits.

## Testing

The test suite includes:

- **Unit tests** — Edge cases, boundary conditions, individual properties
- **Property tests** — 8 correctness properties verified via fast-check with 100+ generated cases each
- **Regression tests** — Schedule invalidation behavior; stale schedule detection
- **Storage tests** — Validation, corruption handling, state recovery
- **Validation tests** — Input constraints, error handling

Run all tests:

```bash
npm --prefix studysprint test
```

## Build & Deployment

To build for production:

```bash
npm --prefix studysprint run build
```

Outputs optimized files to `studysprint/dist/`.

To preview the production build locally:

```bash
npm --prefix studysprint run preview
```

## Documentation

- **`docs/kiro-evidence.md`** — Challenge demonstrations: Context7 Power usage, MCP tool calls, hook creation, custom agent use
- **`docs/reviewer-report.md`** — Analysis of schedule invalidation bug, fix implementation, and test coverage
- **`docs/power-review.md`** — Scheduler correctness review using the scheduler-correctness Power

## License

StudySprint and the scheduler-correctness Power are provided for educational and demonstration purposes.

# Kiro University Challenge – Evidence Log

## Context7 Power: fast-check documentation lookup

**Date:** 2026-10-02
**Power used:** Context7 (installed)
**MCP server:** `context7`

### Tool calls made

| # | Tool | Arguments | Outcome |
|---|---|---|---|
| 1 | `resolve-library-id` | `libraryName: "fast-check"`, `query: "uniqueArray unique constraint fc.assert numRuns"` | Resolved `/dubzzz/fast-check` (1820 snippets, High reputation, score 85.59) |
| 2 | `query-docs` | `libraryId: "/dubzzz/fast-check"`, `query: "fc.assert numRuns configuration property test runner options"` | Retrieved numRuns / Parameters API |
| 3 | `query-docs` | `libraryId: "/dubzzz/fast-check"`, `query: "uniqueArray arbitrary unique constraint on generated values"` | Retrieved uniqueArray signatures and selector/comparator options |

### Library ID resolved

`/dubzzz/fast-check`

### What we learned

**`fc.assert` with `numRuns`**

Pass a `Parameters` object as the second argument to `fc.assert` to set `numRuns` per assertion.
The default is 100; for StudySprint we use exactly 100 as the minimum for all eight property tests:

```ts
fc.assert(
  fc.property(arbTaskList, arbAvailability, arbDateString, (tasks, availability, today) => {
    // property body
  }),
  { numRuns: 100 }
);
```

**`fc.uniqueArray` — documented vs actual implementation**

Context7 documented `fc.uniqueArray(arb, { selector })` as the canonical approach. The implementation in `src/tests/scheduler.property.test.ts` uses `fc.array(...).chain(...)` with a `Set` for deduplication instead:

```ts
const arbTaskList: fc.Arbitrary<Task[]> = fc
  .array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 20 })
  .chain((ids) => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return fc.constant([]);
    return fc.tuple(...uniqueIds.map(arbTaskBase));
  });
```

Both approaches correctly prevent duplicate task IDs in generated test inputs.

### Impact on StudySprint tests

- All eight property tests use `{ numRuns: 100 }` as the minimum iteration count.
- `arbTaskList` guarantees globally unique IDs via `Set` deduplication in a `.chain()` call.

---

## Challenge Demonstrations – Artifacts Created

### Command Hook: typecheck-on-stop.json

**File:** `.kiro/hooks/typecheck-on-stop.json`

**Purpose:** Automatically run TypeScript type checking when development stops.

**Configuration:**
- Trigger: "Stop" event
- Command: `npm --prefix studysprint run typecheck`
- Timeout: 60 seconds

**Status:** ✓ Created and validated

---

### Custom Agent: studysprint-reviewer.json

**File:** `.kiro/agents/studysprint-reviewer.json`

**Purpose:** Custom agent that reviews StudySprint code for scheduling, persistence, task-ID preservation, and stale schedule prevention.

**Specification:**
- Name: `studysprint-reviewer`
- Model: `claude-haiku-4.5`
- Tools: `read`, `write`, `shell`

**Actual Use (2026-10-02):**

The user selected `studysprint-reviewer` in the IDE agent picker to:
1. Inspect code and steering requirements
2. Identify schedule invalidation bug (isStale flag never set to true)
3. Create `docs/reviewer-report.md` with findings
4. Implement fix (3 files)
5. Add regression tests (6 test cases)
6. Verify via tests (88 passed) and build
7. Update docs with evidence

**Decision:** Direct invocation was simpler than delegation; the agent was registered and available in the IDE picker.

---

### Reusable Kiro Power: scheduler-correctness

**Location:** `powers/scheduler-correctness/`

**Files:**
- `plugin.json` — Manifest (name, version, keywords)
- `README.md` — Installation via Powers panel, usage guide
- `skills/review-scheduler/SKILL.md` — 8-step review process
- `skills/review-scheduler/references/scenarios.md` — 8 concrete test scenarios

**Purpose:** Review deterministic schedulers for correctness properties (purity, conservation, capacity, deadline, exclusion, determinism, ordering).

**Installation & Activation:**
1. **Install:** Powers panel → Add Custom Power → Import power from a folder → select `powers/scheduler-correctness`
2. **Activate:** Default agent chat session → request to activate and use the installed `scheduler-correctness` Power
3. **Use:** Agent applies `review-scheduler` skill to audit a scheduler

**Power Applied to StudySprint (2026-10-02):**

1. Power installed via Powers panel
2. Default agent chat requested to use the installed power
3. Agent activated `scheduler-correctness` and applied `review-scheduler` skill
4. Review conducted against SKILL.md 8-step process and reference scenarios
5. Output: `docs/power-review.md`

**Review findings:** All 8 correctness properties verified
- Code inspection: "No calls to `new Date()`" (reading scheduler.ts)
- Test evidence: "Property Test 3 verifies conservation with 100+ generated cases" (reading test file code)
- Test Evidence vs. Code Review: Separated in output; previously executed test results referenced but not re-run

---

## Challenge Demonstrations Status

- [x] **Installed Power actually used** — Context7 Power invoked (3 real MCP tool calls)
- [x] **MCP tool calls** — resolve-library-id and query-docs against Context7 server
- [x] **Command hook** — typecheck-on-stop.json created and validated
- [x] **Custom agent** — studysprint-reviewer.json created and used for code review
- [x] **Reusable Kiro Power** — scheduler-correctness created and used to produce power-review.md

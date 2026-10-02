---
name: Review Deterministic Scheduler
description: Inspect a deterministic scheduler for correctness properties using code review and test analysis. Covers purity, conservation, capacity, deadline compliance, ordering, and determinism.
---

# Review Deterministic Scheduler

This skill provides a structured approach to reviewing a deterministic scheduling engine for correctness. Use it to inspect a scheduler codebase against key properties before or after implementation.

## Scope

- **Schedulers covered:** Any system that assigns work to time slots based on constraints (deadlines, capacity, priority)
- **Properties checked:** 
  - Purity (no side effects, no global state)
  - Minute/resource conservation invariant
  - Daily/slot capacity compliance
  - Deadline enforcement
  - Completed-work exclusion
  - Determinism (same input → same output)
  - Sort order correctness
- **Output:** Findings report with file references, distinguishing code inspection from test execution

---

## Steps

### 1. Locate Scheduler Core and Types

**Goal:** Find the scheduling function and its input/output contracts.

**Actions:**
- Search the codebase for the main scheduler function (e.g., `schedule()`, `run()`, `compute()`)
- Identify its signature: input parameters (tasks/jobs, slots/availability, reference date), return type (schedule result with entries and unschedulable/overflow)
- Locate type definitions: Task/Job interface, Availability/Capacity map, ScheduleEntry/Slot interface, ScheduleResult interface
- Record file paths and line numbers

**Questions to answer:**
- What is the function name and file path?
- What are the input types and their constraints?
- What does the return value contain? (entries, unschedulable minutes, conflicts, etc.)
- Are types exported for testing?

---

### 2. Check Purity and Explicit Inputs

**Goal:** Verify the scheduler is a pure function with no hidden state or date dependencies.

**Actions:**
- Read the scheduler function body (first 50 lines usually reveal the pattern)
- Search for: `new Date()`, `Date.now()`, `Math.random()`, global variable reads, side effects (`console.log`, file I/O, DOM mutations)
- Verify the function accepts a "today" or reference date parameter
- Check if the function reads any external state or calls functions that do

**Questions to answer:**
- Does the function call `new Date()` or `Date.now()`?
- Is there a "today" or reference date parameter?
- Are all date values passed in explicitly?
- Does the function modify its inputs or external state?
- Are all dependencies injected as parameters?

**Expected:** No time-reading calls; dates supplied explicitly; pure function.

---

### 3. Check Minute Conservation

**Goal:** Verify the conservation invariant: for each incomplete task, `allocated + unschedulable = estimatedMinutes`.

**Actions:**
- Locate the scheduler's return type or test assertions for conservation
- Search test files for "conservation" or "invariant" keywords
- Read a unit test that checks this (if one exists)
- Manually trace the scheduler logic:
  - Does it track `remaining` minutes for each task?
  - When it stops allocating, does it record leftover minutes as unschedulable?
  - Do tests verify the invariant holds for completed, partial, and zero-capacity cases?

**Questions to answer:**
- Is conservation checked in tests?
- Does the scheduler explicitly track unschedulable/overflow minutes?
- Are there edge cases (empty tasks, zero-capacity days, overdue tasks) tested?

**Expected:** Test assertions confirm `sum(allocated) + unschedulable === estimated` for all tasks.

---

### 4. Check Daily Capacity Compliance

**Goal:** Verify the scheduler respects per-day or per-slot capacity limits.

**Actions:**
- Locate the availability/capacity map type and how it's populated
- Search the scheduler for how it reads capacity (e.g., `availability[date]`, `slot.capacity`)
- Check tests for capacity-related assertions:
  - Search for "capacity", "available", "remaining"
  - Look for tests with limited availability (e.g., 60 min/day, 0 min on certain days)
- Trace the allocation logic:
  - Does it check capacity before allocating?
  - Does it reduce remaining capacity as tasks are scheduled?
  - Are days with 0 capacity skipped?

**Questions to answer:**
- Does the scheduler check capacity before allocating to a slot?
- Are days with 0 capacity excluded?
- Do tests verify total allocation per day ≤ available minutes?

**Expected:** Test assertions confirm `sum(allocated per day) ≤ available minutes per day`.

---

### 5. Check Deadline Compliance

**Goal:** Verify the scheduler never allocates work past task deadlines.

**Actions:**
- Find how deadlines are compared (e.g., lexicographic string comparison, Date comparison)
- Search tests for "deadline" assertions
- Look for edge cases:
  - "deadline today" case (should be scheduled today if possible)
  - "past deadline" or overdue case (should be unschedulable)
  - "far future deadline" case (all capacity available)
- Trace allocation logic:
  - Does it check `day <= deadline` before allocating?
  - How are dates compared?

**Questions to answer:**
- How are deadline dates compared to slot dates?
- Do tests cover today-is-deadline, overdue, and future deadlines?
- Are all schedule entries within deadline bounds?

**Expected:** Test assertions confirm `entry.date <= task.deadline` for all entries. Overdue tasks marked unschedulable.

---

### 6. Check Completed-Task Exclusion

**Goal:** Verify completed/finished tasks are excluded from the schedule.

**Actions:**
- Find the Task interface and locate the completion flag (e.g., `completed`, `finished`, `done`)
- Search the scheduler for where tasks are filtered (usually early in the function)
- Look for tests that include completed tasks and verify they produce no entries
- Check: are completed tasks counted in unschedulable? (They should not be.)

**Questions to answer:**
- Is there a completion/done flag on tasks?
- Does the scheduler filter out completed tasks?
- Do tests verify completed tasks produce no schedule entries?

**Expected:** Completed tasks excluded from entries and unschedulable records.

---

### 7. Check Determinism

**Goal:** Verify identical inputs produce identical outputs.

**Actions:**
- Look for property-based tests (fast-check, hypothesis, Quickcheck, etc.)
- Search test files for "determinism", "idempotent", "round-trip", or property test names
- Check if the test runs the scheduler twice with the same input and compares results
- Look at the test structure:
  - Are arbitrary generators used to create diverse inputs?
  - Is `fc.assert()` or similar used with a high iteration count (100+)?
  - Does the assertion compare task IDs, dates, and allocated minutes?

**Questions to answer:**
- Are there property-based tests?
- Do they call the scheduler twice and compare outputs?
- How many runs are configured? (100+ is typical)

**Expected:** Property test assertion confirms `schedule(same input) === schedule(same input)` for 100+ generated cases.

---

### 8. Check Sort Order

**Goal:** Verify tasks are processed in the correct order: deadline ASC, then priority, then ID.

**Actions:**
- Find the sorting logic in the scheduler (usually early in the function)
- Identify the sort keys:
  - Primary: deadline (earliest first)
  - Secondary: priority weight (High=1, Medium=2, Low=3, lower first)
  - Tertiary: task ID (lower first)
- Check if the sort is stable
- Look for tests that compare schedule order or verify priority is respected

**Questions to answer:**
- What is the sort order? (deadline, then priority, then ID?)
- Is the sort stable?
- Do tests verify order? (e.g., two tasks same deadline but different priority scheduled in priority order)

**Expected:** Sort order matches spec. Tests confirm two equal-deadline, different-priority tasks scheduled in priority order.

---

## Reference Scenarios

Consult **`references/scenarios.md`** for concrete test inputs and expected outputs covering:
- Overloaded capacity (insufficient time for all work)
- Overdue tasks (deadline before today)
- Completed tasks (excluded from schedule)
- Split across days (task scheduled on multiple days)
- Equal deadlines with priority tie-breaking

---

## Reporting

**What to include in your findings:**
- Scheduler location (file, function name, line number)
- Type definitions location (file, line)
- Test file locations
- For each property (purity, conservation, capacity, deadline, exclusion, determinism, order):
  - ✅ Pass: Evidence from code and/or test assertion
  - ❌ Fail: Gap or violation with file/line reference
  - ⚠️ Partial: Code present but not tested, or test only covers subset of cases
- Summary of passing properties and any blockers

**Distinguish between:**
- **Code inspection:** "The function does not call `new Date()`" (from reading source)
- **Test evidence:** "Test `testConservation` verifies `allocated + unschedulable === estimatedMinutes`" (from reading tests)
- **Inferred:** Never. Report only what the code and tests show.

---

## Usage

1. Save this skill locally or in your `.kiro/skills/` directory
2. When reviewing a scheduler, read this document first
3. Follow the steps in order, recording findings per section
4. Consult scenarios.md for concrete test cases to check
5. Write your report, referencing files and line numbers throughout
6. Use the summary table format (property, status, evidence)

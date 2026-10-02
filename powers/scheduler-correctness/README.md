# Scheduler Correctness Power

A reusable Kiro Power for reviewing deterministic schedulers against correctness properties: purity, conservation, capacity, deadline compliance, task exclusion, determinism, and ordering.

**Version:** 1.0.0  
**Author:** Hemanth

---

## What It Does

This power provides a structured skill (`review-scheduler`) and reference scenarios to systematically review any deterministic scheduler—academic projects, production systems, or implementations in any language. It distinguishes between:
- **Code inspection** (reading source to verify properties)
- **Test evidence** (examining test assertions and property tests)
- Never inventing results

Use it to:
- Audit a scheduler before deployment
- Verify correctness properties are tested
- Review a new scheduler implementation against a spec
- Compare two scheduler implementations for correctness
- Teach scheduler design and verification practices

---

## Installation

This power is installed through the Kiro IDE **Powers panel**:

1. **Powers panel** → **Add Custom Power**
2. Choose **Import power from a folder**
3. Navigate to `powers/scheduler-correctness` in your workspace
4. Click **Import**

The power is now installed and ready to activate.

---

## Usage

To use the power:

1. **Activate it** — Open a chat session with the default agent and request to activate the installed `scheduler-correctness` Power
2. **Apply the skill** — The agent activates and uses the `review-scheduler` skill to audit a scheduler
3. **Review findings** — The skill provides 8 structured steps to verify correctness properties and reference scenarios for validation

The power guides you to:
- Locate the scheduling function and types
- Verify purity (no global state, explicit date input)
- Check conservation invariant (allocated + unschedulable = estimated)
- Verify capacity, deadline, and ordering constraints
- Distinguish code inspection from test evidence

---

## What's Inside

```
scheduler-correctness/
├── plugin.json                          # Power manifest
├── README.md                            # This file
└── skills/
    └── review-scheduler/
        ├── SKILL.md                     # Main review skill (8 properties)
        └── references/
            └── scenarios.md             # 8 concrete test scenarios with inputs/outputs
```

### Files

- **`plugin.json`** — Metadata: name, version, description, keywords
- **`SKILL.md`** — Step-by-step review process for each correctness property:
  1. Locate scheduler and types
  2. Check purity and explicit date inputs
  3. Verify minute/resource conservation
  4. Check daily capacity compliance
  5. Verify deadline enforcement
  6. Check completed-task exclusion
  7. Verify determinism
  8. Check sort order
  - Reporting guidelines: distinguish code inspection from tests
- **`scenarios.md`** — 8 concrete scenarios with fixed dates, inputs, and expected outputs:
  - Overloaded capacity
  - Overdue tasks
  - Completed tasks
  - Split across multiple days
  - Equal deadline with priority tie-breaking
  - Equal deadline/priority with ID tie-breaking
  - Zero-capacity days
  - Determinism verification

---

## Key Principles

1. **No MCP server needed** — This power contains only documentation and structured guidance. It's a skill and reference, not an automated tool.

2. **Inspect, don't execute** — The skill teaches code review; tests are examined, not run. (Tests can be run separately in the scheduler project.)

3. **Concrete scenarios** — All reference scenarios use explicit dates (`YYYY-MM-DD`), fixed task IDs, and precise expected outputs. No hand-waving.

4. **Never invent results** — Report only what code and tests show. Use clear language:
   - ✅ "The function does not call `new Date()`" (code inspection)
   - ✅ "Test `testConservation` verifies `allocated + unschedulable === estimatedMinutes`" (test evidence)
   - ❌ "The scheduler is probably deterministic" (speculation)

5. **File references throughout** — Always cite `file.ts:lineNumber` when reporting findings.

---

## Use Cases

### 1. Academic Project Review
Student implements a class scheduler. Use the skill to audit the code against the 8 properties. Consult scenarios to manually trace behavior. Report findings with file references.

### 2. Production Deployment Checklist
Before deploying a new scheduler, review using this power to verify:
- Conservation invariant (tested)
- Capacity constraints (tested)
- Deadline compliance (tested)
- Determinism (property tests exist)

### 3. Comparative Analysis
Two team members implement schedulers. Use the skill and scenarios to compare both for correctness, using the same criteria.

### 4. Learning Tool
Learn scheduler correctness properties by reading the skill, then applying each step to an example scheduler (e.g., StudySprint).

---

## StudySprint Example

The StudySprint application includes a pure scheduler (`src/scheduler/scheduler.ts`) that can be reviewed using this power:

```
Activate the scheduler-correctness power.

Review StudySprint's scheduler:

1. Location: src/scheduler/scheduler.ts, function schedule()
2. Types: src/types.ts (Task, Availability, ScheduleEntry, ScheduleResult)
3. Tests: src/tests/scheduler*.ts (unit, property, and regression tests)

Check each property from the skill:
- ✅ Pure: no new Date(), explicit today parameter
- ✅ Conservation: verified by property tests with fc.assert
- ✅ Capacity: tests verify per-day totals ≤ available
- ✅ Deadline: tests verify no entries past deadline
- ✅ Exclusion: completed tasks filtered before scheduling
- ✅ Determinism: property tests run scheduler twice, compare outputs
- ✅ Ordering: deadline ASC → priority ASC → ID ASC

Report your findings with file and line references.
```

---

## Extensibility

To extend this power for other scheduler types:

1. **Add a new scenario** to `references/scenarios.md` (e.g., "Network task scheduling", "Resource allocation")
2. **Add a new property** to `SKILL.md` (e.g., "Resource conflict detection", "Fairness across users")
3. **Create a variant skill** (e.g., `review-scheduler-parallel.md` for concurrent schedulers)

All follow the same structure: explicit steps, file references, and concrete scenarios.

---

## License

This power is provided as-is for review and educational purposes.

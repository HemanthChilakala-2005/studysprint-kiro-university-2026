# Reference Scenarios for Scheduler Testing

This document provides concrete inputs and expected outputs for testing a deterministic scheduler. Use these scenarios to verify correctness properties during code review.

---

## Scenario 1: Overloaded Capacity

**Setup:** Total work required exceeds available time within deadlines.

**Input:**

| Task ID | Title | Deadline | Est. Min | Priority |
|---------|-------|----------|----------|----------|
| 1 | Math homework | 2025-01-17 | 180 | High |
| 2 | History essay | 2025-01-18 | 200 | Medium |
| 3 | Physics lab | 2025-01-20 | 150 | Low |

**Availability:**

```
2025-01-15: 60 min
2025-01-16: 60 min
2025-01-17: 60 min
2025-01-18: 60 min
2025-01-19: 0 min (unavailable)
2025-01-20: 60 min
```

**Today:** `2025-01-15`

**Total available:** 300 min (5 days × 60)  
**Total needed:** 530 min  
**Expected unschedulable:** 230 min

**Expected behavior:**

Tasks scheduled in order: deadline ASC (task 1 first), then priority.

| Task | Date | Minutes | Notes |
|------|------|---------|-------|
| 1 (Math, High, 2025-01-17) | 2025-01-15 | 60 | Highest priority, earliest deadline |
| 1 (Math) | 2025-01-16 | 60 | Continue Math |
| 1 (Math) | 2025-01-17 | 60 | Complete by deadline |
| 2 (History, Medium, 2025-01-18) | 2025-01-18 | 60 | Only 60 min before deadline |
| 2 (History, unschedulable) | — | 140 | Cannot fit 140 remaining minutes |
| 3 (Physics, Low, 2025-01-20) | 2025-01-20 | 60 | Last slot available |
| 3 (Physics, unschedulable) | — | 90 | Cannot fit 90 remaining minutes |

**Conservation check:**
- Task 1: 60+60+60 = 180 ✓ (fully scheduled)
- Task 2: 60 + 140 = 200 ✓ (60 allocated + 140 unschedulable)
- Task 3: 60 + 90 = 150 ✓ (60 allocated + 90 unschedulable)

---

## Scenario 2: Overdue Tasks

**Setup:** Task deadline is strictly before today (in the past).

**Input:**

| Task ID | Title | Deadline | Est. Min | Priority |
|---------|-------|----------|----------|----------|
| 1 | Overdue project | 2025-01-10 | 120 | High |
| 2 | Current task | 2025-01-20 | 90 | Medium |

**Availability:**

```
2025-01-15: 60 min
2025-01-16: 60 min
2025-01-20: 60 min
```

**Today:** `2025-01-15` (deadline for task 1 is 2025-01-10, which is < 2025-01-15)

**Expected behavior:**

- Task 1: Entirely unschedulable (deadline in past)
- Task 2: Scheduled normally

**Schedule:**

| Task | Date | Minutes |
|------|------|---------|
| 2 (Current, 2025-01-20) | 2025-01-15 | 60 |
| 2 (Current) | 2025-01-16 | 30 |

**Unschedulable:**

- Task 1 (Overdue): 120 min (all minutes unschedulable; deadline < today)
- Task 2: 0 min (all 90 min scheduled: 60+30)

---

## Scenario 3: Completed Tasks

**Setup:** Some tasks are marked as complete; they should not appear in the schedule.

**Input:**

| Task ID | Title | Deadline | Est. Min | Priority | Completed |
|---------|-------|----------|----------|----------|-----------|
| 1 | Done task | 2025-01-15 | 120 | High | Yes |
| 2 | Active task | 2025-01-20 | 60 | Medium | No |

**Availability:**

```
2025-01-15: 60 min
2025-01-20: 60 min
```

**Today:** `2025-01-15`

**Expected behavior:**

Only incomplete tasks are scheduled.

**Schedule:**

| Task | Date | Minutes |
|------|------|---------|
| 2 (Active, 2025-01-20) | 2025-01-20 | 60 |

**Unschedulable:**

- Task 1: (not included; completed tasks excluded entirely)
- Task 2: 0 min (fully scheduled)

---

## Scenario 4: Split Across Multiple Days

**Setup:** A task is larger than any single day's capacity; it must be split across multiple days before the deadline.

**Input:**

| Task ID | Title | Deadline | Est. Min | Priority |
|---------|-------|----------|----------|----------|
| 1 | Large project | 2025-01-18 | 180 | High |

**Availability:**

```
2025-01-15: 90 min
2025-01-16: 90 min
2025-01-17: 90 min
2025-01-18: 90 min
```

**Today:** `2025-01-15`

**Expected behavior:**

Task splits across multiple days, respecting both capacity and deadline.

**Schedule:**

| Task | Date | Minutes |
|------|------|---------|
| 1 (Large project) | 2025-01-15 | 90 |
| 1 (Large project) | 2025-01-16 | 90 |
| 1 (Large project) | 2025-01-17 | 0 | (no allocation needed; 180 already complete)

OR

| Task | Date | Minutes |
|------|------|---------|
| 1 (Large project) | 2025-01-15 | 90 |
| 1 (Large project) | 2025-01-16 | 90 |

**Unschedulable:** 0 min (fully scheduled before deadline)

---

## Scenario 5: Equal Deadline, Priority Tie-Breaking

**Setup:** Two tasks share the same deadline. The higher-priority task should be scheduled first.

**Input:**

| Task ID | Title | Deadline | Est. Min | Priority |
|---------|-------|----------|----------|----------|
| 1 | Priority 1 | 2025-01-20 | 120 | High |
| 2 | Priority 2 | 2025-01-20 | 120 | Low |

**Availability:**

```
2025-01-15: 60 min
2025-01-16: 60 min
2025-01-17: 60 min
2025-01-18: 60 min
2025-01-19: 60 min
2025-01-20: 60 min
```

**Today:** `2025-01-15`

**Total available:** 360 min (6 days × 60)  
**Total needed:** 240 min (both tasks)

**Expected behavior:**

Both tasks fit, but task 1 (High priority) is processed first in the allocation order.

**Schedule (in order of allocation):**

| Task | Date | Minutes | Notes |
|------|------|---------|-------|
| 1 (High) | 2025-01-15 | 60 | Task 1 starts first |
| 1 (High) | 2025-01-16 | 60 | Continue task 1 |
| 2 (Low) | 2025-01-17 | 60 | Task 2 starts after task 1 |
| 2 (Low) | 2025-01-18 | 60 | Continue task 2 |

**Unschedulable:** Both tasks 0 min (fully scheduled)

**Conservation:**
- Task 1: 60+60 = 120 ✓
- Task 2: 60+60 = 120 ✓

---

## Scenario 6: Equal Deadline and Priority, ID Tie-Breaking

**Setup:** Two tasks share deadline and priority. Lower task ID should be scheduled first.

**Input:**

| Task ID | Title | Deadline | Est. Min | Priority |
|---------|-------|----------|----------|----------|
| 1 | Task A | 2025-01-20 | 120 | High |
| 2 | Task B | 2025-01-20 | 120 | High |

**Availability:**

```
2025-01-15: 60 min
2025-01-16: 60 min
2025-01-17: 60 min
2025-01-18: 60 min
```

**Today:** `2025-01-15`

**Total available:** 240 min  
**Total needed:** 240 min

**Expected behavior:**

Task 1 (lower ID) scheduled before task 2.

**Schedule:**

| Task | Date | Minutes |
|------|------|---------|
| 1 (Task A) | 2025-01-15 | 60 |
| 1 (Task A) | 2025-01-16 | 60 |
| 2 (Task B) | 2025-01-17 | 60 |
| 2 (Task B) | 2025-01-18 | 60 |

**Unschedulable:** Both 0 min (fully scheduled)

---

## Scenario 7: Zero Capacity Days

**Setup:** Some days have 0 available minutes; scheduler should skip them.

**Input:**

| Task ID | Title | Deadline | Est. Min | Priority |
|---------|-------|----------|----------|----------|
| 1 | Task | 2025-01-20 | 120 | High |

**Availability:**

```
2025-01-15: 60 min
2025-01-16: 0 min   (unavailable)
2025-01-17: 0 min   (unavailable)
2025-01-18: 60 min
2025-01-19: 60 min
2025-01-20: 0 min   (unavailable)
```

**Today:** `2025-01-15`

**Expected behavior:**

Scheduler allocates only on days with capacity > 0, skipping zero-capacity days.

**Schedule:**

| Task | Date | Minutes |
|------|------|---------|
| 1 (Task) | 2025-01-15 | 60 |
| 1 (Task) | 2025-01-18 | 60 |

**Unschedulable:** 0 min (fully scheduled on available days before deadline)

---

## Scenario 8: Determinism Check

**Setup:** Run the scheduler twice with identical inputs; output must be identical.

**Input (same both runs):**

| Task ID | Title | Deadline | Est. Min | Priority |
|---------|-------|----------|----------|----------|
| 1 | Task A | 2025-01-18 | 120 | High |
| 2 | Task B | 2025-01-18 | 90 | Low |

**Availability (same both runs):**

```
2025-01-15: 60 min
2025-01-16: 60 min
2025-01-17: 60 min
2025-01-18: 60 min
```

**Today (same both runs):** `2025-01-15`

**Expected behavior:**

Both calls return identical results (same entries in same order, same unschedulable map).

**Run 1 result ≡ Run 2 result**

---

## How to Use These Scenarios

1. **During code review:** Manually trace your scheduler through one or two scenarios to verify behavior
2. **In unit tests:** Create test cases for each scenario using your testing framework
3. **In property tests:** Generate similar scenarios with variants (different capacities, priorities, deadlines) and verify properties hold
4. **When comparing schedulers:** Run both schedulers on all scenarios and compare outputs

All dates use explicit `YYYY-MM-DD` format. All comparisons are lexicographic (string-based) unless the scheduler explicitly parses to Date objects.

# Requirements Document

## Introduction

StudySprint is a browser-based study planner that helps students fit their tasks into the time available before each deadline. Students add tasks with a title, subject, deadline, estimated duration, and priority. They also declare how many minutes they can study on each day. A deterministic scheduling engine then distributes task work across days, respects deadlines and daily capacity, and surfaces any minutes that cannot be placed. All data is persisted in browser-local storage. The app exports the generated schedule as JSON and provides a responsive, keyboard-accessible interface. There is no backend and no paid APIs.

### Assumptions

- "Day" and "deadline" are interpreted using the user's local calendar date (from `Intl.DateTimeFormat` or equivalent), never UTC.
- A task whose deadline is today may still be scheduled on today's date.
- A task is considered overdue if its deadline is strictly before today's local date.
- An "available minutes" entry of 0 means the user cannot study that day; the scheduler skips it.
- Task splitting is allowed: a task may be spread across multiple days.
- A completed task is excluded from scheduling but remains visible in the task list.
- Priority levels are: **High**, **Medium**, **Low** (High is most urgent).
- Priority numeric weights for tie-breaking: High = 1, Medium = 2, Low = 3 (lower number = scheduled first).
- When two tasks share the same deadline and priority, the one with the lower stable task ID is scheduled first.
- Estimated minutes must be a positive integer (≥ 1).
- Available minutes per day must be a non-negative integer (≥ 0).
- The scheduler is a pure, side-effect-free function that can be tested independently of the UI.

---

## Glossary

- **Task**: A unit of study work with a title, subject, deadline, estimated minutes, priority, completion status, and a stable numeric ID assigned at creation time.
- **Subject**: A free-text label grouping tasks by course or topic (e.g., "Math", "History").
- **Deadline**: The local calendar date by which a task must be finished (inclusive).
- **Estimated Minutes**: The total number of minutes required to complete a task.
- **Priority**: One of three levels — High, Medium, or Low — used for tie-breaking during scheduling.
- **Availability**: A map from local calendar date strings (`YYYY-MM-DD`) to non-negative integers representing the number of minutes the user can study on that day.
- **Schedule**: An ordered list of `ScheduleEntry` objects, each assigning a number of minutes of a specific task to a specific day.
- **ScheduleEntry**: A record containing task ID, task title, subject, local date (`YYYY-MM-DD`), and allocated minutes.
- **Overdue Task**: A task whose deadline is strictly before today's local date and that is not yet complete.
- **Unschedulable Minutes**: Minutes from a task that the Scheduler could not place within the task's deadline given the remaining daily availability.
- **Scheduler**: The pure scheduling engine that maps tasks and availability to a Schedule.
- **Storage**: The browser's `localStorage` API, used to persist tasks and availability.
- **Export**: A JSON file download containing the current Schedule.

---

## Requirements

### Requirement 1: Task Management

**User Story:** As a student, I want to add, edit, delete, and complete tasks, so that I can maintain an accurate list of study work.

#### Acceptance Criteria

1. THE Task_Manager SHALL assign a unique, stable, auto-incrementing integer ID to each Task at creation time; IDs SHALL NOT be reassigned after a Task is deleted.
2. WHEN a user submits a new task with a non-empty title of 1–200 characters, a non-empty subject of 1–100 characters, a valid calendar date as the deadline, a positive integer estimated minutes value between 1 and 1440, and a priority level of Low, Medium, or High, THE Task_Manager SHALL add the Task to the task list and display it in the task list within 1 second.
3. IF a user submits a new task with a title that is empty or contains only whitespace after trimming, THEN THE Task_Manager SHALL reject the submission and display an inline validation error on the title field.
4. IF a user submits a new task with a subject that is empty or contains only whitespace after trimming, THEN THE Task_Manager SHALL reject the submission and display an inline validation error on the subject field.
5. IF a user submits a new task with an estimated minutes value that is not a finite safe integer, or is less than 1, or is greater than 1440, THEN THE Task_Manager SHALL reject the submission and display an inline validation error on the estimated minutes field.
6. IF a user submits a new task without selecting a priority, THEN THE Task_Manager SHALL reject the submission and display an inline validation error on the priority field.
7. IF a user submits a new task with a title exceeding 200 characters, THEN THE Task_Manager SHALL reject the submission and display an inline validation error on the title field.
8. IF a user submits a new task with a subject exceeding 100 characters, THEN THE Task_Manager SHALL reject the submission and display an inline validation error on the subject field.
9. WHEN a user submits a new or edited task with a deadline date that is a valid calendar date and is strictly before today's local date, THE Task_Manager SHALL accept the task and display a visible overdue indicator alongside that task in the task list.
10. WHEN a user edits an existing task and submits updated values that satisfy the same validation rules as task creation, THE Task_Manager SHALL update the Task in place, preserving the original task ID, and reflect the changes in the task list within 1 second.
11. IF a user submits an edited task with any invalid field value, THEN THE Task_Manager SHALL reject the submission, display an inline validation error on each invalid field, and preserve the task's previously saved values unchanged.
12. WHEN a user marks a task as complete, THE Task_Manager SHALL set the task's completion status to true and retain the Task in the task list.
13. WHEN a user marks a complete task as incomplete, THE Task_Manager SHALL set the task's completion status to false and retain the Task in the task list.
14. WHEN a user deletes a task, THE Task_Manager SHALL remove the Task from the task list permanently and confirm the removal by no longer displaying the Task in the task list.
15. IF a user submits a new or edited task with a deadline that is not a valid calendar date (e.g. 2024-02-30), THEN THE Task_Manager SHALL reject the submission and display an inline validation error on the deadline field.

---

### Requirement 2: Daily Availability Management

**User Story:** As a student, I want to set how many minutes I can study each day, so that the scheduler knows my capacity.

#### Acceptance Criteria

1. WHEN a user sets available minutes for a local calendar date to a non-negative integer, THE Availability_Manager SHALL store the value in the Availability map under the key `YYYY-MM-DD` formatted using the user's local time zone.
2. IF a user submits an available minutes value that is not a finite safe integer, or is not a non-negative integer, THEN THE Availability_Manager SHALL reject the input and display an inline validation error indicating that the value must be a whole number between 0 and 1440 inclusive.
3. WHEN a user updates the available minutes for a date that already has an entry, THE Availability_Manager SHALL overwrite the previous value with the new value.
4. THE Availability_Manager SHALL allow a user to set available minutes for any local date, including past dates.
5. IF a user submits an available minutes value greater than 1440, THEN THE Availability_Manager SHALL reject the input and display an inline validation error indicating that the value must be between 0 and 1440 inclusive.
6. WHEN a user sets available minutes for a date to 0, THE Availability_Manager SHALL store the value 0 and the Scheduler SHALL treat that date as having no capacity.

---

### Requirement 3: Deterministic Schedule Generation

**User Story:** As a student, I want the app to generate a daily study schedule from my tasks and availability, so that I know exactly what to study each day.

#### Acceptance Criteria

1. WHEN the user requests schedule generation, THE Scheduler SHALL produce a Schedule by iterating over local calendar dates from the reference date (today's local date, calculated by the UI and passed explicitly as a parameter) through the latest deadline among all incomplete tasks, in ascending date order.
2. THE Scheduler SHALL exclude Tasks whose completion status is marked as complete from all Schedule output.
3. THE Scheduler SHALL process Tasks in the following sort order (ascending): primary key is deadline date (earliest first); secondary key is priority weight (High = 1, Medium = 2, Low = 3, so lower weight first); tertiary key is task ID (lower ID first).
4. THE Scheduler SHALL, for each Task in sorted order, allocate minutes on days where the remaining capacity from the availability map is greater than zero and the day is on or before the task's deadline, filling the earliest available days first.
5. THE Scheduler SHALL NOT allocate minutes on a day whose available minutes as defined by the availability map is zero or has no entry.
6. THE Scheduler SHALL NOT allocate minutes to a Task on a date after the Task's deadline.
7. WHEN all estimated minutes for a Task are allocated, THE Scheduler SHALL mark that Task as fully scheduled and move to the next Task.
8. WHEN a Task's estimated minutes cannot be fully placed before or on its deadline, THE Scheduler SHALL record the remaining unplaceable minutes as Unschedulable Minutes for that Task.
9. THE Scheduler SHALL produce identical output for identical inputs (deterministic): given the same task list, availability map, and today's date, the Scheduler SHALL always return the same Schedule.
10. WHEN the task list contains no incomplete Tasks, THE Scheduler SHALL return an empty Schedule.
11. THE Scheduler output SHALL be a value containing: a list of blocks (each with task ID, date, and allocated minutes), and a map of task ID to unschedulable minutes for tasks that could not be fully placed.
12. IF a Task has an estimated minutes value of zero or less, THE Scheduler SHALL skip that Task and SHALL NOT add any ScheduleEntry or Unschedulable Minutes for it.
13. WHEN any Task is created, updated, deleted, or has its completion status changed, OR WHEN the Availability map changes, THE UI SHALL discard the current Schedule and display a prompt or indicator informing the user that the schedule is out of date and must be regenerated.

---

### Requirement 4: Overdue and Edge-Case Handling

**User Story:** As a student, I want the app to handle overdue tasks and unusual inputs clearly, so that the schedule is always honest and accurate.

#### Acceptance Criteria

1. WHEN the Scheduler encounters an incomplete Task whose deadline is strictly before the reference date, THE Scheduler SHALL record all of the Task's estimated minutes as Unschedulable Minutes, SHALL NOT add any ScheduleEntry for that Task, and the conservation invariant (allocated minutes + unschedulable minutes = estimated minutes) SHALL hold.
2. WHEN the Availability map contains no entries for any date on or between today's local date and the latest Task deadline (inclusive), THE Scheduler SHALL record all incomplete Task estimated minutes as Unschedulable Minutes and SHALL NOT add any ScheduleEntry.
3. WHEN total incomplete Task estimated minutes exceed total available minutes across all dates on or between today's local date and the latest Task deadline (inclusive), THE Scheduler SHALL allocate available minutes to Tasks in sort order (earliest deadline first, then priority, then task ID), filling each Task's estimated minutes fully before moving to the next, until no available minutes remain, and SHALL record each Task's unallocated estimated minutes as that Task's Unschedulable Minutes.
4. WHEN the Scheduler run completes and one or more Tasks have Unschedulable Minutes greater than zero, THE UI SHALL display the total Unschedulable Minutes prominently alongside the Schedule, grouped by Task name, with each Task's Unschedulable Minutes shown as a whole number of minutes.
5. IF a Task's estimated minutes value is zero or negative, THEN THE Scheduler SHALL skip that Task, exclude it from Unschedulable Minutes, and SHALL NOT add any ScheduleEntry for that Task.

---

### Requirement 5: Local Date Handling

**User Story:** As a student, I want all dates to reflect my local calendar, so that deadlines and schedules are accurate in my time zone.

#### Acceptance Criteria

1. THE UI SHALL derive today's local date (year, month, day) from the browser's environment at the moment the user requests schedule generation, never from UTC conversion, with month and day zero-padded to form a valid `YYYY-MM-DD` string, and SHALL pass it as an explicit parameter to the Scheduler; the Scheduler SHALL NOT read the current date itself.
2. THE Task_Manager SHALL store deadline dates as `YYYY-MM-DD` strings derived from the user's local time zone at the moment the deadline is saved, with month and day zero-padded to two digits.
3. THE Availability_Manager SHALL store availability keys as `YYYY-MM-DD` strings derived from the user's local time zone at the moment the availability is recorded, with month and day zero-padded to two digits.
4. WHEN comparing a task deadline to today's date, THE Scheduler SHALL compare the two `YYYY-MM-DD` strings lexicographically (an earlier string equals an earlier date), and SHALL NOT parse either string as a UTC timestamp.
5. IF the browser environment cannot provide a local time zone at the time of any date operation, THEN THE system SHALL display a non-blocking error message indicating that date operations may be unreliable, and SHALL NOT proceed with schedule generation.

---

### Requirement 6: Persistence

**User Story:** As a student, I want my tasks and availability settings to survive a page refresh, so that I don't lose my data.

#### Acceptance Criteria

1. WHEN any Task is created, updated, deleted, or its completion status changes, THE Storage_Manager SHALL write the full task list to `localStorage` under the key `studysprint_tasks` as a JSON string within 500 ms of the change.
2. WHEN the available minutes for any date change, THE Storage_Manager SHALL write the full Availability map to `localStorage` under the key `studysprint_availability` as a JSON string within 500 ms of the change.
3. WHEN the application initialises, THE Storage_Manager SHALL read tasks and availability from `localStorage` and restore them to application state within 1000 ms, before rendering the task list or schedule.
4. IF the value stored under `studysprint_tasks` or `studysprint_availability` is not valid JSON or does not conform to the expected schema, THEN THE Storage_Manager SHALL discard the corrupted value, initialise the corresponding state as empty, and display a non-blocking warning to the user identifying which key was discarded.
5. IF `localStorage` is unavailable due to browser restrictions or a quota-exceeded error, THEN THE Storage_Manager SHALL allow the application to operate in-memory and display a persistent banner informing the user that data will not be saved across refreshes.
6. WHEN the application initialises and no data exists in `localStorage` for `studysprint_tasks` or `studysprint_availability`, THE Storage_Manager SHALL silently initialise the corresponding state as empty without displaying any warning.
7. THE Storage_Manager SHALL persist the next available task ID counter to `localStorage` under the key `studysprint_next_id` as a JSON integer, updating it whenever a new Task is created, and SHALL restore it on application initialisation so that task IDs are never reused across sessions or after tasks are deleted.

---

### Requirement 7: Schedule Export

**User Story:** As a student, I want to export my schedule as a JSON file, so that I can save or share it.

#### Acceptance Criteria

1. WHEN the user activates the Export button and the Schedule contains at least one ScheduleEntry, THE Export_Manager SHALL trigger a browser file download of a JSON file named `studysprint-schedule-<YYYY-MM-DD>.json`, where the date is today's local date.
2. THE Export_Manager SHALL structure the exported JSON file as an array containing all ScheduleEntry objects from the Schedule, where each object contains: `taskId` (integer), `taskTitle` (string), `subject` (string), `date` (string, `YYYY-MM-DD`), and `allocatedMinutes` (integer between 1 and 1440 inclusive).
3. IF the Schedule contains no ScheduleEntry objects when the user activates the Export button, THEN THE Export_Manager SHALL display a non-blocking inline message indicating that there is no schedule data to export, and SHALL NOT initiate a file download.
4. IF the browser prevents or fails the file download after THE Export_Manager initiates it, THEN THE Export_Manager SHALL display an error message indicating that the download could not be completed.

---

### Requirement 8: Responsive and Accessible Interface

**User Story:** As a student, I want a clear, responsive, keyboard-accessible interface, so that I can use the app on any device without difficulty.

#### Acceptance Criteria

1. THE UI SHALL render all content correctly on viewport widths from 320 px to 1920 px without horizontal scrolling or content clipping, verified at breakpoints 320 px, 375 px, 768 px, 1024 px, 1280 px, and 1920 px.
2. THE UI SHALL assign an `aria-label` or a visible text label to every interactive control (buttons, inputs, selects), where the label text is non-empty and descriptive of the control's purpose.
3. WHEN a user navigates using only the keyboard (Tab, Shift+Tab, Enter, Space), THE UI SHALL allow the user to reach and activate all interactive controls without requiring a pointer device, and focus order SHALL follow the visual reading order of the page (top-to-bottom, left-to-right).
4. WHEN focus moves to an interactive control, THE UI SHALL display a visible focus indicator with a minimum outline area of 3 px and a contrast ratio of at least 3 : 1 between the indicator and the adjacent background color.
5. THE UI SHALL maintain a contrast ratio of at least 4.5 : 1 between text and its background for all text at font sizes below 18 pt (or below 14 pt bold), and at least 3 : 1 for text at 18 pt or above (or 14 pt bold or above), in line with WCAG 2.1 AA.
6. WHEN a form validation error occurs, THE UI SHALL associate the error message with its corresponding input using `aria-describedby`, so that the error message is announced by screen readers when the input receives focus, and the error message SHALL remain visible until the validation condition is resolved.
7. IF a UI layout change is triggered by a viewport width transition between breakpoints, THEN THE UI SHALL complete the layout reflow within 300 ms without loss of content or interactive controls.
8. WHEN the UI is rendered on a touch-capable device, THE UI SHALL ensure every interactive control has a touch target size of at least 44 × 44 px.

---

### Requirement 9: Scheduling Engine Correctness Properties

**User Story:** As a developer, I want the scheduling engine to be verified against formal correctness properties, so that regressions are caught automatically.

#### Acceptance Criteria

1. **Daily Capacity**: FOR ALL valid inputs, THE Scheduler SHALL produce a Schedule in which the sum of `allocatedMinutes` for any single date does not exceed the `dailyAvailableMinutes` for that date as specified in the availability map; dates absent from the map have zero capacity and SHALL receive no allocations.
2. **Deadline Compliance**: FOR ALL valid inputs, THE Scheduler SHALL produce a Schedule in which no ScheduleEntry has a date later than the deadline of the referenced Task.
3. **Conservation of Minutes**: FOR ALL valid inputs, FOR EACH incomplete Task, the sum of `allocatedMinutes` across all ScheduleEntries for that Task plus that Task's Unschedulable Minutes SHALL equal the Task's estimated minutes exactly; this property holds regardless of whether the Task is overdue, fully schedulable, or partially schedulable.
4. **Determinism (Round-Trip)**: FOR ALL valid inputs, calling THE Scheduler twice with the same task list, availability map, and reference date SHALL return two Schedule values with identical `taskId`, `date`, and `allocatedMinutes` fields per entry in the same order.
5. **Exclusion of Completed Tasks**: FOR ALL valid inputs, THE Scheduler SHALL produce a Schedule that contains no ScheduleEntry whose `taskId` matches a Task with a completion status of complete in the input.
6. **Non-negativity**: FOR ALL valid inputs, THE Scheduler SHALL produce a Schedule in which every `allocatedMinutes` value is a positive integer greater than zero.
7. **Overdue Tasks Excluded**: FOR ALL tasks whose deadline is before the reference date supplied to the Scheduler at invocation time, THE Scheduler SHALL include zero ScheduleEntries for those tasks.
8. **Empty Input**: WHEN the task list is empty or all tasks are completed, THE Scheduler SHALL return an empty Schedule (zero ScheduleEntries).

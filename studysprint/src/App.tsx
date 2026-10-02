// src/App.tsx
// Top-level orchestrator: loads persisted state, wires hooks, manages schedule invalidation.
// [Req 3.13, 5.1, 6]

import { useState, useCallback, useMemo } from "react";
import { storageManager } from "./storage/storageManager";
import { useTaskManager } from "./hooks/useTaskManager";
import { useAvailabilityManager } from "./hooks/useAvailabilityManager";
import { schedule } from "./scheduler/scheduler";
import { getTodayLocal, formatLocalDate } from "./scheduler/dateUtils";
import type { ScheduleResult, Task } from "./types";
import { TaskForm } from "./components/TaskForm";
import { TaskList } from "./components/TaskList";
import { AvailabilityPanel } from "./components/AvailabilityPanel";
import { SchedulePanel } from "./components/SchedulePanel";
import { StorageBanner } from "./components/StorageBanner";

// Load initial state once at module level (synchronous localStorage read)
const { tasks: initTasks, nextId: initNextId, warning: tasksWarning } = storageManager.loadTasks();
const { data: initAvail, warning: availWarning } = storageManager.loadAvailability();
const initWarnings = [tasksWarning, availWarning].filter(Boolean) as string[];

export function App() {
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Invalidate schedule whenever tasks or availability mutate [Req 3.13]
  // Only show stale warning if a schedule was previously generated
  const handleMutate = useCallback(() => {
    setScheduleResult(null);
    if (hasGenerated) {
      setExportMessage("Tasks or availability changed. Generate a new schedule.");
    }
  }, [hasGenerated]);

  const { tasks, addTask, editTask, deleteTask, toggleComplete } = useTaskManager(
    storageManager, initTasks, initNextId, handleMutate,
  );
  const { availability, setMinutes } = useAvailabilityManager(
    storageManager, initAvail, handleMutate,
  );

  const today = useMemo(() => getTodayLocal(), []);

  function handleGenerate() {
    const result = schedule(tasks, availability, getTodayLocal()); // fresh local date at generation time
    setScheduleResult(result);
    setHasGenerated(true);
    setExportMessage(null);
  }

  function handleExport() {
    if (!scheduleResult || scheduleResult.entries.length === 0) {
      setExportMessage("No schedule data to export. Generate a schedule first.");
      return;
    }
    try {
      const json = JSON.stringify(scheduleResult.entries, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studysprint-schedule-${formatLocalDate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportMessage(null);
    } catch {
      setExportMessage("Download could not be completed. Please try again.");
    }
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleTaskSubmit(data: import("./hooks/useTaskManager").TaskFormData) {
    if (editingTask) {
      const errs = editTask(editingTask.id, data);
      if (!errs) setEditingTask(null);
      return errs;
    }
    return addTask(data);
  }

  return (
    <>
      <header className="app-header">
        <h1>StudySprint</h1>
      </header>

      <main>
        <div className="app-layout">
          {/* Storage warnings */}
          {(initWarnings.length > 0 || !storageManager.isAvailable()) && (
            <div className="full-width">
              <StorageBanner
                visible={!storageManager.isAvailable()}
                warnings={initWarnings}
              />
            </div>
          )}

          {/* Task form */}
          <div className="card">
            <h2>{editingTask ? `Editing: ${editingTask.title}` : "Add task"}</h2>
            <TaskForm
              editingTask={editingTask}
              today={today}
              onSubmit={handleTaskSubmit}
              onCancel={editingTask ? () => setEditingTask(null) : undefined}
            />
          </div>

          {/* Availability */}
          <div className="card">
            <h2>Daily availability</h2>
            <AvailabilityPanel
              availability={availability}
              today={today}
              onSet={setMinutes}
            />
          </div>

          {/* Task list */}
          <div className="card full-width">
            <h2>Tasks ({tasks.length})</h2>
            <TaskList
              tasks={tasks}
              today={today}
              onEdit={handleEdit}
              onDelete={deleteTask}
              onToggleComplete={toggleComplete}
            />
          </div>

          {/* Schedule */}
          <div className="card full-width">
            <h2>Schedule</h2>
            <SchedulePanel
              scheduleResult={scheduleResult}
              hasGenerated={hasGenerated}
              tasks={tasks}
              onGenerate={handleGenerate}
              onExport={handleExport}
              exportMessage={exportMessage}
            />
          </div>
        </div>
      </main>
    </>
  );
}
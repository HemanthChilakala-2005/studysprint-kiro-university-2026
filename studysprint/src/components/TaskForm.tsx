// src/components/TaskForm.tsx
// Add / edit task form with per-field validation. [Req 1, 8.6]

import { useState, useEffect, useId } from "react";
import type { Task } from "../types";
import type { TaskFormData, TaskFormErrors } from "../hooks/useTaskManager";
import { emptyTaskErrors } from "../hooks/useTaskManager";
import { isOverdue } from "../hooks/useTaskManager";

interface Props {
  editingTask?: Task | null;
  today: string;
  onSubmit: (data: TaskFormData) => TaskFormErrors | null;
  onCancel?: () => void;
}

export function TaskForm({ editingTask, today, onSubmit, onCancel }: Props) {
  const uid = useId();
  const [data, setData] = useState<TaskFormData>({
    title: "", subject: "", deadline: today, estimatedMinutes: "", priority: "",
  });
  const [errors, setErrors] = useState<TaskFormErrors>(emptyTaskErrors);

  useEffect(() => {
    if (editingTask) {
      setData({
        title: editingTask.title,
        subject: editingTask.subject,
        deadline: editingTask.deadline,
        estimatedMinutes: String(editingTask.estimatedMinutes),
        priority: editingTask.priority,
      });
      setErrors(emptyTaskErrors);
    } else {
      setData({ title: "", subject: "", deadline: today, estimatedMinutes: "", priority: "" });
      setErrors(emptyTaskErrors);
    }
  }, [editingTask, today]);

  function set(field: keyof TaskFormData, value: string) {
    setData((d) => ({ ...d, [field]: value }));
    setErrors((e) => ({ ...e, [field]: null }));
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const result = onSubmit(data);
    if (result) setErrors(result);
    else {
      setData({ title: "", subject: "", deadline: today, estimatedMinutes: "", priority: "" });
      setErrors(emptyTaskErrors);
    }
  }

  const showOverdueNote = data.deadline && isOverdue(data.deadline, today);

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={editingTask ? "Edit task" : "Add task"}>
      <div className={`form-group${errors.title ? " has-error" : ""}`}>
        <label htmlFor={`${uid}-title`}>Title</label>
        <input
          id={`${uid}-title`} type="text" value={data.title} maxLength={201}
          onChange={(e) => set("title", e.target.value)}
          aria-describedby={errors.title ? `${uid}-title-err` : undefined}
          aria-required="true" autoComplete="off"
        />
        {errors.title && <p id={`${uid}-title-err`} className="field-error" role="alert">{errors.title}</p>}
      </div>

      <div className={`form-group${errors.subject ? " has-error" : ""}`}>
        <label htmlFor={`${uid}-subject`}>Subject</label>
        <input
          id={`${uid}-subject`} type="text" value={data.subject} maxLength={101}
          onChange={(e) => set("subject", e.target.value)}
          aria-describedby={errors.subject ? `${uid}-subject-err` : undefined}
          aria-required="true" autoComplete="off"
        />
        {errors.subject && <p id={`${uid}-subject-err`} className="field-error" role="alert">{errors.subject}</p>}
      </div>

      <div className="form-row">
        <div className={`form-group${errors.deadline ? " has-error" : ""}`}>
          <label htmlFor={`${uid}-deadline`}>Deadline</label>
          <input
            id={`${uid}-deadline`} type="date" value={data.deadline}
            onChange={(e) => set("deadline", e.target.value)}
            aria-describedby={`${uid}-deadline-desc${errors.deadline ? ` ${uid}-deadline-err` : ""}`}
            aria-required="true"
          />
          <p id={`${uid}-deadline-desc`} className="field-error" style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>
            {showOverdueNote ? "⚠ Past deadline — task will be marked overdue." : " "}
          </p>
          {errors.deadline && <p id={`${uid}-deadline-err`} className="field-error" role="alert">{errors.deadline}</p>}
        </div>

        <div className={`form-group${errors.estimatedMinutes ? " has-error" : ""}`}>
          <label htmlFor={`${uid}-mins`}>Est. minutes (1–1440)</label>
          <input
            id={`${uid}-mins`} type="number" value={data.estimatedMinutes} min={1} max={1440}
            onChange={(e) => set("estimatedMinutes", e.target.value)}
            aria-describedby={errors.estimatedMinutes ? `${uid}-mins-err` : undefined}
            aria-required="true"
          />
          {errors.estimatedMinutes && <p id={`${uid}-mins-err`} className="field-error" role="alert">{errors.estimatedMinutes}</p>}
        </div>
      </div>

      <div className={`form-group${errors.priority ? " has-error" : ""}`}>
        <label htmlFor={`${uid}-priority`}>Priority</label>
        <select
          id={`${uid}-priority`} value={data.priority}
          onChange={(e) => set("priority", e.target.value)}
          aria-describedby={errors.priority ? `${uid}-priority-err` : undefined}
          aria-required="true"
        >
          <option value="">— select —</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        {errors.priority && <p id={`${uid}-priority-err`} className="field-error" role="alert">{errors.priority}</p>}
      </div>

      <div className="btn-group">
        <button type="submit" className="btn btn-primary">
          {editingTask ? "Save changes" : "Add task"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
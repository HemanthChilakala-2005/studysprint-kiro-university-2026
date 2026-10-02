// src/components/TaskList.tsx
// Renders the task list with overdue badges, edit/delete/complete actions. [Req 1]

import type { Task } from "../types";
import { isOverdue } from "../hooks/useTaskManager";

interface Props {
  tasks: Task[];
  today: string;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onToggleComplete: (id: number) => void;
}

export function TaskList({ tasks, today, onEdit, onDelete, onToggleComplete }: Props) {
  if (tasks.length === 0) {
    return <p className="empty-state">No tasks yet. Add one above.</p>;
  }

  return (
    <ul className="task-list" aria-label="Task list">
      {tasks.map((task) => {
        const overdue = !task.completed && isOverdue(task.deadline, today);
        return (
          <li key={task.id} className={`task-item${task.completed ? " completed" : ""}`}>
            <input
              type="checkbox"
              className="task-checkbox"
              checked={task.completed}
              onChange={() => onToggleComplete(task.id)}
              aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
            />
            <div className="task-content">
              <div className="task-title">
                <span className={`tag-priority ${task.priority}`}>{task.priority}</span>
                {task.title}
                {overdue && <span className="tag-overdue" aria-label="Overdue">Overdue</span>}
              </div>
              <div className="task-meta">
                {task.subject} · Due {task.deadline} · {task.estimatedMinutes} min
              </div>
              <div className="task-actions">
                <button
                  type="button" className="btn btn-ghost btn-sm"
                  onClick={() => onEdit(task)}
                  aria-label={`Edit task "${task.title}"`}
                >
                  Edit
                </button>
                <button
                  type="button" className="btn btn-danger btn-sm"
                  onClick={() => onDelete(task.id)}
                  aria-label={`Delete task "${task.title}"`}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
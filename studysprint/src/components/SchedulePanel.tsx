// src/components/SchedulePanel.tsx
// Generate schedule, display entries grouped by day, show unschedulable minutes.
// [Req 3, 4, 7]

import type { ScheduleResult, Task } from "../types";
import { getTodayLocal } from "../scheduler/dateUtils";

interface Props {
  scheduleResult: ScheduleResult | null;
  hasGenerated: boolean;
  tasks: Task[];
  onGenerate: () => void;
  onExport: () => void;
  exportMessage: string | null;
}

export function SchedulePanel({ scheduleResult, hasGenerated, tasks, onGenerate, onExport, exportMessage }: Props) {
  // Group entries by date for display
  const byDate: Record<string, typeof scheduleResult extends null ? never : ScheduleResult["entries"]> = {};
  if (scheduleResult) {
    for (const e of scheduleResult.entries) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date]!.push(e);
    }
  }
  const sortedDates = Object.keys(byDate).sort();

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const unschedulableEntries = scheduleResult
    ? Object.entries(scheduleResult.unschedulable).filter(([, m]) => m > 0)
    : [];

  const isStale = hasGenerated && !scheduleResult;

  return (
    <section aria-label="Schedule">
      {isStale && (
        <div className="banner banner-stale" role="status" aria-live="polite">
          ⚠ {exportMessage || "Schedule is out of date — tasks or availability changed. Regenerate to update."}
        </div>
      )}

      <div className="btn-group" style={{ marginTop: 0 }}>
        <button type="button" className="btn btn-primary" onClick={onGenerate} aria-label="Generate study schedule">
          Generate schedule
        </button>
        <button
          type="button" className="btn btn-ghost"
          onClick={onExport}
          aria-label="Export schedule as JSON file"
          disabled={!scheduleResult || scheduleResult.entries.length === 0 || isStale}
        >
          Export JSON
        </button>
      </div>

      {exportMessage && !isStale && (
        <p className="banner banner-warning" role="status" style={{ marginTop: "var(--space-md)" }}>{exportMessage}</p>
      )}

      {scheduleResult && (
        <>
          {scheduleResult.entries.length === 0 && unschedulableEntries.length === 0 && (
            <p className="empty-state">No incomplete tasks to schedule.</p>
          )}

          {sortedDates.length > 0 && (
            <div style={{ marginTop: "var(--space-md)" }}>
              {sortedDates.map((date) => (
                <div key={date} className="schedule-day">
                  <div className="schedule-day-header">{date}{date === getTodayLocal() ? " (today)" : ""}</div>
                  {byDate[date]!.map((e, i) => (
                    <div key={`${e.taskId}-${i}`} className="schedule-entry">
                      <span><strong>{e.taskTitle}</strong> <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>{e.subject}</span></span>
                      <span style={{ whiteSpace: "nowrap", marginLeft: "var(--space-sm)" }}>{e.allocatedMinutes} min</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {unschedulableEntries.length > 0 && (
            <div className="unschedulable-section" role="region" aria-label="Unschedulable minutes">
              <h3>⚠ Could not schedule all minutes</h3>
              <ul className="unschedulable-list">
                {unschedulableEntries.map(([idStr, mins]) => {
                  const t = taskMap.get(Number(idStr));
                  return (
                    <li key={idStr}>
                      {t ? t.title : `Task ${idStr}`}: <strong>{mins} min</strong> unschedulable
                      {t && t.deadline < getTodayLocal() ? " (overdue)" : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
// src/components/AvailabilityPanel.tsx
// Set available study minutes per local date. [Req 2, 8]

import { useState, useId } from "react";
import type { Availability } from "../types";
import type { AvailabilityFormErrors } from "../hooks/useAvailabilityManager";

interface Props {
  availability: Availability;
  today: string;
  onSet: (date: string, minutes: string) => AvailabilityFormErrors | null;
}

export function AvailabilityPanel({ availability, today, onSet }: Props) {
  const uid = useId();
  const [date, setDate] = useState(today);
  const [mins, setMins] = useState("");
  const [errors, setErrors] = useState<AvailabilityFormErrors>({ date: null, minutes: null });

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const result = onSet(date, mins);
    if (result) {
      setErrors(result);
    } else {
      setErrors({ date: null, minutes: null });
      setMins("");
    }
  }

  const sortedEntries = Object.entries(availability).sort(([a], [b]) => a < b ? -1 : 1);

  return (
    <section aria-label="Daily availability">
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <div className={`form-group${errors.date ? " has-error" : ""}`}>
            <label htmlFor={`${uid}-av-date`}>Date</label>
            <input
              id={`${uid}-av-date`} type="date" value={date}
              onChange={(e) => { setDate(e.target.value); setErrors((er) => ({ ...er, date: null })); }}
              aria-describedby={errors.date ? `${uid}-av-date-err` : undefined}
              aria-required="true"
            />
            {errors.date && <p id={`${uid}-av-date-err`} className="field-error" role="alert">{errors.date}</p>}
          </div>

          <div className={`form-group${errors.minutes ? " has-error" : ""}`}>
            <label htmlFor={`${uid}-av-mins`}>Available minutes (0–1440)</label>
            <input
              id={`${uid}-av-mins`} type="number" value={mins} min={0} max={1440}
              onChange={(e) => { setMins(e.target.value); setErrors((er) => ({ ...er, minutes: null })); }}
              aria-describedby={errors.minutes ? `${uid}-av-mins-err` : undefined}
              aria-required="true"
            />
            {errors.minutes && <p id={`${uid}-av-mins-err`} className="field-error" role="alert">{errors.minutes}</p>}
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-sm" aria-label="Set available minutes for selected date">
          Set minutes
        </button>
      </form>

      {sortedEntries.length > 0 && (
        <ul className="availability-list" aria-label="Availability entries">
          {sortedEntries.map(([d, m]) => (
            <li key={d} className="availability-entry">
              <span>{d}</span>
              <span>{m} min</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
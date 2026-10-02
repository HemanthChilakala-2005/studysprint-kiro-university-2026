// src/hooks/useAvailabilityManager.ts
// Per-day availability CRUD with validation. [Req 2]

import { useState, useCallback } from "react";
import type { Availability } from "../types";
import type { StorageManager } from "../storage/storageManager";
import { validateAvailableMinutes } from "../scheduler/validation";
import { isValidCalendarDate } from "../scheduler/dateUtils";

export interface AvailabilityFormErrors {
  date: string | null;
  minutes: string | null;
}

export function useAvailabilityManager(
  storage: StorageManager,
  initial: Availability,
  onMutate: () => void,
) {
  const [availability, setAvailability] = useState<Availability>(initial);

  const setMinutes = useCallback((date: string, minutesStr: string): AvailabilityFormErrors | null => {
    const errors: AvailabilityFormErrors = { date: null, minutes: null };
    if (!isValidCalendarDate(date)) {
      errors.date = "Please enter a valid date (YYYY-MM-DD).";
    }
    const mins = parseInt(minutesStr, 10);
    const minutesErr = validateAvailableMinutes(Number.isNaN(mins) ? minutesStr : mins);
    if (minutesErr) errors.minutes = minutesErr;
    if (errors.date || errors.minutes) return errors;
    const updated = { ...availability, [date]: mins };
    setAvailability(updated);
    storage.saveAvailability(updated);
    onMutate();
    return null;
  }, [availability, storage, onMutate]);

  return { availability, setMinutes };
}
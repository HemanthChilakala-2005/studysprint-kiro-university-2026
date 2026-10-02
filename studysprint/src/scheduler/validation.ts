// src/scheduler/validation.ts
// Field-level validation helpers. Each returns null (valid) or an error string.
// Req 1.3–1.8, 1.15, 2.2, 2.5

import { isValidCalendarDate } from "./dateUtils";
import type { Priority } from "../types";

const PRIORITIES: Priority[] = ["High", "Medium", "Low"];

/** null = valid; string = error message */
export type ValidationResult = string | null;

/** Title: trimmed, 1–200 chars. [Req 1.3, 1.7] */
export function validateTitle(value: string): ValidationResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Title is required.";
  if (trimmed.length > 200) return "Title must be 200 characters or fewer.";
  return null;
}

/** Subject: trimmed, 1–100 chars. [Req 1.4, 1.8] */
export function validateSubject(value: string): ValidationResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Subject is required.";
  if (trimmed.length > 100) return "Subject must be 100 characters or fewer.";
  return null;
}

/**
 * Estimated minutes: finite safe integer, 1–1440. [Req 1.5]
 * Accepts numeric input (from a parsed form field).
 */
export function validateEstimatedMinutes(value: unknown): ValidationResult {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    !isFinite(value)
  ) {
    return "Estimated minutes must be a whole number between 1 and 1440.";
  }
  if (value < 1 || value > 1440) {
    return "Estimated minutes must be between 1 and 1440.";
  }
  return null;
}

/** Priority: must be one of the three allowed values. [Req 1.6] */
export function validatePriority(value: unknown): ValidationResult {
  if (!PRIORITIES.includes(value as Priority)) {
    return "Priority must be High, Medium, or Low.";
  }
  return null;
}

/**
 * Deadline: must be a real calendar date string (YYYY-MM-DD).
 * Past dates are ALLOWED — callers show an overdue indicator instead. [Req 1.9, 1.15]
 */
export function validateDeadline(value: string): ValidationResult {
  if (!isValidCalendarDate(value)) {
    return "Deadline must be a valid date (YYYY-MM-DD).";
  }
  return null;
}

/**
 * Available minutes per day: finite safe integer, 0–1440. [Req 2.2, 2.5]
 */
export function validateAvailableMinutes(value: unknown): ValidationResult {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    !isFinite(value)
  ) {
    return "Available minutes must be a whole number between 0 and 1440.";
  }
  if (value < 0 || value > 1440) {
    return "Available minutes must be between 0 and 1440.";
  }
  return null;
}

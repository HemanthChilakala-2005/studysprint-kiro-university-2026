// src/tests/validation.unit.test.ts
// Boundary and edge-case tests for field validation helpers. [Req 1.3-1.8, 1.15, 2.2, 2.5]

import { describe, it, expect } from "vitest";
import {
  validateTitle,
  validateSubject,
  validateEstimatedMinutes,
  validatePriority,
  validateDeadline,
  validateAvailableMinutes,
} from "../scheduler/validation";
import { isValidCalendarDate } from "../scheduler/dateUtils";

describe("validateTitle", () => {
  it("accepts 1-char title", () => expect(validateTitle("A")).toBeNull());
  it("accepts 200-char title", () => expect(validateTitle("x".repeat(200))).toBeNull());
  it("rejects empty string", () => expect(validateTitle("")).not.toBeNull());
  it("rejects whitespace-only", () => expect(validateTitle("   ")).not.toBeNull());
  it("rejects 201-char title", () => expect(validateTitle("x".repeat(201))).not.toBeNull());
});

describe("validateSubject", () => {
  it("accepts 1-char subject", () => expect(validateSubject("A")).toBeNull());
  it("accepts 100-char subject", () => expect(validateSubject("x".repeat(100))).toBeNull());
  it("rejects empty string", () => expect(validateSubject("")).not.toBeNull());
  it("rejects whitespace-only", () => expect(validateSubject("\t\n")).not.toBeNull());
  it("rejects 101-char subject", () => expect(validateSubject("x".repeat(101))).not.toBeNull());
});

describe("validateEstimatedMinutes", () => {
  it("accepts 1", () => expect(validateEstimatedMinutes(1)).toBeNull());
  it("accepts 1440", () => expect(validateEstimatedMinutes(1440)).toBeNull());
  it("rejects 0", () => expect(validateEstimatedMinutes(0)).not.toBeNull());
  it("rejects 1441", () => expect(validateEstimatedMinutes(1441)).not.toBeNull());
  it("rejects -1", () => expect(validateEstimatedMinutes(-1)).not.toBeNull());
  it("rejects Infinity", () => expect(validateEstimatedMinutes(Infinity)).not.toBeNull());
  it("rejects NaN", () => expect(validateEstimatedMinutes(NaN)).not.toBeNull());
  it("rejects float 1.5", () => expect(validateEstimatedMinutes(1.5)).not.toBeNull());
  it("rejects string '60'", () => expect(validateEstimatedMinutes("60")).not.toBeNull());
  it("rejects Number.MAX_SAFE_INTEGER + 1", () =>
    expect(validateEstimatedMinutes(Number.MAX_SAFE_INTEGER + 1)).not.toBeNull());
});

describe("validatePriority", () => {
  it("accepts High", () => expect(validatePriority("High")).toBeNull());
  it("accepts Medium", () => expect(validatePriority("Medium")).toBeNull());
  it("accepts Low", () => expect(validatePriority("Low")).toBeNull());
  it("rejects 'high' (lowercase)", () => expect(validatePriority("high")).not.toBeNull());
  it("rejects empty string", () => expect(validatePriority("")).not.toBeNull());
  it("rejects undefined", () => expect(validatePriority(undefined)).not.toBeNull());
});

describe("validateDeadline", () => {
  it("accepts a valid future date", () => expect(validateDeadline("2030-06-15")).toBeNull());
  it("accepts a valid past date (past allowed, shown as overdue) [Req 1.9]", () =>
    expect(validateDeadline("2020-01-01")).toBeNull());
  it("rejects 2024-02-30 (day overflow)", () => expect(validateDeadline("2024-02-30")).not.toBeNull());
  it("rejects 2023-13-01 (month 13)", () => expect(validateDeadline("2023-13-01")).not.toBeNull());
  it("rejects empty string", () => expect(validateDeadline("")).not.toBeNull());
  it("rejects plain text", () => expect(validateDeadline("not-a-date")).not.toBeNull());
});

describe("validateAvailableMinutes", () => {
  it("accepts 0", () => expect(validateAvailableMinutes(0)).toBeNull());
  it("accepts 1440", () => expect(validateAvailableMinutes(1440)).toBeNull());
  it("rejects -1", () => expect(validateAvailableMinutes(-1)).not.toBeNull());
  it("rejects 1441", () => expect(validateAvailableMinutes(1441)).not.toBeNull());
  it("rejects Infinity", () => expect(validateAvailableMinutes(Infinity)).not.toBeNull());
  it("rejects float 60.5", () => expect(validateAvailableMinutes(60.5)).not.toBeNull());
  it("rejects string '120'", () => expect(validateAvailableMinutes("120")).not.toBeNull());
});

describe("isValidCalendarDate", () => {
  it("2024-02-29 valid (2024 is a leap year)", () => expect(isValidCalendarDate("2024-02-29")).toBe(true));
  it("2023-02-29 invalid (2023 not a leap year)", () => expect(isValidCalendarDate("2023-02-29")).toBe(false));
  it("2024-04-31 invalid (April has 30 days)", () => expect(isValidCalendarDate("2024-04-31")).toBe(false));
  it("2024-02-30 invalid", () => expect(isValidCalendarDate("2024-02-30")).toBe(false));
  it("2023-13-01 invalid", () => expect(isValidCalendarDate("2023-13-01")).toBe(false));
  it("2030-01-01 valid", () => expect(isValidCalendarDate("2030-01-01")).toBe(true));
  it("empty string invalid", () => expect(isValidCalendarDate("")).toBe(false));
  it("plain text invalid", () => expect(isValidCalendarDate("not-a-date")).toBe(false));
  it("2024-00-01 invalid (month 0)", () => expect(isValidCalendarDate("2024-00-01")).toBe(false));
});

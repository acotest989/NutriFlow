import { describe, it, expect } from "vitest";
import { toDateStr, todayStr, addDays } from "./date";

describe("toDateStr", () => {
  it("formats local Y/M/D as zero-padded YYYY-MM-DD", () => {
    // Month is 0-indexed in the Date constructor.
    expect(toDateStr(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateStr(new Date(2026, 11, 31))).toBe("2026-12-31");
    expect(toDateStr(new Date(2026, 8, 9))).toBe("2026-09-09");
  });

  it("uses LOCAL parts, not UTC (no day-shift)", () => {
    // Local midnight on this date — toISOString() would drift for UTC-negative
    // offsets; toDateStr must return the local calendar day regardless.
    expect(toDateStr(new Date(2026, 2, 1, 0, 0, 0))).toBe("2026-03-01");
  });
});

describe("addDays", () => {
  it("adds and subtracts within a month", () => {
    expect(addDays("2026-01-01", 1)).toBe("2026-01-02");
    expect(addDays("2026-01-10", 5)).toBe("2026-01-15");
    expect(addDays("2026-01-10", -3)).toBe("2026-01-07");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28"); // 2026 is not a leap year
  });

  it("handles leap days", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("is a no-op for 0 and reversible", () => {
    expect(addDays("2026-07-14", 0)).toBe("2026-07-14");
    expect(addDays(addDays("2026-07-14", 9), -9)).toBe("2026-07-14");
  });
});

describe("todayStr", () => {
  it("returns a valid YYYY-MM-DD that round-trips through addDays", () => {
    const today = todayStr();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(addDays(today, 0)).toBe(today);
    // Two hops out and back lands on today (timezone-independent).
    expect(addDays(addDays(today, 3), -3)).toBe(today);
  });
});

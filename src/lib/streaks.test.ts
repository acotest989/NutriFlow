import { describe, it, expect } from "vitest";
import { computeStreakStats, computeBadges, type Badge } from "./streaks";
import { todayStr, addDays } from "./date";
import type { LogEntry } from "../types";

const today = todayStr();
const daysAgo = (n: number) => addDays(today, -n);

let idc = 0;
const entry = (date: string, type: "meal" | "exercise" = "meal"): LogEntry => ({
  id: `e${idc++}`,
  date,
  type,
  name: "x",
  calories: 100,
  protein: 0,
  carbs: 0,
  fat: 0,
  quantity: 1,
  timestamp: "2026-01-01T00:00:00.000Z",
});

const isEarned = (badges: Badge[], id: string) => badges.find((b) => b.id === id)?.earned;

describe("computeStreakStats", () => {
  it("is all-zero for no data", () => {
    expect(computeStreakStats([], {})).toEqual({
      current: 0,
      longest: 0,
      activeDays: 0,
      totalEntries: 0,
      hydrationDays: 0,
      todayActive: false,
    });
  });

  it("counts a streak that includes today", () => {
    const s = computeStreakStats([entry(today)], {});
    expect(s.todayActive).toBe(true);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
    expect(s.activeDays).toBe(1);
    expect(s.totalEntries).toBe(1);
  });

  it("keeps the streak alive from yesterday when today isn't logged yet", () => {
    const s = computeStreakStats([entry(daysAgo(1))], {});
    expect(s.todayActive).toBe(false);
    expect(s.current).toBe(1); // still alive — counted from yesterday
  });

  it("resets current to 0 once a whole day is missed", () => {
    const s = computeStreakStats([entry(daysAgo(2))], {}); // not today, not yesterday
    expect(s.todayActive).toBe(false);
    expect(s.current).toBe(0);
    expect(s.longest).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    const s = computeStreakStats([entry(today), entry(daysAgo(1)), entry(daysAgo(2))], {});
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it("finds the longest run even when it isn't the current one", () => {
    // current run of 2 (today, -1); a separate older run of 4 (-5..-8)
    const s = computeStreakStats(
      [entry(today), entry(daysAgo(1)), entry(daysAgo(5)), entry(daysAgo(6)), entry(daysAgo(7)), entry(daysAgo(8))],
      {}
    );
    expect(s.current).toBe(2);
    expect(s.longest).toBe(4);
    expect(s.activeDays).toBe(6);
  });

  it("treats a day with water logged as active", () => {
    const s = computeStreakStats([], { [today]: 500 });
    expect(s.todayActive).toBe(true);
    expect(s.current).toBe(1);
    expect(s.hydrationDays).toBe(1);
    expect(s.totalEntries).toBe(0);
  });

  it("ignores 0 ml hydration days", () => {
    const s = computeStreakStats([], { [today]: 0 });
    expect(s.todayActive).toBe(false);
    expect(s.current).toBe(0);
    expect(s.hydrationDays).toBe(0);
    expect(s.activeDays).toBe(0);
  });

  it("unions entry-days and hydration-days", () => {
    const s = computeStreakStats([entry(today)], { [daysAgo(1)]: 250 });
    expect(s.activeDays).toBe(2);
    expect(s.current).toBe(2); // today (entry) + yesterday (water)
    expect(s.hydrationDays).toBe(1);
    expect(s.totalEntries).toBe(1);
  });

  it("counts multiple entries on one day as one active day but all entries", () => {
    const s = computeStreakStats([entry(today), entry(today, "exercise")], {});
    expect(s.activeDays).toBe(1);
    expect(s.totalEntries).toBe(2);
    expect(s.current).toBe(1);
  });
});

describe("computeBadges", () => {
  it("unlocks 'start' on the first entry, not before", () => {
    expect(isEarned(computeBadges(computeStreakStats([], {})), "start")).toBe(false);
    expect(isEarned(computeBadges(computeStreakStats([entry(today)], {})), "start")).toBe(true);
  });

  it("unlocks streak badges by the best (current or longest) run", () => {
    const week = Array.from({ length: 7 }, (_, i) => entry(daysAgo(i)));
    const badges = computeBadges(computeStreakStats(week, {}));
    expect(isEarned(badges, "streak3")).toBe(true);
    expect(isEarned(badges, "streak7")).toBe(true);
    expect(isEarned(badges, "streak14")).toBe(false);
  });

  it("unlocks 'hydrated' after water on 7 distinct days", () => {
    const hydration: Record<string, number> = {};
    for (let i = 0; i < 7; i++) hydration[daysAgo(i)] = 300;
    expect(isEarned(computeBadges(computeStreakStats([], hydration)), "hydrated")).toBe(true);
    // 6 days is not enough
    const six: Record<string, number> = {};
    for (let i = 0; i < 6; i++) six[daysAgo(i)] = 300;
    expect(isEarned(computeBadges(computeStreakStats([], six)), "hydrated")).toBe(false);
  });

  it("unlocks 'century' at 100 total entries", () => {
    const many = Array.from({ length: 100 }, () => entry(today));
    expect(isEarned(computeBadges(computeStreakStats(many, {})), "century")).toBe(true);
    const ninetyNine = Array.from({ length: 99 }, () => entry(today));
    expect(isEarned(computeBadges(computeStreakStats(ninetyNine, {})), "century")).toBe(false);
  });
});

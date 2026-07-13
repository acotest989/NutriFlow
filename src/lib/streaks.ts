import { LogEntry } from "../types";
import { todayStr, addDays } from "./date";

// Streaks + badges, computed entirely from the user's existing logged data
// (no extra table). A day is "active" if it has at least one meal/exercise entry
// OR any water logged. All day math uses the local-date helpers so streaks don't
// break across timezones (see src/lib/date.ts).

export interface StreakStats {
  current: number; // consecutive active days ending today (or yesterday, if today isn't done yet)
  longest: number; // longest run of active days ever
  activeDays: number; // total distinct active days
  totalEntries: number; // total meal/exercise entries logged
  hydrationDays: number; // distinct days with water logged
  todayActive: boolean; // has the user logged anything today
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  description: string;
  earned: boolean;
}

// Build the set of active local dates, then derive current + longest streaks.
export function computeStreakStats(
  entries: LogEntry[],
  hydration: Record<string, number>
): StreakStats {
  const active = new Set<string>();
  for (const e of entries) active.add(e.date);

  let hydrationDays = 0;
  for (const [date, ml] of Object.entries(hydration)) {
    if (ml > 0) {
      hydrationDays++;
      active.add(date);
    }
  }

  const today = todayStr();
  const todayActive = active.has(today);

  // Current streak: count back from today; if today isn't logged yet but
  // yesterday was, the streak is still alive, so start from yesterday.
  let current = 0;
  let cursor = todayActive ? today : addDays(today, -1);
  while (active.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  // Longest streak: sort the active days and find the longest consecutive run.
  const sorted = [...active].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }

  return {
    current,
    longest,
    activeDays: active.size,
    totalEntries: entries.length,
    hydrationDays,
    todayActive,
  };
}

// Badge definitions. `best` = the higher of current/longest so an earned streak
// badge stays earned even after a miss.
const BADGE_DEFS: Array<Omit<Badge, "earned"> & { test: (s: StreakStats) => boolean }> = [
  { id: "start", label: "Getting Started", emoji: "🌱", description: "Log your first item", test: (s) => s.totalEntries >= 1 },
  { id: "streak3", label: "Consistent", emoji: "🔥", description: "Reach a 3-day streak", test: (s) => Math.max(s.current, s.longest) >= 3 },
  { id: "streak7", label: "On Fire", emoji: "🚀", description: "Reach a 7-day streak", test: (s) => Math.max(s.current, s.longest) >= 7 },
  { id: "streak14", label: "Dedicated", emoji: "💪", description: "Reach a 14-day streak", test: (s) => Math.max(s.current, s.longest) >= 14 },
  { id: "streak30", label: "Unstoppable", emoji: "🏆", description: "Reach a 30-day streak", test: (s) => Math.max(s.current, s.longest) >= 30 },
  { id: "hydrated", label: "Hydrated", emoji: "💧", description: "Log water on 7 days", test: (s) => s.hydrationDays >= 7 },
  { id: "century", label: "Centurion", emoji: "💯", description: "Log 100 items total", test: (s) => s.totalEntries >= 100 },
];

export function computeBadges(stats: StreakStats): Badge[] {
  return BADGE_DEFS.map(({ test, ...b }) => ({ ...b, earned: test(stats) }));
}

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { LogEntry } from "./types";

// The store's zustand `persist` needs localStorage; provide a tiny in-memory
// polyfill (hoisted above imports) so we can run in the fast node env instead
// of booting jsdom.
vi.hoisted(() => {
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
    key: () => null,
    length: 0,
  };
});

// One controllable result for the next supabase terminal call. The mock builder
// is chainable (insert/update/upsert/delete/select/eq/order return itself) and
// awaitable (resolves to `nextResult`), covering every call shape the store uses.
let nextResult: { data?: unknown; error: unknown } = { error: null };
const setNext = (r: { data?: unknown; error: unknown }) => {
  nextResult = r;
};

vi.mock("./lib/supabase", () => {
  const makeBuilder = () => {
    const b: Record<string, unknown> = {};
    const chain = () => b;
    for (const m of ["insert", "update", "upsert", "delete", "select", "eq", "order"]) b[m] = chain;
    b.single = () => Promise.resolve(nextResult);
    b.maybeSingle = () => Promise.resolve(nextResult);
    // thenable so `await ...delete().eq()` / `await ...upsert()` resolve too
    b.then = (onF: (v: unknown) => unknown, onR: (e: unknown) => unknown) =>
      Promise.resolve(nextResult).then(onF, onR);
    return b;
  };
  return { supabase: { from: () => makeBuilder() } };
});

// Isolate the store from real i18n (react-i18next + locale bundles).
vi.mock("./i18n", () => ({
  default: { language: "en" },
  setLanguage: vi.fn(() => Promise.resolve()),
}));

import { useStore } from "./store";
import { setLanguage as applyLanguageMock } from "./i18n";

const USER = { id: "u1", email: "a@b.co" };
const DATE = "2026-07-14";
const GOAL = { calories: 2000, protein: 150, carbs: 200, fat: 60 };

const entryFix = (id: string, over: Partial<LogEntry> = {}): LogEntry => ({
  id,
  date: DATE,
  type: "meal",
  name: id,
  calories: 100,
  protein: 0,
  carbs: 0,
  fat: 0,
  quantity: 1,
  timestamp: `${DATE}T00:00:00.000Z`,
  ...over,
});

const profileFix = {
  hasOnboarded: true,
  goalType: "maintain",
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  targetWeightKg: null,
  activity: "moderate",
  diet: "none",
  restrictions: [],
  workouts: [],
  units: "metric",
  language: "en",
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  setNext({ error: null });
  useStore.setState({
    user: USER as never,
    entries: [],
    hydration: {},
    goal: { ...GOAL },
    profile: null,
    error: null,
    currentDate: DATE,
  });
});

describe("addEntry", () => {
  it("prepends the row the server returns", async () => {
    const row = { id: "row1", date: DATE, type: "meal", name: "Apple", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, quantity: 100, created_at: `${DATE}T10:00:00.000Z` };
    setNext({ data: row, error: null });
    await useStore.getState().addEntry({ date: DATE, type: "meal", name: "Apple", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, quantity: 100 });
    const { entries, error } = useStore.getState();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: "row1", name: "Apple", calories: 95, timestamp: `${DATE}T10:00:00.000Z` });
    expect(error).toBeNull();
  });

  it("surfaces an error and adds nothing on failure", async () => {
    setNext({ data: null, error: { message: "db down" } });
    await useStore.getState().addEntry({ date: DATE, type: "meal", name: "Apple", calories: 95, protein: 0, carbs: 0, fat: 0, quantity: 100 });
    expect(useStore.getState().entries).toHaveLength(0);
    expect(useStore.getState().error).toBeTruthy();
  });

  it("no-ops (no error) when signed out", async () => {
    useStore.setState({ user: null });
    await useStore.getState().addEntry({ date: DATE, type: "meal", name: "Apple", calories: 95, protein: 0, carbs: 0, fat: 0, quantity: 100 });
    expect(useStore.getState().entries).toHaveLength(0);
    expect(useStore.getState().error).toBeNull();
  });
});

describe("removeEntry", () => {
  it("removes optimistically on success", async () => {
    useStore.setState({ entries: [entryFix("a"), entryFix("b")] });
    setNext({ error: null });
    await useStore.getState().removeEntry("a");
    expect(useStore.getState().entries.map((e) => e.id)).toEqual(["b"]);
  });

  it("rolls back and sets an error on failure", async () => {
    useStore.setState({ entries: [entryFix("a"), entryFix("b")] });
    setNext({ error: { message: "nope" } });
    await useStore.getState().removeEntry("a");
    expect(useStore.getState().entries.map((e) => e.id)).toEqual(["a", "b"]);
    expect(useStore.getState().error).toBeTruthy();
  });
});

describe("updateGoal", () => {
  it("updates optimistically on success", async () => {
    const next = { calories: 2500, protein: 180, carbs: 250, fat: 70 };
    setNext({ error: null });
    await useStore.getState().updateGoal(next);
    expect(useStore.getState().goal).toEqual(next);
  });

  it("rolls back to the previous goal on failure", async () => {
    setNext({ error: { message: "nope" } });
    await useStore.getState().updateGoal({ calories: 9999, protein: 1, carbs: 1, fat: 1 });
    expect(useStore.getState().goal).toEqual(GOAL);
    expect(useStore.getState().error).toBeTruthy();
  });
});

describe("adjustWater", () => {
  it("accumulates and clamps at 0", async () => {
    setNext({ error: null });
    await useStore.getState().adjustWater(250);
    expect(useStore.getState().hydration[DATE]).toBe(250);
    await useStore.getState().adjustWater(500);
    expect(useStore.getState().hydration[DATE]).toBe(750);
    await useStore.getState().adjustWater(-10000);
    expect(useStore.getState().hydration[DATE]).toBe(0);
  });

  it("rolls back on failure", async () => {
    useStore.setState({ hydration: { [DATE]: 500 } });
    setNext({ error: { message: "nope" } });
    await useStore.getState().adjustWater(250);
    expect(useStore.getState().hydration[DATE]).toBe(500);
    expect(useStore.getState().error).toBeTruthy();
  });
});

describe("updateLanguage", () => {
  it("applies immediately and persists to the profile when signed in", async () => {
    useStore.setState({ profile: { ...profileFix } as never });
    setNext({ error: null });
    await useStore.getState().updateLanguage("hr");
    expect(applyLanguageMock).toHaveBeenCalledWith("hr");
    expect(useStore.getState().profile?.language).toBe("hr");
  });

  it("still applies for a signed-out user without touching a profile", async () => {
    useStore.setState({ user: null, profile: null });
    await useStore.getState().updateLanguage("sr");
    expect(applyLanguageMock).toHaveBeenCalledWith("sr");
    expect(useStore.getState().profile).toBeNull();
  });
});

describe("resetData", () => {
  it("clears entries + hydration optimistically on success", async () => {
    useStore.setState({ entries: [entryFix("a")], hydration: { [DATE]: 500 } });
    setNext({ error: null });
    const res = await useStore.getState().resetData();
    expect(res.error).toBeNull();
    expect(useStore.getState().entries).toEqual([]);
    expect(useStore.getState().hydration).toEqual({});
  });

  it("rolls back both on failure", async () => {
    useStore.setState({ entries: [entryFix("a")], hydration: { [DATE]: 500 } });
    setNext({ error: { message: "nope" } });
    const res = await useStore.getState().resetData();
    expect(res.error).toBeTruthy();
    expect(useStore.getState().entries).toHaveLength(1);
    expect(useStore.getState().hydration).toEqual({ [DATE]: 500 });
  });
});

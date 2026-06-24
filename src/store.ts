import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { LogEntry, Goal } from "./types";
import { DEFAULT_GOAL } from "./data";

export type Theme = "deep-midnight" | "high-contrast-light";

// Helper to get formatted dates
const getPastDateStr = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

const todayStr = (): string => new Date().toISOString().split("T")[0];

// Seed high-fidelity sample data so the 7-day trend charts are instantly beautiful!
const SAMPLE_HISTORICAL_ENTRIES = (): LogEntry[] => [
  // 6 Days Ago
  { id: "s1", date: getPastDateStr(6), type: "meal", name: "Oatmeal with Blueberries", calories: 340, protein: 12, carbs: 54, fat: 5, quantity: 150, timestamp: new Date().toISOString() },
  { id: "s2", date: getPastDateStr(6), type: "meal", name: "Baked Chicken with Rice", calories: 520, protein: 42, carbs: 62, fat: 8, quantity: 300, timestamp: new Date().toISOString() },
  { id: "s3", date: getPastDateStr(6), type: "exercise", name: "Brisk Walking (30 mins)", calories: 135, protein: 0, carbs: 0, fat: 0, quantity: 30, timestamp: new Date().toISOString() },
  { id: "s4", date: getPastDateStr(6), type: "meal", name: "Salmon Fillet & Broccoli", calories: 380, protein: 35, carbs: 8, fat: 18, quantity: 200, timestamp: new Date().toISOString() },

  // 5 Days Ago
  { id: "s5", date: getPastDateStr(5), type: "meal", name: "Greek Yogurt & Banana", calories: 250, protein: 18, carbs: 32, fat: 2, quantity: 200, timestamp: new Date().toISOString() },
  { id: "s6", date: getPastDateStr(5), type: "meal", name: "Turkey Breast Sandwich", calories: 410, protein: 28, carbs: 45, fat: 7, quantity: 180, timestamp: new Date().toISOString() },
  { id: "s7", date: getPastDateStr(5), type: "exercise", name: "Cycling Workout (45 mins)", calories: 340, protein: 0, carbs: 0, fat: 0, quantity: 45, timestamp: new Date().toISOString() },
  { id: "s8", date: getPastDateStr(5), type: "meal", name: "Lean Beef Sirloin & Potatoes", calories: 580, protein: 45, carbs: 48, fat: 14, quantity: 350, timestamp: new Date().toISOString() },

  // 4 Days Ago
  { id: "s9", date: getPastDateStr(4), type: "meal", name: "Whey Protein Shake", calories: 120, protein: 24, carbs: 3, fat: 1.5, quantity: 32, timestamp: new Date().toISOString() },
  { id: "s10", date: getPastDateStr(4), type: "meal", name: "Tuna Salad Salad", calories: 320, protein: 32, carbs: 12, fat: 10, quantity: 250, timestamp: new Date().toISOString() },
  { id: "s11", date: getPastDateStr(4), type: "exercise", name: "HIIT Session (20 mins)", calories: 270, protein: 0, carbs: 0, fat: 0, quantity: 20, timestamp: new Date().toISOString() },
  { id: "s12", date: getPastDateStr(4), type: "meal", name: "Pasta Bolognese", calories: 650, protein: 28, carbs: 85, fat: 16, quantity: 400, timestamp: new Date().toISOString() },

  // 3 Days Ago
  { id: "s13", date: getPastDateStr(3), type: "meal", name: "Eggs & Whole Wheat Toast", calories: 290, protein: 16, carbs: 25, fat: 12, quantity: 150, timestamp: new Date().toISOString() },
  { id: "s14", date: getPastDateStr(3), type: "meal", name: "Grilled Salmon Bowl", calories: 480, protein: 34, carbs: 42, fat: 16, quantity: 280, timestamp: new Date().toISOString() },
  { id: "s15", date: getPastDateStr(3), type: "exercise", name: "Weight Lifting (60 mins)", calories: 360, protein: 0, carbs: 0, fat: 0, quantity: 60, timestamp: new Date().toISOString() },
  { id: "s16", date: getPastDateStr(3), type: "meal", name: "Cottage Cheese & Honey", calories: 180, protein: 14, carbs: 18, fat: 4, quantity: 150, timestamp: new Date().toISOString() },

  // 2 Days Ago
  { id: "s17", date: getPastDateStr(2), type: "meal", name: "Protein Oatmeal Bowl", calories: 380, protein: 26, carbs: 48, fat: 6, quantity: 180, timestamp: new Date().toISOString() },
  { id: "s18", date: getPastDateStr(2), type: "meal", name: "Chicken Avocado Wrap", calories: 490, protein: 36, carbs: 32, fat: 18, quantity: 220, timestamp: new Date().toISOString() },
  { id: "s19", date: getPastDateStr(2), type: "exercise", name: "Swimming (General) (30 mins)", calories: 294, protein: 0, carbs: 0, fat: 0, quantity: 30, timestamp: new Date().toISOString() },
  { id: "s20", date: getPastDateStr(2), type: "meal", name: "Mixed Nuts Snack", calories: 164, protein: 6, carbs: 6, fat: 14, quantity: 28, timestamp: new Date().toISOString() },

  // Yesterday
  { id: "s21", date: getPastDateStr(1), type: "meal", name: "Scrambled Eggs & Avocado", calories: 310, protein: 14, carbs: 6, fat: 22, quantity: 180, timestamp: new Date().toISOString() },
  { id: "s22", date: getPastDateStr(1), type: "meal", name: "Chicken Rice & Sweet Potato", calories: 550, protein: 46, carbs: 60, fat: 6, quantity: 320, timestamp: new Date().toISOString() },
  { id: "s23", date: getPastDateStr(1), type: "exercise", name: "Running (Moderate) (30 mins)", calories: 342, protein: 0, carbs: 0, fat: 0, quantity: 30, timestamp: new Date().toISOString() },
  { id: "s24", date: getPastDateStr(1), type: "meal", name: "Steamed Salmon & Asparagus", calories: 340, protein: 32, carbs: 4, fat: 14, quantity: 180, timestamp: new Date().toISOString() },
];

const STORAGE_KEY = "nutriflow-storage";

/**
 * One-time migration: import data saved under the pre-Zustand localStorage keys
 * (macro_tracker_entries / macro_tracker_goal / nutriflow_theme) into the new
 * persisted store, so existing users don't lose their logs on upgrade.
 */
const migrateLegacyStorage = (): void => {
  try {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return; // already on the new store

    const legacyEntries = localStorage.getItem("macro_tracker_entries");
    const legacyGoal = localStorage.getItem("macro_tracker_goal");
    const legacyTheme = localStorage.getItem("nutriflow_theme");
    if (!legacyEntries && !legacyGoal && !legacyTheme) return;

    const migrated = {
      state: {
        entries: legacyEntries ? JSON.parse(legacyEntries) : SAMPLE_HISTORICAL_ENTRIES(),
        goal: legacyGoal ? JSON.parse(legacyGoal) : DEFAULT_GOAL,
        theme: legacyTheme === "high-contrast-light" ? "high-contrast-light" : "deep-midnight",
      },
      version: 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  } catch {
    // If migration fails for any reason, fall back to fresh seeded state.
  }
};

migrateLegacyStorage();

interface AppState {
  // State
  entries: LogEntry[];
  goal: Goal;
  currentDate: string;
  theme: Theme;

  // Actions
  addEntry: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
  removeEntry: (id: string) => void;
  updateGoal: (goal: Goal) => void;
  addQuickCalories: (calories: number, type: "meal" | "exercise") => void;
  setCurrentDate: (date: string) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Seeded by default; overwritten by persisted data when present.
      entries: SAMPLE_HISTORICAL_ENTRIES(),
      goal: DEFAULT_GOAL,
      currentDate: todayStr(),
      theme: "deep-midnight",

      addEntry: (entryData) =>
        set((state) => ({
          entries: [
            {
              ...entryData,
              id: "entry_" + Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toISOString(),
            },
            ...state.entries,
          ],
        })),

      removeEntry: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),

      updateGoal: (goal) => set({ goal }),

      addQuickCalories: (calories, type) =>
        get().addEntry({
          date: get().currentDate,
          type,
          name: type === "meal" ? "Quick Snack" : "Quick Workout",
          calories,
          protein: type === "meal" ? Math.round(calories * 0.05) : 0, // estimate small macros
          carbs: type === "meal" ? Math.round(calories * 0.12) : 0,
          fat: type === "meal" ? Math.round(calories * 0.02) : 0,
          quantity: type === "meal" ? 100 : 30, // generic unit weight/time
        }),

      setCurrentDate: (date) => set({ currentDate: date }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "deep-midnight" ? "high-contrast-light" : "deep-midnight",
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // currentDate is intentionally omitted so the app always opens on "today".
      partialize: (state) => ({
        entries: state.entries,
        goal: state.goal,
        theme: state.theme,
      }),
    }
  )
);

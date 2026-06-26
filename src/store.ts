import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Session, User } from "@supabase/supabase-js";
import { LogEntry, Goal } from "./types";
import { DEFAULT_GOAL } from "./data";
import { supabase } from "./lib/supabase";

export type Theme = "deep-midnight" | "high-contrast-light";

const todayStr = (): string => new Date().toISOString().split("T")[0];

// Shape of a row in the Supabase `entries` table.
type EntryRow = {
  id: string;
  date: string;
  type: "meal" | "exercise";
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  created_at: string;
};

const rowToEntry = (r: EntryRow): LogEntry => ({
  id: r.id,
  date: r.date,
  type: r.type,
  name: r.name,
  calories: Number(r.calories),
  protein: Number(r.protein),
  carbs: Number(r.carbs),
  fat: Number(r.fat),
  quantity: Number(r.quantity),
  timestamp: r.created_at,
});

interface AppState {
  // Auth
  session: Session | null;
  user: User | null;
  authReady: boolean; // initial session check has completed
  recoveryMode: boolean; // arrived via a password-reset link -> show update-password screen

  // Data (loaded from Supabase for the signed-in user)
  entries: LogEntry[];
  goal: Goal;
  hydration: Record<string, number>; // date (YYYY-MM-DD) -> consumed ml
  dataLoading: boolean;

  // UI
  currentDate: string;
  theme: Theme;
  error: string | null; // transient, user-facing error (e.g. a failed sync)

  // Auth actions
  initAuth: () => () => void;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;

  // Data actions
  loadData: () => Promise<void>;
  addEntry: (entry: Omit<LogEntry, "id" | "timestamp">) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  addQuickCalories: (calories: number, type: "meal" | "exercise") => Promise<void>;
  adjustWater: (deltaMl: number) => Promise<void>;

  // UI actions
  setCurrentDate: (date: string) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setError: (message: string | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      authReady: false,
      recoveryMode: false,

      entries: [],
      goal: DEFAULT_GOAL,
      hydration: {},
      dataLoading: false,

      currentDate: todayStr(),
      theme: "deep-midnight",
      error: null,

      // ---------- Auth ----------
      initAuth: () => {
        // Resolve the current session on startup.
        supabase.auth.getSession().then(({ data }) => {
          set({ session: data.session, user: data.session?.user ?? null, authReady: true });
          if (data.session?.user) get().loadData();
        });

        // React to sign in / sign out / token refresh.
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          const prevUserId = get().user?.id;
          set({ session, user: session?.user ?? null, authReady: true });
          // Arrived via a password-reset link: show the update-password screen.
          if (event === "PASSWORD_RECOVERY") {
            set({ recoveryMode: true });
          }
          if (session?.user) {
            // Only (re)load when the user actually changes, not on token refresh.
            if (session.user.id !== prevUserId) get().loadData();
          } else {
            set({ entries: [], goal: DEFAULT_GOAL, hydration: {} });
          }
        });

        return () => subscription.unsubscribe();
      },

      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
      },

      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ entries: [], goal: DEFAULT_GOAL, hydration: {}, recoveryMode: false });
      },

      resetPassword: async (email) => {
        // Sends a reset email; the link returns the user to the app in recovery mode.
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        return { error: error?.message ?? null };
      },

      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (!error) set({ recoveryMode: false });
        return { error: error?.message ?? null };
      },

      deleteAccount: async () => {
        const token = get().session?.access_token;
        if (!token) return { error: "You're not signed in." };
        try {
          const res = await fetch("/api/account", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({} as { error?: string }));
            return { error: body.error ?? "Couldn't delete your account. Please try again." };
          }
          // Account is gone — clear the local session and in-memory data.
          await supabase.auth.signOut();
          set({ entries: [], goal: DEFAULT_GOAL, hydration: {}, recoveryMode: false });
          return { error: null };
        } catch {
          return { error: "Network error. Please check your connection and try again." };
        }
      },

      // ---------- Data ----------
      loadData: async () => {
        set({ dataLoading: true });
        const [entriesRes, goalRes, hydrationRes] = await Promise.all([
          supabase.from("entries").select("*").order("created_at", { ascending: false }),
          supabase.from("goals").select("*").maybeSingle(),
          supabase.from("hydration").select("date, consumed_ml"),
        ]);

        if (entriesRes.error || goalRes.error || hydrationRes.error) {
          console.error("Failed to load data:", entriesRes.error ?? goalRes.error ?? hydrationRes.error);
          set({ error: "Couldn't load your data. Check your connection and refresh." });
        }

        const goalRow = goalRes.data;
        const hydration: Record<string, number> = {};
        for (const row of hydrationRes.data ?? []) {
          hydration[(row as { date: string }).date] = Number((row as { consumed_ml: number }).consumed_ml);
        }

        set({
          entries: (entriesRes.data ?? []).map((r) => rowToEntry(r as EntryRow)),
          goal: goalRow
            ? {
                calories: Number(goalRow.calories),
                protein: Number(goalRow.protein),
                carbs: Number(goalRow.carbs),
                fat: Number(goalRow.fat),
              }
            : DEFAULT_GOAL,
          hydration,
          dataLoading: false,
        });
      },

      addEntry: async (entryData) => {
        const user = get().user;
        if (!user) return;
        const { data, error } = await supabase
          .from("entries")
          .insert({ ...entryData, user_id: user.id })
          .select()
          .single();
        if (error || !data) {
          console.error("Failed to add entry:", error);
          set({ error: "Couldn't save that entry. Please try again." });
          return;
        }
        set((s) => ({ entries: [rowToEntry(data as EntryRow), ...s.entries] }));
      },

      removeEntry: async (id) => {
        const prev = get().entries;
        // Optimistic removal; roll back on failure.
        set({ entries: prev.filter((e) => e.id !== id) });
        const { error } = await supabase.from("entries").delete().eq("id", id);
        if (error) {
          console.error("Failed to remove entry:", error);
          set({ entries: prev, error: "Couldn't delete that entry. Please try again." });
        }
      },

      updateGoal: async (goal) => {
        const user = get().user;
        if (!user) return;
        const prev = get().goal;
        set({ goal }); // optimistic
        const { error } = await supabase
          .from("goals")
          .upsert({ user_id: user.id, ...goal, updated_at: new Date().toISOString() });
        if (error) {
          console.error("Failed to update goal:", error);
          set({ goal: prev, error: "Couldn't save your goal. Please try again." });
        }
      },

      addQuickCalories: async (calories, type) => {
        await get().addEntry({
          date: get().currentDate,
          type,
          name: type === "meal" ? "Quick Snack" : "Quick Workout",
          calories,
          protein: type === "meal" ? Math.round(calories * 0.05) : 0, // estimate small macros
          carbs: type === "meal" ? Math.round(calories * 0.12) : 0,
          fat: type === "meal" ? Math.round(calories * 0.02) : 0,
          quantity: type === "meal" ? 100 : 30, // generic unit weight/time
        });
      },

      adjustWater: async (deltaMl) => {
        const user = get().user;
        if (!user) return;
        const date = get().currentDate;
        const prev = get().hydration;
        const newAmount = Math.max(0, (prev[date] ?? 0) + deltaMl);
        // Optimistic update.
        set({ hydration: { ...prev, [date]: newAmount } });
        const { error } = await supabase
          .from("hydration")
          .upsert({ user_id: user.id, date, consumed_ml: newAmount, updated_at: new Date().toISOString() });
        if (error) {
          console.error("Failed to update hydration:", error);
          set({ hydration: prev, error: "Couldn't save your water intake. Please try again." });
        }
      },

      // ---------- UI ----------
      setCurrentDate: (date) => set({ currentDate: date }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({
          theme: s.theme === "deep-midnight" ? "high-contrast-light" : "deep-midnight",
        })),
      setError: (message) => set({ error: message }),
    }),
    {
      // Only UI preferences are persisted locally; user data lives in Supabase.
      name: "nutriflow-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme }),
    }
  )
);

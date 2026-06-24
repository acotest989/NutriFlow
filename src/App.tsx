import React, { useState, useEffect } from "react";
import { 
  Flame, 
  Apple, 
  Scan, 
  Dumbbell, 
  TrendingUp, 
  Smartphone, 
  Monitor, 
  Cpu, 
  Info, 
  Calendar,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";
import { LogEntry, Goal } from "./types";
import { DEFAULT_GOAL } from "./data";
import Dashboard from "./components/Dashboard";
import FoodSearch from "./components/FoodSearch";
import Scanner from "./components/Scanner";
import ExerciseTracker from "./components/ExerciseTracker";
import ProgressCharts from "./components/ProgressCharts";
import AiCoach from "./components/AiCoach";
import WaterTracker from "./components/WaterTracker";

// Helper to get formatted dates
const getPastDateStr = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

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

export default function App() {
  // Automatically switches between layouts responsively!
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkResponsive = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkResponsive();
    window.addEventListener("resize", checkResponsive);
    return () => window.removeEventListener("resize", checkResponsive);
  }, []);
  
  // App state
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [goal, setGoal] = useState<Goal>(DEFAULT_GOAL);
  
  // Accessibility Accessibility theme: Deep Midnight or High Contrast Light
  const [theme, setTheme] = useState<"deep-midnight" | "high-contrast-light">(() => {
    const saved = localStorage.getItem("nutriflow_theme");
    return saved === "high-contrast-light" ? "high-contrast-light" : "deep-midnight";
  });

  useEffect(() => {
    localStorage.setItem("nutriflow_theme", theme);
  }, [theme]);

  // Mobile viewport current bottom navigation tab
  const [activeMobileTab, setActiveMobileTab] = useState<"dashboard" | "meals" | "exercises" | "charts" | "scanner" | "coach">("dashboard");

  // Load state from local storage on mount
  useEffect(() => {
    const savedEntries = localStorage.getItem("macro_tracker_entries");
    const savedGoal = localStorage.getItem("macro_tracker_goal");

    if (savedGoal) {
      setGoal(JSON.parse(savedGoal));
    } else {
      localStorage.setItem("macro_tracker_goal", JSON.stringify(DEFAULT_GOAL));
    }

    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    } else {
      // Seed initial high fidelity sample logs so charts look stunning instantly
      const seedData = SAMPLE_HISTORICAL_ENTRIES();
      setEntries(seedData);
      localStorage.setItem("macro_tracker_entries", JSON.stringify(seedData));
    }
  }, []);

  // Sync entries helper
  const updateAndPersistEntries = (newEntries: LogEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem("macro_tracker_entries", JSON.stringify(newEntries));
  };

  // State handlers
  const handleAddEntry = (entryData: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newEntry: LogEntry = {
      ...entryData,
      id: "entry_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    updateAndPersistEntries([newEntry, ...entries]);
  };

  const handleRemoveEntry = (id: string) => {
    updateAndPersistEntries(entries.filter(e => e.id !== id));
  };

  const handleUpdateGoal = (newGoal: Goal) => {
    setGoal(newGoal);
    localStorage.setItem("macro_tracker_goal", JSON.stringify(newGoal));
  };

  const handleAddQuickCalories = (calories: number, type: 'meal' | 'exercise') => {
    handleAddEntry({
      date: currentDate,
      type,
      name: type === 'meal' ? 'Quick Snack' : 'Quick Workout',
      calories,
      protein: type === 'meal' ? Math.round(calories * 0.05) : 0, // estimate small macros
      carbs: type === 'meal' ? Math.round(calories * 0.12) : 0,
      fat: type === 'meal' ? Math.round(calories * 0.02) : 0,
      quantity: type === 'meal' ? 100 : 30, // generic unit weight/time
    });
  };

  return (
    <div className={`min-h-screen bg-[#0B0E14] flex flex-col antialiased selection:bg-[#6366F1] selection:text-white transition-colors duration-200 ${theme === 'high-contrast-light' ? 'theme-high-contrast-light' : ''}`}>
      {isMobile ? (
        /* ================= MOBILE DIRECT NATIVE VIEWPORT ================= */
        <div className="flex-1 flex flex-col min-h-screen pb-24">
          {/* NutriFlow Mobile Brand Sticky Header */}
          <div className="bg-[#141923] px-5 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 z-40 select-none shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-[#6366F1] to-[#a855f7] flex items-center justify-center text-white shadow-md shadow-[#6366F1]/10">
                <Flame className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <span className="font-sans font-black text-sm tracking-tight text-white">
                Nutri<span className="text-[#818CF8]">Flow</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                id="mobile_theme_toggle"
                onClick={() => setTheme(prev => prev === 'deep-midnight' ? 'high-contrast-light' : 'deep-midnight')}
                className="p-1.5 rounded-lg border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all text-xs text-[#818CF8] flex items-center justify-center"
                title={theme === 'deep-midnight' ? 'Switch to High Contrast Light Theme' : 'Switch to Deep Midnight Theme'}
              >
                {theme === 'deep-midnight' ? (
                  <Sun className="w-4.5 h-4.5 text-amber-400" />
                ) : (
                  <Moon className="w-4.5 h-4.5 text-[#818CF8]" />
                )}
              </button>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono font-bold tracking-wider text-[#94A3B8] uppercase">Sync On</span>
              </div>
            </div>
          </div>

          {/* Internal Scrollable Content Area */}
          <div className="flex-1 p-4 space-y-4">
            {activeMobileTab === "dashboard" && (
              <div className="space-y-4 animate-fadeIn">
                <Dashboard 
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                  entries={entries}
                  goal={goal}
                  onUpdateGoal={handleUpdateGoal}
                  onAddQuickCalories={handleAddQuickCalories}
                  isCompact={true}
                />
                <WaterTracker currentDate={currentDate} isCompact={true} />
              </div>
            )}

            {activeMobileTab === "meals" && (
              <FoodSearch 
                currentDate={currentDate}
                entries={entries}
                onAddEntry={handleAddEntry}
                onRemoveEntry={handleRemoveEntry}
              />
            )}

            {activeMobileTab === "exercises" && (
              <ExerciseTracker 
                currentDate={currentDate}
                entries={entries}
                onAddEntry={handleAddEntry}
                onRemoveEntry={handleRemoveEntry}
              />
            )}

            {activeMobileTab === "charts" && (
              <ProgressCharts 
                entries={entries}
                goal={goal}
                isCompact={true}
              />
            )}

            {activeMobileTab === "scanner" && (
              <Scanner 
                currentDate={currentDate}
                onAddEntry={handleAddEntry}
                isCompact={true}
              />
            )}

            {activeMobileTab === "coach" && (
              <AiCoach 
                currentDate={currentDate}
                entries={entries}
                goal={goal}
                onAddEntry={handleAddEntry}
                isCompact={true}
              />
            )}
          </div>

          {/* iPhone Native Bottom Tab Navigation Bar */}
          <nav className="fixed bottom-0 inset-x-0 bg-[#141923]/95 border-t border-white/5 flex justify-around py-2.5 z-40 select-none shrink-0 font-sans shadow-[0_-4px_10px_rgba(0,0,0,0.3)] px-1 backdrop-blur-md">
            <button
              id="mobile_nav_dashboard"
              onClick={() => setActiveMobileTab("dashboard")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "dashboard" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Apple className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              id="mobile_nav_meals"
              onClick={() => setActiveMobileTab("meals")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "meals" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Apple className="w-5 h-5" />
              <span>Meals</span>
            </button>
            <button
              id="mobile_nav_workouts"
              onClick={() => setActiveMobileTab("exercises")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "exercises" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Dumbbell className="w-5 h-5" />
              <span>Active</span>
            </button>
            <button
              id="mobile_nav_coach"
              onClick={() => setActiveMobileTab("coach")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "coach" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>AI Coach</span>
            </button>
            <button
              id="mobile_nav_analytics"
              onClick={() => setActiveMobileTab("charts")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "charts" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Trends</span>
            </button>
            <button
              id="mobile_nav_scanner"
              onClick={() => setActiveMobileTab("scanner")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "scanner" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Scan className="w-5 h-5" />
              <span>UPC Scan</span>
            </button>
          </nav>
        </div>
      ) : (
        /* ================= RESPONSIVE WEB/DESKTOP VIEWPORT ================= */
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 p-6">
          {/* Desktop Brand Navigation Bar */}
          <div className="bg-[#141923]/90 border border-white/5 backdrop-blur-md rounded-[24px] px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-xl gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-[#6366F1] to-[#a855f7] flex items-center justify-center text-white shadow-md shadow-[#6366F1]/20">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="font-sans font-black text-base tracking-tight text-white flex items-center gap-1.5">
                  NutriFlow<span className="text-[#818CF8]">Studio</span>
                </h2>
                <p className="text-[10px] text-[#94A3B8] font-sans">Professional Diet, Hydration, and Active Workout Workspace</p>
              </div>
            </div>

            {/* Status and Active Date indicators */}
            <div className="flex items-center gap-4">
              <button
                id="desktop_theme_toggle"
                onClick={() => setTheme(prev => prev === 'deep-midnight' ? 'high-contrast-light' : 'deep-midnight')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all text-xs font-semibold text-[#818CF8] cursor-pointer"
                title={theme === 'deep-midnight' ? 'Switch to High Contrast Light Theme' : 'Switch to Deep Midnight Theme'}
              >
                {theme === 'deep-midnight' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="text-[#E2E8F0] font-sans">High Contrast Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-[#818CF8]" />
                    <span className="text-[#0F172A] font-sans">Deep Midnight</span>
                  </>
                )}
              </button>
              <div className="flex items-center gap-1.5 bg-[#0B0E14] border border-white/5 px-3 py-1.5 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-[#10B981] uppercase tracking-wider">AI Engines Connected</span>
              </div>
              <div className="text-[11px] font-sans text-[#94A3B8]">
                Logged date: <span className="text-white font-semibold font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 ml-1">{currentDate}</span>
              </div>
            </div>
          </div>

          {/* Main Web Bento Grid */}
          <div className="grid lg:grid-cols-12 gap-6 bg-[#141923]/50 rounded-[24px] p-6 border border-white/10 backdrop-blur-md">
            {/* Left side bento block - Interactive Main Controller */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Top Row: Date select and general metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Dashboard summary component */}
                <Dashboard 
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                  entries={entries}
                  goal={goal}
                  onUpdateGoal={handleUpdateGoal}
                  onAddQuickCalories={handleAddQuickCalories}
                  isCompact={false}
                />

                {/* Progress charts component */}
                <ProgressCharts 
                  entries={entries}
                  goal={goal}
                  isCompact={false}
                />
              </div>

              {/* Middle Row: Hydration and AI Coach reviews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WaterTracker currentDate={currentDate} isCompact={false} />
                <AiCoach 
                  currentDate={currentDate}
                  entries={entries}
                  goal={goal}
                  onAddEntry={handleAddEntry}
                  isCompact={false}
                />
              </div>

              {/* Bottom Row: Exercise panel */}
              <ExerciseTracker 
                currentDate={currentDate}
                entries={entries}
                onAddEntry={handleAddEntry}
                onRemoveEntry={handleRemoveEntry}
              />
            </div>

            {/* Right side bento block - Food Logger, Scanner & Barcode details */}
            <div className="lg:col-span-4 space-y-6">
              {/* Barcode scanner device */}
              <Scanner 
                currentDate={currentDate}
                onAddEntry={handleAddEntry}
              />

              {/* Food searching component */}
              <FoodSearch 
                currentDate={currentDate}
                entries={entries}
                onAddEntry={handleAddEntry}
                onRemoveEntry={handleRemoveEntry}
              />
            </div>
          </div>
        </div>
      )}

      {/* Unified Platform Description Footer */}
      <footer className="text-center text-[#64748B] text-xs font-sans mt-8 px-6 pb-8 space-y-1 select-none">
        <div className="flex justify-center items-center gap-1.5 text-[#94A3B8] text-[10px] uppercase font-mono tracking-widest">
          <Info className="w-3.5 h-3.5 text-[#818CF8]" /> Technical Architecture
        </div>
        <p className="max-w-2xl mx-auto leading-relaxed text-[11px] text-[#64748B]">
          NutriFlow is fully responsive. This page uses tailwind grid and flexible viewport hook, rendering a gorgeous native tab bar on mobile phones and a complete multi-column workspace layout on desktop displays.
        </p>
      </footer>
    </div>
  );
}

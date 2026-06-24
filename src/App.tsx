import React, { useState, useEffect } from "react";
import {
  Flame,
  Apple,
  Scan,
  Dumbbell,
  TrendingUp,
  Info,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";
import Dashboard from "./components/Dashboard";
import FoodSearch from "./components/FoodSearch";
import Scanner from "./components/Scanner";
import ExerciseTracker from "./components/ExerciseTracker";
import ProgressCharts from "./components/ProgressCharts";
import AiCoach from "./components/AiCoach";
import WaterTracker from "./components/WaterTracker";
import { useStore } from "./store";

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

  // Shared app state now lives in the global store (see src/store.ts).
  const currentDate = useStore((s) => s.currentDate);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  // Mobile viewport current bottom navigation tab
  const [activeMobileTab, setActiveMobileTab] = useState<"dashboard" | "meals" | "exercises" | "charts" | "scanner" | "coach">("dashboard");

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
                onClick={toggleTheme}
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
                <Dashboard isCompact={true} />
                <WaterTracker isCompact={true} />
              </div>
            )}

            {activeMobileTab === "meals" && <FoodSearch />}

            {activeMobileTab === "exercises" && <ExerciseTracker />}

            {activeMobileTab === "charts" && <ProgressCharts isCompact={true} />}

            {activeMobileTab === "scanner" && <Scanner isCompact={true} />}

            {activeMobileTab === "coach" && <AiCoach isCompact={true} />}
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
          <div className="bg-[#141923]/90 border border-white/5 backdrop-blur-md rounded-3xl px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-xl gap-4">
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
                onClick={toggleTheme}
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
          <div className="grid lg:grid-cols-12 gap-6 bg-[#141923]/50 rounded-3xl p-6 border border-white/10 backdrop-blur-md">
            {/* Left side bento block - Interactive Main Controller */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Top Row: Date select and general metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Dashboard summary component */}
                <Dashboard isCompact={false} />

                {/* Progress charts component */}
                <ProgressCharts isCompact={false} />
              </div>

              {/* Middle Row: Hydration and AI Coach reviews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WaterTracker isCompact={false} />
                <AiCoach isCompact={false} />
              </div>

              {/* Bottom Row: Exercise panel */}
              <ExerciseTracker />
            </div>

            {/* Right side bento block - Food Logger, Scanner & Barcode details */}
            <div className="lg:col-span-4 space-y-6">
              {/* Barcode scanner device */}
              <Scanner />

              {/* Food searching component */}
              <FoodSearch />
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

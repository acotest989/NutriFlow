import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Flame, 
  Apple, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Utensils, 
  Dumbbell,
  Target,
  Plus
} from "lucide-react";
import { Goal, LogEntry } from "../types";

interface DashboardProps {
  currentDate: string;
  setCurrentDate: (date: string) => void;
  entries: LogEntry[];
  goal: Goal;
  onUpdateGoal: (newGoal: Goal) => void;
  onAddQuickCalories: (calories: number, type: 'meal' | 'exercise') => void;
  isCompact?: boolean;
}

export default function Dashboard({
  currentDate,
  setCurrentDate,
  entries,
  goal,
  onUpdateGoal,
  onAddQuickCalories,
  isCompact = false,
}: DashboardProps) {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState<Goal>({ ...goal });

  // Calculate daily totals for selected date
  const dailyEntries = entries.filter(e => e.date === currentDate);
  
  const consumedCalories = dailyEntries
    .filter(e => e.type === "meal")
    .reduce((sum, e) => sum + e.calories, 0);

  const burnedCalories = dailyEntries
    .filter(e => e.type === "exercise")
    .reduce((sum, e) => sum + e.calories, 0); // calories are stored positive, we subtract them

  const netCalories = consumedCalories - burnedCalories;
  const remainingCalories = goal.calories - netCalories;

  const consumedProtein = dailyEntries
    .filter(e => e.type === "meal")
    .reduce((sum, e) => sum + e.protein, 0);

  const consumedCarbs = dailyEntries
    .filter(e => e.type === "meal")
    .reduce((sum, e) => sum + e.carbs, 0);

  const consumedFat = dailyEntries
    .filter(e => e.type === "meal")
    .reduce((sum, e) => sum + e.fat, 0);

  // Helper to format date beautifully
  const formatDateLabel = (dateStr: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (dateStr === todayStr) return "Today";
    if (dateStr === yesterdayStr) return "Yesterday";

    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const changeDate = (days: number) => {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    setCurrentDate(d.toISOString().split("T")[0]);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateGoal(tempGoal);
    setIsEditingGoal(false);
  };

  // Percentages for rings/bars
  const calPercent = Math.min(100, Math.max(0, (netCalories / goal.calories) * 100));
  const proteinPercent = Math.min(100, Math.max(0, (consumedProtein / goal.protein) * 100));
  const carbsPercent = Math.min(100, Math.max(0, (consumedCarbs / goal.carbs) * 100));
  const fatPercent = Math.min(100, Math.max(0, (consumedFat / goal.fat) * 100));

  // Circular gauge calculations
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  return (
    <div id="dashboard_panel" className="space-y-6">
      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between bg-[#141923] rounded-2xl p-3 shadow-sm border border-white/5">
        <button 
          id="btn_prev_date"
          onClick={() => changeDate(-1)} 
          className="p-2 hover:bg-white/5 rounded-xl transition-colors text-[#94A3B8] hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 id="text_date_label" className="font-sans font-semibold text-white">{formatDateLabel(currentDate)}</h2>
          <span className="text-[10px] font-mono text-[#64748B]">{currentDate}</span>
        </div>
        <button 
          id="btn_next_date"
          onClick={() => changeDate(1)} 
          className="p-2 hover:bg-white/5 rounded-xl transition-colors text-[#94A3B8] hover:text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Main Calorie Ring Card */}
      <div className="bg-[#141923] rounded-[24px] p-6 shadow-md border border-white/5 relative overflow-hidden">
        {/* Card Header with Safe Settings Button */}
        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
          <h3 className="font-sans font-bold text-sm text-[#818CF8] flex items-center gap-2">
            <Target className="w-4 h-4" /> Calorie Balance & Goals
          </h3>
          <button 
            id="btn_edit_goal"
            onClick={() => {
              setTempGoal({ ...goal });
              setIsEditingGoal(!isEditingGoal);
            }} 
            className="p-1.5 text-[#64748B] hover:text-[#818CF8] hover:bg-white/5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Adjust Custom Goals"
          >
            <Settings className="w-4 h-4" /> 
            <span className="text-[11px] font-sans">Adjust Goal</span>
          </button>
        </div>

        {isEditingGoal ? (
          <motion.form 
            id="form_goal_settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSaveGoal} 
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-2 text-[#818CF8]">
              <Target className="w-5 h-5" />
              <h3 className="font-semibold font-sans text-white">Custom Goal Settings</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 font-sans">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Calories (kcal)</label>
                <input 
                  id="input_goal_calories"
                  type="number" 
                  value={tempGoal.calories} 
                  onChange={e => setTempGoal({ ...tempGoal, calories: Math.max(1, parseInt(e.target.value) || 0) })}
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Protein (g)</label>
                <input 
                  id="input_goal_protein"
                  type="number" 
                  value={tempGoal.protein} 
                  onChange={e => setTempGoal({ ...tempGoal, protein: Math.max(1, parseInt(e.target.value) || 0) })}
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Carbs (g)</label>
                <input 
                  id="input_goal_carbs"
                  type="number" 
                  value={tempGoal.carbs} 
                  onChange={e => setTempGoal({ ...tempGoal, carbs: Math.max(1, parseInt(e.target.value) || 0) })}
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Fat (g)</label>
                <input 
                  id="input_goal_fat"
                  type="number" 
                  value={tempGoal.fat} 
                  onChange={e => setTempGoal({ ...tempGoal, fat: Math.max(1, parseInt(e.target.value) || 0) })}
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button 
                id="btn_cancel_goal"
                type="button" 
                onClick={() => setIsEditingGoal(false)} 
                className="px-4 py-2 border border-white/10 rounded-xl text-xs text-[#94A3B8] hover:bg-white/5 font-sans"
              >
                Cancel
              </button>
              <button 
                id="btn_submit_goal"
                type="submit" 
                className="px-4 py-2 bg-[#6366F1] hover:bg-[#818CF8] text-white rounded-xl text-xs font-sans font-semibold transition-colors shadow-sm"
              >
                Save Goals
              </button>
            </div>
          </motion.form>
        ) : (
          <div className={isCompact ? "flex flex-col gap-6 items-center" : "flex flex-row flex-wrap gap-6 items-center justify-center lg:justify-between"}>
            {/* Round Calorie Progress Ring */}
            <div className="flex flex-col items-center justify-center relative py-4 shrink-0">
              <svg className="w-48 h-48 transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  className="stroke-white/5"
                  strokeWidth="14"
                  fill="transparent"
                />
                {/* Highlight/Progress Ring */}
                <motion.circle
                  cx="96"
                  cy="96"
                  r={radius}
                  className={remainingCalories < 0 ? "stroke-rose-500" : "stroke-[#818CF8]"}
                  strokeWidth="14"
                  fill="transparent"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner Circle Content */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span id="text_remaining_calories" className="text-4xl font-sans font-bold text-white tracking-tight">
                  {Math.abs(remainingCalories).toLocaleString()}
                </span>
                <span className="text-[10px] text-[#64748B] uppercase tracking-widest font-sans font-semibold">
                  {remainingCalories >= 0 ? "kcal Left" : "Over Target"}
                </span>
                {remainingCalories >= 0 ? (
                  <span className="text-[10px] text-[#818CF8] font-sans mt-1 bg-[#6366F1]/10 px-2.5 py-0.5 rounded-full font-semibold border border-[#6366F1]/10">
                    {calPercent.toFixed(0)}% Done
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-400 font-sans mt-1 bg-rose-500/10 px-2.5 py-0.5 rounded-full font-semibold border border-rose-500/10">
                    Exceeded
                  </span>
                )}
              </div>
            </div>

            {/* Quick Summary Numbers */}
            <div className="space-y-4 font-sans w-full max-w-sm">
              <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#818CF8]/10 flex items-center justify-center text-[#818CF8] shrink-0">
                  <Apple className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-[#94A3B8] font-medium block">Consumed Food</span>
                  <div className="flex items-baseline gap-1">
                    <span id="text_consumed_kcal" className="text-xl font-bold text-[#F8FAFC]">{consumedCalories}</span>
                    <span className="text-[10px] text-[#64748B]">kcal</span>
                  </div>
                </div>
                {/* Quick Add Kcal Pill */}
                <button
                  id="btn_quick_add_meal"
                  onClick={() => onAddQuickCalories(200, 'meal')}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[#818CF8] border border-white/10 rounded-lg text-[10px] font-semibold flex items-center gap-0.5 transition-colors"
                  title="Quick Log +200 kcal"
                >
                  <Plus className="w-3 h-3" /> 200
                </button>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#4ADE80]/10 flex items-center justify-center text-[#4ADE80] shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-[#94A3B8] font-medium block">Burned Workouts</span>
                  <div className="flex items-baseline gap-1">
                    <span id="text_burned_kcal" className="text-xl font-bold text-[#F8FAFC]">{burnedCalories}</span>
                    <span className="text-[10px] text-[#64748B]">kcal</span>
                  </div>
                </div>
                {/* Quick Burn Kcal Pill */}
                <button
                  id="btn_quick_add_exercise"
                  onClick={() => onAddQuickCalories(150, 'exercise')}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[#4ADE80] border border-white/10 rounded-lg text-[10px] font-semibold flex items-center gap-0.5 transition-colors"
                  title="Quick Log -150 kcal"
                >
                  <Plus className="w-3 h-3" /> 150
                </button>
              </div>

              <div className="border-t border-dashed border-white/5 pt-3 flex justify-between text-xs text-[#64748B] px-1">
                <span>Daily Budget: <b className="text-[#94A3B8]">{goal.calories} kcal</b></span>
                <span>Net Calories: <b className="text-[#94A3B8]">{netCalories} kcal</b></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Macronutrients Goals Progress */}
      <div className="bg-[#141923] rounded-[24px] p-6 shadow-md border border-white/5">
        <h3 className="font-sans font-bold text-white mb-5 flex items-center gap-2">
          <Utensils className="w-4 h-4 text-[#818CF8]" /> Daily Macronutrients
        </h3>

        <div className="space-y-5 font-sans">
          {/* Protein progress */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C] inline-block"></span>
                Protein
              </span>
              <span className="text-xs text-[#94A3B8]">
                <b id="text_actual_protein" className="text-white">{consumedProtein.toFixed(1)}g</b> / {goal.protein}g ({proteinPercent.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-[#FB923C] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${proteinPercent}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>

          {/* Carbs progress */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] inline-block"></span>
                Carbohydrates
              </span>
              <span className="text-xs text-[#94A3B8]">
                <b id="text_actual_carbs" className="text-white">{consumedCarbs.toFixed(1)}g</b> / {goal.carbs}g ({carbsPercent.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-[#38BDF8] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${carbsPercent}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>

          {/* Fats progress */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FACC15] inline-block"></span>
                Fats
              </span>
              <span className="text-xs text-[#94A3B8]">
                <b id="text_actual_fat" className="text-white">{consumedFat.toFixed(1)}g</b> / {goal.fat}g ({fatPercent.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-[#FACC15] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${fatPercent}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
        </div>

        {/* Motivating Status Banner */}
        <div className="mt-6 bg-[#6366F1]/5 border border-[#6366F1]/10 rounded-2xl p-4 flex gap-3 items-start">
          <div className="text-[#818CF8] pt-0.5">
            <CheckCircle className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#818CF8] font-sans">
              {remainingCalories > 0 
                ? `You have ${remainingCalories} kcal left for your active target. Keep going!`
                : "You have completed your daily net calorie goal! Excellent work staying balanced today."}
            </p>
            <p className="text-[10px] text-[#94A3B8] font-sans mt-0.5">
              Macros contribute directly to muscle recovery and stable energy. Try logging balanced meals to match targets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

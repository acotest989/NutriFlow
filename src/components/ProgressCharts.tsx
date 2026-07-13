import {
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart
} from "recharts";
import { Activity, Flame, TrendingUp, CircleAlert, Check, Award, Lock } from "lucide-react";
import { useStore } from "../store";
import { todayStr, addDays } from "../lib/date";
import { computeStreakStats, computeBadges } from "../lib/streaks";

interface ProgressChartsProps {
  isCompact?: boolean;
}

export default function ProgressCharts({ isCompact = false }: ProgressChartsProps) {
  const entries = useStore((s) => s.entries);
  const goal = useStore((s) => s.goal);
  const hydration = useStore((s) => s.hydration);
  // 1. Generate 7 days of trend data ending today
  const getTrendData = () => {
    const data = [];

    for (let i = 6; i >= 0; i--) {
      // Local calendar date for this bucket (matches how entries are dated).
      const dateStr = addDays(todayStr(), -i);
      const d = new Date(dateStr + "T00:00:00");

      // Format date label (e.g. "Mon 23")
      const label = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });

      const dayEntries = entries.filter(e => e.date === dateStr);
      
      const food = dayEntries
        .filter(e => e.type === "meal")
        .reduce((sum, e) => sum + e.calories, 0);

      const exercise = dayEntries
        .filter(e => e.type === "exercise")
        .reduce((sum, e) => sum + e.calories, 0);

      const net = food - exercise;

      data.push({
        name: label,
        date: dateStr,
        "Food Ingested": food,
        "Active Burn": exercise,
        "Net Calories": net,
        Goal: goal.calories
      });
    }
    return data;
  };

  // 2. Generate Macronutrient distribution for current date entries
  const getMacroDistribution = () => {
    const today = todayStr();
    const dayEntries = entries.filter(e => e.date === today && e.type === "meal");

    const protein = dayEntries.reduce((sum, e) => sum + e.protein, 0);
    const carbs = dayEntries.reduce((sum, e) => sum + e.carbs, 0);
    const fat = dayEntries.reduce((sum, e) => sum + e.fat, 0);

    // Calories: Protein (4 kcal/g), Carbs (4 kcal/g), Fat (9 kcal/g)
    const pKcal = protein * 4;
    const cKcal = carbs * 4;
    const fKcal = fat * 9;
    const totalKcal = pKcal + cKcal + fKcal;

    if (totalKcal === 0) {
      return [
        { name: "Protein", value: 30, color: "#10b981", grams: 0 },
        { name: "Carbs", value: 50, color: "#fbbf24", grams: 0 },
        { name: "Fat", value: 20, color: "#f87171", grams: 0 }
      ];
    }

    return [
      { name: "Protein", value: Math.round((pKcal / totalKcal) * 100), color: "#4ADE80", grams: Math.round(protein) },
      { name: "Carbs", value: Math.round((cKcal / totalKcal) * 100), color: "#38BDF8", grams: Math.round(carbs) },
      { name: "Fat", value: Math.round((fKcal / totalKcal) * 100), color: "#FACC15", grams: Math.round(fat) }
    ];
  };

  const trendData = getTrendData();
  const macroData = getMacroDistribution();
  const totalGramsLogged = macroData.reduce((sum, m) => sum + m.grams, 0);
  const streak = computeStreakStats(entries, hydration);
  const badges = computeBadges(streak);

  return (
    <div id="analytics_panel" className="space-y-6">
      {/* Streak hero */}
      <div className="bg-linear-to-r from-[#6366F1] to-[#4F46E5] rounded-3xl p-5 text-white shadow-md border border-white/5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex flex-col items-center justify-center shrink-0">
          <Flame className={`w-5 h-5 ${streak.current > 0 ? "text-amber-300" : "text-white/50"}`} />
          <span className="text-xl font-black leading-none mt-0.5">{streak.current}</span>
        </div>
        <div className="font-sans flex-1 min-w-0">
          <h3 className="font-bold text-sm">
            {streak.current > 0 ? `${streak.current}-Day Streak` : "Start a Streak"}
          </h3>
          <p className="text-xs text-[#E2E8F0] mt-0.5 leading-relaxed">
            {streak.current > 0
              ? streak.todayActive
                ? `Nice work today! Keep it going — longest streak: ${streak.longest} ${streak.longest === 1 ? "day" : "days"}.`
                : `Your streak is alive — log anything today to extend it. Longest: ${streak.longest} ${streak.longest === 1 ? "day" : "days"}.`
              : "Log a meal, workout, or water today to begin your streak!"}
          </p>
        </div>
      </div>

      {/* Achievements card */}
      <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-sans font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-[#818CF8]" /> Achievements
          </h3>
          <span className="text-[11px] font-mono font-bold text-[#818CF8] bg-[#6366F1]/10 border border-[#6366F1]/20 px-2.5 py-1 rounded-lg">
            {badges.filter((b) => b.earned).length} / {badges.length}
          </span>
        </div>
        <p className="text-[11px] text-[#94A3B8] font-sans leading-relaxed">
          Log a meal, workout, or water on any day to keep your streak alive — miss a whole day and it resets. Stay consistent to unlock these:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 border ${
                b.earned ? "bg-[#6366F1]/10 border-[#6366F1]/25" : "bg-[#0B0E14] border-white/5"
              }`}
            >
              <span className={`text-xl leading-none shrink-0 ${b.earned ? "" : "opacity-30 grayscale"}`}>{b.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold leading-tight ${b.earned ? "text-white" : "text-[#64748B]"}`}>{b.label}</p>
                <p className={`text-[10px] leading-tight mt-0.5 ${b.earned ? "text-[#94A3B8]" : "text-[#475569]"}`}>{b.description}</p>
              </div>
              {b.earned ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#475569] shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5 space-y-4">
        <div>
          <h3 className="font-sans font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#818CF8]" /> 7-Day Balance Trend
          </h3>
          <p className="text-[10px] text-[#94A3B8] font-sans mt-0.5">
            Compares total food consumed against negative burned workout calories versus daily budget.
          </p>
        </div>

        <div className="h-64 w-full text-xs font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={trendData}
              margin={{ top: 10, right: 10, bottom: 0, left: -25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="name" stroke="#64748B" tickLine={false} />
              <YAxis stroke="#64748B" tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#0B0E14",
                  borderColor: "#1E293B",
                  color: "#E2E8F0",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, monospace"
                }} 
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ color: "#E2E8F0" }} />
              
              {/* Positive Food Consumption */}
              <Bar dataKey="Food Ingested" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={24} />
              
              {/* Negative Active Exercise Burn */}
              <Bar dataKey="Active Burn" fill="#4ADE80" radius={[0, 0, 4, 4]} barSize={24} />
              
              {/* Net Calories Line */}
              <Line type="monotone" dataKey="Net Calories" stroke="#FB7185" strokeWidth={2.5} dot={{ r: 4 }} />
              
              {/* Reference Budget Line */}
              <Line type="monotone" dataKey="Goal" stroke="#64748B" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macronutrient Calories Energy Share */}
      <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5">
        <div>
          <h3 className="font-sans font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#818CF8]" /> Today's Energy Share
          </h3>
          <p className="text-[10px] text-[#94A3B8] font-sans mt-0.5">
            Breakdown of daily energy contributions (kcal percentage) derived from logged proteins, carbs, and fats.
          </p>
        </div>

        <div className={isCompact ? "flex flex-col gap-6 items-center pt-4" : "flex flex-row flex-wrap gap-6 items-center justify-center lg:justify-between pt-4"}>
          <div className="h-44 w-full max-w-45 flex items-center justify-center relative shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `${value}%`}
                  contentStyle={{ 
                    backgroundColor: "#0B0E14",
                    borderColor: "#1E293B",
                    color: "#E2E8F0",
                    borderRadius: "10px",
                    fontFamily: "Inter, sans-serif", 
                    fontSize: "11px"
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered label */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-sans font-bold text-white">
                {totalGramsLogged}g
              </span>
              <span className="text-[9px] uppercase font-sans text-[#64748B]">
                Total Logged
              </span>
            </div>
          </div>

          <div className="space-y-3 font-sans w-full flex-1">
            {macroData.map((m, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-[#0B0E14]/40"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-xs font-semibold text-[#E2E8F0]">{m.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white block">{m.grams}g</span>
                  <span className="text-[9px] text-[#64748B]">{m.value}% of calories</span>
                </div>
              </div>
            ))}
            
            {totalGramsLogged === 0 && (
              <div className="flex gap-1.5 items-start mt-2 p-2 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg text-[9px]">
                <CircleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Default balanced template displayed. Please log food items in the database to see live ratios!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

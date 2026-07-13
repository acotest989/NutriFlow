import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Flame, 
  Trash2, 
  Search, 
  Plus, 
  Activity, 
  Watch, 
  Dumbbell 
} from "lucide-react";
import { ExerciseItem } from "../types";
import { PRESET_EXERCISES } from "../data";
import { useStore } from "../store";
import { useTranslation } from "react-i18next";

export default function ExerciseTracker() {
  const currentDate = useStore((s) => s.currentDate);
  const entries = useStore((s) => s.entries);
  const onAddEntry = useStore((s) => s.addEntry);
  const onRemoveEntry = useStore((s) => s.removeEntry);
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null);
  const [minutes, setMinutes] = useState(30);

  // Manual custom entry state
  const [isManual, setIsManual] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customMinutes, setCustomMinutes] = useState("30");

  const filteredExercises = PRESET_EXERCISES.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogPreset = (exercise: ExerciseItem) => {
    const totalBurned = Math.round(exercise.caloriesPerMinute * minutes);
    onAddEntry({
      date: currentDate,
      type: "exercise",
      name: `${exercise.name} (${minutes} mins)`,
      calories: totalBurned,
      protein: 0,
      carbs: 0,
      fat: 0,
      quantity: minutes,
    });
    setSelectedExercise(null);
    setMinutes(30);
  };

  const handleLogCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    onAddEntry({
      date: currentDate,
      type: "exercise",
      name: `${customName} (${customMinutes} mins)`,
      calories: parseInt(customCalories) || 150,
      protein: 0,
      carbs: 0,
      fat: 0,
      quantity: parseInt(customMinutes) || 30,
    });

    setCustomName("");
    setCustomCalories("");
    setCustomMinutes("30");
    setIsManual(false);
  };

  // Logged exercises on current date
  const loggedExercises = entries.filter(e => e.date === currentDate && e.type === "exercise");
  const totalBurnedToday = loggedExercises.reduce((sum, e) => sum + e.calories, 0);

  return (
    <div id="exercise_tracker_panel" className="space-y-6">
      {/* Segments Header */}
      <div className="flex bg-[#0B0E14] p-1 rounded-2xl border border-white/5">
        <button
          id="tab_preset_exercises"
          onClick={() => { setIsManual(false); }}
          className={`flex-1 py-2 rounded-xl text-xs font-sans font-semibold transition-all ${
            !isManual ? "bg-[#141923] text-[#4ADE80] border border-white/5 shadow-sm" : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5" /> {t("exercise.presetWorkouts")}
          </div>
        </button>
        <button
          id="tab_manual_exercise"
          onClick={() => { setIsManual(true); }}
          className={`flex-1 py-2 rounded-xl text-xs font-sans font-semibold transition-all ${
            isManual ? "bg-[#141923] text-[#4ADE80] border border-white/5 shadow-sm" : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {t("exercise.customWorkout")}
          </div>
        </button>
      </div>

      {/* Main Mode View Panels */}
      {!isManual ? (
        /* Presets Search Database Panel */
        <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-bold text-white">{t("exercise.catalogTitle")}</h3>
            <span className="text-[10px] font-mono bg-white/5 text-[#94A3B8] px-2 py-1 rounded-md border border-white/5">
              {t("exercise.activities", { n: PRESET_EXERCISES.length })}
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-3.5" />
            <input
              id="input_exercise_search"
              type="text"
              placeholder={t("exercise.searchPlaceholder")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0E14] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4ADE80] transition-all font-sans text-white placeholder-[#64748B]"
            />
          </div>

          {/* Quick List Results */}
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {filteredExercises.map(ex => (
              <div
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                  selectedExercise?.id === ex.id
                    ? "border-[#4ADE80] bg-[#4ADE80]/10"
                    : "border-white/5 hover:border-white/10 hover:bg-white/2"
                }`}
              >
                <div className="font-sans flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#4ADE80]/10 flex items-center justify-center text-[#4ADE80] shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#E2E8F0]">{ex.name}</h4>
                    <p className="text-[10px] text-[#64748B] font-medium">
                      {t("exercise.estBurn", { kcal: (ex.caloriesPerMinute * 30).toFixed(0) })}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono text-[#94A3B8] bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                    {ex.caloriesPerMinute} kcal/min
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Preset Servings Adjustment Modal Overlay */}
          <AnimatePresence>
            {selectedExercise && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#4ADE80]/5 rounded-2xl p-4 border border-[#4ADE80]/10 space-y-3 font-sans"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#4ADE80]">{t("exercise.adjustDuration")}</span>
                  <span className="text-xs text-[#94A3B8] font-mono flex items-center gap-1">
                    <Watch className="w-3.5 h-3.5 text-[#4ADE80]" /> <b>{t("exercise.minutes", { n: minutes })}</b>
                  </span>
                </div>

                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="5"
                    max="180"
                    step="5"
                    value={minutes}
                    onChange={e => setMinutes(parseInt(e.target.value))}
                    className="flex-1 accent-[#4ADE80]"
                  />
                  <span className="text-sm font-bold text-[#4ADE80] bg-[#0B0E14] border border-white/10 px-3 py-1 rounded-lg w-16 text-center">
                    {minutes}m
                  </span>
                </div>

                <div className="flex justify-between items-center bg-[#0B0E14] border border-white/5 p-3 rounded-xl">
                  <div>
                    <span className="text-[#64748B] text-xs block">{t("exercise.activeMinutes")}</span>
                    <b className="text-white text-sm">{t("exercise.mins", { n: minutes })}</b>
                  </div>
                  <div className="text-right">
                    <span className="text-[#4ADE80] text-xs block">{t("exercise.negativeCalories")}</span>
                    <b className="text-[#4ADE80] text-base font-bold">-{Math.round(selectedExercise.caloriesPerMinute * minutes)} kcal</b>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    id="btn_cancel_exercise"
                    onClick={() => setSelectedExercise(null)}
                    className="flex-1 bg-[#0B0E14] hover:bg-white/5 border border-white/10 text-[#94A3B8] rounded-xl py-2 text-xs font-semibold transition-all"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    id="btn_confirm_exercise"
                    onClick={() => handleLogPreset(selectedExercise)}
                    className="flex-1 bg-[#4ADE80] hover:bg-[#22C55E] text-[#0B0E14] rounded-xl py-2 text-xs font-bold transition-all shadow-md"
                  >
                    {t("exercise.logExercise")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Manual Custom Exercise Panel */
        <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5 space-y-4">
          <h4 className="font-sans font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#4ADE80]" /> {t("exercise.logCustomTitle")}
          </h4>

          <form onSubmit={handleLogCustom} className="space-y-3 font-sans">
            <div>
              <label className="text-xs text-[#94A3B8] block mb-1">{t("exercise.exerciseDesc")}</label>
              <input
                id="input_custom_exercise_name"
                type="text"
                required
                placeholder={t("exercise.phExerciseName")}
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">{t("exercise.caloriesBurned")}</label>
                <input
                  id="input_custom_exercise_calories"
                  type="number"
                  placeholder={t("exercise.phCaloriesBurned")}
                  value={customCalories}
                  onChange={e => setCustomCalories(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
                />
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">{t("exercise.duration")}</label>
                <input
                  id="input_custom_exercise_minutes"
                  type="number"
                  placeholder={t("exercise.phDuration")}
                  value={customMinutes}
                  onChange={e => setCustomMinutes(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
                />
              </div>
            </div>

            <button
              id="btn_submit_custom_exercise"
              type="submit"
              disabled={!customName.trim()}
              className="w-full bg-[#4ADE80] hover:bg-[#22C55E] disabled:bg-white/5 disabled:text-[#64748B] text-[#0B0E14] font-bold rounded-xl py-2.5 text-xs transition-colors shadow-sm"
            >
              {t("exercise.logCustomBtn")}
            </button>
          </form>
        </div>
      )}

      {/* Burned Exercises List */}
      <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-sans font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#4ADE80]" /> {t("exercise.activeLogTitle")}
          </h3>
          <span className="text-xs font-bold text-[#4ADE80] bg-[#4ADE80]/10 px-2 py-0.5 rounded-lg border border-[#4ADE80]/20">
            -{totalBurnedToday} {t("exercise.kcalToday")}
          </span>
        </div>

        <div className="space-y-3">
          {loggedExercises.length > 0 ? (
            loggedExercises.map(ex => (
              <div
                key={ex.id}
                className="p-3 bg-[#0B0E14] rounded-2xl border border-white/5 flex items-center justify-between"
              >
                <div className="font-sans flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#4ADE80]/10 border border-[#4ADE80]/20 flex items-center justify-center text-[#4ADE80] shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-[#E2E8F0] truncate">{ex.name}</h4>
                    <p className="text-[9px] text-[#64748B] mt-0.5">
                      {t("exercise.durationValue", { n: ex.quantity })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-[#4ADE80] bg-[#4ADE80]/5 border border-[#4ADE80]/15 px-2.5 py-1 rounded-lg">
                    -{ex.calories} kcal
                  </span>
                  <button
                    onClick={() => onRemoveEntry(ex.id)}
                    className="text-[#64748B] hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title={t("exercise.deleteEntry")}
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-[#64748B] text-xs font-sans">
              {t("exercise.noWorkouts")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

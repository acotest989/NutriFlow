import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Sparkles,
  Plus,
  Trash2,
  Utensils,
  Scale,
  Loader2,
  Check,
  Database,
  Globe
} from "lucide-react";
import { FoodItem } from "../types";
import { COMMON_FOOD_ITEMS } from "../data";
import { useStore } from "../store";
import { todayStr, addDays } from "../lib/date";
import { useTranslation } from "react-i18next";

export default function FoodSearch() {
  const currentDate = useStore((s) => s.currentDate);
  const entries = useStore((s) => s.entries);
  const onAddEntry = useStore((s) => s.addEntry);
  const onRemoveEntry = useStore((s) => s.removeEntry);
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [multiplier, setMultiplier] = useState(1);

  // Online food-database (USDA) results that augment the local COMMON_FOOD_ITEMS
  // list as the user types. Progressive enhancement: if the backend has no FDC
  // key or the lookup fails, this stays empty and the local search still works.
  const [onlineResults, setOnlineResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // True once a lookup has completed for the current query, so we can show a
  // "no online matches" hint — only after a real search (never on a net error).
  const [searchDone, setSearchDone] = useState(false);

  // Manual Food Form State
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualServingSize, setManualServingSize] = useState("100");
  const [manualServingUnit, setManualServingUnit] = useState("g");

  // AI-powered Estimation State
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<Omit<FoodItem, 'id'> | null>(null);
  const [aiError, setAiError] = useState("");

  // Filter local food items
  const filteredFoods = COMMON_FOOD_ITEMS.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Debounced online lookup against the USDA-backed /api/food-search. Aborts the
  // in-flight request on each keystroke so results never arrive out of order.
  useEffect(() => {
    const q = searchQuery.trim();
    if (isManualMode || q.length < 2) {
      setOnlineResults([]);
      setIsSearching(false);
      setSearchDone(false);
      return;
    }
    const ctrl = new AbortController();
    setIsSearching(true);
    setSearchDone(false);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/food-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
          signal: ctrl.signal,
        });
        const data = res.ok ? await res.json() : [];
        if (!ctrl.signal.aborted) {
          setOnlineResults(Array.isArray(data) ? data : []);
          setSearchDone(true); // a lookup completed -> allow the "no matches" hint
        }
      } catch {
        if (!ctrl.signal.aborted) setOnlineResults([]); // net error: no hint
      } finally {
        if (!ctrl.signal.aborted) setIsSearching(false);
      }
    }, 400);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [searchQuery, isManualMode]);

  const handleLogPreset = (food: FoodItem) => {
    onAddEntry({
      date: currentDate,
      type: "meal",
      name: `${food.name} (x${multiplier})`,
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10,
      quantity: Math.round(food.servingSize * multiplier),
    });
    setSelectedFood(null);
    setMultiplier(1);
  };

  const handleLogManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const size = parseInt(manualServingSize) || 100;
    const unit = manualServingUnit.trim();
    onAddEntry({
      date: currentDate,
      type: "meal",
      // No unit column on entries, so preserve the serving in the name.
      name: unit ? `${manualName} (${size} ${unit})` : manualName,
      calories: parseInt(manualCalories) || 0,
      protein: parseFloat(manualProtein) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      fat: parseFloat(manualFat) || 0,
      quantity: size,
    });

    // Reset Form
    setManualName("");
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setManualServingSize("100");
    setManualServingUnit("g");
    setIsManualMode(false);
  };

  const handleAiEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    setIsAiLoading(true);
    setAiError("");
    setAiResult(null);

    try {
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiInput, lang: i18n.language }),
      });

      if (!response.ok) {
        throw new Error("API failed to analyze description. Check key settings.");
      }

      const data = await response.json();
      setAiResult(data);
    } catch (err: any) {
      console.error(err);
      setAiError(t("food.aiError"));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLogAiResult = () => {
    if (!aiResult) return;
    onAddEntry({
      date: currentDate,
      type: "meal",
      name: `${aiResult.name} (AI)`,
      calories: aiResult.calories,
      protein: aiResult.protein,
      carbs: aiResult.carbs,
      fat: aiResult.fat,
      quantity: aiResult.servingSize,
    });
    setAiResult(null);
    setAiInput("");
  };

  // Get currently logged meals for this date
  const loggedMeals = entries.filter(e => e.date === currentDate && e.type === "meal");

  return (
    <div id="food_search_panel" className="space-y-6">
      {/* Segment Selectors */}
      <div className="flex bg-[#0B0E14] p-1 rounded-2xl border border-white/5">
        <button
          id="tab_preset_foods"
          onClick={() => { setIsManualMode(false); }}
          className={`flex-1 py-2 rounded-xl text-xs font-sans font-semibold transition-all ${
            !isManualMode ? "bg-[#141923] text-[#818CF8] shadow-sm border border-white/5" : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> {t("food.dbLookup")}
          </div>
        </button>
        <button
          id="tab_manual_food"
          onClick={() => { setIsManualMode(true); }}
          className={`flex-1 py-2 rounded-xl text-xs font-sans font-semibold transition-all ${
            isManualMode ? "bg-[#141923] text-[#818CF8] shadow-sm border border-white/5" : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {t("food.manualAiLog")}
          </div>
        </button>
      </div>

      {/* Main Mode View Panels */}
      {!isManualMode ? (
        /* Presets Search Database Panel */
        <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-bold text-white">{t("food.dbSearchTitle")}</h3>
            <span className="text-[10px] font-mono bg-white/5 text-[#94A3B8] px-2 py-1 rounded-md border border-white/5">
              {t("food.itemsLoaded", { n: COMMON_FOOD_ITEMS.length })}
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-3.5" />
            <input
              id="input_food_search"
              type="text"
              placeholder={t("food.searchPlaceholder")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0E14] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all font-sans text-white placeholder-[#64748B]"
            />
          </div>

          {/* Quick List Results */}
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {filteredFoods.length > 0 ? (
              filteredFoods.map(food => (
                <div
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                    selectedFood?.id === food.id
                      ? "border-[#6366F1] bg-[#6366F1]/10"
                      : "border-white/5 hover:border-white/10 hover:bg-white/2"
                  }`}
                >
                  <div className="font-sans">
                    <h4 className="text-sm font-semibold text-[#E2E8F0]">{food.name}</h4>
                    <p className="text-[10px] text-[#64748B] font-medium">
                      {t("food.serving")} {food.servingSize}{food.servingUnit} • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-[#818CF8] bg-[#6366F1]/10 px-2 py-1 rounded-xl border border-[#6366F1]/10">
                      {food.calories} kcal
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-[#64748B] text-xs font-sans">
                {t("food.noMatch")}
              </div>
            )}
          </div>

          {/* Online (USDA) database results — augment the local list as you type.
              Hidden entirely when the lookup returns nothing, so it never shows a
              misleading empty state (e.g. before an FDC key is configured). */}
          {(isSearching || searchDone || onlineResults.length > 0) && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 px-1">
                <Globe className="w-3 h-3 text-[#64748B]" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                  {t("food.onlineResults")}
                </span>
                {isSearching && <Loader2 className="w-3 h-3 animate-spin text-[#818CF8]" />}
              </div>
              {onlineResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {onlineResults.map(food => (
                    <div
                      key={food.id}
                      onClick={() => setSelectedFood(food)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                        selectedFood?.id === food.id
                          ? "border-[#6366F1] bg-[#6366F1]/10"
                          : "border-white/5 hover:border-white/10 hover:bg-white/2"
                      }`}
                    >
                      <div className="font-sans min-w-0 pr-2">
                        <h4 className="text-sm font-semibold text-[#E2E8F0] truncate">{food.name}</h4>
                        <p className="text-[10px] text-[#64748B] font-medium">
                          {t("food.serving")} {food.servingSize}{food.servingUnit} • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-[#818CF8] bg-[#6366F1]/10 px-2 py-1 rounded-xl border border-[#6366F1]/10">
                          {food.calories} kcal
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isSearching && searchDone && onlineResults.length === 0 && (
                <p className="text-[11px] text-[#64748B] font-sans px-1 py-1">
                  {t("food.noOnlineMatches")}
                </p>
              )}
            </div>
          )}

          {/* Preset Servings Adjustment Modal Overlay */}
          <AnimatePresence>
            {selectedFood && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#6366F1]/5 rounded-2xl p-4 border border-[#6366F1]/10 space-y-3 font-sans"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#818CF8]">{t("food.adjustPortion")}</span>
                  <span className="text-xs text-[#94A3B8] font-mono">
                    {t("food.total")} <b>{Math.round(selectedFood.servingSize * multiplier)} {selectedFood.servingUnit}</b>
                  </span>
                </div>

                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="0.25"
                    max="5.0"
                    step="0.25"
                    value={multiplier}
                    onChange={e => setMultiplier(parseFloat(e.target.value))}
                    className="flex-1 accent-[#6366F1]"
                  />
                  <span className="text-sm font-bold text-[#818CF8] bg-[#0B0E14] border border-white/10 px-3 py-1 rounded-lg w-16 text-center">
                    {multiplier}x
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[10px] bg-[#0B0E14] border border-white/5 p-2 rounded-xl">
                  <div>
                    <span className="text-[#64748B] block">{t("food.kcal")}</span>
                    <b className="text-white text-xs">{Math.round(selectedFood.calories * multiplier)}</b>
                  </div>
                  <div>
                    <span className="text-[#FB923C] block font-semibold">{t("food.protein")}</span>
                    <b className="text-white text-xs">{Math.round(selectedFood.protein * multiplier * 10) / 10}g</b>
                  </div>
                  <div>
                    <span className="text-[#38BDF8] block font-semibold">{t("food.carbs")}</span>
                    <b className="text-white text-xs">{Math.round(selectedFood.carbs * multiplier * 10) / 10}g</b>
                  </div>
                  <div>
                    <span className="text-[#FACC15] block font-semibold">{t("food.fat")}</span>
                    <b className="text-white text-xs">{Math.round(selectedFood.fat * multiplier * 10) / 10}g</b>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    id="btn_cancel_preset"
                    onClick={() => setSelectedFood(null)}
                    className="flex-1 bg-[#0B0E14] hover:bg-white/5 border border-white/10 text-[#94A3B8] rounded-xl py-2 text-xs font-semibold transition-all"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    id="btn_confirm_preset"
                    onClick={() => handleLogPreset(selectedFood)}
                    className="flex-1 bg-[#6366F1] hover:bg-[#818CF8] text-white rounded-xl py-2 text-xs font-bold transition-all shadow-md"
                  >
                    {t("food.logNamed", { name: selectedFood.name })}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Manual and AI Powered Estimations Panel */
        <div className="space-y-6">
          {/* AI Nutrition Estimator */}
          <div className="bg-linear-to-br from-indigo-950/40 via-[#141923] to-[#0B0E14] rounded-3xl p-6 text-white shadow-lg border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-15">
              <Sparkles className="w-40 h-40 text-[#818CF8]" />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-[#818CF8]" />
              <h3 className="font-sans font-bold text-white text-base">{t("food.aiTitle")}</h3>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
              {t("food.aiDesc")} <i>"{t("food.aiExample")}"</i>
            </p>

            <form onSubmit={handleAiEstimate} className="space-y-3">
              <textarea
                id="input_ai_food"
                rows={2}
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder={t("food.aiPlaceholder")}
                className="w-full bg-[#0B0E14] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1] font-sans placeholder-[#64748B] resize-none"
              />
              <button
                id="btn_ai_estimate"
                type="submit"
                disabled={isAiLoading || !aiInput.trim()}
                className="w-full bg-[#6366F1] hover:bg-[#818CF8] disabled:bg-[#141923] disabled:text-[#64748B] text-white rounded-xl py-2.5 text-xs font-sans font-bold transition-all flex items-center justify-center gap-2 border border-white/5"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#818CF8]" />
                    {t("food.aiAnalyzing")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    {t("food.aiEstimateBtn")}
                  </>
                )}
              </button>
            </form>

            {aiError && (
              <p className="text-xs text-rose-300 font-sans mt-3 bg-rose-950/40 p-2 rounded-xl border border-rose-900/30">
                {aiError}
              </p>
            )}

            {/* AI Estimation Result Card */}
            <AnimatePresence>
              {aiResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 bg-[#0B0E14] border border-white/10 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider bg-[#6366F1]/20 text-[#818CF8] px-2 py-0.5 rounded-full font-sans font-semibold">
                        {t("food.aiExtracted")}
                      </span>
                      <h4 id="text_ai_food_name" className="text-sm font-bold text-white mt-1 font-sans">{aiResult.name}</h4>
                      <p className="text-[10px] text-[#94A3B8] font-sans">
                        {t("food.portionSize")} {aiResult.servingSize}{aiResult.servingUnit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-[#818CF8] block font-sans">
                        {aiResult.calories} kcal
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-white/5 p-2 rounded-xl border border-white/5">
                    <div>
                      <span className="text-[#FB923C]/85 block font-medium">{t("food.protein")}</span>
                      <b id="text_ai_food_protein" className="text-white text-xs">{aiResult.protein}g</b>
                    </div>
                    <div>
                      <span className="text-[#38BDF8]/85 block font-medium">{t("food.carbs")}</span>
                      <b id="text_ai_food_carbs" className="text-white text-xs">{aiResult.carbs}g</b>
                    </div>
                    <div>
                      <span className="text-[#FACC15]/85 block font-medium">{t("food.fat")}</span>
                      <b id="text_ai_food_fat" className="text-white text-xs">{aiResult.fat}g</b>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="btn_discard_ai"
                      onClick={() => setAiResult(null)}
                      className="flex-1 bg-transparent hover:bg-white/5 border border-white/10 text-white rounded-xl py-2 text-xs font-semibold font-sans transition-all"
                    >
                      {t("food.discard")}
                    </button>
                    <button
                      id="btn_log_ai"
                      onClick={handleLogAiResult}
                      className="flex-1 bg-[#6366F1] hover:bg-[#818CF8] text-white rounded-xl py-2 text-xs font-bold font-sans transition-all flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> {t("food.logAiMeal")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Standard Manual Log Form */}
          <div className="bg-[#141923] rounded-3xl p-6 shadow-sm border border-white/5 space-y-4">
            <h4 className="font-sans font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#818CF8]" /> {t("food.manualTitle")}
            </h4>

            <form onSubmit={handleLogManual} className="space-y-3 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-[#94A3B8] block mb-1">{t("food.foodName")}</label>
                  <input
                    id="input_manual_name"
                    type="text"
                    required
                    placeholder={t("food.phName")}
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">{t("food.servingSize")}</label>
                  <input
                    id="input_manual_serving_size"
                    type="number"
                    placeholder={t("food.phServing")}
                    value={manualServingSize}
                    onChange={e => setManualServingSize(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">{t("food.unit")}</label>
                  <input
                    id="input_manual_serving_unit"
                    type="text"
                    placeholder="g"
                    value={manualServingUnit}
                    onChange={e => setManualServingUnit(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">{t("food.caloriesKcal")}</label>
                  <input
                    id="input_manual_calories"
                    type="number"
                    placeholder={t("food.phCalories")}
                    value={manualCalories}
                    onChange={e => setManualCalories(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">{t("food.proteinG")}</label>
                  <input
                    id="input_manual_protein"
                    type="number"
                    step="0.1"
                    placeholder={t("food.phProtein")}
                    value={manualProtein}
                    onChange={e => setManualProtein(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">{t("food.carbsG")}</label>
                  <input
                    id="input_manual_carbs"
                    type="number"
                    step="0.1"
                    placeholder={t("food.phCarbs")}
                    value={manualCarbs}
                    onChange={e => setManualCarbs(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1">{t("food.fatsG")}</label>
                  <input
                    id="input_manual_fat"
                    type="number"
                    step="0.1"
                    placeholder={t("food.phFat")}
                    value={manualFat}
                    onChange={e => setManualFat(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  id="btn_submit_manual"
                  type="submit"
                  disabled={!manualName.trim()}
                  className="w-full bg-[#6366F1] hover:bg-[#818CF8] disabled:bg-white/5 disabled:text-[#64748B] text-white font-semibold rounded-xl py-2.5 text-xs transition-colors shadow-sm"
                >
                  {t("food.logCustomFood")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logged Foods List for Today */}
      <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5">
        <h3 className="font-sans font-bold text-white mb-4 flex items-center gap-2">
          <Utensils className="w-4 h-4 text-[#818CF8]" /> {t("food.historyTitle")}
        </h3>

        <div className="space-y-3">
          {loggedMeals.length > 0 ? (
            loggedMeals.map(meal => (
              <div
                key={meal.id}
                className="p-3 bg-[#0B0E14] rounded-2xl border border-white/5 flex items-center justify-between"
              >
                <div className="font-sans flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-bold text-[#E2E8F0] truncate">{meal.name}</h4>
                  <p className="text-[9px] text-[#64748B] mt-0.5">
                    {t("food.portion")} {meal.quantity}g • P: {meal.protein}g • C: {meal.carbs}g • F: {meal.fat}g
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-white bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                    {meal.calories} kcal
                  </span>
                  <button
                    onClick={() => onRemoveEntry(meal.id)}
                    className="text-[#64748B] hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title={t("food.deleteEntry")}
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-[#64748B] text-xs font-sans">
              {t("food.noLogs", { date: formatDateLabel(currentDate) })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function formatDateLabel(dateStr: string) {
    if (dateStr === todayStr()) return t("food.todayLower");
    if (dateStr === addDays(todayStr(), -1)) return t("food.yesterdayLower");
    return dateStr;
  }
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Utensils, 
  Activity, 
  Plus, 
  Check, 
  Loader2, 
  Award,
  AlertCircle
} from "lucide-react";
import { useStore } from "../store";
import { aiPrefs } from "../lib/prefs";
import { useTranslation } from "react-i18next";

interface Recipe {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: number;
  difficulty: string;
  summary: string;
  instructions: string;
}

interface CoachResponse {
  grade: string;
  summary: string;
  suggestions: string[];
  streakMessage: string;
}

interface AiCoachProps {
  isCompact?: boolean;
}

export default function AiCoach({ isCompact = false }: AiCoachProps) {
  const currentDate = useStore((s) => s.currentDate);
  const entries = useStore((s) => s.entries);
  const goal = useStore((s) => s.goal);
  const profile = useStore((s) => s.profile);
  const onAddEntry = useStore((s) => s.addEntry);
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<"coach" | "chef">("coach");

  // AI Coach States
  const [coachData, setCoachData] = useState<CoachResponse | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");

  // AI Chef States
  const [ingredients, setIngredients] = useState("");
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [isChefLoading, setIsChefLoading] = useState(false);
  const [chefError, setChefError] = useState("");
  const [loggedRecipeIndexes, setLoggedRecipeIndexes] = useState<number[]>([]);

  // 1. Fetch AI Coach Diet & Fitness feedback
  const handleAskCoach = async () => {
    setIsCoachLoading(true);
    setCoachError("");
    setCoachData(null);

    // Filter logs for the selected day
    const todaysLogs = entries.filter((e) => e.date === currentDate);

    try {
      const response = await fetch("/api/coach-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: todaysLogs,
          goal,
          date: currentDate,
          prefs: aiPrefs(profile),
          lang: i18n.language,
        }),
      });

      if (!response.ok) {
        throw new Error(t("coach.errCoach"));
      }

      const data = await response.json();
      setCoachData(data);
    } catch (err: any) {
      setCoachError(err.message || t("coach.errGeneric"));
    } finally {
      setIsCoachLoading(false);
    }
  };

  // 2. Fetch AI Chef Recipes
  const handleGenerateRecipes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredients.trim()) return;

    setIsChefLoading(true);
    setChefError("");
    setRecipes(null);
    setLoggedRecipeIndexes([]);

    try {
      const response = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, prefs: aiPrefs(profile), lang: i18n.language }),
      });

      if (!response.ok) {
        throw new Error(t("coach.errRecipes"));
      }

      const data = await response.json();
      setRecipes(data);
    } catch (err: any) {
      setChefError(err.message || t("coach.errRecipesGeneric"));
    } finally {
      setIsChefLoading(false);
    }
  };

  // 3. Add AI Chef recipe directly into user's food log
  const handleLogRecipe = (recipe: Recipe, index: number) => {
    onAddEntry({
      date: currentDate,
      type: "meal",
      name: `AI Chef: ${recipe.name}`,
      calories: recipe.calories,
      protein: Math.round(recipe.protein),
      carbs: Math.round(recipe.carbs),
      fat: Math.round(recipe.fat),
      quantity: 1, // 1 serving
    });
    setLoggedRecipeIndexes((prev) => [...prev, index]);
  };

  // Helper to get color code for grade
  const getGradeColor = (grade: string) => {
    const clean = grade.toUpperCase().trim();
    if (clean.startsWith("A")) return "from-emerald-500/20 to-emerald-400/10 border-emerald-500/30 text-emerald-400";
    if (clean.startsWith("B")) return "from-indigo-500/20 to-indigo-400/10 border-indigo-500/30 text-indigo-400";
    if (clean.startsWith("C")) return "from-amber-500/20 to-amber-400/10 border-amber-500/30 text-amber-400";
    return "from-rose-500/20 to-rose-400/10 border-rose-500/30 text-rose-400";
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Tab Switcher Headers */}
      <div className="flex bg-[#141923] border border-white/5 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab("coach")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "coach"
              ? "bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/15"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4" /> {t("coach.dailyCoachTab")}
        </button>
        <button
          onClick={() => setActiveTab("chef")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "chef"
              ? "bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/15"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Utensils className="w-4 h-4" /> {t("coach.chefTab")}
        </button>
      </div>

      {/* Viewport Content */}
      <div>
        <AnimatePresence mode="wait">
          {activeTab === "coach" ? (
            /* ================= DIET & WORKOUT COACH MODE ================= */
            <motion.div
              key="coach-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="bg-[#141923] border border-white/5 p-4 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#818CF8]/10 flex items-center justify-center text-[#818CF8] shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{t("coach.reviewTitle")}</h4>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
                      {t("coach.reviewDesc")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    id="btn_ask_coach"
                    onClick={handleAskCoach}
                    disabled={isCoachLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-linear-to-r from-[#6366F1] to-[#818CF8] hover:from-[#4F46E5] hover:to-[#6366F1] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-md shadow-[#6366F1]/10"
                  >
                    {isCoachLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> {t("coach.analyzing")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> {t("coach.runReview")}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Coach Error State */}
              {coachError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{coachError}</p>
                </div>
              )}

              {/* Coach Response Display */}
              {coachData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {/* Top Grade Bar */}
                  <div className={`p-4 rounded-2xl border bg-linear-to-br ${getGradeColor(coachData.grade)} flex items-center gap-4`}>
                    <div className="w-14 h-14 rounded-2xl bg-black/20 border border-white/5 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-mono tracking-widest text-[#94A3B8] uppercase font-bold">{t("coach.grade")}</span>
                      <span className="text-2xl font-black leading-none mt-0.5">{coachData.grade}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">{t("coach.coachRating")}</span>
                      </div>
                      <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
                        {coachData.streakMessage}
                      </p>
                    </div>
                  </div>

                  {/* Summary Segment */}
                  <div className="bg-[#141923] border border-white/5 p-4 rounded-2xl space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#818CF8]">
                      <Activity className="w-3.5 h-3.5" /> {t("coach.dietitianSummary")}
                    </h5>
                    <p className="text-xs text-[#E2E8F0] leading-relaxed">
                      {coachData.summary}
                    </p>
                  </div>

                  {/* Tips Segment */}
                  <div className="bg-[#141923] border border-white/5 p-4 rounded-2xl space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#818CF8]">
                      <Sparkles className="w-3.5 h-3.5" /> {t("coach.recommendations")}
                    </h5>
                    <ul className="space-y-2.5">
                      {coachData.suggestions.map((tip, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start text-xs text-[#CBD5E1]">
                          <span className="w-5 h-5 rounded-full bg-[#6366F1]/15 text-[#818CF8] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* ================= AI INGREDIENT RECIPE BUILDER ================= */
            <motion.div
              key="chef-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <form onSubmit={handleGenerateRecipes} className="bg-[#141923] border border-white/5 p-4 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981] shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{t("coach.pantryTitle")}</h4>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
                      {t("coach.pantryDesc")}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <input
                    id="input_chef_ingredients"
                    type="text"
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder={t("coach.pantryPlaceholder")}
                    className="w-full bg-[#0B0E14] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#6366F1] transition-all"
                  />
                </div>

                <button
                  id="btn_chef_submit"
                  type="submit"
                  disabled={isChefLoading || !ingredients.trim()}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-linear-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-md shadow-[#10B981]/10"
                >
                  {isChefLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {t("coach.cookingRecipes")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> {t("coach.formulate")}
                    </>
                  )}
                </button>
              </form>

              {/* Chef Error State */}
              {chefError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{chefError}</p>
                </div>
              )}

              {/* Chef Recipes Display */}
              {recipes && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <h5 className="text-[10px] font-mono font-bold tracking-widest text-[#94A3B8] uppercase px-1">
                    {t("coach.matchedOptions")}
                  </h5>

                  {recipes.map((recipe, index) => {
                    const isLogged = loggedRecipeIndexes.includes(index);
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-[#141923] border border-white/5 rounded-2xl p-4 space-y-3 hover:border-white/10 transition-all"
                      >
                        {/* Title Row */}
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h6 className="text-xs font-bold text-white leading-snug">{recipe.name}</h6>
                            <span className="inline-flex items-center gap-3 text-[10px] text-[#94A3B8] font-mono mt-1">
                              <span>⏱️ {t("coach.mins", { n: recipe.prepTime })}</span>
                              <span>💪 {recipe.difficulty}</span>
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleLogRecipe(recipe, index)}
                            disabled={isLogged}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-sans font-bold transition-all flex items-center gap-1 shrink-0 ${
                              isLogged 
                                ? "bg-emerald-500/15 text-emerald-400 cursor-default"
                                : "bg-[#6366F1] text-white hover:bg-[#4F46E5] active:scale-95"
                            }`}
                          >
                            {isLogged ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> {t("coach.logged")}
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" /> {t("coach.logMeal")}
                              </>
                            )}
                          </button>
                        </div>

                        {/* Nutrition pill summaries */}
                        <div className="grid grid-cols-4 gap-1 bg-[#0B0E14] border border-white/5 rounded-xl p-2 text-center select-none">
                          <div>
                            <div className="text-[9px] font-mono text-[#94A3B8] uppercase">{t("coach.calories")}</div>
                            <div className="text-xs font-bold text-white mt-0.5">{recipe.calories} kcal</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono text-[#F43F5E] uppercase">{t("coach.protein")}</div>
                            <div className="text-xs font-bold text-[#F43F5E] mt-0.5">{Math.round(recipe.protein)}g</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono text-[#F59E0B] uppercase">{t("coach.carbs")}</div>
                            <div className="text-xs font-bold text-[#F59E0B] mt-0.5">{Math.round(recipe.carbs)}g</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono text-[#10B981] uppercase">{t("coach.fat")}</div>
                            <div className="text-xs font-bold text-[#10B981] mt-0.5">{Math.round(recipe.fat)}g</div>
                          </div>
                        </div>

                        {/* Culinary Description */}
                        <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                          {recipe.summary}
                        </p>

                        {/* Collapse Instructions details */}
                        <div className="border-t border-white/5 pt-2.5">
                          <span className="text-[10px] font-bold text-[#818CF8] uppercase tracking-wider block mb-1">
                            {t("coach.instructions")}
                          </span>
                          <p className="text-[10px] text-[#CBD5E1] whitespace-pre-line leading-relaxed pl-1.5 border-l border-[#818CF8]/30">
                            {recipe.instructions}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

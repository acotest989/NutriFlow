import { useState } from "react";
import {
  Flame,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Target,
  Activity,
  Salad,
  Dumbbell,
  Check,
} from "lucide-react";
import { useStore } from "../store";
import { computeGoal, ftInToCm, lbToKg, cmToFtIn, kgToLb } from "../lib/goal";
import type {
  GoalType,
  Sex,
  ActivityLevel,
  DietPreference,
  Units,
  OnboardingData,
} from "../types";

const GOALS: { value: GoalType; label: string; hint: string }[] = [
  { value: "lose", label: "Lose weight", hint: "Calorie deficit" },
  { value: "maintain", label: "Maintain", hint: "Stay where I am" },
  { value: "gain", label: "Gain weight", hint: "Calorie surplus" },
  { value: "build_muscle", label: "Build muscle", hint: "Lean bulk, high protein" },
];

const SEXES: { value: Sex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const ACTIVITIES: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Sedentary", hint: "Little or no exercise" },
  { value: "light", label: "Lightly active", hint: "1–3 days/week" },
  { value: "moderate", label: "Moderately active", hint: "3–5 days/week" },
  { value: "very", label: "Very active", hint: "6–7 days/week" },
  { value: "extra", label: "Extra active", hint: "Physical job / 2× a day" },
];

const DIETS: { value: DietPreference; label: string }[] = [
  { value: "none", label: "Balanced" },
  { value: "high_protein", label: "High protein" },
  { value: "low_carb", label: "Low carb" },
  { value: "keto", label: "Keto" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "paleo", label: "Paleo" },
];

const RESTRICTIONS = ["Gluten", "Dairy", "Nuts", "Shellfish", "Eggs", "Soy", "Pork"];
const WORKOUTS = ["Strength", "Cardio", "HIIT", "Running", "Cycling", "Yoga", "Swimming", "Walking"];

const STEPS = ["Goal", "About you", "Body", "Activity", "Diet", "Preferences", "Review"];

const num = (s: string): number => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export default function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const signOut = useStore((s) => s.signOut);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Answers
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");
  const [units, setUnits] = useState<Units>("metric");
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [diet, setDiet] = useState<DietPreference>("none");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [workouts, setWorkouts] = useState<string[]>([]);

  // Body — metric fields
  const [cm, setCm] = useState("");
  const [kg, setKg] = useState("");
  const [targetKg, setTargetKg] = useState("");
  // Body — imperial fields
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const [lb, setLb] = useState("");
  const [targetLb, setTargetLb] = useState("");

  const toggleUnits = (to: Units) => {
    if (to === units) return;
    if (to === "imperial") {
      if (cm) {
        const { ft: f, in: i } = cmToFtIn(num(cm));
        setFt(String(f));
        setInch(String(i));
      }
      if (kg) setLb(String(Math.round(kgToLb(num(kg)))));
      if (targetKg) setTargetLb(String(Math.round(kgToLb(num(targetKg)))));
    } else {
      if (ft || inch) setCm(String(Math.round(ftInToCm(num(ft), num(inch)))));
      if (lb) setKg(String(Math.round(lbToKg(num(lb)))));
      if (targetLb) setTargetKg(String(Math.round(lbToKg(num(targetLb)))));
    }
    setUnits(to);
  };

  const toMetric = (): OnboardingData => ({
    goalType: goalType ?? "maintain",
    sex: sex ?? "other",
    age: num(age),
    heightCm: units === "metric" ? num(cm) : ftInToCm(num(ft), num(inch)),
    weightKg: units === "metric" ? num(kg) : lbToKg(num(lb)),
    targetWeightKg:
      units === "metric"
        ? targetKg
          ? num(targetKg)
          : null
        : targetLb
        ? lbToKg(num(targetLb))
        : null,
    activity: activity ?? "moderate",
    diet,
    restrictions,
    workouts,
    units,
  });

  const toggleIn = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // Per-step validation gating the Next button.
  const canNext = (): boolean => {
    switch (step) {
      case 0:
        return !!goalType;
      case 1:
        return !!sex && num(age) >= 13 && num(age) <= 100;
      case 2: {
        const h = units === "metric" ? num(cm) : ftInToCm(num(ft), num(inch));
        const w = units === "metric" ? num(kg) : lbToKg(num(lb));
        return h >= 120 && h <= 250 && w >= 30 && w <= 400;
      }
      case 3:
        return !!activity;
      default:
        return true;
    }
  };

  const isLast = step === STEPS.length - 1;
  const goal = isLast ? computeGoal(toMetric()) : null;

  const finish = async () => {
    setError("");
    setSaving(true);
    const { error } = await completeOnboarding(toMetric());
    if (error) {
      setError(error);
      setSaving(false);
    }
    // On success the store flips hasOnboarded -> App renders the dashboard.
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-6 antialiased">
      <div className="w-full max-w-md">
        {/* Brand + progress */}
        <div className="flex items-center gap-3 mb-5 select-none">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-[#6366F1] to-[#a855f7] flex items-center justify-center text-white shadow-lg shadow-[#6366F1]/20">
            <Flame className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white font-sans tracking-tight">
              Let’s personalize NutriFlow
            </p>
            <p className="text-[11px] text-[#64748B] font-sans">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
          </div>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-[#6366F1] to-[#a855f7] rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="bg-[#141923] border border-white/5 rounded-3xl p-6 shadow-xl font-sans">
          {/* STEP 0 — Goal */}
          {step === 0 && (
            <Section icon={<Target className="w-4 h-4" />} title="What’s your main goal?">
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((g) => (
                  <Card key={g.value} active={goalType === g.value} onClick={() => setGoalType(g.value)}>
                    <span className="text-sm font-bold text-white">{g.label}</span>
                    <span className="text-[11px] text-[#94A3B8]">{g.hint}</span>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {/* STEP 1 — About you */}
          {step === 1 && (
            <Section icon={<Flame className="w-4 h-4" />} title="A bit about you">
              <UnitToggle units={units} onChange={toggleUnits} />
              <label className="text-xs text-[#94A3B8] block mb-1.5 mt-4">Sex (for calorie estimate)</label>
              <div className="grid grid-cols-3 gap-2">
                {SEXES.map((s) => (
                  <Card key={s.value} active={sex === s.value} onClick={() => setSex(s.value)} compact>
                    <span className="text-sm font-semibold text-white">{s.label}</span>
                  </Card>
                ))}
              </div>
              <label className="text-xs text-[#94A3B8] block mb-1.5 mt-4">Age</label>
              <input
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 28"
                className={inputCls}
              />
            </Section>
          )}

          {/* STEP 2 — Body */}
          {step === 2 && (
            <Section icon={<Activity className="w-4 h-4" />} title="Your measurements">
              <UnitToggle units={units} onChange={toggleUnits} />
              <div className="mt-4 space-y-4">
                {/* Height */}
                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1.5">Height</label>
                  {units === "metric" ? (
                    <div className="relative">
                      <input type="number" inputMode="numeric" value={cm} onChange={(e) => setCm(e.target.value)} placeholder="175" className={inputCls} />
                      <Suffix>cm</Suffix>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <input type="number" inputMode="numeric" value={ft} onChange={(e) => setFt(e.target.value)} placeholder="5" className={inputCls} />
                        <Suffix>ft</Suffix>
                      </div>
                      <div className="relative">
                        <input type="number" inputMode="numeric" value={inch} onChange={(e) => setInch(e.target.value)} placeholder="9" className={inputCls} />
                        <Suffix>in</Suffix>
                      </div>
                    </div>
                  )}
                </div>
                {/* Weight */}
                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1.5">Current weight</label>
                  <div className="relative">
                    {units === "metric" ? (
                      <>
                        <input type="number" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="72" className={inputCls} />
                        <Suffix>kg</Suffix>
                      </>
                    ) : (
                      <>
                        <input type="number" inputMode="decimal" value={lb} onChange={(e) => setLb(e.target.value)} placeholder="160" className={inputCls} />
                        <Suffix>lb</Suffix>
                      </>
                    )}
                  </div>
                </div>
                {/* Target weight (optional) */}
                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1.5">
                    Target weight <span className="text-[#64748B]">(optional)</span>
                  </label>
                  <div className="relative">
                    {units === "metric" ? (
                      <>
                        <input type="number" inputMode="decimal" value={targetKg} onChange={(e) => setTargetKg(e.target.value)} placeholder="68" className={inputCls} />
                        <Suffix>kg</Suffix>
                      </>
                    ) : (
                      <>
                        <input type="number" inputMode="decimal" value={targetLb} onChange={(e) => setTargetLb(e.target.value)} placeholder="150" className={inputCls} />
                        <Suffix>lb</Suffix>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* STEP 3 — Activity */}
          {step === 3 && (
            <Section icon={<Activity className="w-4 h-4" />} title="How active are you?">
              <div className="space-y-2">
                {ACTIVITIES.map((a) => (
                  <Card key={a.value} active={activity === a.value} onClick={() => setActivity(a.value)} row>
                    <span className="text-sm font-semibold text-white">{a.label}</span>
                    <span className="text-[11px] text-[#94A3B8]">{a.hint}</span>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {/* STEP 4 — Diet */}
          {step === 4 && (
            <Section icon={<Salad className="w-4 h-4" />} title="Dietary preference">
              <div className="grid grid-cols-2 gap-2">
                {DIETS.map((d) => (
                  <Card key={d.value} active={diet === d.value} onClick={() => setDiet(d.value)} compact>
                    <span className="text-sm font-semibold text-white">{d.label}</span>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {/* STEP 5 — Preferences */}
          {step === 5 && (
            <Section icon={<Dumbbell className="w-4 h-4" />} title="Preferences">
              <label className="text-xs text-[#94A3B8] block mb-2">Any restrictions / allergies?</label>
              <div className="flex flex-wrap gap-2 mb-5">
                {RESTRICTIONS.map((r) => (
                  <Chip key={r} active={restrictions.includes(r)} onClick={() => toggleIn(restrictions, r, setRestrictions)}>
                    {r}
                  </Chip>
                ))}
              </div>
              <label className="text-xs text-[#94A3B8] block mb-2">Workouts you enjoy</label>
              <div className="flex flex-wrap gap-2">
                {WORKOUTS.map((w) => (
                  <Chip key={w} active={workouts.includes(w)} onClick={() => toggleIn(workouts, w, setWorkouts)}>
                    {w}
                  </Chip>
                ))}
              </div>
            </Section>
          )}

          {/* STEP 6 — Review */}
          {step === 6 && goal && (
            <Section icon={<Check className="w-4 h-4" />} title="Your personalized daily targets">
              <div className="rounded-2xl bg-[#0B0E14] border border-white/10 p-5 text-center">
                <p className="text-[11px] uppercase tracking-wider text-[#64748B]">Daily calories</p>
                <p className="text-4xl font-black text-white mt-1">
                  {goal.calories}
                  <span className="text-sm font-semibold text-[#64748B] ml-1">kcal</span>
                </p>
                <div className="grid grid-cols-3 gap-2 mt-5">
                  <Macro label="Protein" value={goal.protein} color="text-emerald-400" />
                  <Macro label="Carbs" value={goal.carbs} color="text-amber-400" />
                  <Macro label="Fat" value={goal.fat} color="text-rose-400" />
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] mt-3 leading-relaxed text-center">
                Calculated from your details (Mifflin–St Jeor). You can fine-tune these anytime from the dashboard.
              </p>
            </Section>
          )}

          {error && (
            <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900/30 rounded-xl p-2.5 mt-4">
              {error}
            </p>
          )}

          {/* Nav */}
          <div className="flex items-center gap-3 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white text-sm font-semibold transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
                className="flex-1 bg-[#6366F1] hover:bg-[#818CF8] disabled:bg-white/5 disabled:text-[#64748B] text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#6366F1]/10"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={saving}
                className="flex-1 bg-[#6366F1] hover:bg-[#818CF8] disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#6366F1]/10"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Start tracking
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="w-full text-center text-[11px] text-[#64748B] hover:text-[#94A3B8] transition-colors mt-4"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ---------- small presentational helpers ----------
const inputCls =
  "w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]";

function Suffix({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B] pointer-events-none">
      {children}
    </span>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-[#818CF8]">
        {icon}
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Card({
  active,
  onClick,
  children,
  compact,
  row,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
  row?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border transition-all ${compact ? "px-3 py-2.5" : "p-3.5"} ${
        row ? "w-full flex items-center justify-between gap-3" : "flex flex-col gap-0.5"
      } ${active ? "border-[#6366F1] bg-[#6366F1]/10 ring-1 ring-[#6366F1]" : "border-white/10 bg-[#0B0E14] hover:border-white/20"}`}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        active ? "border-[#6366F1] bg-[#6366F1]/15 text-white" : "border-white/10 bg-[#0B0E14] text-[#94A3B8] hover:text-white hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function UnitToggle({ units, onChange }: { units: Units; onChange: (u: Units) => void }) {
  return (
    <div className="inline-flex bg-[#0B0E14] border border-white/10 rounded-xl p-1 text-xs font-semibold">
      {(["metric", "imperial"] as Units[]).map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            units === u ? "bg-[#6366F1] text-white" : "text-[#94A3B8] hover:text-white"
          }`}
        >
          {u === "metric" ? "Metric (kg/cm)" : "Imperial (lb/ft)"}
        </button>
      ))}
    </div>
  );
}

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/5 py-2.5">
      <p className={`text-lg font-black ${color}`}>{value}g</p>
      <p className="text-[10px] uppercase tracking-wider text-[#64748B]">{label}</p>
    </div>
  );
}

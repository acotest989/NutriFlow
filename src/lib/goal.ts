import type { OnboardingData, Goal, Sex, ActivityLevel, GoalType } from "../types";

// ---------- Unit conversions ----------
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const inToCm = (inches: number) => inches * CM_PER_IN;
export const cmToIn = (cm: number) => cm / CM_PER_IN;

// Split a height in cm into feet + inches (for imperial display/entry).
export const cmToFtIn = (cm: number): { ft: number; in: number } => {
  const totalIn = Math.round(cmToIn(cm));
  return { ft: Math.floor(totalIn / 12), in: totalIn % 12 };
};
export const ftInToCm = (ft: number, inches: number) => inToCm(ft * 12 + inches);

// ---------- Goal computation (Mifflin–St Jeor) ----------
const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

// kcal/day adjustment applied to TDEE for each goal.
const GOAL_DELTA: Record<GoalType, number> = {
  lose: -0.2, // 20% deficit
  maintain: 0,
  gain: 0.12, // ~12% surplus
  build_muscle: 0.1, // lean bulk
};

// Protein target in g per kg bodyweight, by goal.
const PROTEIN_PER_KG: Record<GoalType, number> = {
  lose: 1.8, // preserve muscle in a deficit
  maintain: 1.6,
  gain: 1.8,
  build_muscle: 2.0,
};

const round = (n: number, step: number) => Math.round(n / step) * step;

function bmr(sex: Sex, kg: number, cm: number, age: number): number {
  // Mifflin–St Jeor; "other" uses the average of the male/female constants.
  const base = 10 * kg + 6.25 * cm - 5 * age;
  const constant = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  return base + constant;
}

/**
 * Compute a personalized daily calorie + macro goal from onboarding answers.
 * Macro split adapts to the dietary preference (keto / low-carb / high-protein);
 * everything else uses a balanced split.
 */
export function computeGoal(d: OnboardingData): Goal {
  const tdee = bmr(d.sex, d.weightKg, d.heightCm, d.age) * ACTIVITY_FACTORS[d.activity];
  let calories = tdee * (1 + GOAL_DELTA[d.goalType]);
  // Safety floor so the target is never unhealthily low.
  calories = Math.max(d.sex === "female" ? 1200 : 1500, calories);

  // Protein from bodyweight (capped so it never dominates very low-cal targets).
  let proteinPerKg = PROTEIN_PER_KG[d.goalType];
  if (d.diet === "high_protein") proteinPerKg = Math.max(proteinPerKg, 2.0);
  let protein = d.weightKg * proteinPerKg;

  // Fat as a share of calories, varied by diet.
  let fatPct = 0.27;
  if (d.diet === "keto") fatPct = 0.7;
  else if (d.diet === "low_carb") fatPct = 0.4;
  let fat = (calories * fatPct) / 9;

  // Carbs take the remainder.
  let carbs = (calories - protein * 4 - fat * 9) / 4;

  // If carbs would go negative (e.g. keto + high protein), trim protein toward
  // the floor and recompute so macros stay consistent with the calorie target.
  if (carbs < (d.diet === "keto" ? 20 : 40)) {
    const minCarbs = d.diet === "keto" ? 20 : 40;
    carbs = minCarbs;
    const remaining = calories - carbs * 4;
    // Re-split the remaining calories between protein and fat (60/40-ish).
    protein = Math.max(d.weightKg * 1.6, (remaining * 0.5) / 4);
    fat = (calories - protein * 4 - carbs * 4) / 9;
  }

  return {
    calories: round(calories, 10),
    protein: round(protein, 5),
    carbs: round(Math.max(carbs, 0), 5),
    fat: round(Math.max(fat, 0), 5),
  };
}

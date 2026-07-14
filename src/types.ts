export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fat: number;     // in grams
  servingSize: number;
  servingUnit: string;
  barcode?: string;
  isAiGenerated?: boolean;
}

export interface ExerciseItem {
  id: string;
  name: string;
  caloriesPerMinute: number;
}

export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'meal' | 'exercise';
  name: string;
  calories: number; // negative for exercise, positive for meal
  protein: number;  // 0 for exercise
  carbs: number;    // 0 for exercise
  fat: number;      // 0 for exercise
  quantity: number; // e.g. grams of food, or minutes of exercise
  timestamp: string; // ISO string
}

export interface Goal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ----- Onboarding / personalization -----
export type GoalType = "lose" | "maintain" | "gain" | "build_muscle";
export type Sex = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very" | "extra";
export type DietPreference =
  | "none"
  | "high_protein"
  | "low_carb"
  | "keto"
  | "vegetarian"
  | "vegan"
  | "mediterranean"
  | "paleo";
export type Units = "metric" | "imperial";

// Canonical onboarding answers. Body measurements are always stored in metric
// (cm / kg); `units` only controls how they're displayed/entered.
export interface OnboardingData {
  goalType: GoalType;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number | null;
  activity: ActivityLevel;
  diet: DietPreference;
  restrictions: string[];
  workouts: string[];
  units: Units;
}

// Shape of a row in the Supabase `profiles` table.
export interface Profile extends OnboardingData {
  hasOnboarded: boolean;
  language?: string; // preferred UI language code (en/sr/hr/bs); synced across devices
}

export interface DailySummary {
  date: string;
  consumedCalories: number;
  burnedCalories: number;
  netCalories: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFat: number;
  goal: Goal;
}

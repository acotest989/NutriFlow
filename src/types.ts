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

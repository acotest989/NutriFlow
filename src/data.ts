import { FoodItem, ExerciseItem, Goal } from "./types";

// Static, in-bundle catalogs (no network) used for one-tap logging + AI-search
// fallbacks. Formatted one entry per line, grouped by section, so the file is
// fast to scan and diffs stay small. Anything not here can still be logged via
// AI search, barcode lookup, or the Snap-a-Meal photo analyzer.

export const DEFAULT_GOAL: Goal = {
  calories: 2000,
  protein: 130, // in grams (typical for active/healthy goals)
  carbs: 220,   // in grams
  fat: 65,      // in grams
};

export const COMMON_FOOD_ITEMS: FoodItem[] = [
  // --- Core staples ---
  { id: "f1", name: "Grilled Chicken Breast", calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: 100, servingUnit: "g" },
  { id: "f2", name: "Whole Large Egg", calories: 70, protein: 6, carbs: 0.6, fat: 5, servingSize: 1, servingUnit: "egg" },
  { id: "f3", name: "White Rice (Cooked)", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: 100, servingUnit: "g" },
  { id: "f4", name: "Brown Rice (Cooked)", calories: 111, protein: 2.6, carbs: 23, fat: 0.9, servingSize: 100, servingUnit: "g" },
  { id: "f5", name: "Oatmeal (Cooked in Water)", calories: 71, protein: 2.5, carbs: 12, fat: 1.4, servingSize: 100, servingUnit: "g" },
  { id: "f6", name: "Whey Protein Shake", calories: 120, protein: 24, carbs: 3, fat: 1.5, servingSize: 1, servingUnit: "scoop" },
  { id: "f7", name: "Peanut Butter (Smooth)", calories: 94, protein: 4, carbs: 3, fat: 8, servingSize: 16, servingUnit: "g (1 tbsp)" },
  { id: "f8", name: "Fresh Banana", calories: 105, protein: 1.3, carbs: 27, fat: 0.3, servingSize: 1, servingUnit: "medium banana" },
  { id: "f9", name: "Avocado", calories: 240, protein: 3, carbs: 12, fat: 22, servingSize: 1, servingUnit: "medium avocado" },
  { id: "f10", name: "Sweet Potato (Baked)", calories: 90, protein: 2, carbs: 21, fat: 0.2, servingSize: 100, servingUnit: "g" },
  { id: "f11", name: "Salmon Fillet (Baked)", calories: 206, protein: 22, carbs: 0, fat: 12, servingSize: 100, servingUnit: "g" },
  { id: "f12", name: "Greek Yogurt (0% Plain)", calories: 59, protein: 10, carbs: 3.6, fat: 0.4, servingSize: 100, servingUnit: "g" },
  { id: "f13", name: "Almonds (Raw)", calories: 164, protein: 6, carbs: 6, fat: 14, servingSize: 28, servingUnit: "g (1 oz)" },
  { id: "f14", name: "Broccoli (Steamed)", calories: 35, protein: 2.4, carbs: 7, fat: 0.4, servingSize: 100, servingUnit: "g" },
  { id: "f15", name: "Whole Milk", calories: 149, protein: 8, carbs: 12, fat: 8, servingSize: 244, servingUnit: "ml (1 cup)" },

  // --- Proteins & legumes ---
  { id: "f16", name: "Ground Beef (85% Lean, Cooked)", calories: 250, protein: 26, carbs: 0, fat: 17, servingSize: 100, servingUnit: "g" },
  { id: "f17", name: "Turkey Breast (Roasted)", calories: 135, protein: 30, carbs: 0, fat: 1, servingSize: 100, servingUnit: "g" },
  { id: "f18", name: "Canned Tuna (in Water)", calories: 116, protein: 26, carbs: 0, fat: 1, servingSize: 100, servingUnit: "g" },
  { id: "f19", name: "Cooked Shrimp", calories: 99, protein: 24, carbs: 0.2, fat: 0.3, servingSize: 100, servingUnit: "g" },
  { id: "f20", name: "Firm Tofu", calories: 144, protein: 15, carbs: 3, fat: 8, servingSize: 100, servingUnit: "g" },
  { id: "f21", name: "Cottage Cheese (Low-fat)", calories: 72, protein: 12, carbs: 3, fat: 1, servingSize: 100, servingUnit: "g" },
  { id: "f22", name: "Egg White", calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1, servingSize: 1, servingUnit: "large white" },
  { id: "f23", name: "Lentils (Cooked)", calories: 116, protein: 9, carbs: 20, fat: 0.4, servingSize: 100, servingUnit: "g" },
  { id: "f24", name: "Black Beans (Cooked)", calories: 132, protein: 9, carbs: 24, fat: 0.5, servingSize: 100, servingUnit: "g" },
  { id: "f25", name: "Chickpeas (Cooked)", calories: 164, protein: 9, carbs: 27, fat: 2.6, servingSize: 100, servingUnit: "g" },

  // --- Grains & starches ---
  { id: "f26", name: "Quinoa (Cooked)", calories: 120, protein: 4.4, carbs: 21, fat: 1.9, servingSize: 100, servingUnit: "g" },
  { id: "f27", name: "Whole Wheat Bread", calories: 80, protein: 4, carbs: 14, fat: 1, servingSize: 1, servingUnit: "slice" },
  { id: "f28", name: "Pasta (Cooked)", calories: 158, protein: 6, carbs: 31, fat: 0.9, servingSize: 100, servingUnit: "g" },
  { id: "f29", name: "Potato (Boiled)", calories: 87, protein: 1.9, carbs: 20, fat: 0.1, servingSize: 100, servingUnit: "g" },

  // --- Fruits ---
  { id: "f30", name: "Apple", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, servingSize: 1, servingUnit: "medium apple" },
  { id: "f31", name: "Orange", calories: 62, protein: 1.2, carbs: 15, fat: 0.2, servingSize: 1, servingUnit: "medium orange" },
  { id: "f32", name: "Blueberries", calories: 57, protein: 0.7, carbs: 14, fat: 0.3, servingSize: 100, servingUnit: "g" },
  { id: "f33", name: "Strawberries", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, servingSize: 100, servingUnit: "g" },

  // --- Vegetables ---
  { id: "f34", name: "Spinach (Raw)", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, servingSize: 100, servingUnit: "g" },
  { id: "f35", name: "Carrot (Raw)", calories: 41, protein: 0.9, carbs: 10, fat: 0.2, servingSize: 100, servingUnit: "g" },
  { id: "f36", name: "Bell Pepper", calories: 31, protein: 1, carbs: 6, fat: 0.3, servingSize: 100, servingUnit: "g" },

  // --- Dairy, fats & snacks ---
  { id: "f37", name: "Cheddar Cheese", calories: 113, protein: 7, carbs: 0.4, fat: 9, servingSize: 28, servingUnit: "g (1 oz)" },
  { id: "f38", name: "Olive Oil", calories: 119, protein: 0, carbs: 0, fat: 14, servingSize: 15, servingUnit: "ml (1 tbsp)" },
  { id: "f39", name: "Hummus", calories: 70, protein: 2, carbs: 6, fat: 5, servingSize: 30, servingUnit: "g (2 tbsp)" },
  { id: "f40", name: "Dark Chocolate (70%)", calories: 170, protein: 2, carbs: 13, fat: 12, servingSize: 28, servingUnit: "g (1 oz)" },
  { id: "f41", name: "Walnuts (Raw)", calories: 185, protein: 4.3, carbs: 3.9, fat: 18, servingSize: 28, servingUnit: "g (1 oz)" },

  // --- Balkan / local dishes (estimated per typical serving) ---
  { id: "f42", name: "Ćevapi (10 pcs)", calories: 375, protein: 26, carbs: 3, fat: 29, servingSize: 150, servingUnit: "g" },
  { id: "f43", name: "Pljeskavica (Grilled)", calories: 490, protein: 34, carbs: 4, fat: 37, servingSize: 200, servingUnit: "g" },
  { id: "f44", name: "Burek (Meat)", calories: 560, protein: 18, carbs: 45, fat: 35, servingSize: 250, servingUnit: "g (1 slice)" },
  { id: "f45", name: "Sirnica (Cheese Pita)", calories: 520, protein: 18, carbs: 44, fat: 30, servingSize: 250, servingUnit: "g (1 slice)" },
  { id: "f46", name: "Zeljanica (Spinach-Cheese Pita)", calories: 450, protein: 15, carbs: 42, fat: 26, servingSize: 250, servingUnit: "g (1 slice)" },
  { id: "f47", name: "Krompiruša (Potato Pita)", calories: 480, protein: 10, carbs: 55, fat: 25, servingSize: 250, servingUnit: "g (1 slice)" },
  { id: "f48", name: "Sarma (2 rolls)", calories: 260, protein: 14, carbs: 12, fat: 17, servingSize: 200, servingUnit: "g" },
  { id: "f49", name: "Grah (Bean Stew)", calories: 400, protein: 22, carbs: 40, fat: 16, servingSize: 350, servingUnit: "g (1 bowl)" },
  { id: "f50", name: "Begova Čorba (Bey's Soup)", calories: 220, protein: 14, carbs: 18, fat: 10, servingSize: 300, servingUnit: "g (1 bowl)" },
  { id: "f51", name: "Ajvar", calories: 45, protein: 1, carbs: 5, fat: 3, servingSize: 30, servingUnit: "g (2 tbsp)" },
  { id: "f52", name: "Kajmak", calories: 90, protein: 1, carbs: 1, fat: 9, servingSize: 20, servingUnit: "g (1 tbsp)" },
  { id: "f53", name: "Somun (Flatbread)", calories: 300, protein: 9, carbs: 58, fat: 3, servingSize: 120, servingUnit: "g (1 piece)" },
  { id: "f54", name: "Baklava", calories: 330, protein: 5, carbs: 40, fat: 17, servingSize: 80, servingUnit: "g (1 piece)" },
  { id: "f55", name: "Tufahije", calories: 300, protein: 4, carbs: 40, fat: 14, servingSize: 150, servingUnit: "g (1 piece)" },
  { id: "f56", name: "Stuffed Peppers (Punjene Paprike)", calories: 300, protein: 16, carbs: 20, fat: 17, servingSize: 250, servingUnit: "g (2 peppers)" },
  { id: "f57", name: "Moussaka (Musaka)", calories: 420, protein: 22, carbs: 22, fat: 26, servingSize: 300, servingUnit: "g (1 serving)" },
  { id: "f58", name: "Uštipci (Fried Dough)", calories: 340, protein: 7, carbs: 40, fat: 17, servingSize: 100, servingUnit: "g (3 pcs)" },
];

export const PRESET_EXERCISES: ExerciseItem[] = [
  // --- Cardio ---
  { id: "e1", name: "Running (Moderate Pace)", caloriesPerMinute: 11.4 },
  { id: "e2", name: "Cycling (Leisurely)", caloriesPerMinute: 7.5 },
  { id: "e3", name: "Cycling (Vigorous)", caloriesPerMinute: 12.0 },
  { id: "e4", name: "Swimming (General)", caloriesPerMinute: 9.8 },
  { id: "e6", name: "Walking (Brisk Pace)", caloriesPerMinute: 4.5 },
  { id: "e9", name: "Rowing Machine", caloriesPerMinute: 8.5 },
  { id: "e10", name: "Jumping Rope", caloriesPerMinute: 12.0 },
  { id: "e11", name: "Elliptical Trainer", caloriesPerMinute: 7.0 },
  { id: "e12", name: "Stair Climbing", caloriesPerMinute: 9.0 },
  { id: "e13", name: "Hiking (Uphill)", caloriesPerMinute: 7.3 },

  // --- Strength & conditioning ---
  { id: "e5", name: "Weight Lifting (Intensity)", caloriesPerMinute: 6.0 },
  { id: "e7", name: "HIIT Workout", caloriesPerMinute: 13.5 },
  { id: "e17", name: "Boxing (Heavy Bag)", caloriesPerMinute: 9.5 },
  { id: "e20", name: "Bodyweight Circuit", caloriesPerMinute: 8.0 },

  // --- Sports ---
  { id: "e14", name: "Basketball", caloriesPerMinute: 8.0 },
  { id: "e15", name: "Soccer (Casual)", caloriesPerMinute: 8.5 },
  { id: "e16", name: "Tennis (Singles)", caloriesPerMinute: 8.0 },

  // --- Low-impact / mobility ---
  { id: "e8", name: "Yoga", caloriesPerMinute: 3.2 },
  { id: "e18", name: "Aerobic Dance", caloriesPerMinute: 6.5 },
  { id: "e19", name: "Pilates", caloriesPerMinute: 4.0 },
  { id: "e21", name: "Stretching / Mobility", caloriesPerMinute: 2.5 },
];

export const SAMPLE_BARCODES = [
  { barcode: "070569005077", name: "Rolled Oats", brand: "Quaker" },
  { barcode: "011110038364", name: "Greek Yogurt", brand: "Kroger" },
  { barcode: "021130070519", name: "Whole Wheat Bread", brand: "Lucerne" },
  { barcode: "074570610053", name: "Whey Protein", brand: "Gold Standard" },
  { barcode: "49000000443", name: "Coca-Cola Classic", brand: "Coca-Cola" },
];

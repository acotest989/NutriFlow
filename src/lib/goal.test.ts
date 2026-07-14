import { describe, it, expect } from "vitest";
import { lbToKg, kgToLb, inToCm, cmToIn, cmToFtIn, ftInToCm, computeGoal } from "./goal";
import type { OnboardingData } from "../types";

const base: OnboardingData = {
  goalType: "maintain",
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  targetWeightKg: null,
  activity: "moderate",
  diet: "none",
  restrictions: [],
  workouts: [],
  units: "metric",
};
const make = (o: Partial<OnboardingData> = {}): OnboardingData => ({ ...base, ...o });

describe("unit conversions", () => {
  it("round-trips kg <-> lb", () => {
    expect(lbToKg(0)).toBe(0);
    expect(kgToLb(lbToKg(160))).toBeCloseTo(160, 6);
    expect(lbToKg(kgToLb(72))).toBeCloseTo(72, 6);
  });

  it("round-trips cm <-> in", () => {
    expect(inToCm(10)).toBeCloseTo(25.4, 6);
    expect(cmToIn(inToCm(69))).toBeCloseTo(69, 6);
  });

  it("splits cm into ft + in (matches the onboarding placeholders)", () => {
    expect(cmToFtIn(175)).toEqual({ ft: 5, in: 9 });
    expect(cmToFtIn(180)).toEqual({ ft: 5, in: 11 });
    expect(cmToFtIn(152)).toEqual({ ft: 5, in: 0 });
    expect(ftInToCm(5, 9)).toBeCloseTo(175.26, 6);
  });
});

describe("computeGoal", () => {
  it("computes a known maintain target exactly", () => {
    // male, 80kg, 180cm, 30y, moderate, maintain, balanced diet.
    expect(computeGoal(make())).toEqual({
      calories: 2760,
      protein: 130,
      carbs: 375,
      fat: 85,
    });
  });

  it("applies the female calorie floor (1200)", () => {
    const g = computeGoal(make({ sex: "female", weightKg: 45, heightCm: 150, age: 60, activity: "sedentary", goalType: "lose" }));
    expect(g.calories).toBe(1200);
  });

  it("applies the male calorie floor (1500)", () => {
    const g = computeGoal(make({ weightKg: 40, heightCm: 150, age: 80, activity: "sedentary", goalType: "lose" }));
    expect(g.calories).toBe(1500);
  });

  it("scales protein with bodyweight", () => {
    expect(computeGoal(make({ weightKg: 100 })).protein).toBeGreaterThan(
      computeGoal(make({ weightKg: 60 })).protein
    );
  });

  it("high-protein diet raises the protein target", () => {
    expect(computeGoal(make({ diet: "high_protein" })).protein).toBeGreaterThan(
      computeGoal(make()).protein
    );
  });

  it("keto and low-carb shift macros toward fat", () => {
    const none = computeGoal(make({ goalType: "build_muscle" }));
    const keto = computeGoal(make({ goalType: "build_muscle", diet: "keto" }));
    const lowCarb = computeGoal(make({ goalType: "build_muscle", diet: "low_carb" }));
    expect(keto.fat).toBeGreaterThan(none.fat);
    expect(keto.carbs).toBeLessThan(none.carbs);
    expect(lowCarb.fat).toBeGreaterThan(none.fat);
    expect(lowCarb.carbs).toBeLessThan(none.carbs);
  });

  it("orders calories by sex constant (male > other > female) for the same body", () => {
    const body = { weightKg: 90, heightCm: 185, age: 25, activity: "very" as const };
    const male = computeGoal(make({ ...body, sex: "male" })).calories;
    const other = computeGoal(make({ ...body, sex: "other" })).calories;
    const female = computeGoal(make({ ...body, sex: "female" })).calories;
    expect(male).toBeGreaterThan(other);
    expect(other).toBeGreaterThan(female);
  });

  it("never returns negative macros and respects the calorie floor", () => {
    for (const goalType of ["lose", "maintain", "gain", "build_muscle"] as const) {
      for (const diet of ["none", "keto", "low_carb", "high_protein"] as const) {
        const g = computeGoal(make({ goalType, diet }));
        expect(g.calories).toBeGreaterThanOrEqual(1500);
        expect(g.protein).toBeGreaterThanOrEqual(0);
        expect(g.carbs).toBeGreaterThanOrEqual(0);
        expect(g.fat).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

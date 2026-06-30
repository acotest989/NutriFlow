import type { OnboardingData } from "../types";

// When a logged-out visitor completes the promo quiz, we stash their answers
// here and apply them automatically on their first sign-in (see store.loadData).
const KEY = "nutriflow-pending-onboarding";

export function stashPendingOnboarding(d: OnboardingData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function readPendingOnboarding(): OnboardingData | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as OnboardingData) : null;
  } catch {
    return null;
  }
}

export function clearPendingOnboarding(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

import type { Profile } from "../types";

// Compact preferences payload sent to the AI endpoints so coaching + recipes
// respect the user's goal, diet, allergies, and workout preferences.
export interface AiPrefs {
  goalType?: string;
  diet?: string;
  restrictions?: string[];
  workouts?: string[];
  activity?: string;
}

// Build the prefs payload from the user's profile, omitting empty/neutral values.
// Returns undefined when there's nothing useful to send (so the field drops out
// of the JSON body and the server treats it as absent).
export function aiPrefs(profile: Profile | null): AiPrefs | undefined {
  if (!profile) return undefined;
  const p: AiPrefs = {};
  if (profile.goalType) p.goalType = profile.goalType;
  if (profile.diet && profile.diet !== "none") p.diet = profile.diet;
  if (profile.restrictions?.length) p.restrictions = profile.restrictions;
  if (profile.workouts?.length) p.workouts = profile.workouts;
  if (profile.activity) p.activity = profile.activity;
  return Object.keys(p).length ? p : undefined;
}

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

// i18n bootstrap. English is bundled as the always-present fallback; the other
// locales are lazy-loaded on demand via dynamic import() so Vite code-splits
// each into its own chunk and they never bloat the main bundle (see ROADMAP:
// "Lazy-load locale bundles"). The chosen language persists in localStorage.

export const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "sr", label: "Srpski", short: "SR" },
  { code: "hr", label: "Hrvatski", short: "HR" },
  { code: "bs", label: "Bosanski", short: "BS" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

const STORAGE_KEY = "nutriflow-lang";

// Dynamic loaders for the non-default locales. Keyed lookups keep the switch
// data-driven and let Vite emit one lazy chunk per language.
const loaders: Record<string, () => Promise<{ default: typeof en }>> = {
  sr: () => import("./locales/sr.json"),
  hr: () => import("./locales/hr.json"),
  bs: () => import("./locales/bs.json"),
};

function isSupported(code: string): code is LangCode {
  return LANGUAGES.some((l) => l.code === code);
}

const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
const initialLang: LangCode = stored && isSupported(stored) ? stored : "en";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

// Ensure a locale's bundle is loaded (no-op for English / already-loaded ones).
async function ensureLoaded(code: LangCode): Promise<void> {
  if (code === "en" || i18n.hasResourceBundle(code, "translation")) return;
  const mod = await loaders[code]();
  i18n.addResourceBundle(code, "translation", mod.default);
}

// Switch language: load its bundle if needed, apply it, then persist the choice.
export async function setLanguage(code: LangCode): Promise<void> {
  await ensureLoaded(code);
  await i18n.changeLanguage(code);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore storage-blocked (private mode) */
  }
}

// Resolves once the persisted language is loaded — awaited before the first
// render so a reload into a non-English locale doesn't flash English strings.
export const i18nReady: Promise<void> = ensureLoaded(initialLang);

export default i18n;

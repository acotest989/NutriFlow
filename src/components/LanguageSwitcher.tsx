import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Check } from "lucide-react";
import { LANGUAGES, type LangCode } from "../i18n";
import { useStore } from "../store";

// Compact language picker for the app header. Shows the current language's short
// code; opening it reveals the full list. Selecting one lazy-loads that locale's
// bundle (see src/i18n) and persists the choice.
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const updateLanguage = useStore((s) => s.updateLanguage);
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const pick = (code: LangCode) => {
    setOpen(false);
    if (code !== i18n.language) void updateLanguage(code);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all text-[#818CF8] cursor-pointer"
        title={t("lang.label")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Languages className="w-4 h-4" />
        <span className="text-[11px] font-mono font-bold tracking-wider text-[#E2E8F0] leading-none">
          {current.short}
        </span>
      </button>

      {open && (
        <>
          {/* Outside-click catcher */}
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 mt-2 z-50 w-40 bg-[#141923] border border-white/10 rounded-2xl shadow-xl p-1.5 space-y-0.5"
          >
            <li className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#64748B] select-none">
              {t("lang.label")}
            </li>
            {LANGUAGES.map((l) => {
              const active = l.code === i18n.language;
              return (
                <li key={l.code} role="option" aria-selected={active}>
                  <button
                    onClick={() => pick(l.code)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-sans font-semibold transition-all ${
                      active
                        ? "bg-[#6366F1]/15 text-white"
                        : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#818CF8] w-5">{l.short}</span>
                      {l.label}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

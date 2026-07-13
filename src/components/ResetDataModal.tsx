import { useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, X, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";

export default function ResetDataModal({ onClose }: { onClose: () => void }) {
  const resetData = useStore((s) => s.resetData);
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    setError("");
    const { error } = await resetData();
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    // Brief success state, then close.
    setTimeout(onClose, 1100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm antialiased"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm bg-[#141923] border border-white/10 rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center space-y-3 py-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm text-white font-sans font-semibold">{t("modals.resetDone")}</p>
            <p className="text-xs text-[#94A3B8] font-sans">{t("modals.resetDoneNote")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button onClick={onClose} aria-label={t("common.close")} className="text-[#64748B] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-lg font-black text-white font-sans tracking-tight">{t("modals.resetTitle")}</h2>
            <p className="text-xs text-[#94A3B8] font-sans mt-2 leading-relaxed">
              {t("modals.resetBody")}
            </p>

            {error && (
              <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900/30 rounded-xl p-2.5 mt-3 font-sans">
                {error}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white rounded-xl py-2.5 text-sm font-bold transition-colors font-sans disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 font-sans"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {t("modals.resetting")}
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" /> {t("modals.resetBtn")}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

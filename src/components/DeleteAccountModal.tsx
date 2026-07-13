import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store";

export default function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const deleteAccount = useStore((s) => s.deleteAccount);
  const email = useStore((s) => s.user?.email);
  const { t } = useTranslation();

  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canDelete = confirm.trim().toUpperCase() === "DELETE" && !loading;

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    setError("");
    const { error } = await deleteAccount();
    if (error) {
      setError(error);
      setLoading(false);
    }
    // On success the store signs the user out, which unmounts this whole screen.
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
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="text-[#64748B] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-lg font-black text-white font-sans tracking-tight">{t("modals.deleteTitle")}</h2>
        <p className="text-xs text-[#94A3B8] font-sans mt-2 leading-relaxed">
          {t("modals.deleteBody", { who: email || t("modals.deleteYourAccount") })}
        </p>

        <label className="text-xs text-[#94A3B8] block mt-5 mb-1.5 font-sans">
          {t("modals.deleteConfirmPre")} <span className="text-rose-300 font-bold font-mono">DELETE</span> {t("modals.deleteConfirmPost")}
        </label>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          autoFocus
          autoComplete="off"
          className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-rose-500 font-sans"
        />

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
            onClick={handleDelete}
            disabled={!canDelete}
            className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-white/5 disabled:text-[#64748B] text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 font-sans"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {t("modals.deleting")}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> {t("modals.deleteBtn")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

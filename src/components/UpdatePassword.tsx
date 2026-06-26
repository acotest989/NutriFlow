import React, { useState } from "react";
import { Flame, Loader2, Lock, Check, Eye, EyeOff } from "lucide-react";
import { useStore } from "../store";

export default function UpdatePassword() {
  const updatePassword = useStore((s) => s.updatePassword);
  const signOut = useStore((s) => s.signOut);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        setError(error);
      } else {
        // Success: updatePassword clears recoveryMode, so the app will render next.
        setDone(true);
      }
    } catch (err: any) {
      setError(err?.message || "Could not update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-6 antialiased">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-[#6366F1] to-[#a855f7] flex items-center justify-center text-white shadow-lg shadow-[#6366F1]/20 mb-3">
            <Flame className="w-7 h-7" />
          </div>
          <h1 className="font-sans font-black text-2xl tracking-tight text-white">
            Nutri<span className="text-[#818CF8]">Flow</span>
          </h1>
          <p className="text-xs text-[#94A3B8] font-sans mt-1">Choose a new password</p>
        </div>

        <div className="bg-[#141923] border border-white/5 rounded-3xl p-6 shadow-xl">
          {done ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-sm text-white font-sans font-semibold">Password updated</p>
              <p className="text-xs text-[#94A3B8] font-sans">You're all set — loading your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 font-sans">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1.5">New password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                  <input
                    id="new_password"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] block mb-1.5">Confirm new password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                  <input
                    id="confirm_password"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900/30 rounded-xl p-2.5">
                  {error}
                </p>
              )}

              <button
                id="update_password_submit"
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full bg-[#6366F1] hover:bg-[#818CF8] disabled:bg-white/5 disabled:text-[#64748B] text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#6366F1]/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                className="w-full text-xs text-[#94A3B8] hover:text-white transition-colors font-sans pt-1"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

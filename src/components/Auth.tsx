import React, { useState } from "react";
import { Flame, Loader2, Mail, Lock, LogIn, UserPlus, CheckCircle } from "lucide-react";
import { useStore } from "../store";

export default function Auth() {
  const signIn = useStore((s) => s.signIn);
  const signUp = useStore((s) => s.signUp);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || !password) return;
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(email.trim(), password);
        if (error) setError(error);
        // On success, the auth listener swaps this screen for the app.
      } else {
        const { error, needsConfirmation } = await signUp(email.trim(), password);
        if (error) {
          setError(error);
        } else if (needsConfirmation) {
          setInfo("Account created! Check your email to confirm, then sign in.");
          setMode("signin");
        }
        // If no confirmation is required, the auth listener logs you straight in.
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError("");
    setInfo("");
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-6 antialiased">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#a855f7] flex items-center justify-center text-white shadow-lg shadow-[#6366F1]/20 mb-3">
            <Flame className="w-7 h-7" />
          </div>
          <h1 className="font-sans font-black text-2xl tracking-tight text-white">
            Nutri<span className="text-[#818CF8]">Flow</span>
          </h1>
          <p className="text-xs text-[#94A3B8] font-sans mt-1">
            {mode === "signin" ? "Welcome back. Sign in to continue." : "Create your account to get started."}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#141923] border border-white/5 rounded-[24px] p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            <div>
              <label className="text-xs text-[#94A3B8] block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                <input
                  id="auth_email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#94A3B8] block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                <input
                  id="auth_password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900/30 rounded-xl p-2.5">
                {error}
              </p>
            )}
            {info && (
              <p className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900/30 rounded-xl p-2.5 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> {info}
              </p>
            )}

            <button
              id="auth_submit"
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full bg-[#6366F1] hover:bg-[#818CF8] disabled:bg-white/5 disabled:text-[#64748B] text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#6366F1]/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Please wait...
                </>
              ) : mode === "signin" ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/5 text-center">
            <button
              id="auth_switch_mode"
              onClick={switchMode}
              className="text-xs text-[#94A3B8] hover:text-white transition-colors font-sans"
            >
              {mode === "signin" ? (
                <>Don't have an account? <span className="text-[#818CF8] font-semibold">Sign up</span></>
              ) : (
                <>Already have an account? <span className="text-[#818CF8] font-semibold">Sign in</span></>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#64748B] font-sans mt-6 leading-relaxed">
          Your data is private and secured per-account with row-level security.
        </p>
      </div>
    </div>
  );
}

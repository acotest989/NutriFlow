import { useState, useEffect, lazy, Suspense } from "react";
import {
  Flame,
  Apple,
  LayoutDashboard,
  Scan,
  Dumbbell,
  TrendingUp,
  Star,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Loader2,
  AlertTriangle,
  X
} from "lucide-react";
import Dashboard from "./components/Dashboard";
import WaterTracker from "./components/WaterTracker";
// Heavy, non-initial tabs are lazy-loaded so recharts (charts), the camera
// components, and the AI coach stay out of the initial bundle — the dashboard
// tab paints without them.
const FoodSearch = lazy(() => import("./components/FoodSearch"));
const Scanner = lazy(() => import("./components/Scanner"));
const PhotoAnalyzer = lazy(() => import("./components/PhotoAnalyzer"));
const ExerciseTracker = lazy(() => import("./components/ExerciseTracker"));
const ProgressCharts = lazy(() => import("./components/ProgressCharts"));
const AiCoach = lazy(() => import("./components/AiCoach"));
import Auth from "./components/Auth";
import UpdatePassword from "./components/UpdatePassword";
import DeleteAccountModal from "./components/DeleteAccountModal";
import ResetDataModal from "./components/ResetDataModal";
import Onboarding from "./components/Onboarding";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { stashPendingOnboarding } from "./lib/onboarding";
import { useStore } from "./store";
import { useTranslation } from "react-i18next";

// Desktop top-nav tabs — mirror the mobile bottom nav so both views share the
// same sections, driven by the same `activeMobileTab` state. `tKey` points at
// the nav label in the active locale (see src/i18n).
const DESKTOP_TABS = [
  { id: "dashboard", tKey: "nav.dashboard", Icon: LayoutDashboard },
  { id: "meals", tKey: "nav.meals", Icon: Apple },
  { id: "exercises", tKey: "nav.active", Icon: Dumbbell },
  { id: "coach", tKey: "nav.coach", Icon: Sparkles },
  { id: "charts", tKey: "nav.trends", Icon: TrendingUp },
  { id: "scanner", tKey: "nav.scan", Icon: Scan },
] as const;

// Shown while a lazy-loaded tab's chunk is being fetched.
const tabFallback = (
  <div className="flex items-center justify-center py-20 text-[#818CF8]">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>
);

export default function App() {
  // Automatically switches between layouts responsively!
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  // Minimal client-side routing so the quiz is its own full-screen page (own URL,
  // shareable, reusable as a promo entry point) rather than an inline section.
  const [path, setPath] = useState<string>(typeof window !== "undefined" ? window.location.pathname : "/");
  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
  };

  useEffect(() => {
    const checkResponsive = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkResponsive();
    window.addEventListener("resize", checkResponsive);
    return () => window.removeEventListener("resize", checkResponsive);
  }, []);

  // Shared app state now lives in the global store (see src/store.ts).
  const currentDate = useStore((s) => s.currentDate);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const { t } = useTranslation();

  // Auth state
  const authReady = useStore((s) => s.authReady);
  const user = useStore((s) => s.user);
  const recoveryMode = useStore((s) => s.recoveryMode);
  const hasOnboarded = useStore((s) => s.hasOnboarded);
  const profile = useStore((s) => s.profile);
  const initAuth = useStore((s) => s.initAuth);
  const signOut = useStore((s) => s.signOut);

  // Data + error state
  const dataLoading = useStore((s) => s.dataLoading);
  const error = useStore((s) => s.error);
  const setError = useStore((s) => s.setError);

  // Initialize the auth session listener once on mount.
  useEffect(() => initAuth(), [initAuth]);

  // Keep the route in sync with browser back/forward.
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Auto-dismiss the error toast after a few seconds.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error, setError]);

  // Mobile viewport current bottom navigation tab
  const [activeMobileTab, setActiveMobileTab] = useState<"dashboard" | "meals" | "exercises" | "charts" | "scanner" | "coach">("dashboard");

  // Branded splash (mirrors the pre-React boot splash in index.html for a
  // seamless startup). Shown during the initial session check and while the
  // signed-in user's profile is still loading.
  const brandedSplash = (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center gap-5 antialiased select-none">
      <div className="relative">
        <div className="w-18 h-18 rounded-3xl bg-linear-to-tr from-[#6366F1] to-[#a855f7] flex items-center justify-center text-white shadow-xl shadow-[#6366F1]/40 animate-pulse">
          <Flame className="w-9 h-9" />
        </div>
        <div className="absolute inset-0 rounded-3xl bg-[#6366F1]/25 blur-2xl -z-10" />
      </div>
      <h1 className="font-sans font-black text-xl tracking-tight text-white">
        Nutri<span className="text-[#818CF8]">Flow</span>
      </h1>
      <div className="flex items-center gap-2 text-[#64748B]">
        <Loader2 className="w-4 h-4 text-[#818CF8] animate-spin" />
        <span className="text-xs font-sans">Loading your workspace…</span>
      </div>
    </div>
  );

  // While the initial session check runs.
  if (!authReady) return brandedSplash;

  // Arrived via a password-reset link -> show the update-password screen.
  if (recoveryMode) {
    return <UpdatePassword />;
  }

  // Public promo quiz: a logged-out visitor at /quiz can take the quiz and see
  // their plan, then create an account to save it. Answers are stashed and
  // auto-applied on first sign-in (see store.loadData).
  if (!user && path === "/quiz") {
    return (
      <Onboarding
        title={t("onboarding.promoTitle")}
        submitLabel={t("onboarding.promoSubmit")}
        onSubmit={async (data) => {
          stashPendingOnboarding(data);
          navigate("/");
          return { error: null };
        }}
        secondaryLabel={t("onboarding.promoSecondary")}
        onSecondary={() => navigate("/")}
      />
    );
  }

  // Not signed in -> show the auth screen.
  if (!user) {
    return <Auth />;
  }

  // Signed in but profile not loaded yet -> keep the splash (avoids flashing the
  // dashboard before we know whether onboarding is needed).
  if (hasOnboarded === null) return brandedSplash;

  // First-run: personalize goals via the onboarding quiz.
  if (!hasOnboarded) {
    return <Onboarding />;
  }

  // Dedicated full-screen quiz page (edit profile / re-take). Own URL so it's a
  // real page you can't scroll past — and a reusable entry point later.
  if (path === "/quiz") {
    return <Onboarding initial={profile} onClose={() => navigate("/")} />;
  }

  return (
    <div className={`min-h-screen bg-[#0B0E14] flex flex-col antialiased selection:bg-[#6366F1] selection:text-white transition-colors duration-200 ${theme === 'high-contrast-light' ? 'theme-high-contrast-light' : ''}`}>
      {/* Thin sync indicator while loading the user's data */}
      {dataLoading && (
        <div className="fixed top-0 inset-x-0 z-60 flex items-center justify-center gap-2 bg-[#6366F1] text-white text-[10px] font-mono font-bold uppercase tracking-wider py-1 shadow-md">
          <Loader2 className="w-3 h-3 animate-spin" /> Syncing your data...
        </div>
      )}

      {/* Dismissible error toast */}
      {error && (
        <div className="fixed bottom-4 inset-x-0 z-70 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-sm w-full bg-[#141923] border border-rose-500/30 rounded-2xl px-4 py-3 shadow-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="flex-1 text-xs text-[#E2E8F0] font-sans leading-relaxed">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-[#64748B] hover:text-white transition-colors shrink-0"
              title={t("common.dismiss")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isMobile ? (
        /* ================= MOBILE DIRECT NATIVE VIEWPORT ================= */
        <div className="flex flex-col">
          {/* NutriFlow Mobile Brand Sticky Header */}
          <div className="bg-[#141923] px-5 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 z-40 select-none shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-[#6366F1] to-[#a855f7] flex items-center justify-center text-white shadow-md shadow-[#6366F1]/10">
                <Flame className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <span className="font-sans font-black text-sm tracking-tight text-white">
                Nutri<span className="text-[#818CF8]">Flow</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <LanguageSwitcher />
              <button
                id="mobile_theme_toggle"
                onClick={toggleTheme}
                className="p-1.5 rounded-lg border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all text-xs text-[#818CF8] flex items-center justify-center"
                title={theme === 'deep-midnight' ? t('header.themeToLight') : t('header.themeToDark')}
              >
                {theme === 'deep-midnight' ? (
                  <Sun className="w-4.5 h-4.5 text-amber-400" />
                ) : (
                  <Moon className="w-4.5 h-4.5 text-[#818CF8]" />
                )}
              </button>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="hidden min-[420px]:inline text-[9px] font-mono font-bold tracking-wider text-[#94A3B8] uppercase leading-none">{t('header.syncOn')}</span>
              </div>
              <button
                id="mobile_sign_out"
                onClick={() => signOut()}
                className="p-1.5 rounded-lg border border-white/10 hover:border-rose-500/40 bg-white/5 hover:bg-rose-500/10 transition-all text-[#94A3B8] hover:text-rose-400 flex items-center justify-center"
                title={t("header.signOut")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Internal Scrollable Content Area */}
          <div className="flex-1 p-4 space-y-4">
            <Suspense fallback={tabFallback}>
            {activeMobileTab === "dashboard" && (
              <div className="space-y-4 animate-fadeIn">
                <Dashboard isCompact={true} />
                <WaterTracker isCompact={true} />
              </div>
            )}

            {activeMobileTab === "meals" && <FoodSearch />}

            {activeMobileTab === "exercises" && <ExerciseTracker />}

            {activeMobileTab === "charts" && <ProgressCharts isCompact={true} />}

            {activeMobileTab === "scanner" && (
              <div className="space-y-6">
                <PhotoAnalyzer isCompact={true} />
                <Scanner isCompact={true} />
              </div>
            )}

            {activeMobileTab === "coach" && <AiCoach isCompact={true} />}
            </Suspense>
          </div>

          {/* iPhone Native Bottom Tab Navigation Bar */}
          <nav className="fixed bottom-0 inset-x-0 bg-[#141923]/95 border-t border-white/5 flex justify-around py-2.5 z-40 select-none shrink-0 font-sans shadow-[0_-4px_10px_rgba(0,0,0,0.3)] px-1 backdrop-blur-md">
            <button
              id="mobile_nav_dashboard"
              onClick={() => setActiveMobileTab("dashboard")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "dashboard" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>{t('nav.dashboard')}</span>
            </button>
            <button
              id="mobile_nav_meals"
              onClick={() => setActiveMobileTab("meals")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "meals" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Apple className="w-5 h-5" />
              <span>{t('nav.meals')}</span>
            </button>
            <button
              id="mobile_nav_workouts"
              onClick={() => setActiveMobileTab("exercises")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "exercises" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Dumbbell className="w-5 h-5" />
              <span>{t('nav.active')}</span>
            </button>
            <button
              id="mobile_nav_coach"
              onClick={() => setActiveMobileTab("coach")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "coach" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>{t('nav.coach')}</span>
            </button>
            <button
              id="mobile_nav_analytics"
              onClick={() => setActiveMobileTab("charts")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "charts" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>{t('nav.trends')}</span>
            </button>
            <button
              id="mobile_nav_scanner"
              onClick={() => setActiveMobileTab("scanner")}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition-all ${
                activeMobileTab === "scanner" ? "text-[#818CF8] scale-105 font-bold" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Scan className="w-5 h-5" />
              <span>{t('nav.scan')}</span>
            </button>
          </nav>
        </div>
      ) : (
        /* ================= RESPONSIVE WEB/DESKTOP VIEWPORT ================= */
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 p-6">
          {/* Desktop Brand Navigation Bar — raised above the tab nav so the
              language dropdown overlaps it instead of being clipped behind it. */}
          <div className="relative z-30 bg-[#141923]/90 border border-white/5 backdrop-blur-md rounded-3xl px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-xl gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-[#6366F1] to-[#a855f7] flex items-center justify-center text-white shadow-md shadow-[#6366F1]/20">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="font-sans font-black text-base tracking-tight text-white flex items-center gap-1.5">
                  NutriFlow<span className="text-[#818CF8]">Studio</span>
                </h2>
                <p className="text-[10px] text-[#94A3B8] font-sans">{t('header.tagline')}</p>
              </div>
            </div>

            {/* Status and Active Date indicators */}
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <button
                id="desktop_theme_toggle"
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all text-xs font-semibold text-[#818CF8] cursor-pointer"
                title={theme === 'deep-midnight' ? t('header.themeToLight') : t('header.themeToDark')}
              >
                {theme === 'deep-midnight' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="text-[#E2E8F0] font-sans">{t('header.lightLabel')}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-[#818CF8]" />
                    <span className="text-[#0F172A] font-sans">{t('header.darkLabel')}</span>
                  </>
                )}
              </button>
              <div className="flex items-center gap-1.5 bg-[#0B0E14] border border-white/5 px-3 py-1.5 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-[#10B981] uppercase tracking-wider">{t('header.aiConnected')}</span>
              </div>
              <div className="text-[11px] font-sans text-[#94A3B8]">
                {t('header.loggedDate')} <span className="text-white font-semibold font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 ml-1">{currentDate}</span>
              </div>
              <button
                id="desktop_sign_out"
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-rose-500/40 bg-white/5 hover:bg-rose-500/10 transition-all text-xs font-semibold text-[#94A3B8] hover:text-rose-400 cursor-pointer"
                title={user.email ? `${t('header.signOut')} (${user.email})` : t('header.signOut')}
              >
                <LogOut className="w-4 h-4" />
                <span className="font-sans hidden xl:inline">{t('header.signOut')}</span>
              </button>
            </div>
          </div>

          {/* Desktop tab navigation — mirrors the mobile tabs so both views share
              the same sections (driven by the same activeMobileTab state). */}
          <nav className="relative z-20 bg-[#141923]/90 border border-white/5 backdrop-blur-md rounded-3xl p-2 flex items-center justify-center gap-1 shadow-lg overflow-x-auto">
            {DESKTOP_TABS.map(({ id, tKey, Icon }) => {
              const active = activeMobileTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveMobileTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-sans font-semibold transition-all whitespace-nowrap ${
                    active
                      ? "bg-[#6366F1] text-white shadow-md"
                      : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {t(tKey)}
                </button>
              );
            })}
          </nav>

          {/* Tabbed content — mirrors the mobile view's section grouping. No panel
              card here: each component brings its own card(s), so single-card
              components (AI Coach, Water) don't become a card-inside-a-card. */}
          <div className="min-h-[60vh]">
            <Suspense fallback={tabFallback}>
            {activeMobileTab === "dashboard" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-fadeIn">
                <Dashboard />
                <WaterTracker />
              </div>
            )}

            {activeMobileTab === "meals" && (
              <div className="max-w-3xl mx-auto animate-fadeIn">
                <FoodSearch />
              </div>
            )}

            {activeMobileTab === "exercises" && (
              <div className="max-w-3xl mx-auto animate-fadeIn">
                <ExerciseTracker />
              </div>
            )}

            {activeMobileTab === "coach" && (
              <div className="max-w-3xl mx-auto animate-fadeIn">
                <AiCoach />
              </div>
            )}

            {activeMobileTab === "charts" && (
              <div className="animate-fadeIn">
                <ProgressCharts />
              </div>
            )}

            {activeMobileTab === "scanner" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fadeIn">
                <PhotoAnalyzer />
                <Scanner />
              </div>
            )}
            </Suspense>
          </div>
        </div>
      )}

      {/* Footer: useful links + brand. Extra bottom padding on mobile clears the fixed nav bar. */}
      <footer className="text-center font-sans mt-6 px-6 pb-28 lg:mt-10 lg:pb-10 select-none">
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[12px]">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#94A3B8] hover:text-white transition-colors">
            {t('footer.privacy')}
          </a>
          <span className="text-[#334155]">·</span>
          <button
            onClick={() => navigate("/quiz")}
            className="text-[#94A3B8] hover:text-white transition-colors"
          >
            {t('footer.editProfile')}
          </button>
          <span className="text-[#334155]">·</span>
          <button
            onClick={() => setShowResetModal(true)}
            className="text-[#94A3B8] hover:text-amber-400 transition-colors"
          >
            {t('footer.resetData')}
          </button>
          <span className="text-[#334155]">·</span>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-[#94A3B8] hover:text-rose-400 transition-colors"
          >
            {t('footer.deleteAccount')}
          </button>
          <span className="text-[#334155]">·</span>
          <a href="mailto:chillibrimedia@gmail.com" className="text-[#94A3B8] hover:text-white transition-colors">
            {t('footer.contact')}
          </a>
          <span className="text-[#334155]">·</span>
          <a
            href="https://play.google.com/store/apps/details?id=app.nutriflow.twa"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#818CF8] hover:text-[#a5b4fc] transition-colors inline-flex items-center gap-1"
          >
            <Star className="w-3.5 h-3.5" /> {t('footer.rate')}
          </a>
        </div>
        <p className="text-[11px] text-[#64748B] mt-3">
          {t('footer.tagline')}
        </p>
      </footer>

      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
      {showResetModal && <ResetDataModal onClose={() => setShowResetModal(false)} />}
    </div>
  );
}

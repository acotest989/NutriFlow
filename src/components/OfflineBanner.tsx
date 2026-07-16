import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

// A slim, fixed banner shown while the browser reports no network. The offline
// app-shell (service worker) lets the UI still load from cache; this makes the
// offline state explicit so failed data fetches/saves read as "you're offline"
// rather than as a broken app. Self-contained: manages its own online state and
// is mounted once at the root (see src/main.tsx) so it covers every screen.
export default function OfflineBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" && navigator.onLine === false,
  );

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[80] flex items-center justify-center gap-2 bg-amber-500 text-[#0B0E14] text-[10px] font-mono font-bold uppercase tracking-wider py-1 shadow-md"
    >
      <WifiOff className="w-3 h-3" /> {t("common.offline")}
    </div>
  );
}

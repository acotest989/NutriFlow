// Clean up any Service Worker a previous version of the app registered, to avoid
// stale iframe/asset caches. The SW is intentionally disabled (see public/sw.js).
// Kept as an external file — not inline — so the production Content-Security-
// Policy can use a strict `script-src 'self'` (no 'unsafe-inline').
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) console.log("Unregistered stale service worker successfully");
      });
    }
  });
}

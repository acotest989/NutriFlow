import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import OfflineBanner from './components/OfflineBanner.tsx';
import {i18nReady} from './i18n';
import './index.css';

// Register the offline app-shell service worker. `autoUpdate` (configured in
// vite.config.ts) means a new deploy activates and reloads automatically, so an
// installed TWA never gets stuck on a stale shell. Resolves to a no-op in dev
// (devOptions.enabled = false) and is bundled into our hashed JS, so the strict
// production CSP (`script-src 'self'`) keeps holding.
registerSW({immediate: true});

// Wait for the persisted locale's bundle to load before the first render so a
// reload into a non-English language doesn't flash English strings.
i18nReady.finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      {/* Outside the boundary so the offline hint survives an App-level crash. */}
      <OfflineBanner />
    </StrictMode>,
  );
});

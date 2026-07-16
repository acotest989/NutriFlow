import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Offline app-shell (PWA). Precaches the hashed JS/CSS/icons and serves
      // them (and index.html) when the network is unavailable, so the installed
      // app / TWA launches offline instead of showing a blank screen.
      VitePWA({
        // A new build ships a fresh precache revision manifest; the waiting SW
        // activates immediately and the page auto-reloads onto the new version.
        // This is what keeps a `git push` deploy from serving a stale shell.
        registerType: 'autoUpdate',
        // We register the SW ourselves from bundled JS (see src/main.tsx) so the
        // production CSP can keep a strict `script-src 'self'` — no injected
        // inline registration script.
        injectRegister: false,
        // We already ship public/manifest.json (linked from index.html); don't
        // let the plugin generate/inject a second web manifest.
        manifest: false,
        // Kill-switch: `PWA_KILL=1 npm run build` ships a self-destroying SW that
        // unregisters itself and wipes its caches on every client. It's the
        // escape hatch if the cache layer ever misbehaves — recovers installed
        // users over the web, with no new Play Store build.
        selfDestroying: process.env.PWA_KILL === '1',
        workbox: {
          // Precache the hashed app shell. Content-hashed filenames are
          // immutable, and cleanupOutdatedCaches removes the previous build's
          // entries once the new SW activates.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // SPA navigations fall back to the cached index.html so client-side
          // routes (e.g. /quiz) work offline...
          navigateFallback: '/index.html',
          // ...but NEVER shadow the API or the server-rendered pages
          // (privacy / account-deletion / asset-links) with the app shell.
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/privacy/,
            /^\/delete-account/,
            /^\/assetlinks\.json$/,
            /^\/\.well-known\//,
          ],
        },
        // No service worker in dev — keep Vite HMR (and the Express dev server)
        // clean; the SW is a production-build concern only.
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

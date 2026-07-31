// Minimal service worker: exists mainly so the app qualifies as an installable
// PWA (required for PWABuilder / Trusted Web Activity APK generation).
// Intentionally does not cache Supabase API calls or product data — this app's
// content changes too often for a cache-first strategy to make sense yet.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op passthrough for now — network is the source of truth.
});

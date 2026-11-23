// Retire the former assistant page cache without touching account data.
// Navigation always uses the network, so future index.html edits can appear.
const LEGACY_CACHE = 'sigma-ai-v1';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await caches.delete(LEGACY_CACHE);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() =>
    new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>غير متصل</title><body><h1>تعذر الاتصال بالموقع</h1><p>اتصل بالإنترنت ثم أعد تحميل الصفحة لعرض أحدث نسخة.</p></body></html>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    })
  ));
});

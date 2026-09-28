// sw.js - Service Worker لمتجر يزيد
const CACHE_VERSION = 'ym-store-v2.0.0';
const CACHE_ASSETS = ['/', './index.html', './offline.html', './manifest.json'];

self.addEventListener('install', e => {
  console.log('[SW] Install');
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(CACHE_ASSETS).catch(()=>{}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  console.log('[SW] Activate');
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic') || url.hostname.includes('firebaseio') ||
      url.protocol === 'chrome-extension:') return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        const c = r.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(e.request, c));
        return r;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./offline.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
      if (r.status === 200 && r.type === 'basic') {
        const c = r.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(e.request, c));
      }
      return r;
    }).catch(() => cached))
  );
});

self.addEventListener('push', e => {
  console.log('[SW] Push received');
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}

  const n = data.notification || {};
  const d = data.data || {};

  const title = n.title || d.title || 'متجر يزيد';
  const body = n.body || d.body || 'لديك إشعار جديد';
  const icon = n.icon || d.storeLogo || '/favicon.ico';
  const image = n.image || d.storeImage || '';

  const options = {
    body,
    icon,
    badge: icon,
    ...(image ? { image } : {}),
    dir: 'rtl',
    lang: 'ar',
    vibrate: [500, 200, 500, 200, 500],
    tag: 'ym-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: Date.now(),
    actions: [
      { action: 'open', title: '🎁 فتح المتجر' },
      { action: 'close', title: '✖ إغلاق' }
    ],
    data: { url: '/', type: d.type || 'system' }
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  if (d.type === 'SHOW_NOTIFICATION') {
    const p = d.payload || {};
    self.registration.showNotification(p.title || 'متجر يزيد', {
      body: p.body || '',
      icon: p.icon || '/favicon.ico',
      badge: p.icon || '/favicon.ico',
      ...(p.image ? { image: p.image } : {}),
      dir: 'rtl', lang: 'ar',
      vibrate: [500, 200, 500, 200, 500],
      tag: 'ym-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: { url: '/' }
    });
  }
});

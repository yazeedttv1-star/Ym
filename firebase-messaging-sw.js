// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAN11agW-TWwAk3TvF7mRZRt6PHLcnl_aQ",
  authDomain: "ym-pro-max.firebaseapp.com",
  databaseURL: "https://ym-pro-max-default-rtdb.firebaseio.com",
  projectId: "ym-pro-max",
  storageBucket: "ym-pro-max.firebasestorage.app",
  messagingSenderId: "174657071953",
  appId: "1:174657071953:web:5e831fc337df46dbd18170"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  console.log('[FCM-SW] Background:', payload);
  const n = payload.notification || {};
  const d = payload.data || {};

  const title = n.title || d.title || 'متجر يزيد';
  const body = n.body || d.body || 'لديك إشعار جديد';
  const icon = n.icon || d.storeLogo || '/favicon.ico';
  const image = n.image || d.storeImage || '';

  return self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    ...(image ? { image } : {}),
    dir: 'rtl',
    lang: 'ar',
    vibrate: [500, 200, 500, 200, 500],
    tag: 'fcm-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: { url: '/' }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});

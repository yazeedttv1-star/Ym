importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// نفس إعدادات مشروعك
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

// معالجة الإشعارات الواردة أثناء إغلاق التطبيق (الخارجية)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'رسالة جديدة';
  const notificationOptions = {
    body: payload.notification.body || 'لديك إشعار جديد في MY Chat',
    icon: '/favicon.ico' // يمكنك وضع مسار لوجو التطبيق هنا
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

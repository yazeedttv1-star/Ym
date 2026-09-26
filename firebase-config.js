// استيراد الوحدات المطلوبة من Firebase SDK (الإصدار 10.8.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// إعدادات مشروع Firebase الخاص بك
const firebaseConfig = {
  apiKey: "AIzaSyAN11agW-TWwAk3TvF7mRZRt6PHLcnl_aQ",
  authDomain: "ym-pro-max.firebaseapp.com",
  databaseURL: "https://ym-pro-max-default-rtdb.firebaseio.com",
  projectId: "ym-pro-max",
  storageBucket: "ym-pro-max.firebasestorage.app",
  messagingSenderId: "174657071953",
  appId: "1:174657071953:web:5e831fc337df46dbd18170"
};

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// تصدير الخدمات لاستخدامها في باقي ملفات المشروع (مثل app.js)
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

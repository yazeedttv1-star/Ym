import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, RecaptchaVerifier, signInWithPhoneNumber, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// الإعدادات الثابتة لمشروع Firebase الخاص بك
const firebaseConfig = {
  apiKey: "AIzaSyAN11agW-TWwAk3TvF7mRZRt6PHLcnl_aQ",
  authDomain: "ym-pro-max.firebaseapp.com",
  projectId: "ym-pro-max",
  storageBucket: "ym-pro-max.firebasestorage.app",
  messagingSenderId: "174657071953",
  appId: "1:174657071953:web:5e831fc337df46dbd18170"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// عناصر الواجهة الاستاتيكية
const screenAuth = document.getElementById('screen-auth');
const screenApp = document.getElementById('screen-app');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const inputFooterArea = document.getElementById('input-footer-area');

let confirmationResult = null;
let currentRoomId = null;
let unsubscribeChat = null;

// تجهيز أداة التحقق البشري لتوثيق الـ SMS للهاتف
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });

// 1. طريقة تسجيل الدخول بجوجل
document.getElementById('btn-google-login').addEventListener('click', () => { 
    signInWithPopup(auth, new GoogleAuthProvider()).catch(err => alert("خطأ جوجل: " + err.message)); 
});

// 2. طريقة تسجيل الدخول كمجهول (Anonymous)
document.getElementById('btn-anon-login').addEventListener('click', () => { 
    signInAnonymously(auth).catch(err => alert("خطأ الدخول المجهول: " + err.message)); 
});

// 3. طريقة تسجيل الدخول أو إنشاء حساب بالبريد الإلكتروني تلقائياً
document.getElementById('btn-email-auth').addEventListener('click', () => {
    const email = document.getElementById('email-login').value.trim();
    const password = document.getElementById('password-login').value;
    if(!email || !password) return alert("يرجى ملء خانات البريد والرمز السري!");

    signInWithEmailAndPassword(auth, email, password).catch(() => {
        createUserWithEmailAndPassword(auth, email, password)
            .then(() => alert("تم تسجيل وإنشاء حسابك بالبريد بنجاح!"))
            .catch(err => alert("عذراً فشل التعامل بالبريد: " + err.message));
    });
});

// 4. طريقة تسجيل الدخول برقم الهاتف مع معالجة مفتاح الدولة تلقائياً
const btnPhoneAction = document.getElementById('btn-phone-action');
btnPhoneAction.addEventListener('click', () => {
    if (!confirmationResult) {
        let rawNumber = document.getElementById('phone-number').value.trim();
        if(rawNumber.startsWith('0')) rawNumber = rawNumber.substring(1);
        if(!rawNumber) return alert("الرجاء كتابة رقم هاتف صحيح!");

        signInWithPhoneNumber(auth, "+20" + rawNumber, window.recaptchaVerifier)
            .then((res) => {
                confirmationResult = res;
                document.getElementById('otp-area').style.display = 'flex';
                btnPhoneAction.innerText = 'تأكيد الرمز المبعوث';
            }).catch(err => alert("فشل إرسال كود الهاتف: " + err.message));
    } else {
        const code = document.getElementById('verification-code').value.trim();
        confirmationResult.confirm(code).catch(err => alert("الرمز غير صحيح: " + err.message));
    }
});

// إدارة حالات الجلسة والتبديل التلقائي الذكي بين الشاشات
onAuthStateChanged(auth, (user) => {
    if (user) {
        screenAuth.classList.remove('active');
        screenApp.classList.add('active');
        
        let accountName = user.displayName || (user.email ? user.email.split('@')[0] : (user.phoneNumber ? user.phoneNumber : "مستخدم مجهول"));
        document.getElementById('user-display-name').innerText = accountName;
        
        // حقن المعرف الموحد الكامل UID لتسهيل نسخه وتداوله
        document.getElementById('user-uid-input').value = user.uid;
        document.getElementById('user-avatar').innerText = accountName.charAt(0).toUpperCase();
    } else {
        screenAuth.classList.add('active');
        screenApp.classList.remove('active');
        confirmationResult = null;
        document.getElementById('otp-area').style.display = 'none';
        btnPhoneAction.innerText = 'إرسال كود التحقق';
        if (unsubscribeChat) unsubscribeChat();
    }
});

// زر الخروج
document.getElementById('btn-logout').addEventListener('click', () => { if(confirm("هل تود الخروج فعلاً؟")) signOut(auth); });

// ربط الطرفين في غرفة شات خاصة عبر الـ UID الثابت لكل حساب
document.getElementById('btn-connect-room').addEventListener('click', () => {
    const myUid = auth.currentUser.uid;
    const targetUid = document.getElementById('target-identifier').value.trim();
    
    if(!targetUid || myUid === targetUid) {
        alert("يرجى لصق الـ ID الفريد لصديقك بشكل صحيح!");
        return;
    }

    // صياغة الـ Room ID بشكل موحد للطرفين لضمان التقابل
    currentRoomId = [myUid, targetUid].sort().join("_");
    inputFooterArea.style.display = 'flex';
    loadLiveMessages(currentRoomId);
});

// إرسال الرسالة إلى Firestore
async function handleMessageDispatch() {
    const text = chatInput.value.trim();
    if (text && auth.currentUser && currentRoomId) {
        chatInput.value = '';
        await addDoc(collection(db, "whatsapp_verified_chats"), {
            roomId: currentRoomId,
            text: text,
            senderId: auth.currentUser.uid,
            senderName: auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : "صديقك"),
            timestamp: new Date()
        });
    }
}

document.getElementById('btn-send-message').addEventListener('click', handleMessageDispatch);
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleMessageDispatch(); });

// جلب وتحديث الرسائل لحظياً من السيرفر
function loadLiveMessages(roomId) {
    if (unsubscribeChat) unsubscribeChat();
    const q = query(collection(db, "whatsapp_verified_chats"), where("roomId", "==", roomId), orderBy("timestamp", "asc"));
    
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isMe = data.senderId === auth.currentUser.uid;
            
            const msgRow = document.createElement('div');
            msgRow.className = `msg-row ${isMe ? 'sent' : 'received'}`;
            
            let timeFormatted = "الآن";
            if(data.timestamp) {
                timeFormatted = data.timestamp.toDate().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            }

            msgRow.innerHTML = `
                <div class="bubble">
                    ${!isMe ? `<span class="bubble-sender">${data.senderName}</span>` : ''}
                    <span class="bubble-text">${data.text}</span>
                    <span class="bubble-time">${timeFormatted}</span>
                </div>
            `;
            chatMessages.appendChild(msgRow);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
                         }

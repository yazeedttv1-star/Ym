import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const screenAuth = document.getElementById('screen-auth');
const screenApp = document.getElementById('screen-app');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const inputFooterArea = document.getElementById('input-footer-area');

let currentRoomId = null;
let unsubscribeChat = null;
let shortUid = "";

// 1. الدخول بجوجل
document.getElementById('btn-google-login').addEventListener('click', () => { signInWithPopup(auth, new GoogleAuthProvider()); });

// 2. الدخول المجهول
document.getElementById('btn-anon-login').addEventListener('click', () => { signInAnonymously(auth); });

// 3. الدخول أو التسجيل بالبريد
document.getElementById('btn-email-auth').addEventListener('click', () => {
    const email = document.getElementById('email-login').value.trim();
    const password = document.getElementById('password-login').value;
    if(!email || !password) return alert("يرجى كتابة البريد وكلمة المرور!");
    signInWithEmailAndPassword(auth, email, password).catch(() => {
        createUserWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
    });
});

// مراقبة الجلسة والتعامل مع الـ ID المصغر
onAuthStateChanged(auth, (user) => {
    if (user) {
        screenAuth.classList.remove('active');
        screenApp.classList.add('active');
        
        let name = user.displayName || (user.email ? user.email.split('@')[0] : "مستخدم مجهول");
        document.getElementById('user-display-name').innerText = name;
        
        // تحويل الـ UID لـ ID قصير من 6 أرقام وحروف لسهولة التبادل
        shortUid = user.uid.substring(0, 6);
        const uidInput = document.getElementById('user-uid-input');
        uidInput.value = shortUid;
        
        // ميزة إضافية: عند الضغط على خانة الـ ID يتم النسخ تلقائياً للحافظة
        uidInput.onclick = () => {
            navigator.clipboard.writeText(shortUid);
            alert("تم نسخ الـ ID المصغر الخاص بك بنجاح! 📋");
        };

        document.getElementById('user-avatar').innerText = name.charAt(0).toUpperCase();
    } else {
        screenAuth.classList.add('active');
        screenApp.classList.remove('active');
        if (unsubscribeChat) unsubscribeChat();
    }
});

// تسجيل الخروج
document.getElementById('btn-logout').addEventListener('click', () => { signOut(auth); });

// ربط الغرف باستخدام الـ ID المصغر للطرفين
document.getElementById('btn-connect-room').addEventListener('click', () => {
    const targetUid = document.getElementById('target-identifier').value.trim();
    if(!targetUid || shortUid === targetUid) return alert("أدخل الـ ID المصغر الصحيح المكون من 6 أرقام الخاص بصديقك!");
    
    currentRoomId = [shortUid, targetUid].sort().join("_");
    inputFooterArea.style.display = 'flex';
    loadLiveMessages(currentRoomId);
});

// إرسال الرسائل
async function sendMessage() {
    const text = chatInput.value.trim();
    if (text && auth.currentUser && currentRoomId) {
        chatInput.value = '';
        await addDoc(collection(db, "whatsapp_verified_chats"), {
            roomId: currentRoomId,
            text: text,
            senderId: shortUid,
            senderName: auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : "صديقك"),
            timestamp: new Date()
        });
    }
}

document.getElementById('btn-send-message').addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });

// جلب وتحديث الشات لحظياً
function loadLiveMessages(roomId) {
    if (unsubscribeChat) unsubscribeChat();
    const q = query(collection(db, "whatsapp_verified_chats"), where("roomId", "==", roomId), orderBy("timestamp", "asc"));
    
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isMe = data.senderId === shortUid;
            const msgLine = document.createElement('div');
            msgLine.className = `msg-line ${isMe ? 'sent' : 'received'}`;
            
            let t = "الآن";
            if(data.timestamp) t = data.timestamp.toDate().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            
            msgLine.innerHTML = `
                <div class="bubble-wrap">
                    ${!isMe ? `<span class="b-sender">${data.senderName}</span>` : ''}
                    <span class="b-text">${data.text}</span>
                    <span class="b-time">${t}</span>
                </div>
            `;
            chatMessages.appendChild(msgLine);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

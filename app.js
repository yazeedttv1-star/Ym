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
let fullUid = ""; // الـ UID الأصلي الكامل اللي السيرفر بيحتاجه في الخلفية

// أزرار تسجيل الدخول
document.getElementById('btn-google-login').onclick = () => { signInWithPopup(auth, new GoogleAuthProvider()).catch(e => alert(e.message)); };
document.getElementById('btn-anon-login').onclick = () => { signInAnonymously(auth).catch(e => alert(e.message)); };

document.getElementById('btn-email-auth').onclick = () => {
    const email = document.getElementById('email-login').value.trim();
    const password = document.getElementById('password-login').value;
    if(!email || !password) return alert("يرجى ملء البيانات!");
    
    signInWithEmailAndPassword(auth, email, password).catch(() => {
        createUserWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
    });
};

// متابعة حالة المستخدم
onAuthStateChanged(auth, (user) => {
    if (user) {
        screenAuth.classList.remove('active');
        screenApp.classList.add('active');
        
        let name = user.displayName || (user.email ? user.email.split('@')[0] : "مستخدم مجهول");
        document.getElementById('user-display-name').innerText = name;
        
        fullUid = user.uid; // حفظ الـ ID الكامل للاتصال الآمن
        
        // إظهار أول 6 رموز فقط للمستخدم عشان يكون مريح وشكله شيك وجاهز للنسخ
        const displayId = user.uid.substring(0, 6);
        const uidInput = document.getElementById('user-uid-input');
        uidInput.value = displayId;
        
        uidInput.onclick = () => {
            navigator.clipboard.writeText(displayId);
            alert("تم نسخ معرفك المصغر: " + displayId);
        };

        document.getElementById('user-avatar').innerText = name.charAt(0).toUpperCase();
    } else {
        screenAuth.classList.add('active');
        screenApp.classList.remove('active');
        inputFooterArea.style.display = 'none';
        chatMessages.innerHTML = '';
        if (unsubscribeChat) unsubscribeChat();
    }
});

document.getElementById('btn-logout').onclick = () => { signOut(auth); };

// ربط المحادثة فورا وبشكل مضمون
document.getElementById('btn-connect-room').onclick = () => {
    const targetInput = document.getElementById('target-identifier').value.trim();
    if(!targetInput || targetInput.length < 5) return alert("أدخل معرف صديقك بشكل صحيح!");
    
    // السيرفر هنا هيعمل دمج آمن ومستقر للغرفة
    const myShort = fullUid.substring(0, 6);
    if(myShort === targetInput) return alert("لا يمكنك ربط محادثة مع نفسك!");
    
    currentRoomId = [myShort, targetInput].sort().join("_");
    inputFooterArea.style.display = 'flex';
    
    const welcomeBox = document.getElementById('welcome-box');
    if (welcomeBox) welcomeBox.style.display = 'none';
    
    loadLiveMessages(currentRoomId);
};

// إرسال الرسائل
async function sendMessage() {
    const text = chatInput.value.trim();
    if (text && auth.currentUser && currentRoomId) {
        chatInput.value = '';
        await addDoc(collection(db, "whatsapp_verified_chats"), {
            roomId: currentRoomId,
            text: text,
            senderId: fullUid.substring(0, 6), // استخدام المعرف المصغر للتعرف على المرسل داخل الروم
            senderName: auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : "صديقك"),
            timestamp: new Date()
        });
    }
}

document.getElementById('btn-send-message').onclick = sendMessage;
chatInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };

// جلب وتحديث الرسائل لايف ومنع الوقوف
function loadLiveMessages(roomId) {
    if (unsubscribeChat) unsubscribeChat();
    const q = query(collection(db, "whatsapp_verified_chats"), where("roomId", "==", roomId), orderBy("timestamp", "asc"));
    
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isMe = data.senderId === fullUid.substring(0, 6);
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

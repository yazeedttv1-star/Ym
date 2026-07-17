import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const incomingCallBox = document.getElementById('incoming-call-box');
const callerIdLabel = document.getElementById('caller-id-label');
const btnStartCall = document.getElementById('btn-start-call');

let currentRoomId = null;
let unsubscribeChat = null;
let unsubscribeCalls = null;
let shortUid = ""; 
let friendShortId = ""; // حفظ الـ ID الخاص بالصديق الحالي
let currentCallRequestId = null;

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

// متابعة الجلسة
onAuthStateChanged(auth, (user) => {
    if (user) {
        screenAuth.classList.remove('active');
        screenApp.classList.add('active');
        
        let name = user.displayName || (user.email ? user.email.split('@')[0] : "مستخدم مجهول");
        document.getElementById('user-display-name').innerText = name;
        
        shortUid = user.uid.substring(0, 6);
        const uidInput = document.getElementById('user-uid-input');
        uidInput.value = shortUid;
        
        uidInput.onclick = () => {
            navigator.clipboard.writeText(shortUid);
            alert("تم نسخ معرفك: " + shortUid);
        };

        document.getElementById('user-avatar').innerText = name.charAt(0).toUpperCase();
        
        // تشغيل مراقبة طلبات المكالمات الواردة بالخلفية
        listenToCalls();
    } else {
        screenAuth.classList.add('active');
        screenApp.classList.remove('active');
        if (unsubscribeChat) unsubscribeChat();
        if (unsubscribeCalls) unsubscribeCalls();
    }
});

document.getElementById('btn-logout').onclick = () => { signOut(auth); };

// 1. فتح الدردشة فوراً وبشكل عادي قبل الاتصال
document.getElementById('btn-connect-room').onclick = () => {
    const targetInput = document.getElementById('target-identifier').value.trim();
    if(!targetInput || targetInput.length < 5) return alert("أدخل معرف صديقك الصحيح (6 رموز)!");
    if(shortUid === targetInput) return alert("لا يمكنك فتح شات مع نفسك!");
    
    friendShortId = targetInput;
    currentRoomId = [shortUid, targetInput].sort().join("_");
    
    // فتح الواجهة فوراً وعرض بار الإرسال
    document.getElementById('welcome-box').style.display = 'none';
    inputFooterArea.style.display = 'flex';
    btnStartCall.style.display = 'block'; // إظهار زر الاتصال في الأعلى
    
    loadLiveMessages(currentRoomId);
};

// 2. زر طلب اتصال لايف أثناء الدردشة
btnStartCall.onclick = async () => {
    if(!friendShortId) return;
    alert("جاري إرسال طلب اتصال لصديقك لايف... 📞");
    
    await addDoc(collection(db, "call_requests"), {
        senderId: shortUid,
        receiverId: friendShortId,
        status: "pending",
        timestamp: new Date()
    });
};

// 3. مراقبة المكالمات لايف في الخلفية
function listenToCalls() {
    if (unsubscribeCalls) unsubscribeCalls();
    
    const q = query(collection(db, "call_requests"), orderBy("timestamp", "desc"));
    
    unsubscribeCalls = onSnapshot(q, (snapshot) => {
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // استقبال مكالمة واردة
            if (data.receiverId === shortUid && data.status === "pending") {
                currentCallRequestId = docSnap.id;
                callerIdLabel.innerText = data.senderId;
                incomingCallBox.style.display = 'flex';
            }
            
            // رد المكالمة المقبولة للمتصل
            if (data.senderId === shortUid && data.status === "accepted") {
                alert("✅ صديقك وافق على طلب الاتصال الآن!");
                // هنا تقدر تفتح أي ميزة إضافية أو تسيبها إشعار نجاح
            }
            
            if (data.senderId === shortUid && data.status === "rejected") {
                alert("❌ تم رفض أو إغلاق طلب الاتصال.");
            }
        });
    });
}

// أزرار القبول والرفض للمكالمة الواردة
document.getElementById('btn-accept-call').onclick = async () => {
    if (currentCallRequestId) {
        await updateDoc(doc(db, "call_requests", currentCallRequestId), { status: "accepted" });
        incomingCallBox.style.display = 'none';
        alert("تم قبول الاتصال بنجاح! 📞");
    }
};

document.getElementById('btn-reject-call').onclick = async () => {
    if (currentCallRequestId) {
        await updateDoc(doc(db, "call_requests", currentCallRequestId), { status: "rejected" });
        incomingCallBox.style.display = 'none';
    }
};

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

document.getElementById('btn-send-message').onclick = sendMessage;
chatInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };

// تحديث الرسائل لايف
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

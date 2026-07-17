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

// عناصر إضافية للطلبات
const incomingRequestBox = document.getElementById('incoming-request-box');
const callerIdLabel = document.getElementById('caller-id-label');
const welcomeText = document.getElementById('welcome-text');

let currentRoomId = null;
let unsubscribeChat = null;
let unsubscribeRequests = null;
let shortUid = ""; 
let currentIncomingRequestId = null; // لحفظ الـ Request الشغال حالياً

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
        
        shortUid = user.uid.substring(0, 6); // الـ ID المصغر (6 رموز)
        const uidInput = document.getElementById('user-uid-input');
        uidInput.value = shortUid;
        
        uidInput.onclick = () => {
            navigator.clipboard.writeText(shortUid);
            alert("تم نسخ معرفك المصغر: " + shortUid);
        };

        document.getElementById('user-avatar').innerText = name.charAt(0).toUpperCase();
        
        // تشغيل مراقب طلبات الاتصال والردود فور تسجيل الدخول
        listenToRequests();
    } else {
        screenAuth.classList.add('active');
        screenApp.classList.remove('active');
        if (unsubscribeChat) unsubscribeChat();
        if (unsubscribeRequests) unsubscribeRequests();
    }
});

document.getElementById('btn-logout').onclick = () => { signOut(auth); };

// 1. إرسال طلب اتصال للطرف الآخر
document.getElementById('btn-connect-room').onclick = async () => {
    const targetInput = document.getElementById('target-identifier').value.trim();
    if(!targetInput || targetInput.length < 5) return alert("أدخل معرف صديقك (6 رموز) بشكل صحيح!");
    if(shortUid === targetInput) return alert("لا يمكنك الاتصال بنفسك!");
    
    welcomeText.innerText = "جاري إرسال طلب الاتصال وانتظار رد صديقك... ⏳";
    
    // رفع طلب اتصال على السيرفر
    await addDoc(collection(db, "chat_requests"), {
        senderId: shortUid,
        receiverId: targetInput,
        status: "pending", // معلق في انتظار الموافقة
        timestamp: new Date()
    });
};

// 2. مراقبة الطلبات (الواردة والصادرة) لايف
function listenToRequests() {
    if (unsubscribeRequests) unsubscribeRequests();
    
    // مراقبة أي طلب جاي لليوزر ده أو أي طلب هو بعته وتحدث
    const q = query(collection(db, "chat_requests"), orderBy("timestamp", "desc"));
    
    unsubscribeRequests = onSnapshot(q, (snapshot) => {
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // حالة أ: إذا كان هناك طلب "وارد" لي أنا من شخص آخر
            if (data.receiverId === shortUid && data.status === "pending") {
                currentIncomingRequestId = docSnap.id;
                callerIdLabel.innerText = data.senderId;
                incomingRequestBox.style.style.display = 'flex';
            }
            
            // حالة ب: إذا كنت أنا المرسل والطرف الآخر "وافق" (accepted)
            if (data.senderId === shortUid && data.status === "accepted") {
                currentRoomId = [data.senderId, data.receiverId].sort().join("_");
                document.getElementById('welcome-box').style.display = 'none';
                inputFooterArea.style.display = 'flex';
                loadLiveMessages(currentRoomId);
            }

            // حالة ج: إذا كنت أنا المرسل والطرف الآخر "رفض" (rejected)
            if (data.senderId === shortUid && data.status === "rejected") {
                welcomeText.innerText = "❌ للأسف، تم رفض طلب الاتصال الخاص بك من قبل الطرف الآخر.";
            }
        });
    });
}

// 3. أزرار القبول والرفض للطلب الوارد
document.getElementById('btn-accept-request').onclick = async () => {
    if (currentIncomingRequestId) {
        const reqRef = doc(db, "chat_requests", currentIncomingRequestId);
        await updateDoc(reqRef, { status: "accepted" }); // تحديث الحالة لمقبول
        incomingRequestBox.style.display = 'none';
        
        // فتح الشات فوراً عند المستقبل أيضاً
        const callerId = callerIdLabel.innerText;
        currentRoomId = [shortUid, callerId].sort().join("_");
        document.getElementById('welcome-box').style.display = 'none';
        inputFooterArea.style.display = 'flex';
        loadLiveMessages(currentRoomId);
    }
};

document.getElementById('btn-reject-request').onclick = async () => {
    if (currentIncomingRequestId) {
        const reqRef = doc(db, "chat_requests", currentIncomingRequestId);
        await updateDoc(reqRef, { status: "rejected" }); // تحديث الحالة لمرفوض
        incomingRequestBox.style.display = 'none';
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

// جلب وتحديث الرسائل لايف داخل الغرفة المقبولة
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

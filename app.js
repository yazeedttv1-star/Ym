import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, RecaptchaVerifier, signInWithPhoneNumber, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

let confirmationResult = null;
let currentRoomId = null;
let unsubscribeChat = null;

window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });

document.getElementById('btn-google-login').addEventListener('click', () => { signInWithPopup(auth, new GoogleAuthProvider()); });
document.getElementById('btn-anon-login').addEventListener('click', () => { signInAnonymously(auth); });

document.getElementById('btn-email-auth').addEventListener('click', () => {
    const email = document.getElementById('email-login').value.trim();
    const password = document.getElementById('password-login').value;
    if(!email || !password) return alert("املا البيانات!");
    signInWithEmailAndPassword(auth, email, password).catch(() => {
        createUserWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
    });
});

const btnPhoneAction = document.getElementById('btn-phone-action');
btnPhoneAction.addEventListener('click', () => {
    if (!confirmationResult) {
        let rawNumber = document.getElementById('phone-number').value.trim();
        if(rawNumber.startsWith('0')) rawNumber = rawNumber.substring(1);
        if(!rawNumber) return alert("اكتب رقم صح!");
        signInWithPhoneNumber(auth, "+20" + rawNumber, window.recaptchaVerifier)
            .then((res) => {
                confirmationResult = res;
                document.getElementById('phone-field-area').style.display = 'none';
                document.getElementById('otp-area').style.display = 'flex';
                btnPhoneAction.innerText = 'تأكيد الرمز';
            }).catch(err => alert(err.message));
    } else {
        confirmationResult.confirm(document.getElementById('verification-code').value.trim()).catch(err => alert(err.message));
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        screenAuth.classList.remove('active');
        screenApp.classList.add('active');
        let name = user.displayName || (user.email ? user.email.split('@')[0] : (user.phoneNumber ? user.phoneNumber : "مستخدم مجهول"));
        document.getElementById('user-display-name').innerText = name;
        document.getElementById('user-uid-input').value = user.uid;
        document.getElementById('user-avatar').innerText = name.charAt(0).toUpperCase();
    } else {
        screenAuth.classList.add('active');
        screenApp.classList.remove('active');
        confirmationResult = null;
        document.getElementById('phone-field-area').style.display = 'flex';
        document.getElementById('otp-area').style.display = 'none';
        btnPhoneAction.innerText = 'إرسال كود التحقق';
        if (unsubscribeChat) unsubscribeChat();
    }
});

document.getElementById('btn-logout').addEventListener('click', () => { signOut(auth); });

document.getElementById('btn-connect-room').addEventListener('click', () => {
    const myUid = auth.currentUser.uid;
    const targetUid = document.getElementById('target-identifier').value.trim();
    if(!targetUid || myUid === targetUid) return alert("ادخل الـ ID الخاص بصديقك صح!");
    currentRoomId = [myUid, targetUid].sort().join("_");
    inputFooterArea.style.display = 'flex';
    loadLiveMessages(currentRoomId);
});

async function sendMessage() {
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

document.getElementById('btn-send-message').addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });

function loadLiveMessages(roomId) {
    if (unsubscribeChat) unsubscribeChat();
    const q = query(collection(db, "whatsapp_verified_chats"), where("roomId", "==", roomId), orderBy("timestamp", "asc"));
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isMe = data.senderId === auth.currentUser.uid;
            const msgLine = document.createElement('div');
            msgLine.className = `msg-line ${isMe ? 'sent' : 'received'}`;
            let t = "الآن";
            if(data.timestamp) t = data.timestamp.toDate().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            msgLine.innerHTML = `<div class="bubble-wrap">${!isMe ? `<span class="b-sender">${data.senderName}</span>` : ''}<span class="b-text">${data.text}</span><span class="b-time">${t}</span></div>`;
            chatMessages.appendChild(msgLine);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

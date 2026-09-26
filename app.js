import { db, auth, storage } from './firebase-config.js';
import { ref as dbRef, push, set, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// --- العناصر البرمجية (DOM Elements) ---
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const messageInput = document.getElementById('message-input');
const voiceBtn = document.getElementById('voice-note-btn');
const sendBtn = document.getElementById('send-btn');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const messagesContainer = document.getElementById('messages-container');

// متغيرات التسجيل الصوتي
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// --- 1. تبديل المظهر (Dark / Light Theme) ---
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const icon = themeToggleBtn.querySelector('i');
    if (document.body.classList.contains('dark-theme')) {
        icon.className = 'fa-solid fa-moon';
    } else {
        icon.className = 'fa-solid fa-sun';
    }
});

// --- 2. التبديل بين زر الإرسال وزر الميكروفون ---
messageInput.addEventListener('input', () => {
    if (messageInput.value.trim().length > 0) {
        voiceBtn.classList.add('hidden');
        sendBtn.classList.remove('hidden');
    } else {
        voiceBtn.classList.remove('hidden');
        sendBtn.classList.add('hidden');
    }
});

// --- 3. التسجيل الصوتي المباشر (Voice Recording) ---
voiceBtn.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            // طلب إذن الوصول للميكروفون
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await uploadAndSendFile(audioBlob, 'audio');
            };

            mediaRecorder.start();
            isRecording = true;
            voiceBtn.style.color = 'red';
            voiceBtn.title = "انقر لإيقاف التسجيل وإرسال البصمة";
        } catch (err) {
            alert('تعذر الوصول إلى الميكروفون: ' + err.message);
        }
    } else {
        // إيقاف التسجيل
        mediaRecorder.stop();
        // إيقاف جميع مسارات الصوت
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        voiceBtn.style.color = '';
        voiceBtn.title = "تسجيل صوتي";
    }
});

// --- 4. إرفاق الملفات والصور (File Attachments) ---
attachBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
        const type = file.type.startsWith('image/') ? 'image' : 'file';
        await uploadAndSendFile(file, type);
    }
    fileInput.value = ''; // إعادة تعيين الحقل
});

// --- 5. رفع الملفات إلى Firebase Storage وإرسال الرسالة ---
async function uploadAndSendFile(fileOrBlob, type) {
    try {
        const fileName = `${Date.now()}_${type === 'audio' ? 'voice_note.webm' : fileOrBlob.name}`;
        const fileStorageRef = storageRef(storage, `uploads/${type}s/${fileName}`);
        
        // رفع الملف
        const snapshot = await uploadBytes(fileStorageRef, fileOrBlob);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // إرسال بياناقت الرسالة إلى Realtime Database
        await sendMessageToDB({
            type: type,
            mediaUrl: downloadURL,
            fileName: fileOrBlob.name || 'بصمة صوتية'
        });
    } catch (error) {
        console.error('حدث خطأ أثناء رفع الملف:', error);
    }
}

// --- 6. إرسال الرسائل النصية ---
sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (text.length > 0) {
        sendMessageToDB({
            type: 'text',
            content: text
        });
        messageInput.value = '';
        voiceBtn.classList.remove('hidden');
        sendBtn.classList.add('hidden');
    }
});

// --- 7. حفظ الرسالة في Firebase ---
async function sendMessageToDB(messageData) {
    const chatRef = dbRef(db, 'chats/global_chat/messages');
    const newMessageRef = push(chatRef);
    
    await set(newMessageRef, {
        sender: auth.currentUser ? auth.currentUser.uid : 'Anonymous',
        senderName: 'المستخدم',
        timestamp: serverTimestamp(),
        ...messageData
    });
}

// --- 8. استماع وعرض الرسائل لحظياً ---
const chatRef = dbRef(db, 'chats/global_chat/messages');
onValue(chatRef, (snapshot) => {
    const data = snapshot.val();
    messagesContainer.innerHTML = ''; // مسح المحتوى القديم

    if (data) {
        Object.values(data).forEach(msg => {
            renderMessage(msg);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});

// --- 9. رسم الرسالة في الواجهة (Render Message) ---
function renderMessage(msg) {
    const msgElement = document.createElement('div');
    msgElement.className = `message ${msg.sender === (auth.currentUser?.uid || 'Anonymous') ? 'sent' : 'received'}`;

    let contentHTML = '';
    if (msg.type === 'text') {
        contentHTML = `<p>${msg.content}</p>`;
    } else if (msg.type === 'image') {
        contentHTML = `<img src="${msg.mediaUrl}" alt="صورة مرفقة" style="max-width: 200px; border-radius: 8px;">`;
    } else if (msg.type === 'audio') {
        contentHTML = `<audio controls src="${msg.mediaUrl}"></audio>`;
    } else if (msg.type === 'file') {
        contentHTML = `<a href="${msg.mediaUrl}" target="_blank" download><i class="fa-solid fa-file"></i> ${msg.fileName}</a>`;
    }

    msgElement.innerHTML = `
        <div class="message-content">
            ${contentHTML}
            <span class="message-time">${msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
        </div>
    `;

    messagesContainer.appendChild(msgElement);
}
import { messaging } from './firebase-config.js';
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// طلب إذن الإشعارات وحفظ التوكن (Token)
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('تم منح إذن الإشعارات.');
            
            // استبدل المفتاح أدناه بـ VAPID Key الذي جلبته من Firebase
            const currentToken = await getToken(messaging, { 
                vapidKey: 'ضع_هنا_مفتاح_VAPID_الذي_نسخته_من_الفايبربيس' 
            });
            
            if (currentToken) {
                console.log('Notification Token:', currentToken);
                // يمكنك حفظ هذا التوكن في قاعدة البيانات لإرسال إشعارات لهذا المستخدم تحديداً
            } else {
                console.log('لم يتم الحصول على توكن الإشعارات.');
            }
        } else {
            console.log('تم رفض إذن الإشعارات.');
        }
    } catch (error) {
        console.error('حدث خطأ أثناء طلب إذن الإشعارات:', error);
    }
}

// تشغيل طلب الإذن عند تحميل التطبيق
requestNotificationPermission();

// استقبال الإشعارات عندما يكون التطبيق مفتوحاً (داخلية)
onMessage(messaging, (payload) => {
    console.log('إشعار داخلي واصل:', payload);
    
    // إظهار تنبيه داخلي أو صوت
    if (Notification.permission === 'granted') {
        new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/favicon.ico'
        });
    }
});

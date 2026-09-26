import { messaging, db, auth, storage } from './firebase-config.js';
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";
import { ref as dbRef, push, set, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// --- عناصر الواجهة (DOM Elements) ---
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

// --- 2. التبديل بين زر الإرسال والميكروفون ---
messageInput.addEventListener('input', () => {
    if (messageInput.value.trim().length > 0) {
        voiceBtn.classList.add('hidden');
        sendBtn.classList.remove('hidden');
    } else {
        voiceBtn.classList.remove('hidden');
        sendBtn.classList.add('hidden');
    }
});

// --- 3. إعداد وتفعيل إشعارات Push (FCM) ---
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const currentToken = await getToken(messaging, { 
                vapidKey: 'BF-CpPIlfbEG9KkCqX-yyy-EzHcIsKxuyP8rFyXFUsUYM26nhzSeHbyTAIf_ryLy94KmRJbTCXRuRGuaYnD5g3Q' 
            });
            if (currentToken) {
                console.log('FCM Token:', currentToken);
            }
        }
    } catch (error) {
        console.error('خطأ في تفعيل الإشعارات:', error);
    }
}
requestNotificationPermission();

// استقبال الإشعارات والتطبيق مفتوح
onMessage(messaging, (payload) => {
    if (Notification.permission === 'granted') {
        new Notification(payload.notification.title || 'رسالة جديدة', {
            body: payload.notification.body || 'لديك إشعار جديد',
            icon: '/favicon.ico'
        });
    }
});

// --- 4. التسجيل الصوتي المباشر ---
voiceBtn.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await uploadAndSendFile(audioBlob, 'audio');
            };

            mediaRecorder.start();
            isRecording = true;
            voiceBtn.style.color = 'red';
        } catch (err) {
            alert('تعذر الوصول للميكروفون: ' + err.message);
        }
    } else {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        voiceBtn.style.color = '';
    }
});

// --- 5. إرفاق الملفات والصور ---
attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
        const type = file.type.startsWith('image/') ? 'image' : 'file';
        await uploadAndSendFile(file, type);
    }
    fileInput.value = '';
});

// --- 6. رفع الملفات إلى Firebase Storage ---
async function uploadAndSendFile(fileOrBlob, type) {
    try {
        const fileName = `${Date.now()}_${type === 'audio' ? 'voice.webm' : fileOrBlob.name}`;
        const fileStorageRef = storageRef(storage, `uploads/${type}s/${fileName}`);
        
        const snapshot = await uploadBytes(fileStorageRef, fileOrBlob);
        const downloadURL = await getDownloadURL(snapshot.ref);

        await sendMessageToDB({
            type: type,
            mediaUrl: downloadURL,
            fileName: fileOrBlob.name || 'بصمة صوتية'
        });
    } catch (error) {
        console.error('خطأ في رفع الملف:', error);
    }
}

// --- 7. إرسال الرسائل النصية وقراءتها ---
sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (text.length > 0) {
        sendMessageToDB({ type: 'text', content: text });
        messageInput.value = '';
        voiceBtn.classList.remove('hidden');
        sendBtn.classList.add('hidden');
    }
});

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

// استماع الرسائل لحظياً
const chatRef = dbRef(db, 'chats/global_chat/messages');
onValue(chatRef, (snapshot) => {
    const data = snapshot.val();
    messagesContainer.innerHTML = '';
    if (data) {
        Object.values(data).forEach(msg => renderMessage(msg));
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});

function renderMessage(msg) {
    const msgElement = document.createElement('div');
    msgElement.className = `message ${msg.sender === (auth.currentUser?.uid || 'Anonymous') ? 'sent' : 'received'}`;

    let contentHTML = '';
    if (msg.type === 'text') contentHTML = `<p>${msg.content}</p>`;
    else if (msg.type === 'image') contentHTML = `<img src="${msg.mediaUrl}" style="max-width: 200px; border-radius: 8px;">`;
    else if (msg.type === 'audio') contentHTML = `<audio controls src="${msg.mediaUrl}"></audio>`;
    else if (msg.type === 'file') contentHTML = `<a href="${msg.mediaUrl}" target="_blank" download><i class="fa-solid fa-file"></i> ${msg.fileName}</a>`;

    msgElement.innerHTML = `
        <div class="message-content">
            ${contentHTML}
            <span class="message-time">${msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
        </div>
    `;
    messagesContainer.appendChild(msgElement);
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// إعدادات مشروع الفايربيس (Firebase) الخاصة بك
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

const screenAuth = document.getElementById('screen-auth');
const screenGame = document.getElementById('screen-game');
const screenVictory = document.getElementById('screen-victory');
const loveProgress = document.getElementById('love-progress');
const progressTextLabel = document.getElementById('progress-text-label');

let currentProgress = 20; // نسبة البداية

// تفعيل تسجيل الدخول بـ Google
document.getElementById('btn-google-login').onclick = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(err => alert("حدث خطأ أثناء تسجيل الدخول: " + err.message));
};

// تفعيل تسجيل الخروج
document.getElementById('btn-logout').onclick = () => {
    signOut(auth);
};

// تتبع حالة تسجيل الدخول وتبديل الشاشات لايف
onAuthStateChanged(auth, (user) => {
    if (user) {
        screenAuth.classList.add('hidden');
        screenGame.classList.remove('hidden');
        screenVictory.classList.add('hidden');
        document.getElementById('user-display-name').innerText = user.displayName;
    } else {
        screenAuth.classList.remove('hidden');
        screenGame.classList.add('hidden');
        screenVictory.classList.add('hidden');
        
        // إعادة تصفير اللعبة عند تسجيل الخروج
        currentProgress = 20;
        loveProgress.style.width = '20%';
        progressTextLabel.innerText = "نسبة الرضا: 20%";
    }
});

/* --- منطق وعمل اللعبة التفاعلي --- */
const btnYes = document.getElementById('btn-yes');
const btnNo = document.getElementById('btn-no');

// عند الضغط على زر الموافقة والمصالحة
btnYes.onclick = (e) => {
    if (currentProgress < 100) {
        currentProgress += 20; // زيادة العداد مع كل ضغطة
        loveProgress.style.width = currentProgress + '%';
        progressTextLabel.innerText = `نسبة الرضا: ${currentProgress}%`;
        
        // إطلاق قلوب متطايرة عند موضع الضغطة
        createHeart(e.clientX, e.clientY);

        // ألعاب نارية مصغرة مع كل ضغطة
        confetti({ particleCount: 40, spread: 40, origin: { y: 0.8 } });

        if (currentProgress >= 100) {
            // شاشة الفوز الكبرى والاعتذار النهائي بعد ثانية مصغرة
            setTimeout(() => {
                screenGame.classList.add('hidden');
                screenVictory.classList.remove('hidden');
                
                // احتفال ضخم ومستمر بالألعاب النارية لفترة
                let duration = 4 * 1000;
                let end = Date.now() + duration;

                (function frame() {
                    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
                    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
                    if (Date.now() < end) { requestAnimationFrame(frame); }
                }());
            }, 600);
        }
    }
};

// الزر المشاكس: الهروب عند محاولة الرفض
btnNo.onmouseover = moveNoButton;
btnNo.onclick = moveNoButton; // للموبايل عند اللمس والضغط

function moveNoButton() {
    // توليد أبعاد عشوائية في نطاق الشاشة لمنع اختفاء الزر تماماً
    const x = Math.random() * (window.innerWidth - btnNo.offsetWidth - 40);
    const y = Math.random() * (window.innerHeight - btnNo.offsetHeight - 40);
    
    btnNo.style.position = 'fixed';
    btnNo.style.left = x + 'px';
    btnNo.style.top = y + 'px';
    btnNo.style.zIndex = '9999';
}

// دالة إنشاء القلوب الطائرة اللطيفة
function createHeart(x, y) {
    const heart = document.createElement('i');
    heart.className = 'fas fa-heart floating-heart';
    heart.style.left = x + 'px';
    heart.style.top = y + 'px';
    
    const colors = ['#3b82f6', '#60a5fa', '#f43f5e', '#ec4899'];
    heart.style.color = colors[Math.floor(Math.random() * colors.length)];
    document.body.appendChild(heart);
    
    setTimeout(() => { heart.remove(); }, 1500);
}

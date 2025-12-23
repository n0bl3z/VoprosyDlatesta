// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC4p2FijyJfwhaaGx9UiNG2d3DzuSkLIVw",
    authDomain: "quiz-admin-fe871.firebaseapp.com",
    databaseURL: "https://quiz-admin-fe871-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "quiz-admin-fe871",
    storageBucket: "quiz-admin-fe871.firebasestorage.app",
    messagingSenderId: "348155303890",
    appId: "1:348155303890:web:cbc7a907486ec797129a0b",
    measurementId: "G-5SL3Y0C0YX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ============================================
// Presence Tracking — отслеживание пользователей
// ============================================

const FirebasePresence = {
    userRef: null,

    // Регистрация пользователя онлайн
    goOnline(userId, userName, screen = 'start') {
        this.userRef = database.ref('presence/' + userId);

        this.userRef.set({
            name: userName || 'Аноним',
            screen: screen,
            subject: 'hardware',
            question: 0,
            score: 0,
            lastSeen: Date.now(),
            userAgent: navigator.userAgent.substring(0, 50)
        });

        // Автоматически удалять при отключении
        this.userRef.onDisconnect().remove();

        console.log('🔥 Firebase: user online');
    },

    // Обновить статус пользователя
    updateStatus(data) {
        if (this.userRef) {
            this.userRef.update({
                ...data,
                lastSeen: Date.now()
            });
        }
    },

    // Выход
    goOffline() {
        if (this.userRef) {
            this.userRef.remove();
            console.log('🔥 Firebase: user offline');
        }
    },

    // Слушать входящие команды от админа
    listenForCommands(userId, callback) {
        const commandRef = database.ref('commands/' + userId);
        commandRef.on('value', (snapshot) => {
            const command = snapshot.val();
            if (command) {
                callback(command);
                // Удалить команду после выполнения
                commandRef.remove();
            }
        });
    }
};

// ============================================
// Alert System — Обработка команд от админа
// ============================================

const AlertSystem = {
    init(userId) {
        FirebasePresence.listenForCommands(userId, (command) => {
            console.log('📢 Received command:', command);
            this.executeCommand(command);
        });
    },

    executeCommand(command) {
        switch (command.type) {
            case 'alert':
                alert(command.message || '📢 Сообщение от админа!');
                break;

            case 'rainbow':
                this.applyRainbowEffect();
                break;

            case 'flip':
                document.body.style.transform = 'rotate(180deg)';
                setTimeout(() => {
                    document.body.style.transform = '';
                }, 5000);
                break;

            case 'shake':
                document.body.classList.add('shake-effect');
                setTimeout(() => {
                    document.body.classList.remove('shake-effect');
                }, 2000);
                break;

            case 'jumpscare':
                this.showJumpscare(command.imageUrl);
                break;

            case 'fake_error':
                alert('⚠️ ОШИБКА: Ваш тест был аннулирован из-за подозрительной активности. Обратитесь в деканат.');
                break;

            case 'confetti':
                this.showConfetti();
                break;

            default:
                console.warn('Unknown command:', command.type);
        }
    },

    applyRainbowEffect() {
        const style = document.createElement('style');
        style.id = 'rainbow-effect';
        style.textContent = `
      body {
        animation: rainbow-bg 2s linear infinite !important;
      }
      @keyframes rainbow-bg {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
    `;
        document.head.appendChild(style);

        setTimeout(() => {
            const el = document.getElementById('rainbow-effect');
            if (el) el.remove();
        }, 5000);
    },

    showJumpscare(imageUrl) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: black url('${imageUrl || 'https://i.imgur.com/JtGWIad.gif'}') center/cover !important;
      z-index: 999999 !important;
    `;
        document.body.appendChild(overlay);

        setTimeout(() => overlay.remove(), 2000);
    },

    showConfetti() {
        // Простое конфетти из эмодзи
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.textContent = ['🎉', '🎊', '✨', '🌟', '💫'][Math.floor(Math.random() * 5)];
            confetti.style.cssText = `
        position: fixed;
        top: -20px;
        left: ${Math.random() * 100}vw;
        font-size: 24px;
        z-index: 9999;
        animation: fall ${2 + Math.random() * 3}s linear forwards;
      `;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }

        // CSS для анимации
        if (!document.getElementById('confetti-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-style';
            style.textContent = `
        @keyframes fall {
          to { top: 100vh; transform: rotate(720deg); }
        }
      `;
            document.head.appendChild(style);
        }
    }
};

// CSS для shake эффекта
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  .shake-effect {
    animation: shake 0.1s linear infinite;
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;
document.head.appendChild(shakeStyle);

console.log('🔥 Firebase config loaded');

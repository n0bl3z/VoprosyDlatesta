/**
 * Приложение теста для самооценивания
 * Выбирает 40 случайных вопросов и подсчитывает баллы
 * Поддержка вопросов с несколькими правильными ответами
 * Отправка результатов в Discord
 */

// ============================================
// Константы и состояние
// ============================================

const QUESTIONS_PER_TEST = 40;
const TIMER_MINUTES = 45;

// Discord Webhook URL — замените на свой
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1448693442514386994/fyU-avlQmlWIUOAMTb0VJt-Rg3hg9sLbogA6fPMNIcpyfwhKblps_IDn5Ri2sBVxvVk0';

const state = {
  questions: [],
  currentIndex: 0,
  score: 0,
  answered: false,
  selectedAnswers: [],
  isMultiAnswer: false,
  timeRemaining: 0,
  timerInterval: null,
  userName: null,
  userId: null,
  isChangingName: false
};

// Генерация уникального ID пользователя
function generateUserId() {
  return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
}

// ============================================
// DOM-элементы
// ============================================

const elements = {
  startScreen: document.getElementById('start-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  resultsScreen: document.getElementById('results-screen'),
  startBtn: document.getElementById('start-btn'),
  currentQuestion: document.getElementById('current-question'),
  totalQuestions: document.getElementById('total-questions'),
  currentScore: document.getElementById('current-score'),
  timer: document.getElementById('timer'),
  timerDisplay: null,
  progressFill: document.getElementById('progress-fill'),
  questionText: document.getElementById('question-text'),
  answersContainer: document.getElementById('answers-container'),
  multiHint: document.getElementById('multi-hint'),
  confirmBtn: document.getElementById('confirm-btn'),
  feedback: document.getElementById('feedback'),
  nextBtn: document.getElementById('next-btn'),
  resultsIcon: document.getElementById('results-icon'),
  finalScore: document.getElementById('final-score'),
  resultsMessage: document.getElementById('results-message'),
  correctCount: document.getElementById('correct-count'),
  wrongCount: document.getElementById('wrong-count'),
  percentage: document.getElementById('percentage'),
  restartBtn: document.getElementById('restart-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  // Новые элементы для имени
  nameModal: document.getElementById('name-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalDescription: document.getElementById('modal-description'),
  nameInput: document.getElementById('name-input'),
  saveNameBtn: document.getElementById('save-name-btn'),
  changeNameBtn: document.getElementById('change-name-btn'),
  userNameDisplay: document.getElementById('user-name-display')
};

// ============================================
// Управление именем пользователя
// ============================================

function loadUserData() {
  const savedName = localStorage.getItem('userName');
  const savedId = localStorage.getItem('userId');

  // Если нет ID — генерируем новый
  if (!savedId) {
    state.userId = generateUserId();
    localStorage.setItem('userId', state.userId);
  } else {
    state.userId = savedId;
  }

  if (savedName) {
    state.userName = savedName;
    updateNameDisplay();
    return true;
  }
  return false;
}

function updateNameDisplay() {
  if (state.userName) {
    elements.userNameDisplay.textContent = state.userName;
  } else {
    elements.userNameDisplay.textContent = 'Гость';
  }
}

function showNameModal(isChanging = false) {
  state.isChangingName = isChanging;

  if (isChanging) {
    elements.modalTitle.textContent = 'Сменить имя';
    elements.modalDescription.textContent = 'Введите новое имя';
    elements.nameInput.value = state.userName || '';
  } else {
    elements.modalTitle.textContent = 'Как вас зовут?';
    elements.modalDescription.textContent = 'Введите ваше имя для отслеживания результатов';
    elements.nameInput.value = '';
  }

  elements.nameModal.classList.remove('hidden');
  elements.nameInput.focus();
}

function hideNameModal() {
  elements.nameModal.classList.add('hidden');
}

function saveName() {
  const newName = elements.nameInput.value.trim();

  if (!newName) {
    elements.nameInput.style.borderColor = 'var(--color-error)';
    return;
  }

  const oldName = state.userName;
  const isNewUser = !oldName && !state.isChangingName;

  state.userName = newName;
  localStorage.setItem('userName', newName);
  updateNameDisplay();
  hideNameModal();

  // Если новый пользователь — отправляем приветствие
  if (isNewUser) {
    sendNewUserToDiscord(newName);
  }
  // Если меняем имя — отправляем в Discord
  else if (state.isChangingName && oldName && oldName !== newName) {
    sendNameChangeToDiscord(oldName, newName);
  }
}

// ============================================
// Discord Webhook
// ============================================

async function sendToDiscord(payload) {
  // Используем CORS-прокси для обхода блокировки Discord
  // Варианты прокси (если один не работает, попробуйте другой):
  const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/'
  ];

  const proxyUrl = CORS_PROXIES[0] + encodeURIComponent(DISCORD_WEBHOOK_URL);

  try {
    await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Результаты отправлены в Discord');
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
    // Пробуем альтернативный прокси
    try {
      const altProxyUrl = CORS_PROXIES[1] + encodeURIComponent(DISCORD_WEBHOOK_URL);
      await fetch(altProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Результаты отправлены через альтернативный прокси');
    } catch (e) {
      console.error('Все прокси недоступны:', e);
    }
  }
}

function sendResultsToDiscord(score, correct, wrong, percent) {
  // Определяем цвет embed по результату
  let color;
  if (percent >= 90) color = 0x22c55e; // зелёный
  else if (percent >= 70) color = 0x3b82f6; // синий
  else if (percent >= 50) color = 0xf59e0b; // жёлтый
  else color = 0xef4444; // красный

  const payload = {
    embeds: [{
      title: '📝 Результат теста',
      color: color,
      fields: [
        { name: '👤 Пользователь', value: state.userName || 'Аноним', inline: true },
        { name: '� ID', value: `\`${state.userId}\``, inline: true },
        { name: '🏆 Баллы', value: `${score}/100`, inline: true },
        { name: '✅ Правильных', value: `${correct}`, inline: true },
        { name: '❌ Неправильных', value: `${wrong}`, inline: true },
        { name: '📊 Процент', value: `${percent}%`, inline: true },
        { name: '📅 Дата', value: new Date().toLocaleString('ru-RU'), inline: false }
      ],
      footer: { text: 'Тест для самооценивания v0.2' }
    }]
  };

  sendToDiscord(payload);
}

function sendNameChangeToDiscord(oldName, newName) {
  const payload = {
    embeds: [{
      title: '✏️ Смена имени',
      color: 0x8b5cf6, // фиолетовый
      fields: [
        { name: '🆔 ID', value: `\`${state.userId}\``, inline: false },
        { name: '📛 Старое имя', value: oldName, inline: true },
        { name: '➡️ Новое имя', value: newName, inline: true },
        { name: '📅 Дата', value: new Date().toLocaleString('ru-RU'), inline: false }
      ],
      footer: { text: 'Тест для самооценивания v0.2' }
    }]
  };

  sendToDiscord(payload);
}

function sendNewUserToDiscord(userName) {
  const payload = {
    embeds: [{
      title: '🎉 Новый пользователь!',
      color: 0x10b981, // зелёный изумрудный
      description: `Добро пожаловать в тест!`,
      fields: [
        { name: '👤 Имя', value: userName, inline: true },
        { name: '🆔 ID', value: `\`${state.userId}\``, inline: true },
        { name: '📅 Дата регистрации', value: new Date().toLocaleString('ru-RU'), inline: false }
      ],
      footer: { text: 'Тест для самооценивания v0.2' }
    }]
  };

  sendToDiscord(payload);
}

// ============================================
// Переключение темы
// ============================================

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
}

// ============================================
// Таймер
// ============================================

function startTimer() {
  state.timeRemaining = TIMER_MINUTES * 60;
  elements.timerDisplay = elements.timer.parentElement;
  updateTimerDisplay();

  state.timerInterval = setInterval(() => {
    state.timeRemaining--;
    updateTimerDisplay();

    if (state.timeRemaining <= 0) {
      clearInterval(state.timerInterval);
      timeUp();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(state.timeRemaining / 60);
  const seconds = state.timeRemaining % 60;
  elements.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  if (elements.timerDisplay) {
    elements.timerDisplay.classList.remove('warning', 'danger');

    if (state.timeRemaining <= 60) {
      elements.timerDisplay.classList.add('danger');
    } else if (state.timeRemaining <= 300) {
      elements.timerDisplay.classList.add('warning');
    }
  }
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function timeUp() {
  stopTimer();
  showResults();
}

// ============================================
// Утилиты
// ============================================

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomItems(array, n) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function showScreen(screenName) {
  elements.startScreen.classList.remove('active');
  elements.quizScreen.classList.remove('active');
  elements.resultsScreen.classList.remove('active');

  switch (screenName) {
    case 'start':
      elements.startScreen.classList.add('active');
      break;
    case 'quiz':
      elements.quizScreen.classList.add('active');
      break;
    case 'results':
      elements.resultsScreen.classList.add('active');
      break;
  }
}

function isMultiAnswerQuestion(question) {
  const correctCount = question.answers.filter(a => a.isCorrect).length;
  return correctCount > 1;
}

// ============================================
// Логика теста
// ============================================

function initQuiz() {
  state.questions = getRandomItems(allQuestions, QUESTIONS_PER_TEST);
  state.currentIndex = 0;
  state.score = 0;
  state.answered = false;
  state.selectedAnswers = [];
  state.isMultiAnswer = false;

  elements.totalQuestions.textContent = state.questions.length;
  elements.currentScore.textContent = '0';

  showScreen('quiz');
  startTimer();
  renderQuestion();
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  if (!question) return;

  state.isMultiAnswer = isMultiAnswerQuestion(question);
  state.selectedAnswers = [];
  state.answered = false;

  const progress = ((state.currentIndex) / state.questions.length) * 100;
  elements.currentQuestion.textContent = state.currentIndex + 1;
  elements.progressFill.style.width = `${progress}%`;
  elements.questionText.textContent = question.question;

  if (state.isMultiAnswer) {
    elements.multiHint.classList.remove('hidden');
    elements.confirmBtn.classList.remove('hidden');
    elements.confirmBtn.disabled = true;
  } else {
    elements.multiHint.classList.add('hidden');
    elements.confirmBtn.classList.add('hidden');
  }

  elements.answersContainer.innerHTML = '';
  const shuffledAnswers = shuffleArray(question.answers);

  shuffledAnswers.forEach((answer, index) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.dataset.correct = answer.isCorrect ? 'true' : 'false';
    btn.dataset.index = index;

    const letter = String.fromCharCode(65 + index);

    btn.innerHTML = `
      <span class="answer-letter">${letter}</span>
      <span class="answer-text">${answer.text}</span>
    `;

    btn.addEventListener('click', () => handleAnswerClick(btn, answer, index));
    elements.answersContainer.appendChild(btn);
  });

  elements.feedback.classList.add('hidden');
  elements.feedback.className = 'feedback hidden';
  elements.nextBtn.disabled = true;

  if (state.currentIndex === state.questions.length - 1) {
    elements.nextBtn.textContent = 'Завершить тест';
  } else {
    elements.nextBtn.textContent = 'Следующий вопрос';
  }
}

function handleAnswerClick(btn, answer, index) {
  if (state.answered) return;

  if (state.isMultiAnswer) {
    handleMultiAnswerClick(btn, answer, index);
  } else {
    handleSingleAnswerClick(btn, answer);
  }
}

function handleSingleAnswerClick(btn, answer) {
  state.answered = true;

  const allButtons = elements.answersContainer.querySelectorAll('.answer-btn');
  allButtons.forEach(b => b.disabled = true);

  allButtons.forEach(b => {
    if (b.dataset.correct === 'true') {
      b.classList.add('correct');
    }
  });

  if (answer.isCorrect) {
    state.score++;
    elements.currentScore.textContent = state.score;
    showFeedback(true, 'Правильно!');
  } else {
    btn.classList.add('wrong');
    showFeedback(false, 'Неправильно');
  }

  elements.nextBtn.disabled = false;
}

function handleMultiAnswerClick(btn, answer, index) {
  const selectedIndex = state.selectedAnswers.findIndex(a => a.index === index);

  if (selectedIndex > -1) {
    state.selectedAnswers.splice(selectedIndex, 1);
    btn.classList.remove('selected');
  } else {
    state.selectedAnswers.push({ index, answer, btn });
    btn.classList.add('selected');
  }

  elements.confirmBtn.disabled = state.selectedAnswers.length === 0;
}

function confirmMultiAnswer() {
  if (state.answered || state.selectedAnswers.length === 0) return;

  state.answered = true;

  const allButtons = elements.answersContainer.querySelectorAll('.answer-btn');
  allButtons.forEach(b => b.disabled = true);
  elements.confirmBtn.disabled = true;

  const correctAnswers = [];
  allButtons.forEach(b => {
    if (b.dataset.correct === 'true') {
      b.classList.add('correct');
      correctAnswers.push(b);
    }
  });

  const selectedCorrect = state.selectedAnswers.filter(a => a.answer.isCorrect);
  const selectedWrong = state.selectedAnswers.filter(a => !a.answer.isCorrect);

  selectedWrong.forEach(a => {
    a.btn.classList.remove('selected');
    a.btn.classList.add('wrong');
  });

  const isFullyCorrect =
    selectedCorrect.length === correctAnswers.length &&
    selectedWrong.length === 0;

  if (isFullyCorrect) {
    state.score++;
    elements.currentScore.textContent = state.score;
    showFeedback(true, 'Правильно! Все ответы верны.');
  } else if (selectedCorrect.length > 0 && selectedWrong.length === 0) {
    showFeedback(false, `Частично верно. Вы выбрали ${selectedCorrect.length} из ${correctAnswers.length} правильных.`);
  } else {
    showFeedback(false, 'Неправильно');
  }

  elements.nextBtn.disabled = false;
}

function showFeedback(isCorrect, message) {
  elements.feedback.classList.remove('hidden', 'correct', 'wrong');
  elements.feedback.classList.add(isCorrect ? 'correct' : 'wrong');

  const icon = isCorrect
    ? `<svg class="feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <path d="M20 6L9 17l-5-5"/>
       </svg>`
    : `<svg class="feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <circle cx="12" cy="12" r="10"/>
         <path d="M15 9l-6 6M9 9l6 6"/>
       </svg>`;

  elements.feedback.innerHTML = icon + message;
}

function goToNext() {
  state.currentIndex++;

  if (state.currentIndex >= state.questions.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function showResults() {
  stopTimer();
  showScreen('results');

  const total = state.questions.length;
  const correct = state.score;
  const wrong = total - correct;
  const percent = Math.round((correct / total) * 100);
  const score100 = Math.round((correct / total) * 100);

  elements.finalScore.textContent = score100;
  elements.correctCount.textContent = correct;
  elements.wrongCount.textContent = wrong;
  elements.percentage.textContent = `${percent}%`;

  let iconClass, emoji, message;

  if (percent >= 90) {
    iconClass = 'excellent';
    emoji = '🏆';
    message = 'Красавчик бро не сомнивался в тебе';
  } else if (percent >= 70) {
    iconClass = 'good';
    emoji = '👍';
    message = 'Хорошо бро';
  } else if (percent >= 50) {
    iconClass = 'average';
    emoji = '📚';
    message = 'Ну бро чет мало';
  } else {
    iconClass = 'poor';
    emoji = '💪';
    message = 'Ебать лашок';
  }

  elements.resultsIcon.className = `results-icon ${iconClass}`;
  elements.resultsIcon.textContent = emoji;
  elements.resultsMessage.textContent = message;

  // Отправляем результаты в Discord
  sendResultsToDiscord(score100, correct, wrong, percent);
}

// ============================================
// Обработчики событий
// ============================================

elements.startBtn.addEventListener('click', initQuiz);
elements.nextBtn.addEventListener('click', goToNext);
elements.restartBtn.addEventListener('click', initQuiz);
elements.themeToggle.addEventListener('click', toggleTheme);
elements.confirmBtn.addEventListener('click', confirmMultiAnswer);

// События для работы с именем
elements.changeNameBtn.addEventListener('click', () => showNameModal(true));
elements.saveNameBtn.addEventListener('click', saveName);
elements.nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveName();
});
elements.nameInput.addEventListener('input', () => {
  elements.nameInput.style.borderColor = 'var(--color-border)';
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Проверяем данные пользователя (имя и ID)
  if (!loadUserData()) {
    // Если имени нет — показываем модалку
    showNameModal(false);
  }

  if (typeof allQuestions === 'undefined' || allQuestions.length === 0) {
    elements.startBtn.disabled = true;
    elements.startBtn.textContent = 'Ошибка загрузки вопросов';
    console.error('Вопросы не загружены. Проверьте файл questions.js');
  }
});

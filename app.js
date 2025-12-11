/**
 * Приложение теста для самооценивания
 * Выбирает 40 случайных вопросов и подсчитывает баллы
 * Поддержка вопросов с несколькими правильными ответами
 */

// ============================================
// Константы и состояние
// ============================================

const QUESTIONS_PER_TEST = 40;

const state = {
  questions: [],           // Текущие 40 вопросов для теста
  currentIndex: 0,         // Индекс текущего вопроса
  score: 0,                // Набранные баллы
  answered: false,         // Флаг: ответ дан на текущий вопрос
  selectedAnswers: [],     // Выбранные ответы (для мультиответов)
  isMultiAnswer: false     // Флаг: текущий вопрос с несколькими ответами
};

// ============================================
// DOM-элементы
// ============================================

const elements = {
  // Экраны
  startScreen: document.getElementById('start-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  resultsScreen: document.getElementById('results-screen'),

  // Стартовый экран
  startBtn: document.getElementById('start-btn'),

  // Экран теста
  currentQuestion: document.getElementById('current-question'),
  totalQuestions: document.getElementById('total-questions'),
  currentScore: document.getElementById('current-score'),
  progressFill: document.getElementById('progress-fill'),
  questionText: document.getElementById('question-text'),
  answersContainer: document.getElementById('answers-container'),
  multiHint: document.getElementById('multi-hint'),
  confirmBtn: document.getElementById('confirm-btn'),
  feedback: document.getElementById('feedback'),
  nextBtn: document.getElementById('next-btn'),

  // Экран результатов
  resultsIcon: document.getElementById('results-icon'),
  finalScore: document.getElementById('final-score'),
  resultsMessage: document.getElementById('results-message'),
  correctCount: document.getElementById('correct-count'),
  wrongCount: document.getElementById('wrong-count'),
  percentage: document.getElementById('percentage'),
  restartBtn: document.getElementById('restart-btn'),

  // Тема
  themeToggle: document.getElementById('theme-toggle')
};

// ============================================
// Переключение темы
// ============================================

function initTheme() {
  // Проверяем сохранённую тему или системные настройки
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
// Утилиты
// ============================================

/**
 * Перемешивает массив методом Фишера-Йейтса
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Выбирает N случайных элементов из массива
 */
function getRandomItems(array, n) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

/**
 * Переключает видимость экранов
 */
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

/**
 * Проверяет, является ли вопрос мультиответным
 */
function isMultiAnswerQuestion(question) {
  const correctCount = question.answers.filter(a => a.isCorrect).length;
  return correctCount > 1;
}

// ============================================
// Логика теста
// ============================================

/**
 * Инициализирует новый тест
 */
function initQuiz() {
  // Сбрасываем состояние
  state.questions = getRandomItems(allQuestions, QUESTIONS_PER_TEST);
  state.currentIndex = 0;
  state.score = 0;
  state.answered = false;
  state.selectedAnswers = [];
  state.isMultiAnswer = false;

  // Обновляем UI
  elements.totalQuestions.textContent = state.questions.length;
  elements.currentScore.textContent = '0';

  // Показываем экран теста и первый вопрос
  showScreen('quiz');
  renderQuestion();
}

/**
 * Отображает текущий вопрос
 */
function renderQuestion() {
  const question = state.questions[state.currentIndex];
  if (!question) return;

  // Определяем тип вопроса
  state.isMultiAnswer = isMultiAnswerQuestion(question);
  state.selectedAnswers = [];
  state.answered = false;

  // Обновляем прогресс
  const progress = ((state.currentIndex) / state.questions.length) * 100;
  elements.currentQuestion.textContent = state.currentIndex + 1;
  elements.progressFill.style.width = `${progress}%`;

  // Отображаем текст вопроса
  elements.questionText.textContent = question.question;

  // Показываем/скрываем подсказку для мультиответов
  if (state.isMultiAnswer) {
    elements.multiHint.classList.remove('hidden');
    elements.confirmBtn.classList.remove('hidden');
    elements.confirmBtn.disabled = true;
  } else {
    elements.multiHint.classList.add('hidden');
    elements.confirmBtn.classList.add('hidden');
  }

  // Очищаем и перемешиваем ответы
  elements.answersContainer.innerHTML = '';
  const shuffledAnswers = shuffleArray(question.answers);

  // Создаём кнопки ответов
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

  // Сбрасываем UI
  elements.feedback.classList.add('hidden');
  elements.feedback.className = 'feedback hidden';
  elements.nextBtn.disabled = true;

  // Обновляем текст кнопки
  if (state.currentIndex === state.questions.length - 1) {
    elements.nextBtn.textContent = 'Завершить тест';
  } else {
    elements.nextBtn.textContent = 'Следующий вопрос';
  }
}

/**
 * Обрабатывает клик по ответу
 */
function handleAnswerClick(btn, answer, index) {
  // Игнорируем если уже ответили
  if (state.answered) return;

  if (state.isMultiAnswer) {
    // Режим множественного выбора
    handleMultiAnswerClick(btn, answer, index);
  } else {
    // Режим одиночного выбора
    handleSingleAnswerClick(btn, answer);
  }
}

/**
 * Обработка одиночного ответа
 */
function handleSingleAnswerClick(btn, answer) {
  state.answered = true;

  // Блокируем все кнопки
  const allButtons = elements.answersContainer.querySelectorAll('.answer-btn');
  allButtons.forEach(b => b.disabled = true);

  // Подсвечиваем правильный ответ
  allButtons.forEach(b => {
    if (b.dataset.correct === 'true') {
      b.classList.add('correct');
    }
  });

  // Проверяем ответ
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

/**
 * Обработка мультиответа — выбор
 */
function handleMultiAnswerClick(btn, answer, index) {
  const selectedIndex = state.selectedAnswers.findIndex(a => a.index === index);

  if (selectedIndex > -1) {
    // Снимаем выбор
    state.selectedAnswers.splice(selectedIndex, 1);
    btn.classList.remove('selected');
  } else {
    // Добавляем выбор
    state.selectedAnswers.push({ index, answer, btn });
    btn.classList.add('selected');
  }

  // Активируем кнопку подтверждения если есть выбранные ответы
  elements.confirmBtn.disabled = state.selectedAnswers.length === 0;
}

/**
 * Подтверждение мультиответа
 */
function confirmMultiAnswer() {
  if (state.answered || state.selectedAnswers.length === 0) return;

  state.answered = true;

  // Блокируем все кнопки
  const allButtons = elements.answersContainer.querySelectorAll('.answer-btn');
  allButtons.forEach(b => b.disabled = true);
  elements.confirmBtn.disabled = true;

  // Находим все правильные ответы
  const correctAnswers = [];
  allButtons.forEach(b => {
    if (b.dataset.correct === 'true') {
      b.classList.add('correct');
      correctAnswers.push(b);
    }
  });

  // Проверяем выбранные ответы
  const selectedCorrect = state.selectedAnswers.filter(a => a.answer.isCorrect);
  const selectedWrong = state.selectedAnswers.filter(a => !a.answer.isCorrect);

  // Подсвечиваем неправильные выбранные
  selectedWrong.forEach(a => {
    a.btn.classList.remove('selected');
    a.btn.classList.add('wrong');
  });

  // Проверяем: все правильные выбраны И нет неправильных
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

/**
 * Показывает обратную связь после ответа
 */
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

/**
 * Переходит к следующему вопросу или показывает результаты
 */
function goToNext() {
  state.currentIndex++;

  if (state.currentIndex >= state.questions.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

/**
 * Показывает экран результатов
 */
function showResults() {
  showScreen('results');

  const total = state.questions.length;
  const correct = state.score;
  const wrong = total - correct;
  const percent = Math.round((correct / total) * 100);

  // Рассчитываем балл в 100-бальной системе
  const score100 = Math.round((correct / total) * 100);

  // Заполняем данные
  elements.finalScore.textContent = score100;
  elements.correctCount.textContent = correct;
  elements.wrongCount.textContent = wrong;
  elements.percentage.textContent = `${percent}%`;

  // Определяем категорию результата
  let iconClass, emoji, message;

  if (percent >= 90) {
    iconClass = 'excellent';
    emoji = '🏆';
    message = 'Отличный результат! Вы прекрасно знаете материал.';
  } else if (percent >= 70) {
    iconClass = 'good';
    emoji = '👍';
    message = 'Хороший результат! Есть над чем поработать.';
  } else if (percent >= 50) {
    iconClass = 'average';
    emoji = '📚';
    message = 'Удовлетворительно. Рекомендуем повторить материал.';
  } else {
    iconClass = 'poor';
    emoji = '💪';
    message = 'Нужно подтянуть знания. Не сдавайтесь!';
  }

  elements.resultsIcon.className = `results-icon ${iconClass}`;
  elements.resultsIcon.textContent = emoji;
  elements.resultsMessage.textContent = message;
}

// ============================================
// Обработчики событий
// ============================================

elements.startBtn.addEventListener('click', initQuiz);
elements.nextBtn.addEventListener('click', goToNext);
elements.restartBtn.addEventListener('click', initQuiz);
elements.themeToggle.addEventListener('click', toggleTheme);
elements.confirmBtn.addEventListener('click', confirmMultiAnswer);

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  // Инициализируем тему
  initTheme();

  // Проверяем, загружены ли вопросы
  if (typeof allQuestions === 'undefined' || allQuestions.length === 0) {
    elements.startBtn.disabled = true;
    elements.startBtn.textContent = 'Ошибка загрузки вопросов';
    console.error('Вопросы не загружены. Проверьте файл questions.js');
  }
});

import './styles.css';
import JSConfetti from 'js-confetti';
import questionData from './questions.json';
import { applyAnswer, createState, type QuizState, type Tier } from './engine';

type Question = {
  id: string;
  difficulty: Tier;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
};

const QUESTIONS = questionData as Question[];
const LETTERS = ['A', 'B', 'C', 'D'];

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const catalog: Record<Tier, Question[]> = { easy: [], medium: [], hard: [] };
for (const question of QUESTIONS) catalog[question.difficulty].push(question);

const bags: Record<Tier, Question[]> = {
  easy: shuffle(catalog.easy),
  medium: shuffle(catalog.medium),
  hard: shuffle(catalog.hard),
};

function draw(tier: Tier): Question {
  if (bags[tier].length === 0) bags[tier] = shuffle(catalog[tier]);
  return bags[tier].pop()!;
}

const badge = document.querySelector<HTMLElement>('#tierBadge')!;
const dotsLabel = document.querySelector<HTMLElement>('#dotsLabel')!;
const dots = document.querySelector<HTMLElement>('#dots')!;
const hardDots = document.querySelector<HTMLElement>('#hardDots')!;
const score = document.querySelector<HTMLElement>('#score')!;
const questionLabel = document.querySelector<HTMLElement>('#questionLabel')!;
const questionTier = document.querySelector<HTMLElement>('#questionTier')!;
const questionText = document.querySelector<HTMLElement>('#questionText')!;
const optionsEl = document.querySelector<HTMLElement>('#options')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const skipButton = document.querySelector<HTMLButtonElement>('#skip')!;

const confetti = new JSConfetti();

let state: QuizState = createState();
let current: Question = draw(state.tier);
let revealing = false;
let served = 0;

function dotsMarkup(): string {
  if (state.mediumLocked) {
    return Array.from({ length: 4 }, (_, index) =>
      `<span class="dot" data-tone="redemption" data-on="${index < state.redemptionStreak}"></span>`,
    ).join('');
  }
  return Array.from({ length: 3 }, (_, index) =>
    `<span class="dot" data-on="${index < state.easyStreak}"></span>`,
  ).join('');
}

function hardDotsMarkup(): string {
  return Array.from({ length: 2 }, (_, index) =>
    `<span class="dot" data-tone="hard" data-on="${index < state.hardCharge}"></span>`,
  ).join('');
}

function renderHud() {
  const locked = state.mediumLocked && state.tier === 'easy';
  badge.dataset.tier = locked ? 'locked' : state.tier;
  badge.textContent = locked ? 'Locked' : state.tier;

  dotsLabel.textContent = locked ? `Redemption ${state.redemptionStreak}/4` : 'Easy streak';
  dots.innerHTML = dotsMarkup();
  hardDots.innerHTML = hardDotsMarkup();

  score.textContent = String(state.correct);
}

function renderQuestion() {
  served += 1;
  revealing = false;
  questionLabel.textContent = `Question ${served} · ${current.id}`;
  questionTier.textContent = current.difficulty;
  questionText.textContent = current.question;
  feedback.innerHTML = '';
  optionsEl.innerHTML = current.options
    .map(
      (option, index) => `
      <button type="button" class="nb-option" data-index="${index}">
        <span class="flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink bg-white text-[10px] font-black">${LETTERS[index]}</span>
        <span>${escapeHtml(option)}</span>
      </button>`,
    )
    .join('');

  optionsEl.querySelectorAll<HTMLButtonElement>('.nb-option').forEach((button) => {
    button.addEventListener('click', () => answer(Number(button.dataset.index)));
  });
  renderHud();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function celebrate(tier: Tier) {
  if (tier === 'hard') {
    void confetti.addConfetti({ emojis: ['🩷', '🎀', '✨'], confettiNumber: 80 });
    return;
  }
  if (tier === 'medium') {
    void confetti.addConfetti({ confettiColors: ['#FF69B4', '#FF1493', '#FFFFFF'], confettiNumber: 60 });
    return;
  }
  void confetti.addConfetti({ confettiColors: ['#FFB6C1', '#FF69B4', '#FFFFFF'], confettiNumber: 25 });
}

function answer(index: number) {
  if (revealing) return;

  if (index === current.answer) {
    celebrate(current.difficulty);
    state = applyAnswer(state, true);
    state.tier = state.nextTier;
    current = draw(state.tier);
    renderQuestion();
    return;
  }

  state = applyAnswer(state, false);
  renderHud();
  reveal(index);
}

function reveal(pickedIndex: number) {
  revealing = true;

  optionsEl.querySelectorAll<HTMLButtonElement>('.nb-option').forEach((button) => {
    const index = Number(button.dataset.index);
    button.disabled = true;
    if (index === current.answer) button.classList.add('is-correct');
    else if (index === pickedIndex) button.classList.add('is-wrong');
    else button.classList.add('is-muted');
  });

  renderRationale(pickedIndex);
}

function renderRationale(pickedIndex: number) {
  const answerText = current.options[current.answer];
  const explanation = current.explanation?.trim();
  const skipped = pickedIndex < 0;

  feedback.innerHTML = `
    <div class="nb bg-blush p-3">
      <p class="text-[10px] font-black uppercase tracking-[0.16em] text-deep">
        ${skipped ? 'Skipped' : 'Not quite'} · correct answer ${LETTERS[current.answer]}
      </p>
      <p class="mt-1 text-sm font-bold leading-snug">${escapeHtml(answerText)}</p>
      ${explanation ? `<p class="mt-1.5 text-xs leading-relaxed text-ink/80">${escapeHtml(explanation)}</p>` : ''}
      <button
        id="next"
        type="button"
        class="nb mt-3 border-2 border-ink bg-hot px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white"
      >
        Continue · Enter ↵
      </button>
    </div>
  `;

  const nextButton = feedback.querySelector<HTMLButtonElement>('#next');
  nextButton?.addEventListener('click', continueNext);
  nextButton?.focus({ preventScroll: true });
}

function continueNext() {
  if (!revealing) return;
  revealing = false;
  state.tier = state.nextTier;
  current = draw(state.tier);
  renderQuestion();
}

function skip() {
  if (revealing) return;
  state = applyAnswer(state, false);
  renderHud();
  reveal(-1);
}

skipButton.addEventListener('click', skip);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    if (revealing) {
      event.preventDefault();
      continueNext();
    }
    return;
  }

  if (revealing) return;
  const key = Number(event.key);
  if (Number.isInteger(key) && key >= 1 && key <= 4) {
    event.preventDefault();
    answer(key - 1);
  }
});

renderQuestion();

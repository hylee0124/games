const SYMBOLS = [
  "7", "★", "◆", "●", "♣", "♥", "☀", "☂",
  "♜", "⚑", "✚", "✦", "A", "B", "C", "D",
  "E", "F", "G", "H", "J", "K", "L", "M",
  "N", "P", "Q", "R", "S", "T", "W", "Z"
];
const LEVELS = {
  easy: { cols: 4, pairs: 6 },
  medium: { cols: 4, pairs: 8 },
  hard: { cols: 6, pairs: 12 },
  large: { cols: 6, pairs: 18 },
  wide: { cols: 8, pairs: 24 },
  expert: { cols: 8, pairs: 32 }
};

const state = {
  cards: [],
  first: null,
  second: null,
  lock: false,
  moves: 0,
  matchedPairs: 0,
  totalPairs: 0,
  startedAt: 0,
  timerId: 0,
  running: false,
  difficulty: "medium"
};

const boardEl = document.getElementById("board");
const timeEl = document.getElementById("time");
const movesEl = document.getElementById("moves");
const matchedEl = document.getElementById("matched");
const messageEl = document.getElementById("message");
const difficultyEl = document.getElementById("difficulty");

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

function setMessage(text) {
  messageEl.textContent = text;
}

function startTimer() {
  if (state.running) return;
  state.running = true;
  state.startedAt = Date.now();
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    timeEl.textContent = formatTime(Date.now() - state.startedAt);
  }, 500);
}

function stopTimer() {
  clearInterval(state.timerId);
  state.running = false;
  timeEl.textContent = formatTime(Date.now() - state.startedAt);
}

function updateStats() {
  movesEl.textContent = state.moves;
  matchedEl.textContent = `${state.matchedPairs}/${state.totalPairs}`;
}

function renderBoard() {
  const level = LEVELS[state.difficulty];
  boardEl.style.setProperty("--cols", level.cols);
  boardEl.style.setProperty("--gap", level.cols >= 8 ? "7px" : "10px");
  boardEl.innerHTML = "";

  state.cards.forEach((card, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.disabled = state.lock || card.matched;
    btn.setAttribute("aria-label", card.matched || card.flipped ? `${card.symbol} card` : "Hidden card");
    if (card.flipped) btn.classList.add("flipped");
    if (card.matched) btn.classList.add("matched");

    btn.innerHTML = `
      <span class="card-inner">
        <span class="face front">?</span>
        <span class="face back">${card.symbol}</span>
      </span>
    `;
    btn.addEventListener("click", () => flipCard(index));
    boardEl.appendChild(btn);
  });

  updateStats();
}

function flipCard(index) {
  if (state.lock) return;
  const card = state.cards[index];
  if (!card || card.flipped || card.matched) return;

  startTimer();
  card.flipped = true;

  if (state.first === null) {
    state.first = index;
    setMessage("한 장 더 선택하세요.");
    renderBoard();
    return;
  }

  state.second = index;
  state.moves += 1;
  state.lock = true;
  renderBoard();

  const firstCard = state.cards[state.first];
  const secondCard = state.cards[state.second];
  if (firstCard.symbol === secondCard.symbol) {
    firstCard.matched = true;
    secondCard.matched = true;
    state.matchedPairs += 1;
    resetPick();
    setMessage("맞았습니다. 계속 찾아보세요.");
    renderBoard();
    checkWin();
    return;
  }

  setMessage("다른 카드입니다. 위치를 기억하세요.");
  setTimeout(() => {
    firstCard.flipped = false;
    secondCard.flipped = false;
    resetPick();
    renderBoard();
  }, 720);
}

function resetPick() {
  state.first = null;
  state.second = null;
  state.lock = false;
}

function checkWin() {
  if (state.matchedPairs !== state.totalPairs) return;
  stopTimer();
  setMessage(`완성했습니다. 기록은 ${timeEl.textContent}, 이동 ${state.moves}회입니다.`);
}

function peekCards() {
  if (state.lock) return;
  startTimer();
  state.lock = true;
  state.cards.forEach((card) => {
    if (!card.matched) card.flipped = true;
  });
  setMessage("카드 위치를 기억하세요.");
  renderBoard();
  setTimeout(() => {
    state.cards.forEach((card) => {
      if (!card.matched) card.flipped = false;
    });
    resetPick();
    setMessage("다시 시작합니다.");
    renderBoard();
  }, Math.min(2600, 900 + state.totalPairs * 45));
}

function newGame() {
  const level = LEVELS[difficultyEl.value] || LEVELS.medium;
  const selected = shuffle(SYMBOLS).slice(0, level.pairs);
  state.difficulty = difficultyEl.value;
  state.cards = shuffle([...selected, ...selected]).map((symbol) => ({
    symbol,
    flipped: false,
    matched: false
  }));
  state.first = null;
  state.second = null;
  state.lock = false;
  state.moves = 0;
  state.matchedPairs = 0;
  state.totalPairs = level.pairs;
  state.startedAt = Date.now();
  state.running = false;
  clearInterval(state.timerId);
  timeEl.textContent = "00:00";
  setMessage("카드 두 장을 뒤집어 같은 그림을 찾으세요.");
  renderBoard();
}

document.getElementById("newGameBtn").addEventListener("click", newGame);
document.getElementById("restartBtn").addEventListener("click", newGame);
document.getElementById("peekBtn").addEventListener("click", peekCards);

newGame();

const BASE_SOLVED = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8]
];

const difficultyClues = {
  easy: 42,
  medium: 34,
  hard: 28
};

const state = {
  puzzle: [],
  solution: [],
  values: [],
  fixed: [],
  notes: Array.from({ length: 81 }, () => new Set()),
  selected: 0,
  noteMode: false,
  mistakes: 0,
  startedAt: Date.now(),
  timerId: 0,
  hintCell: -1
};

const boardEl = document.getElementById("board");
const numberPadEl = document.getElementById("numberPad");
const timeEl = document.getElementById("time");
const mistakesEl = document.getElementById("mistakes");
const filledEl = document.getElementById("filled");
const messageEl = document.getElementById("message");
const noteBtn = document.getElementById("noteBtn");
const difficultyEl = document.getElementById("difficulty");

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function swapRows(grid, a, b) {
  [grid[a], grid[b]] = [grid[b], grid[a]];
}

function swapCols(grid, a, b) {
  for (let row = 0; row < 9; row += 1) {
    [grid[row][a], grid[row][b]] = [grid[row][b], grid[row][a]];
  }
}

function makeSolution() {
  const grid = cloneGrid(BASE_SOLVED);
  const digitMap = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      grid[row][col] = digitMap[grid[row][col] - 1];
    }
  }

  for (let band = 0; band < 3; band += 1) {
    const rows = shuffle([0, 1, 2]);
    for (let i = 0; i < 3; i += 1) {
      swapRows(grid, band * 3 + i, band * 3 + rows[i]);
    }
  }

  for (let stack = 0; stack < 3; stack += 1) {
    const cols = shuffle([0, 1, 2]);
    for (let i = 0; i < 3; i += 1) {
      swapCols(grid, stack * 3 + i, stack * 3 + cols[i]);
    }
  }

  shuffle([0, 1, 2]).forEach((targetBand, currentBand) => {
    for (let i = 0; i < 3; i += 1) {
      swapRows(grid, currentBand * 3 + i, targetBand * 3 + i);
    }
  });

  shuffle([0, 1, 2]).forEach((targetStack, currentStack) => {
    for (let i = 0; i < 3; i += 1) {
      swapCols(grid, currentStack * 3 + i, targetStack * 3 + i);
    }
  });

  return grid.flat();
}

function makePuzzle(solution, clueCount) {
  const puzzle = [...solution];
  const cellsToClear = shuffle(Array.from({ length: 81 }, (_, index) => index)).slice(0, 81 - clueCount);
  cellsToClear.forEach((index) => {
    puzzle[index] = 0;
  });
  return puzzle;
}

function rowOf(index) {
  return Math.floor(index / 9);
}

function colOf(index) {
  return index % 9;
}

function boxOf(index) {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

function isPeer(a, b) {
  return rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b);
}

function isCandidateAvailable(index, number) {
  return !state.values.some((value, otherIndex) => (
    otherIndex !== index && value === number && isPeer(index, otherIndex)
  ));
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

function renderBoard() {
  boardEl.innerHTML = "";
  const selectedValue = state.values[state.selected];

  state.values.forEach((value, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.setAttribute("aria-label", `row ${rowOf(index) + 1}, column ${colOf(index) + 1}`);
    cell.dataset.index = String(index);

    if (state.fixed[index]) cell.classList.add("given");
    if (index === state.selected) cell.classList.add("selected");
    if (index !== state.selected && isPeer(index, state.selected)) cell.classList.add("peer");
    if (selectedValue && value === selectedValue) cell.classList.add("same");
    if (value && value !== state.solution[index]) cell.classList.add("error");
    if (index === state.hintCell) cell.classList.add("hint");

    if (value) {
      cell.textContent = value;
    } else if (state.notes[index].size) {
      const notes = document.createElement("div");
      notes.className = "notes";
      for (let number = 1; number <= 9; number += 1) {
        const note = document.createElement("span");
        note.textContent = state.notes[index].has(number) ? number : "";
        if (note.textContent && !isCandidateAvailable(index, number)) {
          note.className = "invalid";
        }
        notes.appendChild(note);
      }
      cell.appendChild(notes);
    }

    cell.addEventListener("click", () => selectCell(index));
    boardEl.appendChild(cell);
  });

  mistakesEl.textContent = state.mistakes;
  filledEl.textContent = `${state.values.filter(Boolean).length}/81`;
  noteBtn.classList.toggle("active", state.noteMode);
  updateNumberPadState();
}

function renderNumberPad() {
  numberPadEl.innerHTML = "";
  for (let number = 1; number <= 9; number += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "num";
    btn.textContent = number;
    btn.addEventListener("click", () => inputNumber(number));
    numberPadEl.appendChild(btn);
  }
  updateNumberPadState();
}

function updateNumberPadState() {
  const counts = Array(10).fill(0);
  state.values.forEach((value) => {
    if (value) counts[value] += 1;
  });

  numberPadEl.querySelectorAll(".num").forEach((btn) => {
    const number = Number(btn.textContent);
    btn.disabled = counts[number] >= 9;
    btn.title = btn.disabled ? `${number}은 모두 사용되었습니다.` : "";
  });
}

function selectCell(index) {
  state.selected = index;
  state.hintCell = -1;
  renderBoard();
}

function inputNumber(number) {
  const index = state.selected;
  if (state.fixed[index]) {
    setMessage("처음부터 주어진 숫자는 바꿀 수 없습니다.");
    return;
  }

  if (state.noteMode) {
    if (state.values[index]) return;
    if (state.notes[index].has(number)) {
      state.notes[index].delete(number);
    } else {
      state.notes[index].add(number);
    }
    renderBoard();
    return;
  }

  state.values[index] = number;
  state.notes[index].clear();

  if (number !== state.solution[index]) {
    state.mistakes += 1;
    setMessage("틀린 숫자입니다. 같은 행, 열, 3x3 박스를 다시 확인하세요.");
  } else {
    clearRelatedNotes(index, number);
    setMessage("좋습니다. 계속 진행하세요.");
  }

  renderBoard();
  checkWin();
}

function clearRelatedNotes(index, number) {
  state.notes.forEach((notes, otherIndex) => {
    if (isPeer(index, otherIndex)) notes.delete(number);
  });
}

function eraseSelected() {
  const index = state.selected;
  if (state.fixed[index]) {
    setMessage("처음부터 주어진 숫자는 지울 수 없습니다.");
    return;
  }

  state.values[index] = 0;
  state.notes[index].clear();
  setMessage("선택한 칸을 비웠습니다.");
  renderBoard();
}

function giveHint() {
  const empty = state.values
    .map((value, index) => (value ? -1 : index))
    .filter((index) => index >= 0);

  if (!empty.length) {
    checkWin();
    return;
  }

  const index = empty[Math.floor(Math.random() * empty.length)];
  state.values[index] = state.solution[index];
  state.notes[index].clear();
  state.hintCell = index;
  state.selected = index;
  clearRelatedNotes(index, state.solution[index]);
  setMessage("힌트 숫자를 하나 채웠습니다.");
  renderBoard();
  checkWin();
}

function checkBoard() {
  const wrong = state.values.some((value, index) => value && value !== state.solution[index]);
  const empty = state.values.some((value) => !value);

  if (wrong) {
    setMessage("아직 틀린 숫자가 있습니다.");
  } else if (empty) {
    setMessage("현재까지 입력한 숫자는 모두 맞습니다.");
  } else {
    checkWin();
  }
}

function checkWin() {
  const solved = state.values.every((value, index) => value === state.solution[index]);
  if (!solved) return;

  clearInterval(state.timerId);
  setMessage(`완성했습니다. 기록은 ${timeEl.textContent}, 실수 ${state.mistakes}회입니다.`);
}

function moveSelection(deltaRow, deltaCol) {
  const row = Math.min(8, Math.max(0, rowOf(state.selected) + deltaRow));
  const col = Math.min(8, Math.max(0, colOf(state.selected) + deltaCol));
  selectCell(row * 9 + col);
}

function startTimer() {
  clearInterval(state.timerId);
  state.startedAt = Date.now();
  state.timerId = setInterval(() => {
    timeEl.textContent = formatTime(Date.now() - state.startedAt);
  }, 500);
  timeEl.textContent = "00:00";
}

function newGame() {
  const clueCount = difficultyClues[difficultyEl.value] || difficultyClues.medium;
  state.solution = makeSolution();
  state.puzzle = makePuzzle(state.solution, clueCount);
  state.values = [...state.puzzle];
  state.fixed = state.puzzle.map(Boolean);
  state.notes = Array.from({ length: 81 }, () => new Set());
  state.selected = state.values.findIndex((value) => !value);
  if (state.selected < 0) state.selected = 0;
  state.noteMode = false;
  state.mistakes = 0;
  state.hintCell = -1;
  setMessage("빈 칸을 선택한 뒤 숫자를 입력하세요.");
  startTimer();
  renderBoard();
}

document.getElementById("newGameBtn").addEventListener("click", newGame);
document.getElementById("eraseBtn").addEventListener("click", eraseSelected);
document.getElementById("hintBtn").addEventListener("click", giveHint);
document.getElementById("checkBtn").addEventListener("click", checkBoard);
noteBtn.addEventListener("click", () => {
  state.noteMode = !state.noteMode;
  setMessage(state.noteMode ? "메모 모드입니다. 숫자를 누르면 작은 후보로 표시됩니다." : "일반 입력 모드입니다.");
  renderBoard();
});

document.addEventListener("keydown", (event) => {
  if (/^[1-9]$/.test(event.key)) inputNumber(Number(event.key));
  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") eraseSelected();
  if (event.key.toLowerCase() === "n") {
    state.noteMode = !state.noteMode;
    renderBoard();
  }
  if (event.key === "ArrowUp") moveSelection(-1, 0);
  if (event.key === "ArrowDown") moveSelection(1, 0);
  if (event.key === "ArrowLeft") moveSelection(0, -1);
  if (event.key === "ArrowRight") moveSelection(0, 1);
});

renderNumberPad();
newGame();

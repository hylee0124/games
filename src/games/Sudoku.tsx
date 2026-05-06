import { useEffect, useMemo, useState } from "react";

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

const difficultyClues = { easy: 42, medium: 34, hard: 28 };
type Difficulty = keyof typeof difficultyClues;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cloneGrid(grid: number[][]) {
  return grid.map((row) => [...row]);
}

function swapRows(grid: number[][], a: number, b: number) {
  [grid[a], grid[b]] = [grid[b], grid[a]];
}

function swapCols(grid: number[][], a: number, b: number) {
  for (let row = 0; row < 9; row += 1) [grid[row][a], grid[row][b]] = [grid[row][b], grid[row][a]];
}

function makeSolution() {
  const grid = cloneGrid(BASE_SOLVED);
  const digitMap = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) grid[row][col] = digitMap[grid[row][col] - 1];
  }
  for (let band = 0; band < 3; band += 1) {
    const rows = shuffle([0, 1, 2]);
    for (let i = 0; i < 3; i += 1) swapRows(grid, band * 3 + i, band * 3 + rows[i]);
  }
  for (let stack = 0; stack < 3; stack += 1) {
    const cols = shuffle([0, 1, 2]);
    for (let i = 0; i < 3; i += 1) swapCols(grid, stack * 3 + i, stack * 3 + cols[i]);
  }
  shuffle([0, 1, 2]).forEach((targetBand, currentBand) => {
    for (let i = 0; i < 3; i += 1) swapRows(grid, currentBand * 3 + i, targetBand * 3 + i);
  });
  shuffle([0, 1, 2]).forEach((targetStack, currentStack) => {
    for (let i = 0; i < 3; i += 1) swapCols(grid, currentStack * 3 + i, targetStack * 3 + i);
  });
  return grid.flat();
}

function makePuzzle(solution: number[], clueCount: number) {
  const puzzle = [...solution];
  shuffle(Array.from({ length: 81 }, (_, index) => index)).slice(0, 81 - clueCount).forEach((index) => {
    puzzle[index] = 0;
  });
  return puzzle;
}

function rowOf(index: number) { return Math.floor(index / 9); }
function colOf(index: number) { return index % 9; }
function boxOf(index: number) { return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3); }
function isPeer(a: number, b: number) { return rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b); }
function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function createGame(difficulty: Difficulty) {
  const solution = makeSolution();
  const puzzle = makePuzzle(solution, difficultyClues[difficulty]);
  const selected = puzzle.findIndex((value) => !value);
  return {
    solution,
    puzzle,
    values: [...puzzle],
    fixed: puzzle.map(Boolean),
    notes: Array.from({ length: 81 }, () => new Set<number>()),
    selected: selected < 0 ? 0 : selected,
    noteMode: false,
    mistakes: 0,
    hintCell: -1,
    startedAt: Date.now(),
    message: "빈 칸을 선택하고 숫자를 입력하세요.",
    complete: false
  };
}

export function Sudoku() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [game, setGame] = useState(() => createGame("medium"));
  const [time, setTime] = useState("00:00");

  useEffect(() => {
    if (game.complete) return;
    const timer = window.setInterval(() => setTime(formatTime(Date.now() - game.startedAt)), 500);
    setTime("00:00");
    return () => window.clearInterval(timer);
  }, [game.startedAt, game.complete]);

  const counts = useMemo(() => {
    const next = Array(10).fill(0);
    game.values.forEach((value) => { if (value) next[value] += 1; });
    return next;
  }, [game.values]);

  function isCandidateAvailable(index: number, number: number) {
    return !game.values.some((value, otherIndex) => otherIndex !== index && value === number && isPeer(index, otherIndex));
  }

  function selectCell(index: number) {
    setGame((current) => ({ ...current, selected: index, hintCell: -1 }));
  }

  function clearRelatedNotes(notes: Set<number>[], index: number, number: number) {
    return notes.map((set, otherIndex) => {
      const next = new Set(set);
      if (isPeer(index, otherIndex)) next.delete(number);
      return next;
    });
  }

  function markSolved(next: typeof game) {
    if (!next.values.every((value, index) => value === next.solution[index])) return next;
    return { ...next, complete: true, message: `완성했습니다. 기록은 ${time}, 실수 ${next.mistakes}회입니다.` };
  }

  function inputNumber(number: number) {
    setGame((current) => {
      const index = current.selected;
      if (current.fixed[index]) return { ...current, message: "처음부터 주어진 숫자는 바꿀 수 없습니다." };
      if (current.noteMode) {
        if (current.values[index]) return current;
        const notes = current.notes.map((set) => new Set(set));
        notes[index].has(number) ? notes[index].delete(number) : notes[index].add(number);
        return { ...current, notes };
      }

      const values = [...current.values];
      values[index] = number;
      let notes = current.notes.map((set) => new Set(set));
      notes[index].clear();
      const correct = number === current.solution[index];
      if (correct) notes = clearRelatedNotes(notes, index, number);
      return markSolved({
        ...current,
        values,
        notes,
        mistakes: correct ? current.mistakes : current.mistakes + 1,
        message: correct ? "좋습니다. 계속 진행하세요." : "다른 숫자입니다. 같은 줄, 칸, 3x3 박스를 확인하세요."
      });
    });
  }

  function eraseSelected() {
    setGame((current) => {
      const index = current.selected;
      if (current.fixed[index]) return { ...current, message: "처음부터 주어진 숫자는 지울 수 없습니다." };
      const values = [...current.values];
      const notes = current.notes.map((set) => new Set(set));
      values[index] = 0;
      notes[index].clear();
      return { ...current, values, notes, message: "선택한 칸을 비웠습니다." };
    });
  }

  function giveHint() {
    setGame((current) => {
      const empty = current.values.map((value, index) => value ? -1 : index).filter((index) => index >= 0);
      if (!empty.length) return markSolved(current);
      const index = empty[Math.floor(Math.random() * empty.length)];
      const values = [...current.values];
      values[index] = current.solution[index];
      const notes = clearRelatedNotes(current.notes, index, current.solution[index]);
      notes[index].clear();
      return markSolved({ ...current, values, notes, selected: index, hintCell: index, message: "힌트 숫자를 하나 채웠습니다." });
    });
  }

  function checkBoard() {
    setGame((current) => {
      const wrong = current.values.some((value, index) => value && value !== current.solution[index]);
      const empty = current.values.some((value) => !value);
      if (wrong) return { ...current, message: "아직 다른 숫자가 있습니다." };
      if (empty) return { ...current, message: "현재까지 입력한 숫자는 모두 맞습니다." };
      return markSolved(current);
    });
  }

  function moveSelection(deltaRow: number, deltaCol: number) {
    setGame((current) => {
      const row = Math.min(8, Math.max(0, rowOf(current.selected) + deltaRow));
      const col = Math.min(8, Math.max(0, colOf(current.selected) + deltaCol));
      return { ...current, selected: row * 9 + col, hintCell: -1 };
    });
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (/^[1-9]$/.test(event.key)) inputNumber(Number(event.key));
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") eraseSelected();
      if (event.key.toLowerCase() === "n") setGame((current) => ({ ...current, noteMode: !current.noteMode }));
      if (event.key === "ArrowUp") moveSelection(-1, 0);
      if (event.key === "ArrowDown") moveSelection(1, 0);
      if (event.key === "ArrowLeft") moveSelection(0, -1);
      if (event.key === "ArrowRight") moveSelection(0, 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="app sudoku-view">
      <a className="back-link" href="#/">게임 목록</a>
      <header className="topbar">
        <div>
          <h1>Sudoku</h1>
          <p className="subtitle">숫자를 채우고 메모를 남기며 스도쿠를 완성해 보세요.</p>
        </div>
        <div className="stats">
          <Stat label="Time" value={time} />
          <Stat label="Mistakes" value={String(game.mistakes)} />
          <Stat label="Filled" value={`${game.values.filter(Boolean).length}/81`} />
        </div>
      </header>

      <main className="layout">
        <section className="board-wrap" aria-label="Sudoku board">
          <div className="board sudoku-board">
            {game.values.map((value, index) => {
              const selectedValue = game.values[game.selected];
              const classes = ["cell"];
              if (game.fixed[index]) classes.push("given");
              if (index === game.selected) classes.push("selected");
              if (index !== game.selected && isPeer(index, game.selected)) classes.push("peer");
              if (selectedValue && value === selectedValue) classes.push("same");
              if (value && value !== game.solution[index]) classes.push("error");
              if (index === game.hintCell) classes.push("hint");
              return (
                <button className={classes.join(" ")} key={index} type="button" onClick={() => selectCell(index)}>
                  {value || (game.notes[index].size > 0 && (
                    <div className="notes">
                      {Array.from({ length: 9 }, (_, noteIndex) => {
                        const number = noteIndex + 1;
                        return <span className={game.notes[index].has(number) && !isCandidateAvailable(index, number) ? "invalid" : ""} key={number}>{game.notes[index].has(number) ? number : ""}</span>;
                      })}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="panel">
          <section className="panel-section">
            <p className="panel-title">숫자</p>
            <div className="number-pad">
              {Array.from({ length: 9 }, (_, index) => index + 1).map((number) => (
                <button className="num" disabled={counts[number] >= 9} key={number} onClick={() => inputNumber(number)} type="button">{number}</button>
              ))}
            </div>
          </section>
          <section className="panel-section">
            <p className="panel-title">도구</p>
            <div className="controls">
              <button className={`btn ${game.noteMode ? "active" : ""}`} onClick={() => setGame((current) => ({ ...current, noteMode: !current.noteMode, message: !current.noteMode ? "메모 모드입니다." : "일반 입력 모드입니다." }))} type="button">메모</button>
              <button className="btn" onClick={eraseSelected} type="button">지우기</button>
              <button className="btn" onClick={giveHint} type="button">힌트</button>
              <button className="btn" onClick={checkBoard} type="button">검사</button>
            </div>
            <p className="message">{game.message}</p>
          </section>
          <section className="panel-section">
            <p className="panel-title">새 게임</p>
            <div className="controls">
              <select className="select" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
                <option value="easy">쉬움</option>
                <option value="medium">보통</option>
                <option value="hard">어려움</option>
              </select>
              <button className="btn primary" onClick={() => setGame(createGame(difficulty))} type="button">시작</button>
            </div>
          </section>
          <section className="panel-section">
            <p className="panel-title">키보드</p>
            <ul className="kbd">
              <li>숫자 1-9: 선택 칸 입력</li>
              <li>Backspace 또는 Delete: 지우기</li>
              <li>N: 메모 모드 전환</li>
              <li>방향키: 선택 칸 이동</li>
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><span className="stat-label">{label}</span><span className="stat-value">{value}</span></div>;
}

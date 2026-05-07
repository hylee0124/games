import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

const SYMBOLS = ["7", "★", "◆", "●", "▲", "■", "♣", "♥", "♠", "☀", "☂", "☕", "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "W", "Z"];
const LEVELS = {
  easy: { cols: 4, pairs: 6, label: "쉬움 4x3" },
  medium: { cols: 4, pairs: 8, label: "보통 4x4" },
  hard: { cols: 6, pairs: 12, label: "어려움 6x4" },
  large: { cols: 6, pairs: 18, label: "확장 6x6" },
  wide: { cols: 8, pairs: 24, label: "집중 8x6" },
  expert: { cols: 8, pairs: 32, label: "전문가 8x8" }
};
type Level = keyof typeof LEVELS;
type Card = { symbol: string; flipped: boolean; matched: boolean };

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function makeCards(level: Level) {
  const selected = shuffle(SYMBOLS).slice(0, LEVELS[level].pairs);
  return shuffle([...selected, ...selected]).map((symbol) => ({ symbol, flipped: false, matched: false }));
}

export function MemoryCard() {
  const [difficulty, setDifficulty] = useState<Level>("medium");
  const [cards, setCards] = useState<Card[]>(() => makeCards("medium"));
  const [first, setFirst] = useState<number | null>(null);
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState("00:00");
  const [message, setMessage] = useState("카드 두 장을 뒤집어 같은 그림을 찾으세요.");
  const matchedPairs = useMemo(() => cards.filter((card) => card.matched).length / 2, [cards]);
  const totalPairs = LEVELS[difficulty].pairs;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setTime(formatTime(Date.now() - startedAt)), 500);
    return () => window.clearInterval(timer);
  }, [running, startedAt]);

  function startTimer() {
    if (running) return;
    setRunning(true);
    setStartedAt(Date.now());
  }

  function newGame(level = difficulty) {
    setCards(makeCards(level));
    setFirst(null);
    setLock(false);
    setMoves(0);
    setStartedAt(0);
    setRunning(false);
    setTime("00:00");
    setMessage("카드 두 장을 뒤집어 같은 그림을 찾으세요.");
  }

  function flipCard(index: number) {
    if (lock || cards[index]?.flipped || cards[index]?.matched) return;
    startTimer();
    const nextCards = cards.map((card, cardIndex) => cardIndex === index ? { ...card, flipped: true } : card);
    if (first === null) {
      setCards(nextCards);
      setFirst(index);
      setMessage("다음 카드를 선택하세요.");
      return;
    }
    setCards(nextCards);
    setMoves((value) => value + 1);
    setLock(true);
    const firstCard = nextCards[first];
    const secondCard = nextCards[index];
    if (firstCard.symbol === secondCard.symbol) {
      const matchedCards = nextCards.map((card, cardIndex) => cardIndex === first || cardIndex === index ? { ...card, matched: true } : card);
      setCards(matchedCards);
      setFirst(null);
      setLock(false);
      if (matchedCards.every((card) => card.matched)) {
        setRunning(false);
        setMessage(`완성했습니다. 기록은 ${time}, 이동 ${moves + 1}회입니다.`);
      } else {
        setMessage("맞았습니다. 계속 찾아보세요.");
      }
      return;
    }
    setMessage("다른 카드입니다. 위치를 기억하세요.");
    window.setTimeout(() => {
      setCards((current) => current.map((card, cardIndex) => cardIndex === first || cardIndex === index ? { ...card, flipped: false } : card));
      setFirst(null);
      setLock(false);
    }, 720);
  }

  function peekCards() {
    if (lock) return;
    startTimer();
    setLock(true);
    setCards((current) => current.map((card) => card.matched ? card : { ...card, flipped: true }));
    setMessage("카드 위치를 기억하세요.");
    window.setTimeout(() => {
      setCards((current) => current.map((card) => card.matched ? card : { ...card, flipped: false }));
      setFirst(null);
      setLock(false);
      setMessage("다시 시작합니다.");
    }, Math.min(2600, 900 + totalPairs * 45));
  }

  return (
    <div className="app memory-view">
      <a className="back-link" href="#/">게임 목록</a>
      <header className="topbar">
        <div>
          <h1>Memory Card</h1>
          <p className="subtitle">같은 그림의 카드 쌍을 찾아 모든 짝을 맞춰보세요.</p>
        </div>
        <div className="stats">
          <Stat label="Time" value={time} />
          <Stat label="Moves" value={String(moves)} />
          <Stat label="Matched" value={`${matchedPairs}/${totalPairs}`} />
        </div>
      </header>
      <main className="layout memory-layout">
        <section className="board-wrap" aria-label="Memory card board">
          <div className="board memory-board" style={{ "--cols": LEVELS[difficulty].cols, "--gap": LEVELS[difficulty].cols >= 8 ? "7px" : "10px" } as CSSProperties}>
            {cards.map((card, index) => (
              <button className={`card ${card.flipped ? "flipped" : ""} ${card.matched ? "matched" : ""}`} disabled={lock || card.matched} key={`${card.symbol}-${index}`} onClick={() => flipCard(index)} type="button">
                <span className="card-inner">
                  <span className="face front">?</span>
                  <span className="face back">{card.symbol}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
        <aside className="panel">
          <section className="panel-section">
            <p className="panel-title">새 게임</p>
            <div className="controls">
              <select className="select" value={difficulty} onChange={(event) => { const level = event.target.value as Level; setDifficulty(level); }}>
                {Object.entries(LEVELS).map(([key, level]) => <option value={key} key={key}>{level.label}</option>)}
              </select>
              <button className="btn primary" onClick={() => newGame()} type="button">시작</button>
            </div>
            <p className="message">{message}</p>
          </section>
          <section className="panel-section">
            <p className="panel-title">도구</p>
            <div className="controls">
              <button className="btn" onClick={peekCards} type="button">잠깐 보기</button>
              <button className="btn" onClick={() => newGame()} type="button">다시 시작</button>
            </div>
          </section>
          <section className="panel-section">
            <p className="panel-title">규칙</p>
            <ul className="rules">
              <li>한 번에 카드 두 장을 뒤집습니다.</li>
              <li>같은 그림이면 열린 상태로 남습니다.</li>
              <li>모든 카드를 맞추면 기록이 멈춥니다.</li>
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

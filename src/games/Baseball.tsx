import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type DigitLength = 3 | 4 | 5;
type GuessResult = {
  guess: string;
  strikes: number;
  balls: number;
  outs: number;
};

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeSecret(length: DigitLength) {
  const first = String(Math.floor(Math.random() * 9) + 1);
  const rest = shuffle(DIGITS.filter((digit) => digit !== first)).slice(0, length - 1);
  return [first, ...rest].join("");
}

function scoreGuess(secret: string, guess: string): GuessResult {
  let strikes = 0;
  let balls = 0;
  for (let index = 0; index < guess.length; index += 1) {
    if (guess[index] === secret[index]) strikes += 1;
    else if (secret.includes(guess[index])) balls += 1;
  }
  return { guess, strikes, balls, outs: guess.length - strikes - balls };
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function Baseball() {
  const [digitLength, setDigitLength] = useState<DigitLength>(3);
  const [secret, setSecret] = useState(() => makeSecret(3));
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<GuessResult[]>([]);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [time, setTime] = useState("00:00");
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("서로 다른 숫자를 골라 정답을 맞혀보세요.");

  const usedDigits = useMemo(() => new Set(input), [input]);
  const canSubmit = input.length === digitLength && new Set(input).size === digitLength && !complete;

  useEffect(() => {
    if (complete) return;
    const timer = window.setInterval(() => setTime(formatTime(Date.now() - startedAt)), 500);
    setTime("00:00");
    return () => window.clearInterval(timer);
  }, [startedAt, complete]);

  function newGame(length = digitLength) {
    setDigitLength(length);
    setSecret(makeSecret(length));
    setInput("");
    setHistory([]);
    setStartedAt(Date.now());
    setTime("00:00");
    setComplete(false);
    setMessage(`${length}자리 새 게임을 시작합니다.`);
  }

  function addDigit(digit: string) {
    if (complete) return;
    if (input.length >= digitLength) {
      setMessage(`${digitLength}자리까지 입력할 수 있습니다.`);
      return;
    }
    if (usedDigits.has(digit)) {
      setMessage("같은 숫자는 한 번만 사용할 수 있습니다.");
      return;
    }
    if (input.length === 0 && digit === "0") {
      setMessage("첫 숫자는 0이 될 수 없습니다.");
      return;
    }
    setInput((current) => current + digit);
    setMessage("입력을 완성한 뒤 확인을 누르세요.");
  }

  function eraseDigit() {
    if (complete) return;
    setInput((current) => current.slice(0, -1));
  }

  function clearInput() {
    if (complete) return;
    setInput("");
  }

  function submitGuess() {
    if (!canSubmit) {
      setMessage(`${digitLength}개의 서로 다른 숫자를 입력하세요.`);
      return;
    }
    const result = scoreGuess(secret, input);
    const nextHistory = [result, ...history];
    setHistory(nextHistory);
    setInput("");
    if (result.strikes === digitLength) {
      setComplete(true);
      setMessage(`${nextHistory.length}번 만에 성공했습니다. 정답은 ${secret}입니다.`);
      return;
    }
    setMessage(`${result.strikes}S ${result.balls}B ${result.outs}O입니다. 다음 추측을 입력하세요.`);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (/^[0-9]$/.test(event.key)) addDigit(event.key);
      if (event.key === "Backspace" || event.key === "Delete") eraseDigit();
      if (event.key === "Enter") submitGuess();
      if (event.key === "Escape") clearInput();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="app baseball-view">
      <a className="back-link" href="#/">게임 목록</a>
      <header className="topbar">
        <div>
          <h1>숫자야구</h1>
          <p className="subtitle">중복 없는 숫자를 추측하고 스트라이크와 볼 힌트로 정답을 좁혀보세요.</p>
        </div>
        <div className="stats">
          <Stat label="Time" value={time} />
          <Stat label="Attempts" value={String(history.length)} />
          <Stat label="Digits" value={`${digitLength}자리`} />
        </div>
      </header>

      <main className="layout baseball-layout">
        <section className="board-wrap baseball-board-wrap" aria-label="Baseball input board">
          <div className="baseball-display" style={{ "--digits": digitLength } as CSSProperties} aria-label="Current guess">
            {Array.from({ length: digitLength }, (_, index) => (
              <span className={input[index] ? "filled" : ""} key={index}>{input[index] ?? ""}</span>
            ))}
          </div>

          <div className="baseball-pad" aria-label="Number pad">
            {DIGITS.map((digit) => (
              <button className="num" disabled={complete || usedDigits.has(digit) || input.length >= digitLength || (input.length === 0 && digit === "0")} key={digit} onClick={() => addDigit(digit)} type="button">
                {digit}
              </button>
            ))}
          </div>

          <div className="baseball-actions">
            <button className="btn" onClick={eraseDigit} type="button">지우기</button>
            <button className="btn" onClick={clearInput} type="button">비우기</button>
            <button className="btn primary" disabled={!canSubmit} onClick={submitGuess} type="button">확인</button>
          </div>

          <p className="message">{message}</p>
        </section>

        <aside className="panel">
          <section className="panel-section">
            <p className="panel-title">새 게임</p>
            <div className="digit-options" role="group" aria-label="Digit length">
              {[3, 4, 5].map((length) => (
                <button className={`btn ${digitLength === length ? "active" : ""}`} key={length} onClick={() => newGame(length as DigitLength)} type="button">
                  {length}자리
                </button>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <p className="panel-title">기록</p>
            {history.length === 0 ? (
              <p className="empty-history">아직 입력한 추측이 없습니다.</p>
            ) : (
              <ol className="guess-list">
                {history.map((result, index) => (
                  <li key={`${result.guess}-${history.length - index}`}>
                    <span className="guess-number">{history.length - index}</span>
                    <strong>{result.guess}</strong>
                    <span>{result.strikes}S</span>
                    <span>{result.balls}B</span>
                    <span>{result.outs}O</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel-section">
            <p className="panel-title">규칙</p>
            <ul className="rules">
              <li>정답과 같은 위치의 숫자는 스트라이크입니다.</li>
              <li>숫자는 맞지만 위치가 다르면 볼입니다.</li>
              <li>정답에 없는 숫자는 아웃입니다.</li>
              <li>정답과 입력에는 같은 숫자가 반복되지 않습니다.</li>
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

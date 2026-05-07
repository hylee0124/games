import { useEffect, useState } from "react";
import { Baseball } from "./games/Baseball";
import { MemoryCard } from "./games/MemoryCard";
import { RandomDefense } from "./games/RandomDefense";
import { Sudoku } from "./games/Sudoku";

type GameKey = "home" | "sudoku" | "memory-card" | "random-defense" | "baseball";

const games = [
  {
    key: "baseball",
    title: "숫자야구",
    tags: ["Logic", "Numbers", "Single Player"],
    description: "3자리부터 5자리까지 난이도를 고르고 스트라이크와 볼 힌트로 정답을 맞히는 추리 게임입니다."
  },
  {
    key: "sudoku",
    title: "Sudoku",
    tags: ["Puzzle", "Keyboard", "Single Player"],
    description: "숫자를 채우고 메모를 남기며 9x9 퍼즐을 완성하는 스도쿠입니다."
  },
  {
    key: "memory-card",
    title: "Memory Card",
    tags: ["Puzzle", "Matching", "Single Player"],
    description: "카드를 뒤집어 같은 그림 쌍을 찾는 기억력 게임입니다."
  },
  {
    key: "random-defense",
    title: "Random Defense",
    tags: ["Defense", "Canvas", "Single Player"],
    description: "무작위 타워를 뽑아 배치하고 강화해 몰려오는 웨이브를 막는 게임입니다."
  }
] as const;

function getRoute(): GameKey {
  const route = window.location.hash.replace("#/", "");
  if (route === "sudoku" || route === "memory-card" || route === "random-defense" || route === "baseball") return route;
  return "home";
}

export function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route === "baseball") return <Baseball />;
  if (route === "sudoku") return <Sudoku />;
  if (route === "memory-card") return <MemoryCard />;
  if (route === "random-defense") return <RandomDefense />;

  return (
    <main className="page">
      <header className="home-header">
        <div>
          <h1>Games</h1>
          <p className="subtitle">간단한 브라우저 게임 모음입니다.</p>
        </div>
        <div className="header-actions">
          <a className="shortcut" href="#/baseball">숫자야구 바로가기</a>
          <div className="count">4 Games</div>
        </div>
      </header>

      <section className="game-grid" aria-label="Game list">
        {games.map((game) => (
          <a className="game-card" href={`#/${game.key}`} key={game.key}>
            <div className={`thumb thumb-${game.key}`} aria-hidden="true">
              {Array.from({ length: 27 }, (_, index) => <span key={index} />)}
            </div>
            <div>
              <h2 className="game-title">{game.title}</h2>
              <div className="game-meta">
                {game.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
              </div>
            </div>
            <p className="description">{game.description}</p>
            <span className="play">게임 시작</span>
          </a>
        ))}
      </section>
    </main>
  );
}

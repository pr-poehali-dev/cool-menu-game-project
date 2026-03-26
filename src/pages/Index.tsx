import { useState } from "react";
import MenuScreen from "@/components/game/MenuScreen";
import GameScreen from "@/components/game/GameScreen";

type Screen = "menu" | "game" | "gameover";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);

  const handlePlay = () => setScreen("game");
  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setScreen("gameover");
  };
  const handleRestart = () => setScreen("game");
  const handleMenu = () => setScreen("menu");

  return (
    <div className="game-root">
      {screen === "menu" && <MenuScreen onPlay={handlePlay} />}
      {screen === "game" && <GameScreen onGameOver={handleGameOver} />}
      {screen === "gameover" && (
        <div className="gameover-screen">
          <div className="gameover-content">
            <div className="gameover-title">GAME OVER</div>
            <div className="gameover-score">Очки: {score}</div>
            <button className="menu-btn" onClick={handleRestart}>СНОВА</button>
            <button className="menu-btn secondary" onClick={handleMenu}>МЕНЮ</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;

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
    <div style={{ position: "fixed", inset: 0, background: "#030208", overflow: "hidden" }}>
      {screen === "menu" && <MenuScreen onPlay={handlePlay} />}
      {screen === "game" && <GameScreen onGameOver={handleGameOver} />}
      {screen === "gameover" && (
        <div style={{
          position: "fixed", inset: 0,
          background: "radial-gradient(ellipse at center, #0d0b1e 0%, #030208 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Animated cursed energy lines */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                width: "1px",
                height: "100%",
                left: `${10 + i * 12}%`,
                background: `linear-gradient(to bottom, transparent, rgba(124,58,237,${0.05 + i * 0.01}), transparent)`,
                animation: `fadeIn 2s ease ${i * 0.1}s both`,
              }} />
            ))}
          </div>

          <div style={{
            position: "relative", zIndex: 10,
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: "24px",
            textAlign: "center",
          }}>
            {/* Cursed mark symbol */}
            <div style={{
              fontSize: "48px",
              color: "#7c3aed",
              textShadow: "0 0 30px rgba(124,58,237,0.8)",
              lineHeight: 1,
            }}>
              ✦
            </div>

            <div style={{
              fontFamily: "'Georgia', serif",
              fontSize: "clamp(36px, 6vw, 60px)",
              fontWeight: 900,
              letterSpacing: "0.2em",
              color: "#ef4444",
              textShadow: "0 0 30px rgba(239,68,68,0.7), 0 0 60px rgba(220,38,38,0.4)",
            }}>
              ПРОКЛЯТИЕ ЗАВЕРШЕНО
            </div>

            <div style={{
              fontFamily: "monospace",
              fontSize: "14px",
              color: "#6d28d9",
              letterSpacing: "0.1em",
            }}>
              呪術廻戦 — Cursed Legacy
            </div>

            <div style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(124,58,237,0.4)",
              padding: "16px 48px",
              borderRadius: "4px",
            }}>
              <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#7c3aed", letterSpacing: "0.15em", marginBottom: "4px" }}>
                ОЧКОВ НАБРАНО
              </div>
              <div style={{
                fontFamily: "'Georgia', serif",
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 700,
                color: "#fbbf24",
                textShadow: "0 0 20px rgba(251,191,36,0.6)",
              }}>
                {score}
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <button
                onClick={handleRestart}
                style={{
                  fontFamily: "'Georgia', serif",
                  fontSize: "15px",
                  letterSpacing: "0.2em",
                  color: "#a78bfa",
                  background: "transparent",
                  border: "2px solid #7c3aed",
                  padding: "12px 32px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 0 20px rgba(124,58,237,0.2)",
                }}
                onMouseEnter={e => {
                  (e.target as HTMLButtonElement).style.background = "rgba(124,58,237,0.15)";
                  (e.target as HTMLButtonElement).style.borderColor = "#a78bfa";
                }}
                onMouseLeave={e => {
                  (e.target as HTMLButtonElement).style.background = "transparent";
                  (e.target as HTMLButtonElement).style.borderColor = "#7c3aed";
                }}
              >
                ▶ СНОВА В БОЙ
              </button>
              <button
                onClick={handleMenu}
                style={{
                  fontFamily: "'Georgia', serif",
                  fontSize: "15px",
                  letterSpacing: "0.2em",
                  color: "#6d28d9",
                  background: "transparent",
                  border: "1px solid rgba(109,40,217,0.4)",
                  padding: "12px 32px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  (e.target as HTMLButtonElement).style.color = "#a78bfa";
                  (e.target as HTMLButtonElement).style.borderColor = "#7c3aed";
                }}
                onMouseLeave={e => {
                  (e.target as HTMLButtonElement).style.color = "#6d28d9";
                  (e.target as HTMLButtonElement).style.borderColor = "rgba(109,40,217,0.4)";
                }}
              >
                МЕНЮ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;

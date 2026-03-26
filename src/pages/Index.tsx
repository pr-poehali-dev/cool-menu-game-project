import { useState } from "react";
import MenuScreen from "@/components/game/MenuScreen";
import EnergySelect from "@/components/game/EnergySelect";
import TrainingScreen from "@/components/game/TrainingScreen";
import GameScreen from "@/components/game/GameScreen";
import InfoModal from "@/components/game/InfoModal";
import { EnergyType, CharacterProgress, getEnergyDef, createProgress } from "@/components/game/gameState";

type Screen = "menu" | "energy-select" | "training" | "game" | "gameover";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("menu");
  const [showInfo, setShowInfo] = useState(false);
  const [energy, setEnergy] = useState<EnergyType>("piercing");
  const [progress, setProgress] = useState<CharacterProgress | null>(null);
  const [finalProgress, setFinalProgress] = useState<CharacterProgress | null>(null);

  const handlePlay = () => setScreen("energy-select");

  const handleEnergySelect = (e: EnergyType) => {
    setEnergy(e);
    setProgress(createProgress(e));
    setScreen("training");
  };

  const handleTrainingComplete = (prog: CharacterProgress) => {
    setProgress(prog);
    setScreen("game");
  };

  const handleGameOver = (prog: CharacterProgress) => {
    setFinalProgress(prog);
    setScreen("gameover");
  };

  const handleRestart = () => {
    setProgress(createProgress(energy));
    setScreen("training");
  };

  const handleMenu = () => setScreen("menu");

  const energyDef = getEnergyDef(energy);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#030208", overflow: "hidden" }}>
      {screen === "menu" && <MenuScreen onPlay={handlePlay} onInfo={() => setShowInfo(true)} />}
      {screen === "energy-select" && <EnergySelect onSelect={handleEnergySelect} />}
      {screen === "training" && progress && (
        <TrainingScreen energy={energy} onComplete={handleTrainingComplete} />
      )}
      {screen === "game" && progress && (
        <GameScreen energy={energy} progress={progress} onGameOver={handleGameOver} />
      )}
      {screen === "gameover" && finalProgress && (
        <div style={{
          position: "fixed", inset: 0,
          background: "radial-gradient(ellipse at 50% 40%, #0d0b1e 0%, #030208 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Georgia', serif",
        }}>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{
                position: "absolute", width: "1px", height: "100%",
                left: `${8 + i * 12}%`,
                background: `linear-gradient(to bottom, transparent, rgba(124,58,237,${0.04 + i * 0.008}), transparent)`,
              }} />
            ))}
          </div>

          <div style={{
            position: "relative", zIndex: 10,
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 22, textAlign: "center",
          }}>
            <div style={{ fontSize: 44, color: energyDef.color, textShadow: `0 0 30px ${energyDef.glowColor}` }}>
              {energyDef.kanji}
            </div>
            <div style={{
              fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, letterSpacing: "0.2em",
              color: "#ef4444",
              textShadow: "0 0 30px rgba(239,68,68,0.7), 0 0 60px rgba(220,38,38,0.4)",
            }}>
              ПРОКЛЯТИЕ ЗАВЕРШЕНО
            </div>
            <div style={{ color: "#6d28d9", fontSize: 13, letterSpacing: "0.1em" }}>
              呪術廻戦 — Cursed Legacy
            </div>
            <div style={{
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(124,58,237,0.35)",
              padding: "20px 44px", borderRadius: 8,
              display: "flex", gap: 40,
            }}>
              {[
                { label: "Уровень", value: String(finalProgress.level), color: energyDef.color },
                { label: "Опыт", value: `${finalProgress.xp} XP`, color: "#fbbf24" },
                { label: "Энергия", value: energyDef.nameRu, color: energyDef.color },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ color: "#4c3a7a", fontSize: 10, letterSpacing: "0.15em", marginBottom: 4 }}>
                    {s.label.toUpperCase()}
                  </div>
                  <div style={{ color: s.color, fontSize: 22, fontWeight: 700, textShadow: `0 0 10px ${s.color}88` }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <button onClick={handleRestart} style={{
                fontFamily: "'Georgia', serif", fontSize: 14, letterSpacing: "0.2em",
                color: energyDef.color, background: "transparent",
                border: `2px solid ${energyDef.color}`, padding: "12px 32px", cursor: "pointer",
                borderRadius: 4, boxShadow: `0 0 20px ${energyDef.color}33`,
              }}>
                ▶ СНОВА В БОЙ
              </button>
              <button onClick={handleMenu} style={{
                fontFamily: "'Georgia', serif", fontSize: 14, letterSpacing: "0.2em",
                color: "#6d28d9", background: "transparent",
                border: "1px solid rgba(109,40,217,0.3)", padding: "12px 32px", cursor: "pointer",
                borderRadius: 4,
              }}>
                МЕНЮ
              </button>
            </div>
          </div>
        </div>
      )}

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </div>
  );
};

export default Index;

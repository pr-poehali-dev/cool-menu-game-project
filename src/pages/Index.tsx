import { useState } from "react";
import MenuScreen from "@/components/game/MenuScreen";
import EnergySelect from "@/components/game/EnergySelect";
import CityScreen from "@/components/game/CityScreen";
import GameScreen from "@/components/game/GameScreen";
import InfoModal from "@/components/game/InfoModal";
import { EnergyType, CharacterProgress, getEnergyDef, createProgress } from "@/components/game/gameState";

type Screen = "menu" | "energy-select" | "city" | "game" | "victory" | "gameover";

// ── Квест-плашка ──────────────────────────────────────────────────────────────
const QuestHUD = ({ progress }: { progress: CharacterProgress }) => {
  if (!progress.activeQuest) return null;
  const pct = Math.min(1, progress.questProgress / Math.max(1, progress.questGoal));
  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 50,
      background: "rgba(10,8,24,0.92)",
      border: "1px solid rgba(124,58,237,0.45)",
      borderRadius: 8,
      padding: "10px 14px",
      minWidth: 200,
      fontFamily: "'Georgia', serif",
      boxShadow: "0 2px 20px rgba(109,40,217,0.2)",
    }}>
      <div style={{ color: "#7c3aed", fontSize: 9, letterSpacing: "0.18em", marginBottom: 5 }}>
        ✦ АКТИВНЫЙ КВЕСТ
      </div>
      <div style={{ color: "#c4b5fd", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
        {progress.activeQuest}
      </div>
      <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>
        Духи: {progress.questProgress} / {progress.questGoal}
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
        <div style={{
          width: `${pct*100}%`, height: "100%",
          background: pct >= 1 ? "#22c55e" : "#7c3aed",
          borderRadius: 2, transition: "width 0.3s",
        }} />
      </div>
      {pct >= 1 && (
        <div style={{ color: "#22c55e", fontSize: 10, marginTop: 5, fontWeight: 700 }}>
          ✓ Выполнено — вернись к НПС!
        </div>
      )}
    </div>
  );
};

// ── Экран победы ──────────────────────────────────────────────────────────────
const VictoryScreen = ({ progress, energy, onReturn, onMenu }: {
  progress: CharacterProgress; energy: EnergyType;
  onReturn: () => void; onMenu: () => void;
}) => {
  const energyDef = getEnergyDef(energy);
  return (
    <div style={{
      position:"fixed",inset:0,
      background:"radial-gradient(ellipse at 50% 40%, #0d1a0d 0%, #030208 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'Georgia',serif",
    }}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,textAlign:"center",zIndex:10}}>
        <div style={{fontSize:40,color:energyDef.color,textShadow:`0 0 30px ${energyDef.glowColor}`}}>
          {energyDef.kanji}
        </div>
        <div style={{fontSize:"clamp(26px,5vw,48px)",fontWeight:900,letterSpacing:"0.2em",
          color:"#22c55e",textShadow:"0 0 30px rgba(34,197,94,0.7)"}}>
          ВСЕ ДУХИ УСТРАНЕНЫ
        </div>
        <div style={{color:"#16a34a",fontSize:12,letterSpacing:"0.1em"}}>
          呪術廻戦 — Миссия выполнена
        </div>
        <div style={{
          background:"rgba(0,0,0,0.65)",border:"1px solid rgba(34,197,94,0.3)",
          padding:"18px 40px",borderRadius:8,display:"flex",gap:36,
        }}>
          {[
            {label:"Уровень",value:String(progress.level),color:energyDef.color},
            {label:"Опыт",value:`${progress.xp} XP`,color:"#fbbf24"},
            {label:"Энергия",value:energyDef.nameRu,color:energyDef.color},
          ].map(s=>(
            <div key={s.label} style={{textAlign:"center"}}>
              <div style={{color:"#4c3a7a",fontSize:9,letterSpacing:"0.15em",marginBottom:4}}>{s.label.toUpperCase()}</div>
              <div style={{color:s.color,fontSize:20,fontWeight:700}}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:12}}>
          <button onClick={onReturn} style={{
            fontFamily:"'Georgia',serif",fontSize:13,letterSpacing:"0.15em",
            color:"#22c55e",background:"transparent",
            border:"2px solid #22c55e",padding:"11px 28px",cursor:"pointer",borderRadius:4,
            boxShadow:"0 0 16px rgba(34,197,94,0.25)",
          }}>▶ ВЕРНУТЬСЯ В ГОРОД</button>
          <button onClick={onMenu} style={{
            fontFamily:"'Georgia',serif",fontSize:13,letterSpacing:"0.15em",
            color:"#6d28d9",background:"transparent",
            border:"1px solid rgba(109,40,217,0.3)",padding:"11px 28px",cursor:"pointer",borderRadius:4,
          }}>МЕНЮ</button>
        </div>
      </div>
    </div>
  );
};

// ── Экран поражения ────────────────────────────────────────────────────────────
const GameOverScreen = ({ progress, energy, onRetry, onMenu }: {
  progress: CharacterProgress; energy: EnergyType;
  onRetry: () => void; onMenu: () => void;
}) => {
  const energyDef = getEnergyDef(energy);
  return (
    <div style={{
      position:"fixed",inset:0,
      background:"radial-gradient(ellipse at 50% 40%, #0d0b1e 0%, #030208 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'Georgia',serif",
    }}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,textAlign:"center"}}>
        <div style={{fontSize:40,color:energyDef.color,textShadow:`0 0 30px ${energyDef.glowColor}`}}>
          {energyDef.kanji}
        </div>
        <div style={{fontSize:"clamp(24px,5vw,48px)",fontWeight:900,letterSpacing:"0.2em",
          color:"#ef4444",textShadow:"0 0 30px rgba(239,68,68,0.7)"}}>
          ПРОКЛЯТИЕ ЗАВЕРШЕНО
        </div>
        <div style={{
          background:"rgba(0,0,0,0.65)",border:"1px solid rgba(124,58,237,0.3)",
          padding:"18px 40px",borderRadius:8,display:"flex",gap:36,
        }}>
          {[
            {label:"Уровень",value:String(progress.level),color:energyDef.color},
            {label:"Опыт",value:`${progress.xp} XP`,color:"#fbbf24"},
          ].map(s=>(
            <div key={s.label} style={{textAlign:"center"}}>
              <div style={{color:"#4c3a7a",fontSize:9,letterSpacing:"0.15em",marginBottom:4}}>{s.label.toUpperCase()}</div>
              <div style={{color:s.color,fontSize:20,fontWeight:700}}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:12}}>
          <button onClick={onRetry} style={{
            fontFamily:"'Georgia',serif",fontSize:13,letterSpacing:"0.15em",
            color:energyDef.color,background:"transparent",
            border:`2px solid ${energyDef.color}`,padding:"11px 28px",cursor:"pointer",borderRadius:4,
          }}>▶ В ГОРОД</button>
          <button onClick={onMenu} style={{
            fontFamily:"'Georgia',serif",fontSize:13,letterSpacing:"0.15em",
            color:"#6d28d9",background:"transparent",
            border:"1px solid rgba(109,40,217,0.3)",padding:"11px 28px",cursor:"pointer",borderRadius:4,
          }}>МЕНЮ</button>
        </div>
      </div>
    </div>
  );
};

// ── Главная ────────────────────────────────────────────────────────────────────
const Index = () => {
  const [screen, setScreen] = useState<Screen>("menu");
  const [showInfo, setShowInfo] = useState(false);
  const [energy, setEnergy] = useState<EnergyType>("infinity");
  const [progress, setProgress] = useState<CharacterProgress | null>(null);
  const [finalProgress, setFinalProgress] = useState<CharacterProgress | null>(null);

  const handlePlay = () => setScreen("energy-select");

  const handleEnergySelect = (e: EnergyType) => {
    setEnergy(e);
    setProgress(createProgress(e));
    setScreen("city");
  };

  const handleQuestUpdate = (prog: CharacterProgress) => {
    setProgress(prog);
  };

  const handleGoToBattle = (prog: CharacterProgress) => {
    setProgress(prog);
    setScreen("game");
  };

  const handleGameOver = (prog: CharacterProgress) => {
    setFinalProgress(prog);
    setProgress(prog);
    setScreen("gameover");
  };

  const handleVictory = (prog: CharacterProgress) => {
    const updated: CharacterProgress = {
      ...prog,
      questProgress: prog.activeQuest ? prog.questGoal : 0,
    };
    setFinalProgress(updated);
    setProgress(updated);
    setScreen("victory");
  };

  const handleFlee = (prog: CharacterProgress) => {
    setProgress(prog);
    setScreen("city");
  };

  const handleReturnToCity = () => {
    setScreen("city");
  };

  const handleMenu = () => {
    setScreen("menu");
    setProgress(null);
    setFinalProgress(null);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"#030208",overflow:"hidden" }}>
      {screen==="menu" && <MenuScreen onPlay={handlePlay} onInfo={()=>setShowInfo(true)} />}
      {screen==="energy-select" && <EnergySelect onSelect={handleEnergySelect} />}
      {screen==="city" && progress && (
        <CityScreen
          energy={energy}
          progress={progress}
          onGoToBattle={handleGoToBattle}
          onQuestUpdate={handleQuestUpdate}
        />
      )}
      {screen==="game" && progress && (
        <GameScreen
          energy={energy}
          progress={progress}
          onGameOver={handleGameOver}
          onVictory={handleVictory}
          onFlee={handleFlee}
        />
      )}
      {screen==="victory" && finalProgress && (
        <VictoryScreen
          progress={finalProgress}
          energy={energy}
          onReturn={handleReturnToCity}
          onMenu={handleMenu}
        />
      )}
      {screen==="gameover" && finalProgress && (
        <GameOverScreen
          progress={finalProgress}
          energy={energy}
          onRetry={handleReturnToCity}
          onMenu={handleMenu}
        />
      )}

      {/* Квест-плашка — только в городе (в бою квест рисуется на канвасе) */}
      {progress && screen==="city" && (
        <QuestHUD progress={progress} />
      )}

      {showInfo && <InfoModal onClose={()=>setShowInfo(false)} />}
    </div>
  );
};

export default Index;
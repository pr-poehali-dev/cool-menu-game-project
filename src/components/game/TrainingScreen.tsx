import { useEffect, useRef, useState } from "react";
import { EnergyType, getEnergyDef, CharacterProgress, createProgress, xpForLevel, TECHNIQUES } from "./gameState";

interface Props {
  energy: EnergyType;
  onComplete: (progress: CharacterProgress) => void;
}

type TrainingPhase =
  | "intro"           // нарратив: ты только что узнал что у тебя есть CE
  | "breathe"         // задание: почувствуй энергию (зажать пробел)
  | "move"            // задание: научись двигаться
  | "strike"          // задание: нанеси 5 ударов по столбу
  | "technique"       // задание: используй первую технику
  | "complete";       // итог + переход

const DIALOGS: Record<TrainingPhase, string[]> = {
  intro: [
    "Ты только что узнал правду — внутри тебя живёт проклятая энергия.",
    "Это не дар. Это бремя. Но именно с него начинается путь.",
    "Мастер Годзё сказал: «Сначала почувствуй её. Только потом — управляй.»",
    "Добро пожаловать в Высшую Школу Магии. Пора начать тренировку.",
  ],
  breathe: [
    "Закрой глаза. Дыши. Ощути, как энергия движется внутри тебя.",
    "Удержи [ПРОБЕЛ] — сосредоточься на потоке CE.",
  ],
  move: [
    "Хорошо. Теперь позволь ей двигаться вместе с тобой.",
    "Используй WASD или стрелки для движения.",
    "Попробуй добраться до каждой из светящихся точек.",
  ],
  strike: [
    "Теперь — атака. Проклятая энергия должна вырваться наружу.",
    "Бей по тренировочному столбу: [Z] или [X].",
    "Нанеси 5 ударов — почувствуй, как энергия слушается тебя.",
  ],
  technique: [
    "Ты готов к первой технике.",
    "Нажми [E] — выброс проклятой энергии вокруг тебя.",
    "Это базовая техника. Со временем откроются более мощные.",
  ],
  complete: [
    "Неплохо для первого раза.",
    "Твоя врождённая энергия проснулась. Путь только начинается.",
    "Впереди — настоящие духи. Будь осторожен.",
  ],
};

// ─── Canvas drawing helpers ────────────────────────────────────────────────

const W = 900, H = 520;
const ISO_X = 0.7, ISO_Y = 0.35;

function toScreen(wx: number, wy: number, camX: number, camY: number) {
  return {
    sx: (wx - wy) * ISO_X - (camX - camY) * ISO_X + W / 2,
    sy: (wx + wy) * ISO_Y - (camX + camY) * ISO_Y + H / 3,
  };
}

const TrainingScreen = ({ energy, onComplete }: Props) => {
  const energyDef = getEnergyDef(energy);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    px: 200, py: 300,
    vx: 0, vy: 0,
    walkCycle: 0,
    facing: { x: 1, y: 0 },
    camX: 200, camY: 300,
    keys: new Set<string>(),
    tick: 0,
    // training state
    spaceHeld: 0,
    strikeCount: 0,
    techniqueUsed: false,
    goalPoints: [
      { x: 350, y: 250, reached: false },
      { x: 150, y: 380, reached: false },
      { x: 400, y: 420, reached: false },
    ],
    pillarX: 440, pillarY: 300,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    ceLevel: 0,        // 0-1: растёт при breathe фазе
    attackAnim: 0,
    specialAnim: 0,
  });

  const [phase, setPhase] = useState<TrainingPhase>("intro");
  const [dialogIdx, setDialogIdx] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0); // 0-1
  const [showSkip, setShowSkip] = useState(false);
  const animRef = useRef<number>(0);
  const phaseRef = useRef<TrainingPhase>("intro");
  phaseRef.current = phase;

  const advanceDialog = () => {
    const lines = DIALOGS[phase];
    if (dialogIdx < lines.length - 1) {
      setDialogIdx(dialogIdx + 1);
    } else {
      nextPhase();
    }
  };

  const nextPhase = () => {
    const order: TrainingPhase[] = ["intro", "breathe", "move", "strike", "technique", "complete"];
    const idx = order.indexOf(phase);
    if (idx < order.length - 1) {
      const next = order[idx + 1];
      setPhase(next);
      setDialogIdx(0);
      setPhaseProgress(0);
    }
  };

  const finishTraining = () => {
    const prog = createProgress(energy);
    prog.level = 2;
    prog.xp = 0;
    prog.xpToNext = xpForLevel(2);
    prog.unlockedTechniques = ["basic_strike", "cursed_burst"];
    onComplete(prog);
  };

  useEffect(() => {
    setShowSkip(false);
    const t = setTimeout(() => setShowSkip(true), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const s = stateRef.current;
      if (down) s.keys.add(e.code); else s.keys.delete(e.code);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))
        e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    let attackCooldown = 0;
    let specialCooldown = 0;

    const loop = () => {
      const s = stateRef.current;
      const ph = phaseRef.current;
      s.tick++;

      const SPEED = energyDef.statMods.speed * 2.6;

      // Movement
      let mvx = 0, mvy = 0;
      if (s.keys.has("ArrowLeft") || s.keys.has("KeyA")) { mvx -= 1; }
      if (s.keys.has("ArrowRight") || s.keys.has("KeyD")) { mvx += 1; }
      if (s.keys.has("ArrowUp") || s.keys.has("KeyW")) { mvy -= 1; }
      if (s.keys.has("ArrowDown") || s.keys.has("KeyS")) { mvy += 1; }

      if (mvx !== 0 || mvy !== 0) {
        const len = Math.sqrt(mvx * mvx + mvy * mvy);
        s.vx = (mvx / len) * SPEED;
        s.vy = (mvy / len) * SPEED;
        s.facing = { x: mvx / len, y: mvy / len };
        s.walkCycle += 0.18;
      } else {
        s.vx *= 0.5; s.vy *= 0.5;
      }

      // Clamp to training area
      s.px = Math.max(60, Math.min(560, s.px + s.vx));
      s.py = Math.max(60, Math.min(560, s.py + s.vy));

      // Phase-specific logic
      if (ph === "breathe") {
        if (s.keys.has("Space")) {
          s.spaceHeld = Math.min(1, s.spaceHeld + 0.008);
          s.ceLevel = s.spaceHeld;
        } else {
          s.spaceHeld = Math.max(0, s.spaceHeld - 0.003);
          s.ceLevel = s.spaceHeld;
        }
        setPhaseProgress(s.spaceHeld);
        if (s.spaceHeld >= 1) {
          setTimeout(() => nextPhase(), 600);
        }
      }

      if (ph === "move") {
        s.goalPoints.forEach(gp => {
          if (!gp.reached) {
            const dx = s.px - gp.x, dy = s.py - gp.y;
            if (dx*dx + dy*dy < 30*30) {
              gp.reached = true;
              for (let i = 0; i < 10; i++) {
                s.particles.push({
                  x: gp.x, y: gp.y,
                  vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5,
                  life: 30, color: energyDef.color,
                });
              }
            }
          }
        });
        const done = s.goalPoints.filter(g => g.reached).length;
        setPhaseProgress(done / s.goalPoints.length);
        if (done === s.goalPoints.length) setTimeout(() => nextPhase(), 600);
      }

      if (ph === "strike") {
        const dx = s.pillarX - s.px, dy = s.pillarY - s.py;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if ((s.keys.has("KeyZ") || s.keys.has("KeyX")) && attackCooldown <= 0 && dist < 80) {
          attackCooldown = 28;
          s.attackAnim = 12;
          s.strikeCount++;
          for (let i = 0; i < 8; i++) {
            s.particles.push({
              x: s.pillarX, y: s.pillarY,
              vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6,
              life: 25, color: energyDef.color,
            });
          }
          setPhaseProgress(s.strikeCount / 5);
          if (s.strikeCount >= 5) setTimeout(() => nextPhase(), 600);
        }
      }

      if (ph === "technique") {
        if (s.keys.has("KeyE") && specialCooldown <= 0) {
          specialCooldown = 80;
          s.specialAnim = 20;
          s.techniqueUsed = true;
          for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 2;
            s.particles.push({
              x: s.px + Math.cos(a)*8, y: s.py + Math.sin(a)*8,
              vx: Math.cos(a)*7, vy: Math.sin(a)*7,
              life: 35, color: energyDef.color,
            });
          }
          setPhaseProgress(1);
          setTimeout(() => nextPhase(), 800);
        }
      }

      if (attackCooldown > 0) attackCooldown--;
      if (s.attackAnim > 0) s.attackAnim--;
      if (specialCooldown > 0) specialCooldown--;
      if (s.specialAnim > 0) s.specialAnim--;

      // Particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.88; p.vy *= 0.88;
        return --p.life > 0;
      });

      // Camera
      s.camX += (s.px - s.camX) * 0.1;
      s.camY += (s.py - s.camY) * 0.1;

      // ── Draw ──
      ctx.fillStyle = "#07060f";
      ctx.fillRect(0, 0, W, H);

      // Floor tiles
      const tileSize = 80;
      const startX = Math.floor((s.camX - 300) / tileSize) * tileSize;
      const startY = Math.floor((s.camY - 300) / tileSize) * tileSize;
      for (let wx = startX; wx < s.camX + 300; wx += tileSize) {
        for (let wy = startY; wy < s.camY + 300; wy += tileSize) {
          const tl = toScreen(wx, wy, s.camX, s.camY);
          const tr = toScreen(wx+tileSize, wy, s.camX, s.camY);
          const br = toScreen(wx+tileSize, wy+tileSize, s.camX, s.camY);
          const bl = toScreen(wx, wy+tileSize, s.camX, s.camY);
          ctx.beginPath();
          ctx.moveTo(tl.sx,tl.sy); ctx.lineTo(tr.sx,tr.sy);
          ctx.lineTo(br.sx,br.sy); ctx.lineTo(bl.sx,bl.sy);
          ctx.closePath();
          const xi = Math.floor(wx/tileSize), yi = Math.floor(wy/tileSize);
          ctx.fillStyle = (xi+yi)%2===0 ? "#09080f" : "#0c0b16";
          ctx.fill();
          ctx.strokeStyle = "rgba(67,56,202,0.07)";
          ctx.lineWidth = 1; ctx.stroke();
        }
      }

      // Training boundary walls
      const corners = [
        toScreen(60,60,s.camX,s.camY), toScreen(560,60,s.camX,s.camY),
        toScreen(560,560,s.camX,s.camY), toScreen(60,560,s.camX,s.camY),
      ];
      ctx.beginPath();
      corners.forEach((c,i) => i===0 ? ctx.moveTo(c.sx,c.sy) : ctx.lineTo(c.sx,c.sy));
      ctx.closePath();
      ctx.strokeStyle = `rgba(${energyDef.color.slice(1).match(/../g)!.map(h=>parseInt(h,16)).join(",")},0.2)`;
      ctx.lineWidth = 2; ctx.stroke();

      // Goal points (move phase)
      if (ph === "move") {
        s.goalPoints.forEach(gp => {
          const { sx, sy } = toScreen(gp.x, gp.y, s.camX, s.camY);
          const pulse = 0.5 + 0.5 * Math.sin(s.tick * 0.08);
          ctx.beginPath();
          ctx.arc(sx, sy, 14 + pulse*4, 0, Math.PI*2);
          ctx.fillStyle = gp.reached
            ? `rgba(34,197,94,0.3)` 
            : `rgba(${energyDef.color.slice(1).match(/../g)!.map(h=>parseInt(h,16)).join(",")},${0.2+pulse*0.2})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx, sy, 8, 0, Math.PI*2);
          ctx.fillStyle = gp.reached ? "#4ade80" : energyDef.color;
          ctx.fill();
        });
      }

      // Training pillar (strike phase)
      if (ph === "strike" || ph === "technique") {
        const { sx, sy } = toScreen(s.pillarX, s.pillarY, s.camX, s.camY);
        // shadow
        ctx.beginPath();
        ctx.ellipse(sx, sy+5, 18, 9, 0, 0, Math.PI*2);
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill();
        // pillar body
        ctx.fillStyle = "#252535";
        ctx.fillRect(sx-12, sy-50, 24, 55);
        ctx.fillStyle = "#1c1c2e";
        ctx.fillRect(sx-14, sy-50, 28, 8);
        ctx.fillStyle = "#2e2e45";
        ctx.fillRect(sx-14, sy+5, 28, 6);
        // crack glow from hits
        if (s.strikeCount > 0) {
          ctx.strokeStyle = energyDef.color + "88";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx-4, sy-45); ctx.lineTo(sx+2, sy-20); ctx.lineTo(sx-2, sy+2);
          ctx.stroke();
        }
        // hit flash
        if (s.attackAnim > 0) {
          ctx.beginPath();
          ctx.arc(sx, sy-25, 30, 0, Math.PI*2);
          ctx.fillStyle = `${energyDef.color}33`; ctx.fill();
        }
      }

      // Particles
      s.particles.forEach(p => {
        const { sx, sy } = toScreen(p.x, p.y, s.camX, s.camY);
        const alpha = p.life / 35;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Breathe phase CE meter in world
      if (ph === "breathe") {
        const { sx, sy } = toScreen(s.px, s.py, s.camX, s.camY);
        const rings = Math.floor(s.ceLevel * 3);
        for (let r = 0; r <= rings; r++) {
          ctx.beginPath();
          ctx.arc(sx, sy-20, 20 + r*12 + Math.sin(s.tick*0.1+r)*3, 0, Math.PI*2);
          ctx.strokeStyle = `${energyDef.color}${Math.floor((s.ceLevel*0.6-r*0.15)*255).toString(16).padStart(2,"0")}`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Special burst anim
      if (s.specialAnim > 0) {
        const { sx, sy } = toScreen(s.px, s.py, s.camX, s.camY);
        const prog = s.specialAnim / 20;
        ctx.beginPath();
        ctx.arc(sx, sy-16, 80*(1-prog), 0, Math.PI*2);
        ctx.strokeStyle = `${energyDef.color}${Math.floor(prog*200).toString(16).padStart(2,"0")}`;
        ctx.lineWidth = 4*prog;
        ctx.stroke();
      }

      // ── Player ──
      {
        const { sx, sy } = toScreen(s.px, s.py, s.camX, s.camY);
        const wc = s.walkCycle;
        const isMoving = Math.abs(s.vx) > 0.2 || Math.abs(s.vy) > 0.2;
        const legSwing = isMoving ? Math.sin(wc) * 6 : 0;
        const armSwing = isMoving ? Math.sin(wc + Math.PI) * 5 : 0;
        const flip = s.facing.x >= 0 ? 1 : -1;

        ctx.save();
        ctx.translate(sx, sy);

        // Shadow
        ctx.beginPath();
        ctx.ellipse(0, 4, 13, 6, 0, 0, Math.PI*2);
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill();

        // CE aura (grows with ceLevel)
        if (s.ceLevel > 0.05) {
          ctx.beginPath();
          ctx.arc(0, -14, 18 + Math.sin(s.tick*0.1)*2, 0, Math.PI*2);
          ctx.strokeStyle = `${energyDef.color}${Math.floor(s.ceLevel*180).toString(16).padStart(2,"0")}`;
          ctx.lineWidth = 2; ctx.stroke();
        }

        // Legs
        [[-flip*5, -legSwing], [flip*5, legSwing]].forEach(([lx, rot], li) => {
          ctx.fillStyle = "#111827";
          ctx.save();
          ctx.translate(lx as number, 0);
          ctx.rotate((rot as number)*0.04);
          ctx.fillRect(-3.5, 0, 7, 20);
          ctx.fillStyle = "#1f2937";
          ctx.fillRect(-4.5, 16, 10, 6);
          ctx.restore();
        });

        // Body
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-9, -24, 18, 22);
        ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 1;
        ctx.strokeRect(-9, -24, 18, 22);
        // Buttons
        ctx.fillStyle = "#2d3f5a";
        for (let i=0;i<4;i++) ctx.fillRect(-1, -22+i*5, 2, 2);

        // Arms
        [[-flip*(9+3-1), armSwing*0.05], [flip*(9+3-1), -armSwing*0.05]].forEach(([ax, rot]) => {
          ctx.fillStyle = "#0f172a";
          ctx.save();
          ctx.translate(ax as number, -21);
          ctx.rotate(rot as number);
          ctx.fillRect(-3, 0, 6, 16);
          ctx.fillStyle = "#d4a574";
          ctx.beginPath();
          ctx.arc(0, 18, 4, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
        });

        // Neck
        ctx.fillStyle = "#c9a87c";
        ctx.fillRect(-3, -29, 6, 7);

        // Head
        ctx.fillStyle = "#e8c9a0";
        ctx.beginPath();
        ctx.ellipse(0, -36, 7, 8, 0, 0, Math.PI*2);
        ctx.fill();

        // Hair
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.ellipse(0, -40, 7, 5, 0, 0, Math.PI*2);
        ctx.fill();
        [[-6,-38,-9,-46],[0,-41,0,-48],[6,-38,9,-46]].forEach(([x1,y1,x2,y2]) => {
          ctx.beginPath();
          ctx.moveTo(x1-3,y1); ctx.lineTo(x2,y2); ctx.lineTo(x1+3,y1);
          ctx.closePath(); ctx.fill();
        });

        // Eyes
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(flip-4,-35,5,3);
        ctx.fillRect(flip+3,-35,5,3);

        // Attack effect
        if (s.attackAnim > 0) {
          const ang = Math.atan2(s.facing.y, s.facing.x);
          const prog2 = s.attackAnim/12;
          ctx.beginPath();
          ctx.moveTo(0,-14);
          ctx.arc(0,-14, 48, ang-0.85, ang+0.85);
          ctx.closePath();
          ctx.fillStyle = `${energyDef.color}${Math.floor(prog2*80).toString(16).padStart(2,"0")}`;
          ctx.fill();
          ctx.strokeStyle = `${energyDef.color}${Math.floor(prog2*200).toString(16).padStart(2,"0")}`;
          ctx.lineWidth = 2.5; ctx.stroke();
        }

        ctx.restore();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dialogLines = DIALOGS[phase];
  const isInteractive = phase !== "intro" && phase !== "complete";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#07060f", display: "flex", flexDirection: "column" }}>
      {/* Canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: "block", width: "100%", height: "100%" }} />

        {/* Phase progress bar */}
        {isInteractive && (
          <div style={{
            position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
            width: 280, background: "rgba(0,0,0,0.65)",
            border: `1px solid ${energyDef.color}55`,
            borderRadius: 6, padding: "8px 14px",
          }}>
            <div style={{ color: energyDef.color, fontSize: 11, letterSpacing: "0.12em", marginBottom: 5 }}>
              {phase === "breathe" && "ПОЧУВСТВУЙ ЭНЕРГИЮ — удерживай ПРОБЕЛ"}
              {phase === "move" && `ДОЙДИ ДО ТОЧЕК — ${stateRef.current.goalPoints.filter(g=>g.reached).length} / 3`}
              {phase === "strike" && `УДАРЫ ПО СТОЛБУ — ${Math.min(5,stateRef.current.strikeCount)} / 5  [Z или X]`}
              {phase === "technique" && "ИСПОЛЬЗУЙ ТЕХНИКУ — [E]"}
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
              <div style={{
                height: "100%", width: `${phaseProgress * 100}%`,
                background: energyDef.color, borderRadius: 2,
                boxShadow: `0 0 8px ${energyDef.glowColor}`,
                transition: "width 0.2s",
              }} />
            </div>
          </div>
        )}

        {/* Energy indicator top-left */}
        <div style={{
          position: "absolute", top: 14, left: 14,
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(0,0,0,0.65)",
          border: `1px solid ${energyDef.color}44`,
          borderRadius: 6, padding: "6px 12px",
        }}>
          <span style={{ fontSize: 20, color: energyDef.color, textShadow: `0 0 10px ${energyDef.glowColor}` }}>
            {energyDef.kanji}
          </span>
          <div>
            <div style={{ color: energyDef.color, fontSize: 12, fontWeight: 700 }}>{energyDef.nameRu}</div>
            <div style={{ color: "#4c3a7a", fontSize: 10 }}>Тренировка · Уровень 1</div>
          </div>
        </div>
      </div>

      {/* Dialog box */}
      <div style={{
        background: "rgba(4,3,13,0.95)",
        borderTop: `1px solid ${energyDef.color}33`,
        padding: "18px 32px 18px",
        display: "flex", alignItems: "center", gap: 20,
        minHeight: 100,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#4c3a7a", fontSize: 10, letterSpacing: "0.2em", marginBottom: 6 }}>
            {phase === "intro" && "МАСТЕР ГОДЗЁ"}
            {phase === "breathe" && "НАСТАВНИК"}
            {phase === "move" && "ТРЕНИРОВОЧНАЯ ПЛОЩАДКА"}
            {phase === "strike" && "НАСТАВНИК"}
            {phase === "technique" && "НАСТАВНИК"}
            {phase === "complete" && "МАСТЕР ГОДЗЁ"}
          </div>
          <div style={{
            color: "#e2d9f3", fontSize: 15, lineHeight: 1.65,
            fontFamily: "'Georgia', serif",
          }}>
            {dialogLines[dialogIdx]}
          </div>
          {dialogIdx < dialogLines.length - 1 && (
            <div style={{ color: "#4c3a7a", fontSize: 10, marginTop: 8, letterSpacing: "0.1em" }}>
              ▼ нажми, чтобы продолжить
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          {/* Advance dialog or next phase */}
          {(phase === "intro" || phase === "complete") && (
            <button onClick={phase === "complete" ? finishTraining : advanceDialog} style={{
              background: "transparent",
              border: `1px solid ${energyDef.color}88`,
              color: energyDef.color,
              padding: "10px 28px",
              fontSize: 13, letterSpacing: "0.15em",
              cursor: "pointer",
              fontFamily: "'Georgia', serif",
              borderRadius: 4,
            }}>
              {phase === "complete" ? "НА ПОЛЕ БОЯ →" : dialogIdx < dialogLines.length - 1 ? "ДАЛЕЕ" : "НАЧАТЬ ТРЕНИРОВКУ"}
            </button>
          )}

          {/* Skip */}
          {showSkip && phase !== "complete" && (
            <button onClick={finishTraining} style={{
              background: "transparent", border: "none",
              color: "#3d2d60", fontSize: 11, cursor: "pointer",
              letterSpacing: "0.1em",
            }}>
              пропустить тренировку
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingScreen;

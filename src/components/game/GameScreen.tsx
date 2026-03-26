import { useEffect, useRef, useCallback } from "react";
import {
  EnergyType, getEnergyDef, CharacterProgress, xpForLevel, loadBindings,
  getTechniqueById, ALL_TECHNIQUES, BASE_ATTACK,
} from "./gameState";

interface Props {
  energy: EnergyType;
  progress: CharacterProgress;
  onGameOver: (finalProgress: CharacterProgress) => void;
  onVictory: (finalProgress: CharacterProgress) => void;
  onFlee: (finalProgress: CharacterProgress) => void;
}

const W = 900, H = 520;
// Бой — небольшая комната внутри дома
const WORLD_W = 1100, WORLD_H = 800;
const CAMERA_LERP = 0.12;
const ATTACK_RANGE = 56;
const ATTACK_COOLDOWN_BASE = 28;
const SPECIAL_COOLDOWN = 90;
// Зона входа (дверь) — игрок начинает здесь, здесь можно сбежать
const FLEE_ZONE = { x: WORLD_W/2 - 40, y: WORLD_H - 60, w: 80, h: 60 };

// Вид строго сверху — без перспективы
function toScreen(wx: number, wy: number, camX: number, camY: number) {
  return { sx: (wx - camX) + W / 2, sy: (wy - camY) + H / 2 };
}

interface Vec2 { x: number; y: number; }

interface Player {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  attackTimer: number; invincible: number;
  facing: Vec2;
  attacking: boolean; attackAnim: number;
  attackKeyHeld: boolean;
  ce: number; maxCe: number;
  specialTimer: number;
  walkCycle: number;
  chargeTimer: number; chargeReady: boolean;
  level: number; xp: number; xpToNext: number;
  xpGain: number; xpGainTimer: number;
  comboCount: number;
  healCooldown: number; // кулдаун обратной техники
}

interface Enemy {
  id: number;
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; alive: boolean;
  type: "curse" | "special";
  aiTimer: number; hitFlash: number;
  walkCycle: number; facing: number;
  frozen: boolean; frozenTimer: number;
  slowTimer: number;
  stuckTimer: number; lastX: number; lastY: number; // для обхода застревания
}

interface Obstacle { x: number; y: number; w: number; h: number; wallH: number; type: "building" | "pillar" | "ruin"; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; shape: "circle" | "spark" | "ring"; }
interface FloatText { x: number; y: number; text: string; color: string; life: number; vy: number; }

interface GameData {
  player: Player; enemies: Enemy[]; obstacles: Obstacle[];
  particles: Particle[]; floatTexts: FloatText[];
  camX: number; camY: number;
  keys: Set<string>; tick: number; running: boolean;
  won: boolean;
}

let enemyIdCounter = 0;

// Препятствия внутри комнаты — алтари, колонны, мебель
const createObstacles = (): Obstacle[] => {
  const obs: Obstacle[] = [];
  const rng = (a: number, b: number) => a + Math.random() * (b - a);
  // Колонны по углам
  [[120,100],[WORLD_W-160,100],[120,WORLD_H-180],[WORLD_W-160,WORLD_H-180]].forEach(([cx,cy])=>{
    obs.push({ x:cx-18, y:cy-18, w:36, h:36, wallH:60, type:"pillar" });
  });
  // Случайные объекты по центру
  for (let i=0;i<4;i++) {
    obs.push({ x:rng(200,WORLD_W-250), y:rng(120,WORLD_H-250), w:rng(35,70), h:rng(30,55), wallH:rng(40,80), type:"ruin" });
  }
  return obs;
};

// Враги внутри комнаты — меньше, но плотнее
const spawnEnemies = (): Enemy[] => {
  const positions = [
    {x:200,y:150},{x:550,y:120},{x:900,y:160},
    {x:180,y:380},{x:550,y:350},{x:920,y:400},
    {x:300,y:580},{x:750,y:560},
    {x:500,y:220},{x:700,y:450},{x:350,y:450},{x:650,y:250},
  ];
  return positions.map((p,i) => {
    const isSpecial = i%4===3;
    return {
      id: ++enemyIdCounter,
      x:p.x, y:p.y, vx:0, vy:0,
      hp:isSpecial?8:3, maxHp:isSpecial?8:3,
      alive:true, type:isSpecial?"special":"curse",
      aiTimer:Math.floor(Math.random()*120), hitFlash:0,
      walkCycle:Math.random()*Math.PI*2, facing:1,
      frozen:false, frozenTimer:0, slowTimer:0,
      stuckTimer:0, lastX:p.x, lastY:p.y,
    };
  });
};

const circleRect = (cx:number,cy:number,r:number,rx:number,ry:number,rw:number,rh:number) => {
  const nx=Math.max(rx,Math.min(cx,rx+rw)), ny=Math.max(ry,Math.min(cy,ry+rh));
  return (cx-nx)**2+(cy-ny)**2<r*r;
};

// ── Комната (интерьер) ────────────────────────────────────────────────────────
const drawRoom = (ctx: CanvasRenderingContext2D, camX: number, camY: number, tick: number) => {
  // Фон за комнатой
  ctx.fillStyle = "#0a0008"; ctx.fillRect(0,0,W,H);

  const tl = toScreen(0, 0, camX, camY);
  const br = toScreen(WORLD_W, WORLD_H, camX, camY);
  const roomW = br.sx - tl.sx;
  const roomH = br.sy - tl.sy;

  // Пол — деревянные доски (горизонтальные полосы)
  ctx.fillStyle = "#1a1008"; ctx.fillRect(tl.sx, tl.sy, roomW, roomH);
  const boardH = 28;
  for (let by = 0; by < WORLD_H; by += boardH) {
    const bs = toScreen(0, by, camX, camY);
    const be = toScreen(WORLD_W, by, camX, camY);
    if (bs.sy < -4 || bs.sy > H+4) continue;
    const shade = (Math.floor(by/boardH)%2===0) ? "#1e1408" : "#180f06";
    ctx.fillStyle = shade;
    const beh = Math.min(boardH, toScreen(0,by+boardH,camX,camY).sy - bs.sy);
    ctx.fillRect(tl.sx, bs.sy, roomW, beh);
    // Линия доски
    ctx.strokeStyle = "rgba(80,50,20,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bs.sx, bs.sy); ctx.lineTo(be.sx, be.sy); ctx.stroke();
    // Прожилки дерева
    if (Math.floor(by/boardH)%3===0) {
      ctx.strokeStyle = "rgba(60,35,10,0.15)"; ctx.lineWidth = 0.5;
      const mid = toScreen(WORLD_W*0.3, by+boardH/2, camX, camY);
      const mid2 = toScreen(WORLD_W*0.7, by+boardH/2, camX, camY);
      ctx.beginPath(); ctx.moveTo(bs.sx, bs.sy+beh*0.5); ctx.lineTo(mid.sx, mid.sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mid.sx, mid.sy); ctx.lineTo(mid2.sx, mid2.sy); ctx.stroke();
    }
  }

  // Стены (толстые)
  const wallThick = 22;
  ctx.fillStyle = "#120820";
  // Верхняя стена
  ctx.fillRect(tl.sx - wallThick, tl.sy - wallThick, roomW + wallThick*2, wallThick);
  // Боковые
  ctx.fillRect(tl.sx - wallThick, tl.sy - wallThick, wallThick, roomH + wallThick*2);
  ctx.fillRect(br.sx, tl.sy - wallThick, wallThick, roomH + wallThick*2);
  // Нижняя (с дверным проёмом)
  const doorSx = toScreen(FLEE_ZONE.x, WORLD_H, camX, camY);
  const doorEx = toScreen(FLEE_ZONE.x + FLEE_ZONE.w, WORLD_H, camX, camY);
  ctx.fillRect(tl.sx - wallThick, br.sy, doorSx.sx - tl.sx + wallThick, wallThick);
  ctx.fillRect(doorEx.sx, br.sy, br.sx - doorEx.sx + wallThick, wallThick);

  // Рамки стен
  ctx.strokeStyle = "#2d1b50"; ctx.lineWidth = 2;
  ctx.strokeRect(tl.sx, tl.sy, roomW, roomH);

  // Окна на боковых стенах
  [[0.25, 0.2], [0.25, 0.6], [0.75, 0.2], [0.75, 0.6]].forEach(([fx, fy]) => {
    const wx = toScreen(fx < 0.5 ? 0 : WORLD_W, fy * WORLD_H, camX, camY);
    const pulse = 0.4 + 0.15*Math.sin(tick*0.04 + fx*10);
    ctx.fillStyle = `rgba(109,40,217,${pulse*0.3})`;
    ctx.fillRect(wx.sx + (fx < 0.5 ? -wallThick : 0), wx.sy - 15, wallThick, 30);
    ctx.strokeStyle = `rgba(139,92,246,${pulse})`; ctx.lineWidth = 1;
    ctx.strokeRect(wx.sx + (fx < 0.5 ? -wallThick : 0), wx.sy - 15, wallThick, 30);
  });

  // Дверь — выход (снизу по центру)
  const dSx = toScreen(FLEE_ZONE.x, WORLD_H - 10, camX, camY);
  ctx.fillStyle = "#2d1040";
  ctx.fillRect(dSx.sx, dSx.sy - 20, doorEx.sx - dSx.sx, 30);
  ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 1.5;
  ctx.strokeRect(dSx.sx, dSx.sy - 20, doorEx.sx - dSx.sx, 30);
  ctx.fillStyle = "#a855f7"; ctx.font = "9px monospace"; ctx.textAlign = "center";
  ctx.fillText("ВЫХОД", dSx.sx + (doorEx.sx - dSx.sx)/2, dSx.sy - 5);
  ctx.textAlign = "left";

  // CE-знаки на полу (проклятые символы)
  [[0.3, 0.4], [0.7, 0.6], [0.5, 0.25], [0.2, 0.7], [0.8, 0.3]].forEach(([fx, fy], i) => {
    const sc = toScreen(fx * WORLD_W, fy * WORLD_H, camX, camY);
    if (sc.sx < 0 || sc.sx > W || sc.sy < 0 || sc.sy > H) return;
    const pulse2 = 0.06 + 0.04*Math.sin(tick*0.05 + i*1.3);
    ctx.strokeStyle = `rgba(109,40,217,${pulse2})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sc.sx, sc.sy, 25, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(sc.sx, sc.sy, 12, 0, Math.PI*2); ctx.stroke();
    for (let k=0;k<6;k++) {
      const a = (k/6)*Math.PI*2 + tick*0.003;
      ctx.beginPath();
      ctx.moveTo(sc.sx + Math.cos(a)*12, sc.sy + Math.sin(a)*12);
      ctx.lineTo(sc.sx + Math.cos(a)*25, sc.sy + Math.sin(a)*25);
      ctx.stroke();
    }
  });
};

// ── Препятствие — вид сверху ──────────────────────────────────────────────────
const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, camX: number, camY: number) => {
  const tl=toScreen(obs.x,obs.y,camX,camY);
  const br=toScreen(obs.x+obs.w,obs.y+obs.h,camX,camY);
  if (br.sx<-10||tl.sx>W+10||br.sy<-10||tl.sy>H+10) return;
  const rw = br.sx-tl.sx, rh = br.sy-tl.sy;
  if (obs.type==="pillar") {
    ctx.fillStyle="#1c1c2e"; ctx.fillRect(tl.sx,tl.sy,rw,rh);
    ctx.strokeStyle="#4a4a6a"; ctx.lineWidth=1.5; ctx.strokeRect(tl.sx,tl.sy,rw,rh);
    // Каменный узор сверху
    ctx.fillStyle="#252535"; ctx.fillRect(tl.sx+3,tl.sy+3,rw-6,rh-6);
    ctx.strokeStyle="#3a3a5a"; ctx.lineWidth=0.5; ctx.strokeRect(tl.sx+3,tl.sy+3,rw-6,rh-6);
  } else {
    // Алтарь / обломки
    ctx.fillStyle="#18181a"; ctx.fillRect(tl.sx,tl.sy,rw,rh);
    ctx.strokeStyle="#4c1d95"; ctx.lineWidth=1; ctx.strokeRect(tl.sx,tl.sy,rw,rh);
    ctx.fillStyle="rgba(109,40,217,0.12)";
    ctx.fillRect(tl.sx+2,tl.sy+2,rw-4,rh-4);
  }
};

// ── Игрок ────────────────────────────────────────────────────────────────────
const drawPlayer = (
  ctx: CanvasRenderingContext2D, p: Player, tick: number,
  camX: number, camY: number, energyColor: string, glowColor: string
) => {
  const { sx, sy } = toScreen(p.x, p.y, camX, camY);
  if (p.invincible>0 && Math.floor(tick/3)%2===0) return;
  const isMoving = Math.abs(p.vx)>0.2||Math.abs(p.vy)>0.2;
  const walkFrame = Math.floor(p.walkCycle / 5) % 4;
  const flip = p.facing.x>=0 ? 1 : -1;

  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.imageSmoothingEnabled = false;

  // Заряд max (только при удержании)
  if (p.chargeTimer>30) {
    const cp = Math.min(1,(p.chargeTimer-30)/60);
    ctx.beginPath(); ctx.arc(0,-18,24,-Math.PI/2,-Math.PI/2+Math.PI*2*cp);
    ctx.strokeStyle = p.chargeReady ? "#f0abfc" : `rgba(192,132,252,${cp})`;
    ctx.lineWidth = 2.5; ctx.stroke();
  }
  // Зеленый ореол лечения
  if (p.healCooldown > 0 && p.healCooldown > 450) {
    // только показываем что недавно исцелились
  }

  const legL_dy = isMoving ? (walkFrame<2?-2:2) : 0;
  const legR_dy = isMoving ? (walkFrame<2?2:-2) : 0;
  const legColor = "#0f1a2e";
  const bootColor = "#0a0f1c";
  ctx.fillStyle = legColor; ctx.fillRect(-8, legL_dy, 6, 16);
  ctx.fillStyle = bootColor; ctx.fillRect(-9, 14+legL_dy, 8, 5);
  ctx.fillStyle = legColor; ctx.fillRect(2, legR_dy, 6, 16);
  ctx.fillStyle = bootColor; ctx.fillRect(1, 14+legR_dy, 8, 5);

  ctx.fillStyle = "#0f172a"; ctx.fillRect(-9, -22, 18, 22);
  ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 1; ctx.strokeRect(-9, -22, 18, 22);
  ctx.beginPath(); ctx.moveTo(-4, -22); ctx.lineTo(0, -16); ctx.lineTo(4, -22);
  ctx.strokeStyle = "#2d4a7a"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = energyColor;
  for (let i=0;i<3;i++) { ctx.beginPath(); ctx.arc(0, -18+i*5, 1.5, 0, Math.PI*2); ctx.fill(); }

  const armSwing = isMoving ? (walkFrame%2===0?2:-2) : 0;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-13, -20+armSwing, 5, 15);
  ctx.fillRect(8, -20-armSwing, 5, 15);
  if (p.attacking && p.attackAnim>0) {
    const armX = flip>0 ? 8 : -13;
    const reach = (p.attackAnim/12)*8;
    ctx.fillStyle = energyColor+"88";
    ctx.fillRect(armX+flip*reach, -20-armSwing*flip, 5, 15);
  }
  ctx.fillStyle = "#d4a574";
  ctx.fillRect(-13, -6+armSwing, 5, 5);
  ctx.fillRect(8, -6-armSwing, 5, 5);

  ctx.fillStyle = "#c9a87c"; ctx.fillRect(-2, -27, 4, 6);
  ctx.fillStyle = "#e8c9a0"; ctx.fillRect(-7, -38, 14, 14);
  ctx.strokeStyle = "#c9a87c"; ctx.lineWidth = 1; ctx.strokeRect(-7, -38, 14, 14);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(-7, -42, 14, 6);
  ctx.fillRect(-9, -40, 3, 8); ctx.fillRect(6,  -40, 3, 8);
  for (let i=0;i<3;i++) {
    ctx.beginPath();
    ctx.moveTo(-5+i*5, -42); ctx.lineTo(-3+i*5, -47); ctx.lineTo(-1+i*5, -42);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(-5, -33, 4, 3); ctx.fillRect(1, -33, 4, 3);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(-5+(flip>0?2:0), -33, 2, 3);
  ctx.fillRect(1+(flip>0?2:0),  -33, 2, 3);
  ctx.fillStyle = "#111";
  ctx.fillRect(-6, -36, 5, 2); ctx.fillRect(1, -36, 5, 2);

  if (p.attacking && p.attackAnim>0) {
    const prog = p.attackAnim/12;
    const ang = Math.atan2(p.facing.y, p.facing.x);
    ctx.beginPath(); ctx.moveTo(0,-18);
    ctx.arc(0,-18,ATTACK_RANGE*0.65,ang-0.85,ang+0.85); ctx.closePath();
    ctx.fillStyle = `${energyColor}${Math.floor(prog*50).toString(16).padStart(2,"0")}`;
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,-18);
    ctx.arc(0,-18,ATTACK_RANGE*0.65,ang-0.85,ang+0.85); ctx.closePath();
    ctx.strokeStyle = `${glowColor}${Math.floor(prog*180).toString(16).padStart(2,"0")}`;
    ctx.lineWidth = 2.5; ctx.stroke();
  }

  ctx.restore();
};

// ── Враг — гуманоидный проклятый дух ─────────────────────────────────────────
const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy, camX: number, camY: number, tick: number) => {
  if (!e.alive) return;
  const { sx, sy } = toScreen(e.x, e.y, camX, camY);
  if (sx<-80||sx>W+80||sy<-150||sy>H+80) return;
  const flash = e.hitFlash > 0;
  const isSpecial = e.type === "special";

  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.imageSmoothingEnabled = false;

  const scale = isSpecial ? 1.35 : 1.0;
  ctx.scale(scale, scale);

  const walkFrame = Math.floor(e.walkCycle / 5) % 4;
  const isMoving = Math.abs(e.vx) > 0.1 || Math.abs(e.vy) > 0.1;
  const legLdy = isMoving ? (walkFrame<2?-2:2) : 0;
  const legRdy = isMoving ? (walkFrame<2?2:-2) : 0;
  const armSwing = isMoving ? (walkFrame%2===0?2:-2) : 0;
  const flip = e.facing >= 0 ? 1 : -1;

  // CE-ореол вокруг духа (фиолетовый)
  const pulse = 0.4 + 0.25 * Math.sin(tick * 0.07 + e.id);
  if (!flash) {
    const grad = ctx.createRadialGradient(0, -20, 4, 0, -20, isSpecial ? 30 : 22);
    grad.addColorStop(0, `rgba(109,40,217,0)`);
    grad.addColorStop(0.6, `rgba(109,40,217,${pulse * 0.35})`);
    grad.addColorStop(1, `rgba(109,40,217,0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(-30, -50, 60, 60);
  }

  // Тень
  ctx.beginPath(); ctx.ellipse(0, 2, isSpecial?12:9, isSpecial?5:4, 0, 0, Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill();

  const skinColor = flash ? "#fff" : (isSpecial ? "#3b0764" : "#1e1b4b");
  const clothColor = flash ? "#eee" : (isSpecial ? "#1a0a2e" : "#1e1b4b");
  const eyeColor = flash ? "#fbbf24" : "#a855f7";
  const markColor = flash ? "#fbbf24" : (isSpecial ? "#ef4444" : "#7c3aed");

  // ── Ноги ──
  ctx.fillStyle = clothColor;
  ctx.fillRect(-7, legLdy, 5, 15);
  ctx.fillRect(2, legRdy, 5, 15);
  // Ступни (слегка деформированные)
  ctx.fillStyle = skinColor;
  ctx.fillRect(-8, 14+legLdy, 7, 4);
  ctx.fillRect(1, 14+legRdy, 7, 4);

  // ── Тело ──
  ctx.fillStyle = clothColor;
  ctx.fillRect(-8, -20, 16, 22);
  // Полосы/узоры CE на теле
  ctx.strokeStyle = markColor;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.moveTo(-8,-14); ctx.lineTo(8,-14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4,-20); ctx.lineTo(-4,-4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4,-20); ctx.lineTo(4,-4); ctx.stroke();
  ctx.setLineDash([]);

  // ── Руки ──
  ctx.fillStyle = skinColor;
  ctx.fillRect(flip > 0 ? -13 : 8, -18+armSwing, 5, 14);
  ctx.fillRect(flip > 0 ? 8 : -13, -18-armSwing, 5, 14);
  // Когти/пальцы
  ctx.fillStyle = markColor;
  const clawX = flip > 0 ? -13 : 8;
  for (let c=0;c<3;c++) {
    ctx.fillRect(clawX+c*1.5, -5+armSwing, 2, 4);
  }

  // ── Шея ──
  ctx.fillStyle = skinColor; ctx.fillRect(-2, -25, 4, 6);

  // ── Голова ──
  ctx.fillStyle = skinColor;
  // Слегка искажённая голова (угловатая у обычных, большая у особых)
  if (isSpecial) {
    ctx.fillRect(-9, -42, 18, 20);
    // Маска / деформация
    ctx.strokeStyle = markColor; ctx.lineWidth = 1.5;
    ctx.strokeRect(-9, -42, 18, 20);
    // Рога
    ctx.fillStyle = markColor;
    ctx.beginPath(); ctx.moveTo(-8,-42); ctx.lineTo(-6,-50); ctx.lineTo(-4,-42); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4,-42); ctx.lineTo(6,-50); ctx.lineTo(8,-42); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillRect(-7, -38, 14, 16);
  }
  ctx.strokeStyle = flash ? "#f0abfc" : markColor; ctx.lineWidth = 0.8;
  ctx.strokeRect(isSpecial?-9:-7, isSpecial?-42:-38, isSpecial?18:14, isSpecial?20:16);

  // ── Глаза (CE-светящиеся) ──
  ctx.fillStyle = eyeColor;
  if (isSpecial) {
    ctx.fillRect(-6, -37, 5, 4);
    ctx.fillRect(1, -37, 5, 4);
    // Дополнительный глаз на лбу
    ctx.beginPath(); ctx.arc(0, -40, 2.5, 0, Math.PI*2);
    ctx.fillStyle = flash ? "#fbbf24" : "#ef4444"; ctx.fill();
  } else {
    ctx.fillRect(-4, -33, 3, 3);
    ctx.fillRect(1, -33, 3, 3);
  }

  // Свечение глаз
  if (!flash) {
    ctx.shadowColor = eyeColor; ctx.shadowBlur = 6;
    ctx.fillStyle = eyeColor;
    ctx.fillRect(isSpecial?-6:-4, isSpecial?-37:-33, isSpecial?5:3, isSpecial?4:3);
    ctx.fillRect(isSpecial?1:-1+isSpecial?4:1, isSpecial?-37:-33, isSpecial?5:3, isSpecial?4:3);
    ctx.shadowBlur = 0;
  }

  // ── Рот (проклятая улыбка) ──
  ctx.strokeStyle = markColor; ctx.lineWidth = 1;
  if (isSpecial) {
    ctx.beginPath();
    ctx.moveTo(-6,-29); ctx.lineTo(6,-29);
    for (let t=0;t<4;t++) { ctx.lineTo(-5+t*3.5,-26); ctx.lineTo(-3+t*3.5,-29); }
    ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0,-27,3,0,Math.PI); ctx.stroke();
  }

  ctx.restore();

  // HP-бар
  const bw = e.type==="special"?50:36;
  const hby = sy-(e.type==="special"?65:46), hbx=sx-bw/2;
  ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(hbx-1,hby-1,bw+2,7);
  ctx.fillStyle="#ef4444"; ctx.fillRect(hbx,hby,bw,5);
  ctx.fillStyle="#22c55e"; ctx.fillRect(hbx,hby,bw*(e.hp/e.maxHp),5);
};

const drawParticle = (ctx: CanvasRenderingContext2D, pt: Particle, camX: number, camY: number) => {
  const { sx, sy } = toScreen(pt.x,pt.y,camX,camY);
  const a = pt.life/pt.maxLife;
  ctx.globalAlpha = a;
  if (pt.shape==="ring") {
    ctx.beginPath(); ctx.arc(sx,sy,pt.size*(1.5-a),0,Math.PI*2);
    ctx.strokeStyle=pt.color; ctx.lineWidth=2; ctx.stroke();
  } else if (pt.shape==="spark") {
    const { sx:tx, sy:ty }=toScreen(pt.x-pt.vx*3,pt.y-pt.vy*3,camX,camY);
    ctx.strokeStyle=pt.color; ctx.lineWidth=pt.size*0.5; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(tx,ty); ctx.stroke();
  } else {
    ctx.fillStyle=pt.color; ctx.beginPath(); ctx.arc(sx,sy,pt.size*a+0.5,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
};

// ── HUD ──────────────────────────────────────────────────────────────────────
const drawHUD = (
  ctx: CanvasRenderingContext2D, p: Player,
  energyColor: string, activeTechName: string,
  specialTimer: number, specialCooldownMax: number,
  enemiesAlive: number, totalEnemies: number,
  tick: number, questName: string | null, questProg: number, questGoal: number
) => {
  // ── HP ──
  ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(12,12,190,22);
  const hpPct=p.hp/p.maxHp;
  ctx.fillStyle=hpPct>0.6?"#22c55e":hpPct>0.3?"#f59e0b":"#ef4444";
  ctx.fillRect(14,14,186*hpPct,18);
  ctx.strokeStyle="#4338ca"; ctx.lineWidth=1; ctx.strokeRect(12,12,190,22);
  ctx.fillStyle="#f1f5f9"; ctx.font="bold 11px monospace";
  ctx.fillText(`HP  ${p.hp} / ${p.maxHp}`,18,26);

  // ── CE ──
  ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(12,40,190,14);
  const cePct=p.ce/p.maxCe;
  ctx.fillStyle=energyColor; ctx.fillRect(14,42,186*cePct,10);
  ctx.strokeStyle="#4338ca"; ctx.strokeRect(12,40,190,14);
  ctx.fillStyle="#c4b5fd"; ctx.font="9px monospace";
  ctx.fillText(`CE  ${Math.floor(p.ce)}/${p.maxCe}`,16,51);

  // ── XP ──
  ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(12,60,190,12);
  const xpPct=p.xp/p.xpToNext;
  ctx.fillStyle="#fbbf24"; ctx.fillRect(14,62,186*xpPct,8);
  ctx.strokeStyle="#4338ca"; ctx.strokeRect(12,60,190,12);
  ctx.fillStyle="#fde68a"; ctx.font="8px monospace";
  ctx.fillText(`XP  ${p.xp}/${p.xpToNext}  Ур.${p.level}`,16,70);

  // ── Активная техника ──
  ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(12,78,190,20);
  ctx.strokeStyle=energyColor+"44"; ctx.strokeRect(12,78,190,20);
  ctx.fillStyle=energyColor; ctx.font="bold 10px monospace";
  ctx.fillText(`[E]  ${activeTechName.slice(0,22)}`,18,92);

  // ── Счётчик врагов ──
  const alive = enemiesAlive;
  const pulse = 0.7+0.3*Math.sin(tick*0.1);
  const counterColor = alive===0?"#22c55e":"#f87171";
  ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(W/2-70,8,140,24);
  ctx.strokeStyle=`${counterColor}88`; ctx.lineWidth=1; ctx.strokeRect(W/2-70,8,140,24);
  ctx.fillStyle=alive===0?`rgba(34,197,94,${pulse})`:counterColor;
  ctx.font="bold 12px monospace"; ctx.textAlign="center";
  ctx.fillText(alive===0?"✓ ВСЕ ДУХИ":`Духи: ${alive} / ${totalEnemies}`,W/2,24);
  ctx.textAlign="left";

  // ── Квест-HUD ──
  if (questName) {
    const qx = W - 220, qy = 10;
    const qPct = Math.min(1, questProg / Math.max(1, questGoal));
    ctx.fillStyle="rgba(0,0,0,0.8)"; ctx.fillRect(qx, qy, 210, 54);
    ctx.strokeStyle="rgba(124,58,237,0.5)"; ctx.lineWidth=1; ctx.strokeRect(qx, qy, 210, 54);
    ctx.fillStyle="#7c3aed"; ctx.font="8px monospace";
    ctx.fillText("✦ КВЕСТ", qx+8, qy+14);
    ctx.fillStyle="#c4b5fd"; ctx.font="bold 9px monospace";
    ctx.fillText(questName.slice(0,28), qx+8, qy+26);
    ctx.fillStyle="#6b7280"; ctx.font="8px monospace";
    ctx.fillText(`${questProg} / ${questGoal}`, qx+8, qy+38);
    ctx.fillStyle="rgba(255,255,255,0.1)"; ctx.fillRect(qx+8, qy+43, 194, 4);
    ctx.fillStyle=qPct>=1?"#22c55e":"#7c3aed"; ctx.fillRect(qx+8, qy+43, 194*qPct, 4);
  }

  // ── XP float ──
  if (p.xpGainTimer>0&&p.xpGain>0) {
    const a=Math.min(1,p.xpGainTimer/20);
    ctx.globalAlpha=a;
    ctx.fillStyle="#fbbf24"; ctx.font="bold 14px monospace"; ctx.textAlign="center";
    ctx.fillText(`+${p.xpGain} XP`,W/2,(H/2)-20+((45-p.xpGainTimer)*1.2));
    ctx.textAlign="left"; ctx.globalAlpha=1;
  }

  // ── Слот техники [E] ──
  const bx=12, by=H-56;
  const onCd = specialTimer > 0;
  ctx.fillStyle="rgba(0,0,0,0.85)"; ctx.fillRect(bx,by,50,50);
  ctx.strokeStyle=onCd?"#4338ca":"#7c3aed"; ctx.lineWidth=1; ctx.strokeRect(bx,by,50,50);
  ctx.fillStyle=onCd?"#4c3a7a":"#c4b5fd"; ctx.font="bold 12px monospace";
  ctx.fillText("[E]",bx+7,by+16);
  if (onCd) {
    const cdPct=specialTimer/specialCooldownMax;
    ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(bx,by,50,50*cdPct);
    ctx.fillStyle="#a78bfa"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
    ctx.fillText(`${Math.ceil(specialTimer/60)}s`,bx+25,by+38); ctx.textAlign="left";
  } else {
    ctx.fillStyle="#4ade80"; ctx.font="8px monospace";
    ctx.fillText("ГОТОВ",bx+5,by+38);
  }

  // (Подсказка побега показывается прямо на карте у двери, не в HUD)
};

// ─── Компонент ───────────────────────────────────────────────────────────────

const GameScreen = ({ energy, progress, onGameOver, onVictory, onFlee }: Props) => {
  const energyDef = getEnergyDef(energy);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData | null>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef<CharacterProgress>({ ...progress });
  const bindings = useRef(loadBindings());

  // Определяем активную технику из прогресса
  const getActiveTechnique = () => {
    const eq = progress.equippedTechniques;
    if (!eq || eq.length === 0) return BASE_ATTACK;
    const idx = Math.min(progress.activeSlot ?? 0, eq.length - 1);
    return getTechniqueById(eq[idx]) ?? BASE_ATTACK;
  };

  const activeTechRef = useRef(getActiveTechnique());
  const activeTechCooldownMax = useRef(Math.round((activeTechRef.current.cooldownSec || 1.5) * 60));

  const addParticle = (g: GameData, x: number, y: number, color: string, count=5, shape: Particle["shape"]="circle") => {
    for (let i=0;i<count;i++) {
      g.particles.push({ x,y, vx:(Math.random()-0.5)*7, vy:(Math.random()-0.5)*7,
        life:25+Math.random()*20, maxLife:45, color, size:3+Math.random()*4, shape });
    }
  };

  const addFloat = (g: GameData, x: number, y: number, text: string, color: string) => {
    g.floatTexts.push({ x,y,text,color,life:40,vy:-1.2 });
  };

  const gainXp = useCallback((g: GameData, amount: number) => {
    const p=g.player;
    p.xp+=amount; p.xpGain=amount; p.xpGainTimer=45;
    if (p.xp>=p.xpToNext) {
      p.level++; p.xp-=p.xpToNext; p.xpToNext=xpForLevel(p.level);
      p.maxHp=Math.floor(8*energyDef.statMods.defense+(p.level-1)*2);
      p.hp=Math.min(p.hp+3,p.maxHp);
      p.maxCe=100+(p.level-1)*10;
      addFloat(g,p.x,p.y-30,`УР. ${p.level}!`,"#fbbf24");
    }
    progressRef.current.level=p.level;
    progressRef.current.xp=p.xp;
    progressRef.current.xpToNext=p.xpToNext;
  }, [energyDef.statMods.defense]);

  const initGame = useCallback(() => {
    const emod=energyDef.statMods;
    // Игрок стартует у входа (нижний центр комнаты)
    const player: Player = {
      x:WORLD_W/2, y:WORLD_H-50, vx:0,vy:0,
      hp:Math.floor(8*emod.defense+(progress.level-1)*2),
      maxHp:Math.floor(8*emod.defense+(progress.level-1)*2),
      attackTimer:0,invincible:0,
      facing:{x:1,y:0},
      attacking:false,attackAnim:0,
      attackKeyHeld:false,
      ce:100+(progress.level-1)*10,
      maxCe:100+(progress.level-1)*10,
      specialTimer:0,walkCycle:0,
      chargeTimer:0,chargeReady:false,
      level:progress.level,xp:progress.xp,xpToNext:progress.xpToNext,
      xpGain:0,xpGainTimer:0,
      comboCount:0,
      healCooldown:0,
    };
    gameRef.current={
      player,enemies:spawnEnemies(),obstacles:createObstacles(),
      particles:[],floatTexts:[],
      camX:WORLD_W/2, camY:WORLD_H/2,
      keys:new Set(),tick:0,running:true,won:false,
    };
  }, [energyDef.statMods, progress]);

  useEffect(() => {
    initGame();
    bindings.current = loadBindings();
    activeTechRef.current = getActiveTechnique();
    activeTechCooldownMax.current = Math.max(30, Math.round((activeTechRef.current.cooldownSec || 1.5) * 60));

    const canvas=canvasRef.current;
    if (!canvas) return;
    const ctx=canvas.getContext("2d");
    if (!ctx) return;

    const onKeyDown=(e: KeyboardEvent)=>{
      const g=gameRef.current; if (!g) return;
      g.keys.add(e.code);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
    };
    const onKeyUp=(e: KeyboardEvent)=>{
      const g=gameRef.current; if (!g) return;
      g.keys.delete(e.code);
    };
    window.addEventListener("keydown",onKeyDown);
    window.addEventListener("keyup",onKeyUp);

    const emod=energyDef.statMods;
    const SPEED=emod.speed*2.8;
    const pr=12;
    const b=bindings.current;
    const tech = activeTechRef.current;
    const techCdMax = activeTechCooldownMax.current;

    const gameLoop=()=>{
      const g=gameRef.current;
      if (!g||!g.running) return;
      g.tick++;
      const { player:p, enemies, obstacles, keys }=g;

      // ── Побег — только у входа (зона двери) ──
      const inFleeZone = p.x >= FLEE_ZONE.x && p.x <= FLEE_ZONE.x+FLEE_ZONE.w
        && p.y >= FLEE_ZONE.y && p.y <= WORLD_H;
      if (inFleeZone && (keys.has(b.flee||"Escape")||keys.has("Escape"))) {
        g.running=false;
        progressRef.current.level=p.level;
        progressRef.current.xp=p.xp;
        progressRef.current.xpToNext=p.xpToNext;
        onFlee({...progressRef.current});
        return;
      }

      // ── Движение ──
      let mvx=0, mvy=0;
      if (keys.has(b.left)||keys.has("ArrowLeft"))  mvx-=1;
      if (keys.has(b.right)||keys.has("ArrowRight")) mvx+=1;
      if (keys.has(b.up)||keys.has("ArrowUp"))       mvy-=1;
      if (keys.has(b.down)||keys.has("ArrowDown"))   mvy+=1;

      if (mvx!==0||mvy!==0) {
        const len=Math.sqrt(mvx*mvx+mvy*mvy);
        p.vx=(mvx/len)*SPEED; p.vy=(mvy/len)*SPEED;
        p.facing={ x:mvx/len, y:mvy/len };
        p.walkCycle+=0.18;
      } else {
        p.vx*=0.5; p.vy*=0.5;
      }

      // Коллизии с препятствиями
      const nx=p.x+p.vx, ny=p.y+p.vy;
      let bx2=false,by2=false;
      obstacles.forEach(o=>{
        if (circleRect(nx,p.y,pr,o.x,o.y,o.w,o.h)) bx2=true;
        if (circleRect(p.x,ny,pr,o.x,o.y,o.w,o.h)) by2=true;
      });
      if (!bx2) p.x=nx; if (!by2) p.y=ny;
      p.x=Math.max(pr,Math.min(WORLD_W-pr,p.x));
      p.y=Math.max(pr,Math.min(WORLD_H-pr,p.y));

      // ── Атака — 1 кнопка, нужно отпустить ──
      const atkKeyDown = keys.has(b.attack);
      if (!atkKeyDown) p.attackKeyHeld = false;

      // Заряд (для max/infinity)
      if (atkKeyDown && energy==="infinity") {
        p.chargeTimer++; if (p.chargeTimer>90) p.chargeReady=true;
      }

      const canAtk = !p.attackKeyHeld && p.attackTimer<=0;
      const normalAtk = atkKeyDown && canAtk;

      if (normalAtk) {
        p.attacking=true;
        p.attackTimer=Math.max(16,Math.floor(ATTACK_COOLDOWN_BASE/emod.attackSpeed));
        p.attackAnim=12;
        p.attackKeyHeld = true;
        if (energy==="infinity") { p.chargeTimer=0; p.chargeReady=false; }
        p.comboCount=(p.comboCount+1)%8;
        const nfx=p.facing.x, nfy=p.facing.y;

        enemies.forEach(e=>{
          if (!e.alive) return;
          const dx=e.x-p.x, dy=e.y-p.y;
          const dist=Math.sqrt(dx*dx+dy*dy);
          const dot=nfx*dx+nfy*dy;
          if (dist<ATTACK_RANGE+e.maxHp&&dot>-8) {
            let dmg=Math.max(1,Math.floor(emod.damage));
            if (energy==="sukuna"&&Math.random()<0.3) { dmg*=2; addFloat(g,e.x,e.y,"×2","#f87171"); }
            if (energy==="ratio"&&p.comboCount===6) { dmg=Math.floor(dmg*1.8); addFloat(g,e.x,e.y,"7:3!","#fbbf24"); }
            if (energy==="puppet") dmg=Math.floor(dmg*1.4);
            if (energy==="divergent") {
              setTimeout(()=>{
                const g2=gameRef.current; if (!g2||!e.alive) return;
                e.hp-=Math.floor(dmg*0.15); e.hitFlash=5;
                if (e.hp<=0) { e.alive=false; gainXp(g2,30); }
              }, 300);
            }
            e.hp-=dmg; e.hitFlash=10;
            e.vx=nfx*4; e.vy=nfy*4;
            addParticle(g,e.x,e.y,energyDef.color,5,"spark");
            addFloat(g,e.x,e.y,`-${dmg}`,energyDef.color);
            if (e.hp<=0) {
              e.alive=false;
              const xpAmt=e.type==="special"?80:30;
              gainXp(g,xpAmt);
              addParticle(g,e.x,e.y,"#fbbf24",16);
              addFloat(g,e.x,e.y,`+${xpAmt} XP`,"#fbbf24");
              // Счётчик квеста — за каждое убийство
              progressRef.current.questProgress = (progressRef.current.questProgress||0)+1;
            }
          }
        });
      }

      if (p.attackTimer>0) p.attackTimer--;
      if (p.attackAnim>0) p.attackAnim--;
      if (p.attackTimer===0) p.attacking=false;
      if (p.invincible>0) p.invincible--;
      if (p.specialTimer>0) p.specialTimer--;
      if (p.xpGainTimer>0) p.xpGainTimer--;
      if (p.healCooldown>0) p.healCooldown--;
      p.ce=Math.min(p.maxCe,p.ce+emod.energyRegen*0.15);

      // ── Активная техника [E] ──
      if (keys.has(b.technique) && p.specialTimer<=0) {
        const ceCost = tech.ceCost;
        if (p.ce >= ceCost) {
          p.ce -= ceCost;
          p.specialTimer = techCdMax;

          // Обратная техника — лечение
          if (tech.id==="reverse_curse" || tech.isHealing) {
            const heal = Math.floor(p.maxHp * 0.25);
            p.hp = Math.min(p.maxHp, p.hp + heal);
            addFloat(g,p.x,p.y,`+${heal} HP`,"#4ade80");
            addParticle(g,p.x,p.y,"#4ade80",8,"spark");
          } else {
            // Атакующая техника — удар по ближайшему врагу в конусе
            let hit = false;
            enemies.forEach(e=>{ if (!e.alive) return;
              const dx=e.x-p.x,dy=e.y-p.y;
              const dist=Math.sqrt(dx*dx+dy*dy);
              const dot=(p.facing.x*dx+p.facing.y*dy)/Math.max(1,dist);
              if (dist<110 && dot>-0.3) {
                const dmg=Math.floor(2.5*emod.damage);
                e.hp-=dmg; e.hitFlash=18; e.vx=dx*0.1; e.vy=dy*0.1;
                addParticle(g,e.x,e.y,energyDef.color,8,"spark");
                addFloat(g,e.x,e.y,`-${dmg}`,energyDef.color);
                hit = true;
                if (e.hp<=0) {
                  e.alive=false;
                  const xpAmt=e.type==="special"?80:30;
                  gainXp(g,xpAmt);
                  addParticle(g,e.x,e.y,"#fbbf24",12);
                  // Счётчик квеста
                  progressRef.current.questProgress = (progressRef.current.questProgress||0)+1;
                }
              }
            });
            // Визуальный эффект техники — только искры вперёд, без кольца
            if (hit) {
              for (let i=0;i<8;i++) {
                const a=Math.atan2(p.facing.y,p.facing.x)+( Math.random()-0.5)*0.8;
                g.particles.push({ x:p.x,y:p.y,
                  vx:Math.cos(a)*10,vy:Math.sin(a)*10,
                  life:20+Math.random()*12,maxLife:32,color:energyDef.color,size:4,shape:"spark" });
              }
            }
          }
        }
      }

      // ── AI врагов — с антизастреванием ──
      enemies.forEach(e=>{
        if (!e.alive) return;
        e.aiTimer++; e.walkCycle+=0.12;
        if (e.frozen) { if (--e.frozenTimer<=0) e.frozen=false; e.vx*=0.1; e.vy*=0.1; }
        if (e.slowTimer>0) e.slowTimer--;
        const dx=p.x-e.x,dy=p.y-e.y,dist=Math.sqrt(dx*dx+dy*dy);
        const spd=(e.type==="special"?1.0:1.4)*(e.slowTimer>0?0.4:1);

        if (!e.frozen&&dist>0&&dist<380) {
          e.vx+=(dx/dist)*spd*0.25;
          e.vy+=(dy/dist)*spd*0.25;
          // Антизастревание: если стоит слишком долго — боковой импульс
          e.stuckTimer++;
          if (e.stuckTimer > 60) {
            const stuck = Math.abs(e.x-e.lastX)<1 && Math.abs(e.y-e.lastY)<1;
            if (stuck) {
              e.vx += (Math.random()-0.5)*3;
              e.vy += (Math.random()-0.5)*3;
            }
            e.stuckTimer=0; e.lastX=e.x; e.lastY=e.y;
          }
          const s=Math.sqrt(e.vx*e.vx+e.vy*e.vy);
          if (s>spd) { e.vx=e.vx/s*spd; e.vy=e.vy/s*spd; }
          e.facing=dx>0?1:-1;
        } else if (!e.frozen&&e.aiTimer%80===0) {
          e.vx=(Math.random()-0.5)*1.4; e.vy=(Math.random()-0.5)*1.4;
        }
        e.vx*=0.82; e.vy*=0.82;

        // Коллизии врагов с препятствиями
        const enx=e.x+e.vx, eny=e.y+e.vy;
        let ex2=false,ey2=false;
        obstacles.forEach(o=>{
          if (circleRect(enx,e.y,10,o.x,o.y,o.w,o.h)) ex2=true;
          if (circleRect(e.x,eny,10,o.x,o.y,o.w,o.h)) ey2=true;
        });
        // Если застрял — попробовать по диагонали
        if (ex2&&ey2) {
          e.vx=(Math.random()-0.5)*2; e.vy=(Math.random()-0.5)*2;
        } else {
          if (!ex2) e.x=enx; if (!ey2) e.y=eny;
        }
        e.x=Math.max(10,Math.min(WORLD_W-10,e.x)); e.y=Math.max(10,Math.min(WORLD_H-10,e.y));
        if (e.hitFlash>0) e.hitFlash--;

        // Атака врага
        if (dist<38&&p.invincible===0) {
          if (energy==="infinity"&&p.ce>5&&Math.random()<0.8) {
            p.ce-=5;
          } else {
            p.hp--; p.invincible=65; addParticle(g,p.x,p.y,"#dc2626",8);
            if (p.hp<=0) {
              g.running=false;
              progressRef.current.level=p.level; progressRef.current.xp=p.xp; progressRef.current.xpToNext=p.xpToNext;
              onGameOver({...progressRef.current});
            }
          }
        }
      });

      g.particles=g.particles.filter(pt=>{ pt.x+=pt.vx; pt.y+=pt.vy; pt.vx*=0.88; pt.vy*=0.88; return --pt.life>0; });
      g.floatTexts=g.floatTexts.filter(ft=>{ ft.y+=ft.vy; return --ft.life>0; });
      g.camX+=(p.x-g.camX)*CAMERA_LERP; g.camY+=(p.y-g.camY)*CAMERA_LERP;
      // Камера ограничена — комната небольшая, показываем всю сразу если помещается
      g.camX=Math.max(W/2,Math.min(WORLD_W-W/2,g.camX));
      g.camY=Math.max(H/2,Math.min(WORLD_H-H/2,g.camY));

      // Победа
      const aliveCount=enemies.filter(e=>e.alive).length;
      if (aliveCount===0 && !g.won) {
        g.won=true;
        for (let i=0;i<30;i++) addParticle(g,p.x,p.y,energyDef.color,1,"ring");
        setTimeout(()=>{
          progressRef.current.level=p.level; progressRef.current.xp=p.xp; progressRef.current.xpToNext=p.xpToNext;
          onVictory({...progressRef.current});
        },1800);
      }

      // ── Рендер ──
      drawRoom(ctx,g.camX,g.camY,g.tick);
      g.particles.forEach(pt=>drawParticle(ctx,pt,g.camX,g.camY));

      // Показываем подсказку у двери
      if (inFleeZone) {
        const ds=toScreen(p.x, p.y-40, g.camX, g.camY);
        ctx.fillStyle="rgba(168,85,247,0.85)"; ctx.fillRect(ds.sx-48,ds.sy-16,96,16);
        ctx.fillStyle="#fff"; ctx.font="bold 10px monospace"; ctx.textAlign="center";
        ctx.fillText("[Esc] Сбежать",ds.sx,ds.sy-3); ctx.textAlign="left";
      }

      const dl: {y:number;draw:()=>void}[]=[];
      g.obstacles.forEach(o=>dl.push({y:o.y+o.h,draw:()=>drawObstacle(ctx,o,g.camX,g.camY)}));
      enemies.forEach(e=>{ if (e.alive) dl.push({y:e.y,draw:()=>drawEnemy(ctx,e,g.camX,g.camY,g.tick)}); });
      dl.push({y:p.y,draw:()=>drawPlayer(ctx,p,g.tick,g.camX,g.camY,energyDef.color,energyDef.glowColor)});
      dl.sort((a,b2)=>a.y-b2.y);
      dl.forEach(d=>d.draw());

      g.floatTexts.forEach(ft=>{
        const {sx,sy}=toScreen(ft.x,ft.y,g.camX,g.camY);
        ctx.globalAlpha=Math.min(1,ft.life/20);
        ctx.fillStyle=ft.color; ctx.font="bold 12px monospace"; ctx.textAlign="center";
        ctx.fillText(ft.text,sx,sy-20+((40-ft.life)*0.8));
        ctx.textAlign="left"; ctx.globalAlpha=1;
      });

      drawHUD(
        ctx, p, energyDef.color, tech.nameRu,
        p.specialTimer, techCdMax,
        aliveCount, enemies.length,
        g.tick,
        progressRef.current.activeQuest,
        progressRef.current.questProgress,
        progressRef.current.questGoal
      );

      animRef.current=requestAnimationFrame(gameLoop);
    };

    animRef.current=requestAnimationFrame(gameLoop);
    return ()=>{ cancelAnimationFrame(animRef.current); window.removeEventListener("keydown",onKeyDown); window.removeEventListener("keyup",onKeyUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[initGame,onGameOver,onVictory,onFlee,energy,energyDef,gainXp]);

  return (
    <canvas ref={canvasRef} width={W} height={H}
      style={{display:"block",width:"100%",height:"100%",background:"#07060f"}} />
  );
};

export default GameScreen;
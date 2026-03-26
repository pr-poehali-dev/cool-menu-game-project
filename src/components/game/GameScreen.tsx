import { useEffect, useRef, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

// Canvas size
const W = 900;
const H = 500;

// World size (top-down map)
const WORLD_W = 2400;
const WORLD_H = 1600;

const PLAYER_SPEED = 3.2;
const CAMERA_LERP = 0.1;
const ATTACK_RANGE = 52;
const ATTACK_COOLDOWN = 22;

interface Vec2 { x: number; y: number; }

interface Player {
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  hp: number; maxHp: number;
  attackTimer: number;
  invincible: number;
  facing: Vec2;
  attacking: boolean;
  attackAnim: number;
  cursedEnergy: number;
  maxCursedEnergy: number;
  specialCooldown: number;
  score: number;
}

interface Enemy {
  x: number; y: number;
  w: number; h: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  alive: boolean;
  type: "curse" | "special";
  aiTimer: number;
  hitFlash: number;
  angle: number;
}

interface Obstacle {
  x: number; y: number;
  w: number; h: number;
  type: "building" | "pillar" | "ruin";
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string;
  size: number;
  shape: "circle" | "spark";
}

interface GameData {
  player: Player;
  enemies: Enemy[];
  obstacles: Obstacle[];
  particles: Particle[];
  camX: number; camY: number;
  keys: Set<string>;
  tick: number;
  running: boolean;
  score: number;
}

// ---------- world generation ----------

const createObstacles = (): Obstacle[] => {
  const obs: Obstacle[] = [];
  const rng = (min: number, max: number) => min + Math.random() * (max - min);

  // Cluster of buildings
  const clusters = [
    { cx: 400, cy: 300 }, { cx: 900, cy: 200 }, { cx: 600, cy: 700 },
    { cx: 1400, cy: 400 }, { cx: 1100, cy: 900 }, { cx: 1800, cy: 600 },
    { cx: 500, cy: 1100 }, { cx: 1600, cy: 1100 }, { cx: 1200, cy: 1300 },
  ];

  clusters.forEach(({ cx, cy }) => {
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const w = 60 + rng(0, 80);
      const h = 60 + rng(0, 80);
      obs.push({
        x: cx + rng(-120, 120) - w / 2,
        y: cy + rng(-120, 120) - h / 2,
        w, h,
        type: Math.random() < 0.4 ? "ruin" : Math.random() < 0.5 ? "pillar" : "building",
      });
    }
  });

  // Scattered pillars
  for (let i = 0; i < 20; i++) {
    obs.push({
      x: rng(100, WORLD_W - 100),
      y: rng(100, WORLD_H - 100),
      w: 30 + rng(0, 20), h: 30 + rng(0, 20),
      type: "pillar",
    });
  }

  return obs;
};

const spawnEnemies = (): Enemy[] => {
  const enemies: Enemy[] = [];
  const positions = [
    { x: 500, y: 300 }, { x: 800, y: 600 }, { x: 1100, y: 200 },
    { x: 1300, y: 800 }, { x: 600, y: 1000 }, { x: 1600, y: 400 },
    { x: 1800, y: 900 }, { x: 900, y: 1200 }, { x: 1500, y: 1300 },
    { x: 300, y: 1300 }, { x: 2000, y: 700 }, { x: 1900, y: 1400 },
  ];

  positions.forEach((p, i) => {
    const isSpecial = i % 4 === 3;
    enemies.push({
      x: p.x, y: p.y,
      w: isSpecial ? 42 : 30, h: isSpecial ? 42 : 30,
      vx: 0, vy: 0,
      hp: isSpecial ? 8 : 3,
      maxHp: isSpecial ? 8 : 3,
      alive: true,
      type: isSpecial ? "special" : "curse",
      aiTimer: Math.floor(Math.random() * 120),
      hitFlash: 0,
      angle: 0,
    });
  });

  return enemies;
};

// ---------- drawing helpers ----------

// Draw human-like character (top-down view)
const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  p: Player,
  tick: number,
  camX: number,
  camY: number
) => {
  const sx = p.x - camX;
  const sy = p.y - camY;

  // Invincibility flicker
  if (p.invincible > 0 && Math.floor(tick / 4) % 2 === 0) return;

  ctx.save();
  ctx.translate(sx, sy);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();

  // Body (dark uniform - JJK style)
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a2e";
  ctx.fill();
  ctx.strokeStyle = "#4338ca";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Collar / uniform detail
  ctx.beginPath();
  ctx.ellipse(0, -1, 8, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#16213e";
  ctx.fill();

  // Head (top view - circle)
  ctx.beginPath();
  ctx.arc(0, -2, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#e8c9a0";
  ctx.fill();
  ctx.strokeStyle = "#c9a87c";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Hair (dark, spiky - JJK vibe)
  ctx.fillStyle = "#1a1a1a";
  const hairPts = [[-5, -7], [0, -9], [5, -7], [7, -4], [-7, -4]];
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  hairPts.forEach(([hx, hy]) => ctx.lineTo(hx, hy));
  ctx.closePath();
  ctx.fill();

  // Arms (walking animation)
  const wave = Math.sin(tick * 0.15) * 3;
  ctx.fillStyle = "#1a1a2e";

  // Left arm
  ctx.beginPath();
  ctx.ellipse(-12, wave, 5, 4, Math.PI * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Right arm
  ctx.beginPath();
  ctx.ellipse(12, -wave, 5, 4, -Math.PI * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Cursed energy aura
  const energyPct = p.cursedEnergy / p.maxCursedEnergy;
  if (energyPct > 0.2) {
    ctx.beginPath();
    ctx.arc(0, 0, 16 + Math.sin(tick * 0.1) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(139,92,246,${energyPct * 0.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Attack effect
  if (p.attacking && p.attackAnim > 0) {
    const angle = Math.atan2(p.facing.y, p.facing.x);
    const aProgress = 1 - p.attackAnim / 10;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, ATTACK_RANGE - 10, angle - 0.8, angle + 0.8);
    ctx.closePath();
    ctx.fillStyle = `rgba(139,92,246,${0.6 - aProgress * 0.5})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(196,181,253,${0.9 - aProgress * 0.7})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
};

// Draw enemy curse spirit (top-down)
const drawEnemy = (
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  camX: number,
  camY: number,
  tick: number
) => {
  if (!e.alive) return;
  const sx = e.x - camX;
  const sy = e.y - camY;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(e.angle);

  const flash = e.hitFlash > 0;
  const r = e.w / 2;

  if (e.type === "special") {
    // Special grade curse - more humanoid but twisted
    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, r + 2, r - 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = flash ? "#fff" : "#7c0000";
    ctx.fill();
    ctx.strokeStyle = flash ? "#fbbf24" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cursed marks
    if (!flash) {
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const a = (i / 4) * Math.PI * 2 + tick * 0.03;
        ctx.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
        ctx.stroke();
      }
    }

    // Eyes
    ctx.fillStyle = flash ? "#ef4444" : "#fbbf24";
    ctx.beginPath();
    ctx.arc(-5, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-5, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Aura pulse
    ctx.beginPath();
    ctx.arc(0, 0, r + 6 + Math.sin(tick * 0.08) * 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(220,38,38,0.4)";
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    // Regular curse spirit - amorphous blob
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const nr = r + Math.sin(tick * 0.07 + i * 1.3) * 4;
      const px = Math.cos(a) * nr;
      const py = Math.sin(a) * nr;
      if (i === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
    }
    ctx.closePath();
    ctx.fillStyle = flash ? "#fff" : "#312e81";
    ctx.fill();
    ctx.strokeStyle = flash ? "#a78bfa" : "#6d28d9";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Single eye
    ctx.fillStyle = flash ? "#fbbf24" : "#c4b5fd";
    ctx.beginPath();
    ctx.ellipse(0, -2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(0, -2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // HP bar
  const bw = e.w + 8;
  const bh = 4;
  const bx = sx - bw / 2;
  const by = sy + e.h / 2 + 6;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
};

// Draw tile-based top-down floor
const drawFloor = (
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  tick: number
) => {
  // Dark ritual ground
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0a0a14");
  grad.addColorStop(0.5, "#0d0d1a");
  grad.addColorStop(1, "#080810");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Tile grid
  const tileSize = 80;
  const offX = -(camX % tileSize);
  const offY = -(camY % tileSize);

  ctx.strokeStyle = "rgba(67,56,202,0.12)";
  ctx.lineWidth = 1;
  for (let x = offX; x < W; x += tileSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = offY; y < H; y += tileSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Cursed ritual circles (static in world space)
  const circles = [
    { wx: 700, wy: 500, r: 120 }, { wx: 1400, wy: 800, r: 90 },
    { wx: 500, wy: 1100, r: 100 }, { wx: 1800, wy: 400, r: 80 },
  ];

  circles.forEach(({ wx, wy, r }) => {
    const sx = wx - camX;
    const sy = wy - camY;
    if (sx < -r - 50 || sx > W + r + 50 || sy < -r - 50 || sy > H + r + 50) return;

    const pulse = 0.15 + 0.1 * Math.sin(tick * 0.04);
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(139,92,246,${pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner rune lines
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2 + tick * 0.005;
      const a2 = ((i + 2) / 5) * Math.PI * 2 + tick * 0.005;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a1) * r * 0.8, sy + Math.sin(a1) * r * 0.8);
      ctx.lineTo(sx + Math.cos(a2) * r * 0.8, sy + Math.sin(a2) * r * 0.8);
      ctx.strokeStyle = `rgba(139,92,246,${pulse * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
};

// Draw obstacles (top-down view with pseudo-3D)
const drawObstacle = (
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  camX: number,
  camY: number
) => {
  const sx = obs.x - camX;
  const sy = obs.y - camY;
  if (sx > W + 10 || sx + obs.w < -10 || sy > H + 10 || sy + obs.h < -10) return;

  const depth = 10;

  if (obs.type === "building") {
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(sx + depth, sy + depth, obs.w, obs.h);

    // Side face (depth illusion)
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(sx + obs.w, sy);
    ctx.lineTo(sx + obs.w + depth, sy + depth);
    ctx.lineTo(sx + obs.w + depth, sy + obs.h + depth);
    ctx.lineTo(sx + obs.w, sy + obs.h);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(sx, sy + obs.h);
    ctx.lineTo(sx + depth, sy + obs.h + depth);
    ctx.lineTo(sx + obs.w + depth, sy + obs.h + depth);
    ctx.lineTo(sx + obs.w, sy + obs.h);
    ctx.closePath();
    ctx.fillStyle = "#0a1020";
    ctx.fill();

    // Top face
    ctx.fillStyle = "#1e2840";
    ctx.fillRect(sx, sy, obs.w, obs.h);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, obs.w, obs.h);

    // Windows
    ctx.fillStyle = "rgba(251,191,36,0.6)";
    for (let wy = 8; wy < obs.h - 8; wy += 18) {
      for (let wx = 8; wx < obs.w - 8; wx += 14) {
        if (Math.random() > 0.4) {
          ctx.fillRect(sx + wx, sy + wy, 8, 10);
        }
      }
    }
  } else if (obs.type === "pillar") {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(sx + obs.w / 2 + 4, sy + obs.h / 2 + 4, obs.w / 2, obs.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(sx + obs.w / 2, sy + obs.h / 2, obs.w / 2, obs.h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#374151";
    ctx.fill();
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#6b7280";
    ctx.fillRect(sx + 4, sy + 4, obs.w - 8, obs.h - 8);
  } else {
    // Ruin - irregular shape
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(sx + 5, sy + 5, obs.w, obs.h);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(sx, sy, obs.w * 0.7, obs.h);
    ctx.fillRect(sx + obs.w * 0.3, sy + obs.h * 0.3, obs.w * 0.7, obs.h * 0.7);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, obs.w, obs.h);

    // Cursed cracks
    ctx.strokeStyle = "rgba(139,92,246,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + obs.w * 0.2, sy);
    ctx.lineTo(sx + obs.w * 0.5, sy + obs.h * 0.6);
    ctx.lineTo(sx + obs.w * 0.3, sy + obs.h);
    ctx.stroke();
  }
};

const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle, camX: number, camY: number) => {
  const alpha = p.life / p.maxLife;
  const sx = p.x - camX;
  const sy = p.y - camY;
  ctx.globalAlpha = alpha;
  if (p.shape === "spark") {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size * 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - p.vx * 3, sy - p.vy * 3);
    ctx.stroke();
  } else {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

const drawHUD = (ctx: CanvasRenderingContext2D, player: Player, score: number) => {
  // HP bar
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(12, 12, 160, 20);
  const hpPct = player.hp / player.maxHp;
  const hpColor = hpPct > 0.6 ? "#22c55e" : hpPct > 0.3 ? "#f59e0b" : "#ef4444";
  ctx.fillStyle = hpColor;
  ctx.fillRect(14, 14, 156 * hpPct, 16);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, 160, 20);
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 11px monospace";
  ctx.fillText(`HP  ${player.hp}/${player.maxHp}`, 18, 25);

  // Cursed energy bar
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(12, 38, 160, 14);
  const cePct = player.cursedEnergy / player.maxCursedEnergy;
  ctx.fillStyle = "#7c3aed";
  ctx.fillRect(14, 40, 156 * cePct, 10);
  ctx.strokeStyle = "#475569";
  ctx.strokeRect(12, 38, 160, 14);
  ctx.fillStyle = "#c4b5fd";
  ctx.font = "10px monospace";
  ctx.fillText(`CURSED ENERGY`, 18, 50);

  // Score
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(W - 170, 12, 158, 26);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${score} pts`, W - 20, 30);
  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "9px monospace";
  ctx.fillText("SCORE", W - 168, 22);

  // Controls hint (top)
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(W / 2 - 160, H - 30, 320, 22);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("WASD / ↑↓←→  Движение    Z / X  Удар    E  Проклятая техника", W / 2, H - 14);
  ctx.textAlign = "left";
};

// ---------- collision ----------
const circleRect = (cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number) => {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
};

// ---------- main component ----------
const GameScreen = ({ onGameOver }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData | null>(null);
  const animRef = useRef<number>(0);

  const addParticle = (g: GameData, x: number, y: number, color: string, count = 5, shape: "circle" | "spark" = "circle") => {
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.5) * 7,
        life: 25 + Math.random() * 20,
        maxLife: 45,
        color, size: 3 + Math.random() * 4,
        shape,
      });
    }
  };

  const initGame = useCallback(() => {
    const player: Player = {
      x: 120, y: 120,
      vx: 0, vy: 0,
      w: 28, h: 28,
      hp: 8, maxHp: 8,
      attackTimer: 0,
      invincible: 0,
      facing: { x: 1, y: 0 },
      attacking: false,
      attackAnim: 0,
      cursedEnergy: 100, maxCursedEnergy: 100,
      specialCooldown: 0,
      score: 0,
    };

    gameRef.current = {
      player,
      enemies: spawnEnemies(),
      obstacles: createObstacles(),
      particles: [],
      camX: 0, camY: 0,
      keys: new Set(),
      tick: 0,
      running: true,
      score: 0,
    };
  }, []);

  useEffect(() => {
    initGame();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const g = gameRef.current;
      if (!g) return;
      if (down) g.keys.add(e.code);
      else g.keys.delete(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    const gameLoop = () => {
      const g = gameRef.current;
      if (!g || !g.running) return;

      g.tick++;
      const { player, enemies, obstacles, keys } = g;

      // Input movement
      let mvx = 0;
      let mvy = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) mvx -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) mvx += 1;
      if (keys.has("ArrowUp") || keys.has("KeyW")) mvy -= 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) mvy += 1;

      if (mvx !== 0 || mvy !== 0) {
        const len = Math.sqrt(mvx * mvx + mvy * mvy);
        player.vx = (mvx / len) * PLAYER_SPEED;
        player.vy = (mvy / len) * PLAYER_SPEED;
        player.facing = { x: mvx / len, y: mvy / len };
      } else {
        player.vx *= 0.6;
        player.vy *= 0.6;
      }

      // Move player
      const nx = player.x + player.vx;
      const ny = player.y + player.vy;
      const pr = player.w / 2;

      let blockedX = false;
      let blockedY = false;

      obstacles.forEach((obs) => {
        if (circleRect(nx, player.y, pr, obs.x, obs.y, obs.w, obs.h)) blockedX = true;
        if (circleRect(player.x, ny, pr, obs.x, obs.y, obs.w, obs.h)) blockedY = true;
      });

      if (!blockedX) player.x = nx;
      if (!blockedY) player.y = ny;

      // World bounds
      player.x = Math.max(pr, Math.min(WORLD_W - pr, player.x));
      player.y = Math.max(pr, Math.min(WORLD_H - pr, player.y));

      // Attack
      if ((keys.has("KeyZ") || keys.has("KeyX")) && player.attackTimer <= 0) {
        player.attacking = true;
        player.attackTimer = ATTACK_COOLDOWN;
        player.attackAnim = 10;

        enemies.forEach((e) => {
          if (!e.alive) return;
          const dx = e.x - player.x;
          const dy = e.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const dot = player.facing.x * dx + player.facing.y * dy;

          if (dist < ATTACK_RANGE + e.w / 2 && dot > -8) {
            e.hp--;
            e.hitFlash = 10;
            e.vx = player.facing.x * 4;
            e.vy = player.facing.y * 4;
            addParticle(g, e.x, e.y, "#a78bfa", 6, "spark");
            if (e.hp <= 0) {
              e.alive = false;
              g.score += e.type === "special" ? 300 : 100;
              addParticle(g, e.x, e.y, "#fbbf24", 14);
              addParticle(g, e.x, e.y, "#ef4444", 8, "spark");
            }
          }
        });
      }

      // Special cursed technique (E key)
      if (keys.has("KeyE") && player.specialCooldown <= 0 && player.cursedEnergy >= 30) {
        player.cursedEnergy -= 30;
        player.specialCooldown = 90;

        // Burst: hits all enemies in radius 100
        enemies.forEach((e) => {
          if (!e.alive) return;
          const dx = e.x - player.x;
          const dy = e.y - player.y;
          if (dx * dx + dy * dy < 100 * 100) {
            e.hp -= 3;
            e.hitFlash = 15;
            e.vx = dx * 0.1;
            e.vy = dy * 0.1;
            addParticle(g, e.x, e.y, "#8b5cf6", 10, "spark");
            if (e.hp <= 0) {
              e.alive = false;
              g.score += e.type === "special" ? 300 : 100;
              addParticle(g, e.x, e.y, "#fbbf24", 16);
            }
          }
        });

        // Special burst particles
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          g.particles.push({
            x: player.x + Math.cos(a) * 10,
            y: player.y + Math.sin(a) * 10,
            vx: Math.cos(a) * 8, vy: Math.sin(a) * 8,
            life: 30, maxLife: 30,
            color: "#7c3aed", size: 5, shape: "spark",
          });
        }
      }

      if (player.attackTimer > 0) player.attackTimer--;
      if (player.attackAnim > 0) player.attackAnim--;
      if (player.attackTimer <= ATTACK_COOLDOWN - 10) player.attacking = false;
      if (player.invincible > 0) player.invincible--;
      if (player.specialCooldown > 0) player.specialCooldown--;

      // Cursed energy regen
      if (g.tick % 60 === 0 && player.cursedEnergy < player.maxCursedEnergy) {
        player.cursedEnergy = Math.min(player.maxCursedEnergy, player.cursedEnergy + 5);
      }

      // Enemies AI
      enemies.forEach((e) => {
        if (!e.alive) return;
        e.aiTimer++;

        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 350) {
          const speed = e.type === "special" ? 1.4 : 1.8;
          e.vx += (dx / dist) * speed * 0.3;
          e.vy += (dy / dist) * speed * 0.3;

          // Clamp speed
          const spd = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
          if (spd > speed) { e.vx = (e.vx / spd) * speed; e.vy = (e.vy / spd) * speed; }
        } else {
          // Wander
          if (e.aiTimer % 80 === 0) {
            e.vx = (Math.random() - 0.5) * 1.5;
            e.vy = (Math.random() - 0.5) * 1.5;
          }
        }

        // Apply knockback decay
        e.vx *= 0.85;
        e.vy *= 0.85;

        // Move enemy
        const enx = e.x + e.vx;
        const eny = e.y + e.vy;
        const er = e.w / 2;

        let ebX = false;
        let ebY = false;
        obstacles.forEach((obs) => {
          if (circleRect(enx, e.y, er, obs.x, obs.y, obs.w, obs.h)) ebX = true;
          if (circleRect(e.x, eny, er, obs.x, obs.y, obs.w, obs.h)) ebY = true;
        });
        if (!ebX) e.x = enx;
        if (!ebY) e.y = eny;

        e.x = Math.max(er, Math.min(WORLD_W - er, e.x));
        e.y = Math.max(er, Math.min(WORLD_H - er, e.y));
        e.angle += 0.03;
        if (e.hitFlash > 0) e.hitFlash--;

        // Enemy damages player
        if (player.invincible <= 0 && dist < pr + er + 4) {
          player.hp--;
          player.invincible = 70;
          addParticle(g, player.x, player.y, "#dc2626", 8);
          if (player.hp <= 0) {
            g.running = false;
            onGameOver(g.score);
            return;
          }
        }
      });

      // Particles
      g.particles = g.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.life--;
        return p.life > 0;
      });

      // Camera
      const targetCamX = player.x - W / 2;
      const targetCamY = player.y - H / 2;
      g.camX += (targetCamX - g.camX) * CAMERA_LERP;
      g.camY += (targetCamY - g.camY) * CAMERA_LERP;
      g.camX = Math.max(0, Math.min(WORLD_W - W, g.camX));
      g.camY = Math.max(0, Math.min(WORLD_H - H, g.camY));

      // Draw
      drawFloor(ctx, g.camX, g.camY, g.tick);

      // Draw obstacles
      g.obstacles.forEach((obs) => drawObstacle(ctx, obs, g.camX, g.camY));

      // Draw particles behind entities
      g.particles.forEach((p) => drawParticle(ctx, p, g.camX, g.camY));

      // Draw enemies
      enemies.forEach((e) => drawEnemy(ctx, e, g.camX, g.camY, g.tick));

      // Draw player
      drawPlayer(ctx, player, g.tick, g.camX, g.camY);

      // HUD
      drawHUD(ctx, player, g.score);

      animRef.current = requestAnimationFrame(gameLoop);
    };

    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [initGame, onGameOver]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        background: "#0a0a14",
      }}
    />
  );
};

export default GameScreen;
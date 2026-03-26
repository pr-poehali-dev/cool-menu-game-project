import { useEffect, useRef, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const W = 900;
const H = 520;

// Logical world size (flat 2D grid)
const WORLD_W = 2000;
const WORLD_H = 1400;

const PLAYER_SPEED = 2.8;
const CAMERA_LERP = 0.09;
const ATTACK_RANGE = 56;
const ATTACK_COOLDOWN = 24;

// Isometric projection constants
// Tile skew: world (wx,wy) → screen (sx,sy)
// sx = (wx - wy) * ISO_X
// sy = (wx + wy) * ISO_Y  — then we center on canvas
const ISO_X = 0.7;   // horizontal squeeze
const ISO_Y = 0.35;  // vertical squeeze (creates ~30° tilt)

function toScreen(wx: number, wy: number, camX: number, camY: number) {
  const sx = (wx - wy) * ISO_X - (camX - camY) * ISO_X + W / 2;
  const sy = (wx + wy) * ISO_Y - (camX + camY) * ISO_Y + H / 3;
  return { sx, sy };
}

interface Vec2 { x: number; y: number; }

interface Player {
  x: number; y: number;       // world coords
  vx: number; vy: number;
  hp: number; maxHp: number;
  attackTimer: number;
  invincible: number;
  facing: Vec2;               // normalized
  attacking: boolean;
  attackAnim: number;
  cursedEnergy: number;
  maxCursedEnergy: number;
  specialCooldown: number;
  walkCycle: number;
}

interface Enemy {
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  alive: boolean;
  type: "curse" | "special";
  aiTimer: number;
  hitFlash: number;
  walkCycle: number;
  facing: number;             // -1 left, 1 right
}

interface Obstacle {
  x: number; y: number;
  w: number; h: number;       // world footprint
  wallH: number;              // visual height (pixels on screen)
  type: "building" | "pillar" | "ruin";
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
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

// ─── World generation ───────────────────────────────────────────────────────

const rng = (a: number, b: number) => a + Math.random() * (b - a);

const createObstacles = (): Obstacle[] => {
  const obs: Obstacle[] = [];

  const clusters = [
    { cx: 350, cy: 250 }, { cx: 800, cy: 180 }, { cx: 550, cy: 650 },
    { cx: 1200, cy: 350 }, { cx: 950, cy: 800 }, { cx: 1550, cy: 550 },
    { cx: 400, cy: 1000 }, { cx: 1400, cy: 950 }, { cx: 1100, cy: 1150 },
  ];

  clusters.forEach(({ cx, cy }) => {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const type: Obstacle["type"] = Math.random() < 0.45 ? "building" : Math.random() < 0.5 ? "pillar" : "ruin";
      const w = type === "pillar" ? 30 + rng(0, 20) : 55 + rng(0, 60);
      const h = type === "pillar" ? 30 + rng(0, 20) : 50 + rng(0, 50);
      obs.push({
        x: cx + rng(-100, 100) - w / 2,
        y: cy + rng(-100, 100) - h / 2,
        w, h,
        wallH: type === "pillar" ? 60 + rng(0, 40) : 100 + rng(0, 120),
        type,
      });
    }
  });

  for (let i = 0; i < 15; i++) {
    obs.push({
      x: rng(80, WORLD_W - 80), y: rng(80, WORLD_H - 80),
      w: 24 + rng(0, 16), h: 24 + rng(0, 16),
      wallH: 50 + rng(0, 50),
      type: "pillar",
    });
  }

  return obs;
};

const spawnEnemies = (): Enemy[] => {
  const positions = [
    { x: 480, y: 280 }, { x: 750, y: 580 }, { x: 1050, y: 200 },
    { x: 1200, y: 750 }, { x: 580, y: 950 }, { x: 1450, y: 380 },
    { x: 1700, y: 820 }, { x: 850, y: 1100 }, { x: 1350, y: 1200 },
    { x: 280, y: 1200 }, { x: 1850, y: 650 }, { x: 1800, y: 1300 },
  ];

  return positions.map((p, i) => {
    const isSpecial = i % 4 === 3;
    return {
      x: p.x, y: p.y, vx: 0, vy: 0,
      hp: isSpecial ? 8 : 3, maxHp: isSpecial ? 8 : 3,
      alive: true,
      type: isSpecial ? "special" : "curse",
      aiTimer: Math.floor(Math.random() * 120),
      hitFlash: 0,
      walkCycle: Math.random() * Math.PI * 2,
      facing: 1,
    };
  });
};

// ─── Drawing helpers ─────────────────────────────────────────────────────────

// Draw isometric floor tile grid
const drawFloor = (ctx: CanvasRenderingContext2D, camX: number, camY: number, tick: number) => {
  ctx.fillStyle = "#07060f";
  ctx.fillRect(0, 0, W, H);

  const tileSize = 80;
  const startX = Math.floor((camX - WORLD_W / 2) / tileSize) * tileSize;
  const startY = Math.floor((camY - WORLD_H / 2) / tileSize) * tileSize;

  for (let wx = startX; wx < camX + WORLD_W; wx += tileSize) {
    for (let wy = startY; wy < camY + WORLD_H; wy += tileSize) {
      const { sx, sy } = toScreen(wx, wy, camX, camY);
      if (sx < -120 || sx > W + 120 || sy < -80 || sy > H + 80) continue;

      // Tile corners
      const tl = toScreen(wx, wy, camX, camY);
      const tr = toScreen(wx + tileSize, wy, camX, camY);
      const br = toScreen(wx + tileSize, wy + tileSize, camX, camY);
      const bl = toScreen(wx, wy + tileSize, camX, camY);

      ctx.beginPath();
      ctx.moveTo(tl.sx, tl.sy);
      ctx.lineTo(tr.sx, tr.sy);
      ctx.lineTo(br.sx, br.sy);
      ctx.lineTo(bl.sx, bl.sy);
      ctx.closePath();

      // Subtle tile color variation
      const xi = Math.floor(wx / tileSize);
      const yi = Math.floor(wy / tileSize);
      const dark = (xi + yi) % 2 === 0;
      ctx.fillStyle = dark ? "#09080f" : "#0b0a14";
      ctx.fill();
      ctx.strokeStyle = "rgba(67,56,202,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Ritual circles on floor
  const circles = [
    { wx: 700, wy: 450, r: 110 }, { wx: 1300, wy: 700, r: 85 },
    { wx: 450, wy: 1050, r: 95 }, { wx: 1700, wy: 380, r: 75 },
  ];

  circles.forEach(({ wx, wy, r }) => {
    const center = toScreen(wx, wy, camX, camY);
    const edge = toScreen(wx + r, wy, camX, camY);
    const rx = Math.abs(edge.sx - center.sx);
    const ry = rx * ISO_Y / ISO_X;

    const pulse = 0.12 + 0.08 * Math.sin(tick * 0.035);
    ctx.beginPath();
    ctx.ellipse(center.sx, center.sy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(139,92,246,${pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Star rune inside
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2 + tick * 0.006;
      const a2 = ((i + 2) / 5) * Math.PI * 2 + tick * 0.006;
      ctx.beginPath();
      ctx.moveTo(center.sx + Math.cos(a1) * rx * 0.75, center.sy + Math.sin(a1) * ry * 0.75);
      ctx.lineTo(center.sx + Math.cos(a2) * rx * 0.75, center.sy + Math.sin(a2) * ry * 0.75);
      ctx.strokeStyle = `rgba(124,58,237,${pulse * 0.6})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
};

// Draw isometric obstacle with wall face
const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, camX: number, camY: number) => {
  const tl = toScreen(obs.x, obs.y, camX, camY);
  const tr = toScreen(obs.x + obs.w, obs.y, camX, camY);
  const br = toScreen(obs.x + obs.w, obs.y + obs.h, camX, camY);
  const bl = toScreen(obs.x, obs.y + obs.h, camX, camY);

  if (tr.sx < -20 || bl.sx > W + 20 || tl.sy > H + obs.wallH || br.sy < -obs.wallH) return;

  const wallH = obs.wallH;

  if (obs.type === "building") {
    // Right wall face
    ctx.beginPath();
    ctx.moveTo(tr.sx, tr.sy);
    ctx.lineTo(tr.sx, tr.sy - wallH);
    ctx.lineTo(br.sx, br.sy - wallH);
    ctx.lineTo(br.sx, br.sy);
    ctx.closePath();
    ctx.fillStyle = "#0c111e";
    ctx.fill();
    ctx.strokeStyle = "#1e2a40";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Left wall face
    ctx.beginPath();
    ctx.moveTo(bl.sx, bl.sy);
    ctx.lineTo(bl.sx, bl.sy - wallH);
    ctx.lineTo(br.sx, br.sy - wallH);
    ctx.lineTo(br.sx, br.sy);
    ctx.closePath();
    ctx.fillStyle = "#0a0e1a";
    ctx.fill();
    ctx.stroke();

    // Roof (top face)
    ctx.beginPath();
    ctx.moveTo(tl.sx, tl.sy - wallH);
    ctx.lineTo(tr.sx, tr.sy - wallH);
    ctx.lineTo(br.sx, br.sy - wallH);
    ctx.lineTo(bl.sx, bl.sy - wallH);
    ctx.closePath();
    ctx.fillStyle = "#1a2035";
    ctx.fill();
    ctx.strokeStyle = "#2d3a56";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Windows on right face
    const numWin = Math.max(1, Math.floor(wallH / 30));
    for (let row = 0; row < numWin; row++) {
      const wy2 = tr.sy - wallH * 0.85 + row * (wallH / (numWin + 1));
      ctx.fillStyle = "rgba(251,191,36,0.55)";
      ctx.fillRect(tr.sx + (br.sx - tr.sx) * 0.2, wy2, 8, 10);
      ctx.fillRect(tr.sx + (br.sx - tr.sx) * 0.6, wy2, 8, 10);
    }

  } else if (obs.type === "pillar") {
    const cx = (tl.sx + br.sx) / 2;
    const cy = (tl.sy + br.sy) / 2;
    const rx = Math.abs(tr.sx - tl.sx) / 2 + 2;
    const ry = Math.abs(br.sy - tr.sy) / 2 + 2;

    // Pillar body
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#252535";
    ctx.fill();
    ctx.strokeStyle = "#3d3d5c";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Vertical column
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy);
    ctx.lineTo(cx - rx, cy - wallH);
    ctx.lineTo(cx + rx, cy - wallH);
    ctx.lineTo(cx + rx, cy);
    ctx.fillStyle = "#1c1c2e";
    ctx.fill();

    // Top cap
    ctx.beginPath();
    ctx.ellipse(cx, cy - wallH, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#2e2e45";
    ctx.fill();
    ctx.strokeStyle = "#4a4a6a";
    ctx.stroke();

    // Cursed crack glow
    ctx.strokeStyle = "rgba(139,92,246,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.3, cy - wallH * 0.2);
    ctx.lineTo(cx + rx * 0.1, cy - wallH * 0.6);
    ctx.lineTo(cx - rx * 0.2, cy - wallH * 0.9);
    ctx.stroke();

  } else {
    // Ruin — broken walls, partial structure
    ctx.beginPath();
    ctx.moveTo(tl.sx, tl.sy);
    ctx.lineTo(tl.sx, tl.sy - wallH * 0.6);
    ctx.lineTo(tr.sx, tr.sy - wallH * 0.4);
    ctx.lineTo(tr.sx, tr.sy);
    ctx.closePath();
    ctx.fillStyle = "#18181a";
    ctx.fill();
    ctx.strokeStyle = "#2d2d35";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(br.sx, br.sy);
    ctx.lineTo(br.sx, br.sy - wallH * 0.5);
    ctx.lineTo(bl.sx, bl.sy - wallH * 0.7);
    ctx.lineTo(bl.sx, bl.sy);
    ctx.closePath();
    ctx.fillStyle = "#141416";
    ctx.fill();
    ctx.stroke();

    // Roof rubble
    ctx.beginPath();
    ctx.moveTo(tl.sx, tl.sy - wallH * 0.6);
    ctx.lineTo(tr.sx, tr.sy - wallH * 0.4);
    ctx.lineTo(br.sx, br.sy - wallH * 0.5);
    ctx.lineTo(bl.sx, bl.sy - wallH * 0.7);
    ctx.closePath();
    ctx.fillStyle = "#1e1e22";
    ctx.fill();

    // Purple crack
    ctx.strokeStyle = "rgba(139,92,246,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tl.sx + 5, tl.sy - 10);
    ctx.lineTo((tl.sx + br.sx) / 2, (tl.sy + br.sy) / 2 - wallH * 0.3);
    ctx.stroke();
  }
};

// Draw a full-body human player in isometric perspective
const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  p: Player,
  tick: number,
  camX: number,
  camY: number
) => {
  const { sx, sy } = toScreen(p.x, p.y, camX, camY);

  if (p.invincible > 0 && Math.floor(tick / 4) % 2 === 0) return;

  const wc = p.walkCycle;
  const isMoving = Math.abs(p.vx) > 0.2 || Math.abs(p.vy) > 0.2;
  const legSwing = isMoving ? Math.sin(wc) * 6 : 0;
  const armSwing = isMoving ? Math.sin(wc + Math.PI) * 5 : 0;

  // Determine facing direction for sprite
  const fx = p.facing.x;
  const fy = p.facing.y;
  const facingRight = fx >= 0;
  const flip = facingRight ? 1 : -1;

  ctx.save();
  ctx.translate(sx, sy);

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fill();

  // ── Legs ──
  const legY = 0;
  const legW = 7;
  const legH = 20;

  // Left leg
  ctx.fillStyle = "#111827";
  ctx.save();
  ctx.translate(-flip * 5, legY);
  ctx.rotate(-legSwing * 0.04);
  ctx.fillRect(-legW / 2, 0, legW, legH);
  // Boot
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(-legW / 2 - 1, legH - 4, legW + 3, 6);
  ctx.restore();

  // Right leg
  ctx.fillStyle = "#111827";
  ctx.save();
  ctx.translate(flip * 5, legY);
  ctx.rotate(legSwing * 0.04);
  ctx.fillRect(-legW / 2, 0, legW, legH);
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(-legW / 2 - 1, legH - 4, legW + 3, 6);
  ctx.restore();

  // ── Body / Uniform (JJK dark gakuran) ──
  const bodyY = -24;
  const bodyW = 18;
  const bodyH = 22;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-bodyW / 2, bodyY, bodyW, bodyH);

  // Uniform collar details
  ctx.strokeStyle = "#1e3a5f";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-bodyW / 2, bodyY);
  ctx.lineTo(-bodyW / 2, bodyY + bodyH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bodyW / 2, bodyY);
  ctx.lineTo(bodyW / 2, bodyY + bodyH);
  ctx.stroke();

  // Buttons row
  ctx.fillStyle = "#2d3f5a";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(-1, bodyY + 3 + i * 5, 2, 2);
  }

  // Collar V-shape
  ctx.strokeStyle = "#2d4a7a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-5, bodyY);
  ctx.lineTo(0, bodyY + 7);
  ctx.lineTo(5, bodyY);
  ctx.stroke();

  // ── Arms ──
  const shoulderY = bodyY + 3;
  const armW = 6;
  const armH = 16;

  // Left arm
  ctx.fillStyle = "#0f172a";
  ctx.save();
  ctx.translate(-flip * (bodyW / 2 + armW / 2 - 1), shoulderY);
  ctx.rotate(armSwing * 0.05);
  ctx.fillRect(-armW / 2, 0, armW, armH);
  // Hand
  ctx.fillStyle = "#d4a574";
  ctx.beginPath();
  ctx.ellipse(0, armH + 2, 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right arm (weapon/attack side)
  ctx.fillStyle = "#0f172a";
  ctx.save();
  ctx.translate(flip * (bodyW / 2 + armW / 2 - 1), shoulderY);
  ctx.rotate(-armSwing * 0.05 + (p.attacking ? -0.6 * flip : 0));
  ctx.fillRect(-armW / 2, 0, armW, armH + (p.attacking ? 6 : 0));
  // Hand
  ctx.fillStyle = "#d4a574";
  ctx.beginPath();
  const handY = armH + (p.attacking ? 8 : 2);
  ctx.ellipse(0, handY, 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Neck ──
  ctx.fillStyle = "#c9a87c";
  ctx.fillRect(-3, bodyY - 5, 6, 7);

  // ── Head ──
  const headY = bodyY - 19;
  const headW = 14;
  const headH = 16;

  ctx.fillStyle = "#e8c9a0";
  ctx.beginPath();
  ctx.ellipse(0, headY + headH / 2, headW / 2, headH / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jaw / chin detail
  ctx.fillStyle = "#d4b48a";
  ctx.beginPath();
  ctx.ellipse(0, headY + headH - 3, headW / 2 - 2, 4, 0, 0, Math.PI);
  ctx.fill();

  // Hair (dark spiky — Itadori-ish)
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.ellipse(0, headY + 3, headW / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair spikes
  const spikeData = [[-7, headY - 1, -10, headY - 8], [0, headY - 3, 0, headY - 10], [7, headY - 1, 10, headY - 8]];
  ctx.fillStyle = "#111111";
  spikeData.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1 - 4, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x1 + 4, y1);
    ctx.closePath();
    ctx.fill();
  });

  // Eyes
  const eyeY = headY + headH * 0.35;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(flip * 1 - 4, eyeY, 5, 3);
  ctx.fillRect(flip * 1 + 3, eyeY, 5, 3);

  // Eye shine
  ctx.fillStyle = "#6b7280";
  ctx.fillRect(flip * 1 - 3, eyeY, 2, 2);
  ctx.fillRect(flip * 1 + 4, eyeY, 2, 2);

  // ── Cursed energy aura ──
  const cePct = p.cursedEnergy / p.maxCursedEnergy;
  if (cePct > 0.15) {
    for (let ring = 0; ring < 2; ring++) {
      const pr = 18 + ring * 6 + Math.sin(tick * 0.1 + ring) * 3;
      ctx.beginPath();
      ctx.ellipse(0, -10, pr, pr * 0.45, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139,92,246,${cePct * (0.35 - ring * 0.1)})`;
      ctx.lineWidth = 1.5 - ring * 0.5;
      ctx.stroke();
    }
  }

  // ── Attack slash effect ──
  if (p.attacking && p.attackAnim > 0) {
    const prog = p.attackAnim / 12;
    const angle = Math.atan2(fy, fx);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.arc(0, -10, ATTACK_RANGE * 0.7, angle - 0.9, angle + 0.9);
    ctx.closePath();
    ctx.fillStyle = `rgba(167,139,250,${prog * 0.3})`;
    ctx.fill();

    // Slash line
    ctx.strokeStyle = `rgba(196,181,253,${prog * 0.9})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle - 0.7) * 14, -10 + Math.sin(angle - 0.7) * 14);
    ctx.lineTo(Math.cos(angle + 0.7) * (ATTACK_RANGE * 0.65), -10 + Math.sin(angle + 0.7) * (ATTACK_RANGE * 0.65));
    ctx.stroke();
  }

  ctx.restore();
};

// Draw enemy with full sprite
const drawEnemy = (
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  camX: number,
  camY: number,
  tick: number
) => {
  if (!e.alive) return;
  const { sx, sy } = toScreen(e.x, e.y, camX, camY);
  if (sx < -80 || sx > W + 80 || sy < -150 || sy > H + 80) return;

  const flash = e.hitFlash > 0;
  const wc = e.walkCycle;

  ctx.save();
  ctx.translate(sx, sy);

  if (e.type === "special") {
    // ── Special grade: large humanoid curse ──
    const legSwing = Math.sin(wc) * 7;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 5, 20, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();

    // Legs (thick, clawed)
    [[-10, legSwing], [10, -legSwing]].forEach(([lx, rot]) => {
      ctx.fillStyle = flash ? "#fff" : "#7c0000";
      ctx.save();
      ctx.translate(lx, 2);
      ctx.rotate((rot as number) * 0.04);
      ctx.fillRect(-6, 0, 12, 22);
      // Claws
      ctx.fillStyle = flash ? "#fca5a5" : "#450a0a";
      [-4, 0, 4].forEach(cx => ctx.fillRect(cx - 1, 22, 3, 7));
      ctx.restore();
    });

    // Body
    ctx.fillStyle = flash ? "#fff" : "#991b1b";
    ctx.beginPath();
    ctx.ellipse(0, -18, 20, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = flash ? "#fbbf24" : "#7f1d1d";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cursed marks on body
    if (!flash) {
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + tick * 0.04;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(Math.cos(a) * 14, -18 + Math.sin(a) * 10);
        ctx.stroke();
      }
    }

    // Arms (long, menacing)
    [[-1, 1], [1, -1]].forEach(([side, swing]) => {
      ctx.fillStyle = flash ? "#fff" : "#b91c1c";
      ctx.save();
      ctx.translate(side * 22, -22);
      ctx.rotate(swing * Math.sin(wc) * 0.08);
      ctx.fillRect(-5, 0, 10, 26);
      // Claw hands
      ctx.fillStyle = flash ? "#fca5a5" : "#450a0a";
      [-3, 0, 3].forEach(cx => ctx.fillRect(cx - 1, 26, 3, 8));
      ctx.restore();
    });

    // Head — skull-like
    ctx.fillStyle = flash ? "#fff" : "#7c0000";
    ctx.beginPath();
    ctx.ellipse(0, -40, 18, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = flash ? "#fbbf24" : "#dc2626";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes — multiple
    [[- 8, -43], [8, -43], [0, -36]].forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fillStyle = flash ? "#dc2626" : "#fbbf24";
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(ex, ey, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Aura
    ctx.beginPath();
    ctx.ellipse(0, -20, 28 + Math.sin(tick * 0.08) * 4, 22 + Math.sin(tick * 0.08) * 3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(220,38,38,${0.3 + 0.15 * Math.sin(tick * 0.07)})`;
    ctx.lineWidth = 3;
    ctx.stroke();

  } else {
    // ── Regular curse spirit: amorphous but vaguely upright ──
    const sway = Math.sin(wc * 0.5) * 4;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 4, 14, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();

    // Trailing tendrils
    if (!flash) {
      for (let i = 0; i < 4; i++) {
        const ta = (i / 4) * Math.PI * 2 + tick * 0.06;
        const tx = Math.cos(ta) * (12 + Math.sin(tick * 0.05 + i) * 4);
        const ty = Math.sin(ta) * (7 + Math.sin(tick * 0.05 + i) * 3);
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.quadraticCurveTo(tx * 0.5, -14 + ty * 0.5, tx, -10 + ty);
        ctx.strokeStyle = `rgba(109,40,217,${0.4 + 0.2 * Math.sin(tick * 0.07 + i)})`;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    // Body blob
    ctx.beginPath();
    ctx.moveTo(0, -28 + sway);
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const br2 = 14 + Math.sin(tick * 0.07 + i * 1.4) * 4;
      const bx = Math.cos(a) * br2;
      const by = Math.sin(a) * br2 - 14 + sway;
      ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.fillStyle = flash ? "#fff" : "#2d1b69";
    ctx.fill();
    ctx.strokeStyle = flash ? "#c4b5fd" : "#5b21b6";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Single large eye
    ctx.beginPath();
    ctx.ellipse(0, -16 + sway, 7, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = flash ? "#fbbf24" : "#a78bfa";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -16 + sway, 3, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    // Eye shine
    ctx.beginPath();
    ctx.arc(-2, -18 + sway, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    // Small mouth slit
    if (!flash) {
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -10 + sway);
      ctx.quadraticCurveTo(0, -7 + sway, 4, -10 + sway);
      ctx.stroke();
    }
  }

  ctx.restore();

  // HP bar (always above in screen space)
  const barW = e.type === "special" ? 50 : 36;
  const bx = sx - barW / 2;
  const by = sy - (e.type === "special" ? 68 : 44);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(bx - 1, by - 1, barW + 2, 5 + 2);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(bx, by, barW, 5);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), 5);
};

const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle, camX: number, camY: number) => {
  const { sx, sy } = toScreen(p.x, p.y, camX, camY);
  const alpha = p.life / p.maxLife;
  ctx.globalAlpha = alpha;
  if (p.shape === "spark") {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size * 0.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    const { sx: tx, sy: ty } = toScreen(p.x - p.vx * 3, p.y - p.vy * 3, camX, camY);
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  } else {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.size * alpha + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

const drawHUD = (ctx: CanvasRenderingContext2D, player: Player, score: number) => {
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(12, 12, 168, 22);
  const hpPct = player.hp / player.maxHp;
  ctx.fillStyle = hpPct > 0.6 ? "#22c55e" : hpPct > 0.3 ? "#f59e0b" : "#ef4444";
  ctx.fillRect(14, 14, 164 * hpPct, 18);
  ctx.strokeStyle = "#4338ca";
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, 168, 22);
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 11px monospace";
  ctx.fillText(`HP  ${player.hp} / ${player.maxHp}`, 18, 26);

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(12, 40, 168, 14);
  const cePct = player.cursedEnergy / player.maxCursedEnergy;
  ctx.fillStyle = "#7c3aed";
  ctx.fillRect(14, 42, 164 * cePct, 10);
  ctx.strokeStyle = "#4338ca";
  ctx.strokeRect(12, 40, 168, 14);
  ctx.fillStyle = "#c4b5fd";
  ctx.font = "9px monospace";
  ctx.fillText(`CURSED ENERGY  ${Math.floor(cePct * 100)}%`, 16, 51);

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(W - 172, 12, 160, 28);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 15px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${score}`, W - 18, 30);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "9px monospace";
  ctx.fillText("SCORE", W - 18, 20);
  ctx.textAlign = "left";

  // Special cooldown indicator
  if (player.specialCooldown > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(12, 60, 100, 12);
    ctx.fillStyle = "#6d28d9";
    ctx.fillRect(14, 62, 96 * (1 - player.specialCooldown / 90), 8);
    ctx.strokeStyle = "#4338ca";
    ctx.strokeRect(12, 60, 100, 12);
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "8px monospace";
    ctx.fillText("ТЕХНИКА:", 16, 70);
  }

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(W / 2 - 175, H - 28, 350, 20);
  ctx.fillStyle = "#64748b";
  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  ctx.fillText("WASD / ↑↓←→  Движение    Z/X  Удар    E  Проклятая техника", W / 2, H - 13);
  ctx.textAlign = "left";
};

// ─── Collision ───────────────────────────────────────────────────────────────

const circleRect = (cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number) => {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
};

// ─── Component ───────────────────────────────────────────────────────────────

const GameScreen = ({ onGameOver }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData | null>(null);
  const animRef = useRef<number>(0);

  const addParticle = (
    g: GameData, x: number, y: number,
    color: string, count = 5,
    shape: "circle" | "spark" = "circle"
  ) => {
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 25 + Math.random() * 20,
        maxLife: 45,
        color, size: 3 + Math.random() * 4, shape,
      });
    }
  };

  const initGame = useCallback(() => {
    gameRef.current = {
      player: {
        x: 120, y: 120, vx: 0, vy: 0,
        hp: 8, maxHp: 8,
        attackTimer: 0, invincible: 0,
        facing: { x: 1, y: 0 },
        attacking: false, attackAnim: 0,
        cursedEnergy: 100, maxCursedEnergy: 100,
        specialCooldown: 0,
        walkCycle: 0,
      },
      enemies: spawnEnemies(),
      obstacles: createObstacles(),
      particles: [],
      camX: 120, camY: 120,
      keys: new Set(),
      tick: 0, running: true, score: 0,
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
      if (down) g.keys.add(e.code); else g.keys.delete(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code))
        e.preventDefault();
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

      // Movement input
      let mvx = 0, mvy = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) mvx -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) mvx += 1;
      if (keys.has("ArrowUp") || keys.has("KeyW")) mvy -= 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) mvy += 1;

      if (mvx !== 0 || mvy !== 0) {
        const len = Math.sqrt(mvx * mvx + mvy * mvy);
        player.vx = (mvx / len) * PLAYER_SPEED;
        player.vy = (mvy / len) * PLAYER_SPEED;
        player.facing = { x: mvx / len, y: mvy / len };
        player.walkCycle += 0.18;
      } else {
        player.vx *= 0.5;
        player.vy *= 0.5;
      }

      // Move + collide
      const pr = 12;
      const nx = player.x + player.vx;
      const ny = player.y + player.vy;
      let bx = false, by = false;
      obstacles.forEach(o => {
        if (circleRect(nx, player.y, pr, o.x, o.y, o.w, o.h)) bx = true;
        if (circleRect(player.x, ny, pr, o.x, o.y, o.w, o.h)) by = true;
      });
      if (!bx) player.x = nx;
      if (!by) player.y = ny;
      player.x = Math.max(pr, Math.min(WORLD_W - pr, player.x));
      player.y = Math.max(pr, Math.min(WORLD_H - pr, player.y));

      // Attack
      if ((keys.has("KeyZ") || keys.has("KeyX")) && player.attackTimer <= 0) {
        player.attacking = true;
        player.attackTimer = ATTACK_COOLDOWN;
        player.attackAnim = 12;
        enemies.forEach(e => {
          if (!e.alive) return;
          const dx = e.x - player.x, dy = e.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const dot = player.facing.x * dx + player.facing.y * dy;
          if (dist < ATTACK_RANGE + e.hp * 2 && dot > -6) {
            e.hp--;
            e.hitFlash = 10;
            e.vx = player.facing.x * 4;
            e.vy = player.facing.y * 4;
            addParticle(g, e.x, e.y, "#a78bfa", 6, "spark");
            if (e.hp <= 0) {
              e.alive = false;
              g.score += e.type === "special" ? 300 : 100;
              addParticle(g, e.x, e.y, "#fbbf24", 14);
              addParticle(g, e.x, e.y, "#ef4444", 6, "spark");
            }
          }
        });
      }

      // Special cursed technique
      if (keys.has("KeyE") && player.specialCooldown <= 0 && player.cursedEnergy >= 30) {
        player.cursedEnergy -= 30;
        player.specialCooldown = 90;
        enemies.forEach(e => {
          if (!e.alive) return;
          const dx = e.x - player.x, dy = e.y - player.y;
          if (dx * dx + dy * dy < 110 * 110) {
            e.hp -= 3; e.hitFlash = 18;
            e.vx = dx * 0.08; e.vy = dy * 0.08;
            addParticle(g, e.x, e.y, "#8b5cf6", 12, "spark");
            if (e.hp <= 0) {
              e.alive = false;
              g.score += e.type === "special" ? 300 : 100;
              addParticle(g, e.x, e.y, "#fbbf24", 18);
            }
          }
        });
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          g.particles.push({
            x: player.x + Math.cos(a) * 8, y: player.y + Math.sin(a) * 8,
            vx: Math.cos(a) * 9, vy: Math.sin(a) * 9,
            life: 35, maxLife: 35, color: "#7c3aed", size: 5, shape: "spark",
          });
        }
      }

      if (player.attackTimer > 0) player.attackTimer--;
      if (player.attackAnim > 0) player.attackAnim--;
      if (player.attackTimer <= ATTACK_COOLDOWN - 12) player.attacking = false;
      if (player.invincible > 0) player.invincible--;
      if (player.specialCooldown > 0) player.specialCooldown--;
      if (g.tick % 55 === 0 && player.cursedEnergy < player.maxCursedEnergy)
        player.cursedEnergy = Math.min(player.maxCursedEnergy, player.cursedEnergy + 5);

      // Enemy AI
      enemies.forEach(e => {
        if (!e.alive) return;
        e.aiTimer++;
        e.walkCycle += 0.12;

        const dx = player.x - e.x, dy = player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = e.type === "special" ? 1.3 : 1.7;

        if (dist > 0 && dist < 380) {
          e.vx += (dx / dist) * speed * 0.28;
          e.vy += (dy / dist) * speed * 0.28;
          const spd = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
          if (spd > speed) { e.vx = e.vx / spd * speed; e.vy = e.vy / spd * speed; }
          e.facing = dx > 0 ? 1 : -1;
        } else {
          if (e.aiTimer % 80 === 0) { e.vx = (Math.random() - 0.5) * 1.4; e.vy = (Math.random() - 0.5) * 1.4; }
        }

        e.vx *= 0.82; e.vy *= 0.82;

        const er = e.type === "special" ? 18 : 12;
        const enx = e.x + e.vx, eny = e.y + e.vy;
        let ebx = false, eby = false;
        obstacles.forEach(o => {
          if (circleRect(enx, e.y, er, o.x, o.y, o.w, o.h)) ebx = true;
          if (circleRect(e.x, eny, er, o.x, o.y, o.w, o.h)) eby = true;
        });
        if (!ebx) e.x = enx; if (!eby) e.y = eny;
        e.x = Math.max(er, Math.min(WORLD_W - er, e.x));
        e.y = Math.max(er, Math.min(WORLD_H - er, e.y));
        if (e.hitFlash > 0) e.hitFlash--;

        // Hit player
        if (player.invincible <= 0 && dist < pr + er + 2) {
          player.hp--;
          player.invincible = 65;
          addParticle(g, player.x, player.y, "#dc2626", 8);
          if (player.hp <= 0) {
            g.running = false;
            onGameOver(g.score);
          }
        }
      });

      // Particles
      g.particles = g.particles.filter(p => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.88; p.vy *= 0.88;
        return --p.life > 0;
      });

      // Camera (follow player in world space)
      g.camX += (player.x - g.camX) * CAMERA_LERP;
      g.camY += (player.y - g.camY) * CAMERA_LERP;
      g.camX = Math.max(0, Math.min(WORLD_W, g.camX));
      g.camY = Math.max(0, Math.min(WORLD_H, g.camY));

      // ── Render ─────────────────────────────────────────────────────────────

      // Sort entities by Y for correct iso depth order
      const drawList: Array<{ y: number; draw: () => void }> = [];

      g.obstacles.forEach(o => {
        const midY = o.y + o.h / 2;
        drawList.push({ y: midY, draw: () => drawObstacle(ctx, o, g.camX, g.camY) });
      });

      enemies.forEach(e => {
        if (e.alive) drawList.push({ y: e.y, draw: () => drawEnemy(ctx, e, g.camX, g.camY, g.tick) });
      });

      drawList.push({ y: player.y, draw: () => drawPlayer(ctx, player, g.tick, g.camX, g.camY) });

      drawFloor(ctx, g.camX, g.camY, g.tick);

      g.particles.forEach(p => drawParticle(ctx, p, g.camX, g.camY));

      drawList.sort((a, b) => a.y - b.y);
      drawList.forEach(d => d.draw());

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
        background: "#07060f",
      }}
    />
  );
};

export default GameScreen;

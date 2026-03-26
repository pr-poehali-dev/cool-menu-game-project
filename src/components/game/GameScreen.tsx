import { useEffect, useRef, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
}

const W = 900;
const H = 500;
const GROUND = H - 80;
const GRAVITY = 0.55;
const JUMP_FORCE = -13;
const PLAYER_SPEED = 4;
const CAMERA_LERP = 0.08;

interface Entity {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

interface Player extends Entity {
  hp: number;
  maxHp: number;
  attackCooldown: number;
  attackTimer: number;
  invincible: number;
  facing: number;
  attacking: boolean;
  score: number;
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  alive: boolean;
  type: "runner" | "heavy";
  aiTimer: number;
  hitFlash: number;
}

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const createWorld = () => {
  const platforms: Platform[] = [
    { x: 200, y: GROUND - 100, w: 120, h: 16 },
    { x: 420, y: GROUND - 160, w: 100, h: 16 },
    { x: 620, y: GROUND - 100, w: 140, h: 16 },
    { x: 850, y: GROUND - 200, w: 90, h: 16 },
    { x: 1050, y: GROUND - 130, w: 120, h: 16 },
    { x: 1280, y: GROUND - 180, w: 100, h: 16 },
    { x: 1480, y: GROUND - 100, w: 150, h: 16 },
    { x: 1700, y: GROUND - 220, w: 80, h: 16 },
    { x: 1900, y: GROUND - 140, w: 130, h: 16 },
  ];

  const buildings: Building[] = [];
  const colors = ["#111827", "#0f172a", "#1a1f2e", "#141b2d"];
  for (let i = -1; i < 35; i++) {
    buildings.push({
      x: i * 140 + Math.random() * 30,
      y: GROUND - 120 - Math.random() * 220,
      w: 80 + Math.random() * 60,
      h: 120 + Math.random() * 220,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  return { platforms, buildings };
};

const spawnEnemies = (): Enemy[] => {
  const enemies: Enemy[] = [];
  const positions = [300, 600, 900, 1200, 1500, 1800, 2100];
  positions.forEach((x, i) => {
    const isHeavy = i % 3 === 2;
    enemies.push({
      x,
      y: GROUND - (isHeavy ? 50 : 40),
      w: isHeavy ? 40 : 28,
      h: isHeavy ? 50 : 40,
      vx: 0,
      vy: 0,
      onGround: true,
      hp: isHeavy ? 6 : 3,
      maxHp: isHeavy ? 6 : 3,
      alive: true,
      type: isHeavy ? "heavy" : "runner",
      aiTimer: 0,
      hitFlash: 0,
    });
  });
  return enemies;
};

const GameScreen = ({ onGameOver }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    player: Player;
    enemies: Enemy[];
    platforms: Platform[];
    buildings: Building[];
    particles: Particle[];
    camera: number;
    keys: Set<string>;
    tick: number;
    running: boolean;
    score: number;
    worldLen: number;
  } | null>(null);
  const animRef = useRef<number>(0);

  const addParticle = (x: number, y: number, color: string, count = 5) => {
    const g = gameRef.current;
    if (!g) return;
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * -5 - 1,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  };

  const initGame = useCallback(() => {
    const { platforms, buildings } = createWorld();
    const player: Player = {
      x: 100,
      y: GROUND - 44,
      w: 28,
      h: 44,
      vx: 0,
      vy: 0,
      onGround: true,
      hp: 6,
      maxHp: 6,
      attackCooldown: 25,
      attackTimer: 0,
      invincible: 0,
      facing: 1,
      attacking: false,
      score: 0,
    };

    gameRef.current = {
      player,
      enemies: spawnEnemies(),
      platforms,
      buildings,
      particles: [],
      camera: 0,
      keys: new Set(),
      tick: 0,
      running: true,
      score: 0,
      worldLen: 2400,
    };
  }, []);

  useEffect(() => {
    initGame();
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const g = gameRef.current;
      if (!g || !g.running) return;

      g.tick++;
      const { player, enemies, platforms, keys } = g;

      // Input
      if (keys.has("ArrowLeft")) { player.vx = -PLAYER_SPEED; player.facing = -1; }
      else if (keys.has("ArrowRight")) { player.vx = PLAYER_SPEED; player.facing = 1; }
      else player.vx *= 0.7;

      if ((keys.has("ArrowUp") || keys.has("Space") || keys.has("KeyW")) && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
        addParticle(player.x + player.w / 2, player.y + player.h, "#60a5fa", 3);
      }

      if ((keys.has("KeyZ") || keys.has("KeyX") || keys.has("ShiftLeft")) && player.attackTimer <= 0) {
        player.attacking = true;
        player.attackTimer = player.attackCooldown;

        const ax = player.facing === 1 ? player.x + player.w : player.x - 40;
        enemies.forEach((e) => {
          if (!e.alive) return;
          if (e.x < ax + 40 && e.x + e.w > ax && e.y < player.y + player.h && e.y + e.h > player.y) {
            e.hp--;
            e.hitFlash = 8;
            e.vx = player.facing * 5;
            e.vy = -3;
            addParticle(e.x + e.w / 2, e.y + e.h / 2, "#ef4444", 8);
            if (e.hp <= 0) {
              e.alive = false;
              g.score += e.type === "heavy" ? 200 : 100;
              addParticle(e.x + e.w / 2, e.y + e.h / 2, "#fbbf24", 12);
            }
          }
        });
      }

      if (player.attackTimer > 0) player.attackTimer--;
      if (player.attackTimer <= player.attackCooldown - 8) player.attacking = false;
      if (player.invincible > 0) player.invincible--;

      // Physics - player
      player.vy += GRAVITY;
      player.x += player.vx;
      player.y += player.vy;

      player.onGround = false;

      // Ground collision
      if (player.y + player.h >= GROUND) {
        player.y = GROUND - player.h;
        player.vy = 0;
        player.onGround = true;
      }

      // Platform collision
      platforms.forEach((p) => {
        if (
          player.vy >= 0 &&
          player.y + player.h <= p.y + 12 &&
          player.y + player.h + player.vy >= p.y &&
          player.x + player.w > p.x + 4 &&
          player.x < p.x + p.w - 4
        ) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      });

      // Bounds
      if (player.x < 0) player.x = 0;
      if (player.x + player.w > g.worldLen) { player.x = g.worldLen - player.w; }

      // Enemy AI
      enemies.forEach((e) => {
        if (!e.alive) return;
        e.aiTimer++;

        const dx = player.x - e.x;
        const dist = Math.abs(dx);
        const speed = e.type === "heavy" ? 1.2 : 2;

        if (dist < 400) {
          e.vx = Math.sign(dx) * speed;
        } else {
          e.vx *= 0.9;
        }

        if (e.type === "runner" && dist < 300 && e.aiTimer % 90 === 0 && e.onGround) {
          e.vy = JUMP_FORCE * 0.8;
          e.onGround = false;
        }

        e.vy += GRAVITY;
        e.x += e.vx;
        e.y += e.vy;
        e.onGround = false;

        if (e.y + e.h >= GROUND) {
          e.y = GROUND - e.h;
          e.vy = 0;
          e.onGround = true;
        }

        platforms.forEach((p) => {
          if (
            e.vy >= 0 &&
            e.y + e.h <= p.y + 12 &&
            e.y + e.h + e.vy >= p.y &&
            e.x + e.w > p.x + 4 &&
            e.x < p.x + p.w - 4
          ) {
            e.y = p.y - e.h;
            e.vy = 0;
            e.onGround = true;
          }
        });

        if (e.hitFlash > 0) e.hitFlash--;

        // Enemy hits player
        if (
          player.invincible <= 0 &&
          e.x < player.x + player.w &&
          e.x + e.w > player.x &&
          e.y < player.y + player.h &&
          e.y + e.h > player.y
        ) {
          player.hp--;
          player.invincible = 60;
          player.vx = -Math.sign(dx) * 6;
          player.vy = -5;
          addParticle(player.x + player.w / 2, player.y + player.h / 2, "#dc2626", 6);

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
        p.vy += 0.2;
        p.life--;
        return p.life > 0;
      });

      // Camera
      const targetCam = player.x - W / 3;
      g.camera += (targetCam - g.camera) * CAMERA_LERP;
      g.camera = Math.max(0, Math.min(g.camera, g.worldLen - W));

      // Draw
      draw(ctx, g);

      animRef.current = requestAnimationFrame(gameLoop);
    };

    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [initGame, onGameOver]);

  const draw = (ctx: CanvasRenderingContext2D, g: NonNullable<typeof gameRef.current>) => {
    const { player, enemies, platforms, buildings, particles, camera, tick } = g;
    const cx = Math.floor(camera);

    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, "#050c1a");
    sky.addColorStop(1, "#0d1b30");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND);

    // Stars (parallax 0.2)
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137 + 50) % 2400 - cx * 0.2 + 2400) % 2400;
      if (sx > W) continue;
      const sy = (i * 73 + 20) % (GROUND * 0.7);
      const alpha = 0.3 + 0.7 * Math.abs(Math.sin(tick * 0.02 + i));
      ctx.globalAlpha = alpha;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Buildings (parallax 0.4)
    buildings.forEach((b) => {
      const bx = b.x - cx * 0.4;
      if (bx + b.w < 0 || bx > W) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, b.y, b.w, b.h);
      ctx.strokeStyle = "#1f2d45";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, b.y, b.w, b.h);

      for (let wy = b.y + 8; wy < GROUND - 20; wy += 22) {
        for (let wx = bx + 6; wx < bx + b.w - 12; wx += 16) {
          const seed = Math.floor(wx / 16) + Math.floor(wy / 22) * 100;
          const on = (seed * 2654435761) % 100 > 35;
          if (on) {
            ctx.fillStyle = "#fbbf24";
            ctx.globalAlpha = 0.7 + 0.3 * Math.abs(Math.sin(tick * 0.01 + seed));
            ctx.fillRect(wx, wy, 8, 12);
            ctx.globalAlpha = 1;
          }
        }
      }
    });

    // Ground
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, GROUND, W, 4);

    // Road markings
    for (let rx = -cx % 120; rx < W; rx += 120) {
      ctx.fillStyle = "#facc15";
      ctx.globalAlpha = 0.5;
      ctx.fillRect(rx, GROUND + 30, 60, 5);
      ctx.globalAlpha = 1;
    }

    // Platforms
    platforms.forEach((p) => {
      const px = p.x - cx;
      if (px + p.w < 0 || px > W) return;
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(px, p.y, p.w, 3);
      ctx.fillStyle = "#60a5fa";
      ctx.globalAlpha = 0.3;
      ctx.fillRect(px, p.y - 4, p.w, 4);
      ctx.globalAlpha = 1;
    });

    // Particles
    particles.forEach((p) => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - cx, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    // Enemies
    enemies.forEach((e) => {
      if (!e.alive) return;
      const ex = e.x - cx;
      if (ex + e.w < -10 || ex > W + 10) return;

      const flash = e.hitFlash > 0 && e.hitFlash % 2 === 0;

      if (e.type === "heavy") {
        ctx.fillStyle = flash ? "#ffffff" : "#991b1b";
        ctx.fillRect(ex, e.y, e.w, e.h);
        ctx.fillStyle = flash ? "#fca5a5" : "#7f1d1d";
        ctx.fillRect(ex + 4, e.y + 4, e.w - 8, 16);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(ex + 8, e.y + 8, 8, 6);
        ctx.fillRect(ex + e.w - 16, e.y + 8, 8, 6);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(ex + 6, e.y + 18, e.w - 12, 3);
      } else {
        ctx.fillStyle = flash ? "#ffffff" : "#7c3aed";
        ctx.fillRect(ex, e.y, e.w, e.h);
        ctx.fillStyle = flash ? "#c4b5fd" : "#5b21b6";
        ctx.fillRect(ex + 3, e.y + 3, e.w - 6, 14);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(ex + 5, e.y + 7, 6, 5);
        ctx.fillRect(ex + e.w - 11, e.y + 7, 6, 5);
      }

      // Enemy HP bar
      const barW = e.w;
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(ex, e.y - 10, barW, 5);
      ctx.fillStyle = e.type === "heavy" ? "#ef4444" : "#8b5cf6";
      ctx.fillRect(ex, e.y - 10, barW * (e.hp / e.maxHp), 5);
    });

    // Player
    const px = player.x - cx;
    const isInv = player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0;

    if (!isInv) {
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(px, player.y + player.h * 0.45, player.w, player.h * 0.55);

      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(px + 2, player.y, player.w - 4, player.h * 0.48);

      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(px + 4, player.y + 4, player.w - 8, player.h * 0.22);

      ctx.fillStyle = "#0f172a";
      if (player.facing === 1) {
        ctx.fillRect(px + 14, player.y + 10, 5, 4);
        ctx.fillRect(px + 8, player.y + 18, 12, 2);
      } else {
        ctx.fillRect(px + 9, player.y + 10, 5, 4);
        ctx.fillRect(px + 8, player.y + 18, 12, 2);
      }

      // Attack effect
      if (player.attacking) {
        ctx.fillStyle = "#fbbf24";
        ctx.globalAlpha = 0.8;
        const aw = 40;
        const ax2 = player.facing === 1 ? px + player.w : px - aw;
        ctx.fillRect(ax2, player.y + 10, aw, 8);

        ctx.globalAlpha = 0.4;
        ctx.fillRect(ax2, player.y + 5, aw, 20);
        ctx.globalAlpha = 1;
      }
    }

    // HUD
    drawHUD(ctx, g);
  };

  const drawHUD = (ctx: CanvasRenderingContext2D, g: NonNullable<typeof gameRef.current>) => {
    const { player } = g;

    // HP bar background
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(16, 16, 200, 28);

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(20, 20, 192, 20);

    const hpW = 192 * (player.hp / player.maxHp);
    const hpColor = player.hp > 3 ? "#22c55e" : player.hp > 1 ? "#f59e0b" : "#ef4444";
    ctx.fillStyle = hpColor;
    ctx.fillRect(20, 20, hpW, 20);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'Russo One', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`HP  ${player.hp} / ${player.maxHp}`, 26, 34);

    // Score
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(W - 160, 16, 144, 28);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 14px 'Russo One', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${g.score}`, W - 22, 34);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px 'Russo One', sans-serif";
    ctx.fillText("ОЧКИ", W - 22, 48);

    // Controls hint (first 5 seconds)
    if (g.tick < 300) {
      const alpha = g.tick < 240 ? 1 : (300 - g.tick) / 60;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(W / 2 - 160, H - 50, 320, 34);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px 'Russo One', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("← → движение   ↑/ПРОБЕЛ прыжок   Z/X атака", W / 2, H - 28);
      ctx.globalAlpha = 1;
    }
  };

  return (
    <div className="game-screen">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="game-canvas"
        tabIndex={0}
      />
    </div>
  );
};

export default GameScreen;

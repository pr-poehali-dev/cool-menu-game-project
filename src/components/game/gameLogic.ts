import {
  GameState,
  Particle,
  GRAVITY,
  JUMP_FORCE,
  PLAYER_SPEED,
  CAMERA_LERP,
  GROUND,
  W,
} from "./gameTypes";

export const addParticle = (
  g: GameState,
  x: number,
  y: number,
  color: string,
  count = 5
) => {
  for (let i = 0; i < count; i++) {
    const p: Particle = {
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * -5 - 1,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 3 + Math.random() * 4,
    };
    g.particles.push(p);
  }
};

export const updateGame = (
  g: GameState,
  onGameOver: (score: number) => void
) => {
  g.tick++;
  const { player, enemies, platforms, keys } = g;

  // Input
  if (keys.has("ArrowLeft")) { player.vx = -PLAYER_SPEED; player.facing = -1; }
  else if (keys.has("ArrowRight")) { player.vx = PLAYER_SPEED; player.facing = 1; }
  else player.vx *= 0.7;

  if ((keys.has("ArrowUp") || keys.has("Space") || keys.has("KeyW")) && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    addParticle(g, player.x + player.w / 2, player.y + player.h, "#60a5fa", 3);
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
        addParticle(g, e.x + e.w / 2, e.y + e.h / 2, "#ef4444", 8);
        if (e.hp <= 0) {
          e.alive = false;
          g.score += e.type === "heavy" ? 200 : 100;
          addParticle(g, e.x + e.w / 2, e.y + e.h / 2, "#fbbf24", 12);
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
  if (player.x + player.w > g.worldLen) player.x = g.worldLen - player.w;

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
      addParticle(g, player.x + player.w / 2, player.y + player.h / 2, "#dc2626", 6);

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
};

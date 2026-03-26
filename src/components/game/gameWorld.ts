import { GROUND, Platform, Building, Enemy } from "./gameTypes";

export const createWorld = (): { platforms: Platform[]; buildings: Building[] } => {
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

export const spawnEnemies = (): Enemy[] => {
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

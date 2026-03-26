export const W = 900;
export const H = 500;
export const GROUND = H - 80;
export const GRAVITY = 0.55;
export const JUMP_FORCE = -13;
export const PLAYER_SPEED = 4;
export const CAMERA_LERP = 0.08;

export interface Entity {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  attackCooldown: number;
  attackTimer: number;
  invincible: number;
  facing: number;
  attacking: boolean;
  score: number;
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  alive: boolean;
  type: "runner" | "heavy";
  aiTimer: number;
  hitFlash: number;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface GameState {
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
}

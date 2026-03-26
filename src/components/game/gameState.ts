// =========================================================
// gameState.ts — Cursed Legacy
// =========================================================

export type EnergyType =
  | "infinity"    // Годзё — Бесконечность
  | "divergent"   // Итадори — Расщеплённый кулак
  | "straw"       // Нобара — Соломенная кукла
  | "sukuna"      // Сукуна — Разобрать/Рассечь
  | "ratio"       // Нанами — Соотношение
  | "boogie"      // Тодо — Бугги-Вугги
  | "puppet"      // Маки — Небесное ограничение
  | "shadow"      // Мегуми — Десять теней
  | "poison"      // Дзюго — Яд
  | "lightning";  // Хакари — Джекпот

export interface EnergyDef {
  id: EnergyType;
  name: string;
  nameRu: string;
  kanji: string;
  color: string;
  glowColor: string;
  description: string;
  affinityDesc: string; // к чему склонна эта энергия (без пассивок)
  statMods: {
    damage: number;
    speed: number;
    defense: number;
    energyRegen: number;
    attackSpeed: number;
  };
}

export const ENERGIES: EnergyDef[] = [
  {
    id: "infinity",
    name: "Infinity",
    nameRu: "Бесконечность",
    kanji: "∞",
    color: "#60a5fa",
    glowColor: "#93c5fd",
    description: "Ты остановил время между тобой и врагом. Атаки замедляются и теряют силу до того, как достигнут тебя. Пространство — твой союзник.",
    affinityDesc: "Склонность к защите и контролю пространства. Техники манипуляции CE даются легче всего.",
    statMods: { damage: 0.9, speed: 1.1, defense: 1.5, energyRegen: 0.8, attackSpeed: 1.0 },
  },
  {
    id: "divergent",
    name: "Divergent Fist",
    nameRu: "Расщеплённый кулак",
    kanji: "裂",
    color: "#ef4444",
    glowColor: "#fca5a5",
    description: "Удар разделяется — первая волна CE немедленная, вторая догоняет через мгновение. Враги получают двойной удар от одного жеста.",
    affinityDesc: "Склонность к ударной технике и физической силе. Атакующие техники даются легче.",
    statMods: { damage: 1.2, speed: 1.0, defense: 0.9, energyRegen: 1.0, attackSpeed: 1.15 },
  },
  {
    id: "straw",
    name: "Straw Doll",
    nameRu: "Соломенная кукла",
    kanji: "藁",
    color: "#fb923c",
    glowColor: "#fdba74",
    description: "Ты вбиваешь гвозди в кукол — и враги чувствуют каждый удар. Кровь — твоё оружие и твой резонанс.",
    affinityDesc: "Склонность к техникам проклятий и резонанса. Инструментальные техники даются без труда.",
    statMods: { damage: 1.1, speed: 0.95, defense: 1.0, energyRegen: 1.15, attackSpeed: 0.9 },
  },
  {
    id: "sukuna",
    name: "King of Curses",
    nameRu: "Король Проклятий",
    kanji: "解",
    color: "#f87171",
    glowColor: "#fca5a5",
    description: "Мгновенные режущие потоки CE. Разобрать — для слабых, Рассечь — для сильных. Никаких компромиссов.",
    affinityDesc: "Склонность к разрушительным рубящим техникам. Наносить урон — это твоя природа.",
    statMods: { damage: 1.5, speed: 1.0, defense: 0.75, energyRegen: 0.85, attackSpeed: 1.2 },
  },
  {
    id: "ratio",
    name: "Ratio Technique",
    nameRu: "Соотношение",
    kanji: "比",
    color: "#1e40af",
    glowColor: "#3b82f6",
    description: "Каждую цель делишь в уме на 10 частей — удар в точку соотношения 7:3 наносит критический урон. Просто, эффективно, без прикрас.",
    affinityDesc: "Склонность к точности и методичности. Техники с накоплением и анализом даются лучше.",
    statMods: { damage: 1.15, speed: 0.95, defense: 1.15, energyRegen: 1.0, attackSpeed: 0.95 },
  },
  {
    id: "boogie",
    name: "Boogie Woogie",
    nameRu: "Бугги-Вугги",
    kanji: "交",
    color: "#7dd3fc",
    glowColor: "#bae6fd",
    description: "Хлопок — и ты меняешься местами с врагом или союзником. Пространство — это шутка, а ты знаешь punch-line.",
    affinityDesc: "Склонность к скорости и дезориентации. Техники мобильности и обмена даются легко.",
    statMods: { damage: 1.0, speed: 1.3, defense: 1.0, energyRegen: 1.1, attackSpeed: 1.1 },
  },
  {
    id: "puppet",
    name: "Heavenly Restriction",
    nameRu: "Небесное ограничение",
    kanji: "体",
    color: "#e2e8f0",
    glowColor: "#f1f5f9",
    description: "Без CE — только тело. Но тело, доведённое до предела. Скорость, рефлексы и физическая сила превышают возможности магов.",
    affinityDesc: "Склонность к физическому совершенству. Техники тела без CE доступны сразу.",
    statMods: { damage: 1.4, speed: 1.3, defense: 1.1, energyRegen: 0.1, attackSpeed: 1.2 },
  },
  {
    id: "shadow",
    name: "Ten Shadows",
    nameRu: "Десять теней",
    kanji: "影",
    color: "#374151",
    glowColor: "#6b7280",
    description: "Тени — твои слуги. Мегуми Фусигуро вызывает духовных зверей из теней. Ты — наследник той же техники.",
    affinityDesc: "Склонность к призыву и контролю теней. Техники призыва осваиваются быстрее.",
    statMods: { damage: 1.0, speed: 1.1, defense: 1.0, energyRegen: 1.2, attackSpeed: 1.0 },
  },
  {
    id: "poison",
    name: "Supernova",
    nameRu: "Яд — Сверхновая",
    kanji: "毒",
    color: "#86efac",
    glowColor: "#bbf7d0",
    description: "Яд пронизывает плоть и CE. Каждый удар откладывает токсин — и через секунды враг начинает гнить изнутри.",
    affinityDesc: "Склонность к яду и накоплению. Техники с эффектами за время осваиваются без труда.",
    statMods: { damage: 0.8, speed: 1.0, defense: 1.1, energyRegen: 1.35, attackSpeed: 1.0 },
  },
  {
    id: "lightning",
    name: "Jackpot",
    nameRu: "Джекпот",
    kanji: "雷",
    color: "#16a34a",
    glowColor: "#4ade80",
    description: "CE бьёт как молния — мгновенно и непредсказуемо. Но удача переменчива: иногда она ударяет дважды, иногда промахивается.",
    affinityDesc: "Склонность к непредсказуемости и риску. Случайные и цепные техники доступны раньше.",
    statMods: { damage: 1.1, speed: 1.1, defense: 0.85, energyRegen: 1.0, attackSpeed: 1.15 },
  },
];

// ── Слот-система техник ───────────────────────────────────────────────────────
// Каждая техника имеет вес (слоты): 1 = простая, 2 = средняя, 3 = сложная
// Всего у игрока 5 слотов. Можно учить все техники (энергия = склонность, не ограничение)

export interface Technique {
  id: string;
  nameRu: string;
  nameJp?: string;
  description: string;
  slots: 1 | 2 | 3;            // сколько слотов занимает
  ceCost: number;
  cooldownSec: number;
  xpToLearn: number;            // XP для изучения
  learningProgress?: number;    // текущий прогресс изучения (0..xpToLearn)
  energyAffinity?: EnergyType[]; // энергии с бонусом (не ограничение)
  isHealing?: boolean;
}

// Базовая атака — всегда доступна (не занимает слот)
export const BASE_ATTACK: Technique = {
  id: "basic_attack",
  nameRu: "Проклятый удар",
  description: "Базовый удар с CE. Урон зависит от энергии.",
  slots: 1,
  ceCost: 0,
  cooldownSec: 0,
  xpToLearn: 0,
};

export const ALL_TECHNIQUES: Technique[] = [
  // ── Лечение (универсальная) ──
  {
    id: "reverse_curse",
    nameRu: "Обратная техника",
    nameJp: "反転術式",
    description: "Используешь отрицательную CE для регенерации. Восстанавливает 25% от максимального HP.",
    slots: 2,
    ceCost: 50,
    cooldownSec: 8,
    xpToLearn: 800,
    isHealing: true,
  },

  // ── Годзё ──
  {
    id: "blue",
    nameRu: "Синий",
    nameJp: "蒼",
    description: "Притягивает ближайшего врага к игроку с силой CE. Урон при столкновении.",
    slots: 2,
    ceCost: 30,
    cooldownSec: 1.5,
    xpToLearn: 400,
    energyAffinity: ["infinity"],
  },
  {
    id: "red",
    nameRu: "Красный",
    nameJp: "赫",
    description: "Взрыв CE отталкивает всех врагов в радиусе 120px.",
    slots: 2,
    ceCost: 40,
    cooldownSec: 2.5,
    xpToLearn: 600,
    energyAffinity: ["infinity"],
  },
  {
    id: "purple",
    nameRu: "Пустотный пурпур",
    nameJp: "虚式 茈",
    description: "Луч, стирающий всё на пути. Огромный урон по прямой.",
    slots: 3,
    ceCost: 80,
    cooldownSec: 8,
    xpToLearn: 1500,
    energyAffinity: ["infinity"],
  },

  // ── Итадори ──
  {
    id: "divergent_blow",
    nameRu: "Праздник",
    nameJp: "お祭り騒ぎ",
    description: "Серия из трёх быстрых ударов с CE-вспышкой на каждом.",
    slots: 2,
    ceCost: 30,
    cooldownSec: 2,
    xpToLearn: 350,
    energyAffinity: ["divergent"],
  },
  {
    id: "rush",
    nameRu: "Рывок CE",
    description: "Мгновенный рывок вперёд с уроном на пути.",
    slots: 1,
    ceCost: 20,
    cooldownSec: 1.5,
    xpToLearn: 200,
    energyAffinity: ["divergent"],
  },

  // ── Нобара ──
  {
    id: "hairpin",
    nameRu: "Шпилька",
    nameJp: "共鳴り",
    description: "Кровный резонанс — взрыв CE поражает всех врагов рядом.",
    slots: 2,
    ceCost: 35,
    cooldownSec: 2.5,
    xpToLearn: 450,
    energyAffinity: ["straw"],
  },
  {
    id: "resonance",
    nameRu: "Резонанс",
    description: "При получении урона — отправить 80% врагу с полным HP.",
    slots: 2,
    ceCost: 25,
    cooldownSec: 3,
    xpToLearn: 550,
    energyAffinity: ["straw"],
  },

  // ── Сукуна ──
  {
    id: "dismantle",
    nameRu: "Разобрать",
    nameJp: "解",
    description: "Режущий поток CE мгновенно. 30% шанс двойного удара.",
    slots: 1,
    ceCost: 20,
    cooldownSec: 1,
    xpToLearn: 300,
    energyAffinity: ["sukuna"],
  },
  {
    id: "cleave",
    nameRu: "Рассечь",
    nameJp: "斬",
    description: "Адаптивный удар: чем больше HP у врага, тем сильнее урон.",
    slots: 2,
    ceCost: 35,
    cooldownSec: 2.5,
    xpToLearn: 500,
    energyAffinity: ["sukuna"],
  },
  {
    id: "domain_sukuna",
    nameRu: "Расширение области",
    nameJp: "領域展開",
    description: "На 5 сек все удары наносят двойной урон.",
    slots: 3,
    ceCost: 70,
    cooldownSec: 10,
    xpToLearn: 2000,
    energyAffinity: ["sukuna"],
  },

  // ── Нанами ──
  {
    id: "ratio_strike",
    nameRu: "Сверхурочные",
    nameJp: "時間外労働",
    description: "Серия усиленных ударов — каждый 7-й автоматически в точку 7:3.",
    slots: 2,
    ceCost: 30,
    cooldownSec: 2,
    xpToLearn: 400,
    energyAffinity: ["ratio"],
  },
  {
    id: "blunt",
    nameRu: "Тупой клинок",
    description: "Удар с отдачей — враг теряет скорость на 3 сек.",
    slots: 1,
    ceCost: 20,
    cooldownSec: 1.5,
    xpToLearn: 250,
    energyAffinity: ["ratio"],
  },

  // ── Тодо ──
  {
    id: "swap",
    nameRu: "Бугги-Вугги",
    nameJp: "芳心",
    description: "Немедленный обмен позицией с целью. Цель дезориентирована 1 сек.",
    slots: 2,
    ceCost: 25,
    cooldownSec: 1.5,
    xpToLearn: 350,
    energyAffinity: ["boogie"],
  },
  {
    id: "phantom",
    nameRu: "Фантомный хлопок",
    description: "Три быстрых обмена подряд — враги не успевают понять.",
    slots: 3,
    ceCost: 35,
    cooldownSec: 4,
    xpToLearn: 900,
    energyAffinity: ["boogie"],
  },

  // ── Маки ──
  {
    id: "dash_atk",
    nameRu: "Рывок-удар",
    description: "Стремительный рывок с ударом. CE не нужна.",
    slots: 1,
    ceCost: 0,
    cooldownSec: 1.5,
    xpToLearn: 200,
    energyAffinity: ["puppet"],
  },
  {
    id: "counter",
    nameRu: "Контрудар",
    description: "При атаке в этот момент — урон отражается обратно.",
    slots: 2,
    ceCost: 0,
    cooldownSec: 2,
    xpToLearn: 600,
    energyAffinity: ["puppet"],
  },

  // ── Мегуми ──
  {
    id: "divine_dog",
    nameRu: "Пёс-тень",
    nameJp: "玉犬",
    description: "Призываешь теневого пса — тот атакует ближайшего врага.",
    slots: 2,
    ceCost: 30,
    cooldownSec: 2.5,
    xpToLearn: 450,
    energyAffinity: ["shadow"],
  },
  {
    id: "nue",
    nameRu: "Нуэ",
    nameJp: "鵺",
    description: "Духовная птица бьёт врагов молнией с воздуха.",
    slots: 3,
    ceCost: 40,
    cooldownSec: 4,
    xpToLearn: 1000,
    energyAffinity: ["shadow"],
  },

  // ── Дзюго ──
  {
    id: "venom_burst",
    nameRu: "Взрыв яда",
    nameJp: "毒爆発",
    description: "Мгновенный выброс яда — накладывает 2 стака на всех рядом.",
    slots: 2,
    ceCost: 30,
    cooldownSec: 2,
    xpToLearn: 350,
    energyAffinity: ["poison"],
  },
  {
    id: "miasma",
    nameRu: "Миазм",
    description: "Ядовитое облако на 4 сек. Враги в нём теряют HP.",
    slots: 2,
    ceCost: 45,
    cooldownSec: 5,
    xpToLearn: 700,
    energyAffinity: ["poison"],
  },

  // ── Хакари ──
  {
    id: "jackpot",
    nameRu: "Джекпот!",
    nameJp: "大当たり",
    description: "Случайный эффект: тройной удар, исцеление или цепная молния.",
    slots: 2,
    ceCost: 30,
    cooldownSec: 3,
    xpToLearn: 500,
    energyAffinity: ["lightning"],
  },
  {
    id: "barrier_ce",
    nameRu: "Барьер CE",
    description: "На 3 сек — электрический щит. Атаки по тебе бьют током.",
    slots: 2,
    ceCost: 35,
    cooldownSec: 4,
    xpToLearn: 650,
    energyAffinity: ["lightning"],
  },
];

export function getTechniqueById(id: string): Technique | undefined {
  if (id === BASE_ATTACK.id) return BASE_ATTACK;
  return ALL_TECHNIQUES.find(t => t.id === id);
}

export const MAX_SLOTS = 5;

// ── Прогресс персонажа ────────────────────────────────────────────────────────

export interface LearnedTechniqueEntry {
  id: string;
  progress: number; // 0..xpToLearn
  learned: boolean;
}

export interface CharacterProgress {
  level: number;
  xp: number;
  xpToNext: number;
  energy: EnergyType;
  // техники: что изучается / изучено
  techniqueEntries: LearnedTechniqueEntry[];
  // активные слоты (id техник, занятые слоты)
  equippedTechniques: string[]; // id техник в слотах (не более MAX_SLOTS суммарно по весу)
  activeSlot: number; // индекс в equippedTechniques для быстрого использования
  // квест
  activeQuest: string | null;
  questProgress: number;
  questGoal: number;
}

export function xpForLevel(lvl: number): number {
  // Медленная прокачка: 200 + (level-1)*150
  return 200 + (lvl - 1) * 150;
}

export function createProgress(energy: EnergyType): CharacterProgress {
  return {
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    energy,
    techniqueEntries: [],
    equippedTechniques: [],
    activeSlot: 0,
    activeQuest: null,
    questProgress: 0,
    questGoal: 0,
  };
}

export function getEnergyDef(id: EnergyType): EnergyDef {
  return ENERGIES.find(e => e.id === id) ?? ENERGIES[0];
}

// Считает занятые слоты
export function usedSlots(equippedIds: string[]): number {
  return equippedIds.reduce((sum, id) => {
    const t = getTechniqueById(id);
    return sum + (t?.slots ?? 0);
  }, 0);
}

// ── Управление (кастомные кнопки) ─────────────────────────────────────────────

export interface KeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  attack: string;
  technique: string;
  nextTech: string;  // переключение активной техники
  interact: string;
  flee: string;      // побег из боя
}

export const DEFAULT_BINDINGS: KeyBindings = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  attack: "KeyZ",
  technique: "KeyE",
  nextTech: "KeyQ",
  interact: "KeyF",
  flee: "Escape",
};

const BINDINGS_STORAGE_KEY = "cursed_legacy_bindings";

export function loadBindings(): KeyBindings {
  try {
    const raw = localStorage.getItem(BINDINGS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_BINDINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_BINDINGS };
}

export function saveBindings(b: KeyBindings): void {
  localStorage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(b));
}

export function resetBindings(): KeyBindings {
  localStorage.removeItem(BINDINGS_STORAGE_KEY);
  return { ...DEFAULT_BINDINGS };
}

export function keyCodeToLabel(code: string): string {
  const map: Record<string, string> = {
    KeyA:"A", KeyB:"B", KeyC:"C", KeyD:"D", KeyE:"E", KeyF:"F", KeyG:"G",
    KeyH:"H", KeyI:"I", KeyJ:"J", KeyK:"K", KeyL:"L", KeyM:"M", KeyN:"N",
    KeyO:"O", KeyP:"P", KeyQ:"Q", KeyR:"R", KeyS:"S", KeyT:"T", KeyU:"U",
    KeyV:"V", KeyW:"W", KeyX:"X", KeyY:"Y", KeyZ:"Z",
    ArrowUp:"↑", ArrowDown:"↓", ArrowLeft:"←", ArrowRight:"→",
    Space:"Пробел", Enter:"Enter", ShiftLeft:"Shift", ShiftRight:"Shift",
    ControlLeft:"Ctrl", ControlRight:"Ctrl",
    Escape:"Esc",
    Digit1:"1", Digit2:"2", Digit3:"3", Digit4:"4", Digit5:"5",
    Digit6:"6", Digit7:"7", Digit8:"8", Digit9:"9", Digit0:"0",
  };
  return map[code] ?? code.replace("Key","");
}
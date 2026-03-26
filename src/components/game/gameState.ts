// =========================================================
// gameState.ts — Cursed Legacy
// =========================================================

export type EnergyType =
  | "infinity"    // Годзё — Бесконечность
  | "divergent"   // Итадори — Расщеплённый кулак
  | "straw"       // Нобара — Соломенная кукла
  | "dismantle"   // Сукуна — Разобрать
  | "ratio"       // Нанами — Соотношение
  | "boogie"      // Тодо — Бугги-Вугги
  | "puppet"      // Маки — Небесное ограничение
  | "shadow"      // Мегуми — Десять теней
  | "poison"      // Дзюго — Яд
  | "lightning"   // Хакари — Молния
  | "cleave"      // Сукуна — Рассечь
  | "max";        // Годзё — Пустотный пурпур

export interface EnergyDef {
  id: EnergyType;
  name: string;
  nameRu: string;
  kanji: string;
  color: string;
  glowColor: string;
  description: string;
  passive: string;
  limitation: string;
  inspiration: string;
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
    inspiration: "Сатору Годзё",
    description: "Ты остановил время между тобой и врагом. Атаки замедляются и теряют силу до того, как достигнут тебя. Пространство — твой союзник.",
    passive: "Каждый 5-й удар по тебе отражается — враг получает 50% своего урона обратно",
    limitation: "CE тратится пассивно (1 CE каждые 3 сек) — если иссякнет, защита спадёт",
    statMods: { damage: 0.9, speed: 1.1, defense: 1.5, energyRegen: 0.7, attackSpeed: 1.0 },
  },
  {
    id: "divergent",
    name: "Divergent Fist",
    nameRu: "Расщеплённый кулак",
    kanji: "裂",
    color: "#818cf8",
    glowColor: "#a5b4fc",
    inspiration: "Юдзи Итадори",
    description: "Удар разделяется — первая волна CE немедленная, вторая догоняет через мгновение. Враги получают двойной удар от одного жеста.",
    passive: "Каждый удар наносит дополнительный урон через 0.3 сек (15% от базового)",
    limitation: "Второй удар не поражает уже мёртвых врагов, требует точного тайминга",
    statMods: { damage: 1.2, speed: 1.0, defense: 0.9, energyRegen: 1.0, attackSpeed: 1.1 },
  },
  {
    id: "straw",
    name: "Straw Doll",
    nameRu: "Соломенная кукла",
    kanji: "藁",
    color: "#f59e0b",
    glowColor: "#fcd34d",
    inspiration: "Нобара Кугисаки",
    description: "Ты вбиваешь гвозди в кукол — и враги чувствуют каждый удар. Кровь — твоё оружие и твой резонанс.",
    passive: "При получении урона — отправляешь 40% его врагу с наибольшим HP (кровный резонанс)",
    limitation: "Эффект работает только на врагов, которых ты уже ударял хотя бы раз",
    statMods: { damage: 1.1, speed: 0.95, defense: 1.0, energyRegen: 1.1, attackSpeed: 0.9 },
  },
  {
    id: "dismantle",
    name: "Dismantle",
    nameRu: "Разобрать",
    kanji: "解",
    color: "#ef4444",
    glowColor: "#fca5a5",
    inspiration: "Рёмен Сукуна",
    description: "Мгновенные режущие потоки CE. Никакого замаха. Никакого предупреждения. Просто урон — чистый и холодный.",
    passive: "30% шанс мгновенного двойного удара при каждой атаке",
    limitation: "Без эффектов накопления. Либо попал — либо нет.",
    statMods: { damage: 1.5, speed: 1.0, defense: 0.75, energyRegen: 0.85, attackSpeed: 1.2 },
  },
  {
    id: "cleave",
    name: "Cleave",
    nameRu: "Рассечь",
    kanji: "斬",
    color: "#dc2626",
    glowColor: "#f87171",
    inspiration: "Рёмен Сукуна",
    description: "Урон адаптируется под живучесть цели. Чем больше HP у врага, тем сильнее Рассечение его режет. Боссы боятся этой техники.",
    passive: "Урон ×(1 + HP_цели/MaxHP_цели × 0.6) — чем полнее HP, тем больнее",
    limitation: "Слабо против уже раненых врагов (стандартный урон × 0.7)",
    statMods: { damage: 1.3, speed: 0.85, defense: 0.8, energyRegen: 1.0, attackSpeed: 0.8 },
  },
  {
    id: "ratio",
    name: "Ratio Technique",
    nameRu: "Соотношение",
    kanji: "比",
    color: "#fbbf24",
    glowColor: "#fde68a",
    inspiration: "Кэнто Нанами",
    description: "Каждую цель делишь в уме на 10 частей — удар в точку соотношения 7:3 наносит критический урон. Просто, эффективно, без прикрас.",
    passive: "Каждый 7-й удар — автоматически попадает в точку 7:3, нанося +80% урона",
    limitation: "Техника требует терпения: первые 6 ударов без бонуса",
    statMods: { damage: 1.15, speed: 0.95, defense: 1.1, energyRegen: 1.0, attackSpeed: 0.95 },
  },
  {
    id: "boogie",
    name: "Boogie Woogie",
    nameRu: "Бугги-Вугги",
    kanji: "交",
    color: "#10b981",
    glowColor: "#6ee7b7",
    inspiration: "Аой Тодо",
    description: "Хлопок — и ты меняешься местами с врагом или союзником. Пространство — это шутка, а ты знаешь punch-line.",
    passive: "Каждые 8 ударов — мгновенный обмен позицией с ближайшим врагом (сбивает его)",
    limitation: "Обмен активируется автоматически — не всегда в удобный момент",
    statMods: { damage: 1.0, speed: 1.3, defense: 1.0, energyRegen: 1.1, attackSpeed: 1.1 },
  },
  {
    id: "puppet",
    name: "Heavenly Restriction",
    nameRu: "Небесное ограничение",
    kanji: "体",
    color: "#94a3b8",
    glowColor: "#cbd5e1",
    inspiration: "Маки Зенин",
    description: "Без CE — только тело. Но тело, доведённое до предела. Скорость, рефлексы и физическая сила превышают возможности магов.",
    passive: "Урон от атак увеличен на 40%, скорость передвижения +30% — без CE-техник",
    limitation: "Техника E недоступна. CE медленно убывает со временем (нет генерации)",
    statMods: { damage: 1.4, speed: 1.3, defense: 1.1, energyRegen: 0.0, attackSpeed: 1.2 },
  },
  {
    id: "shadow",
    name: "Ten Shadows",
    nameRu: "Десять теней",
    kanji: "影",
    color: "#6366f1",
    glowColor: "#a5b4fc",
    inspiration: "Мегуми Фусигуро",
    description: "Тени — твои слуги. Мегуми Фусигуро вызывает духовных зверей из теней. Ты — наследник той же техники.",
    passive: "После каждого убийства остаётся теневой след — замедляет врагов, ступающих в него",
    limitation: "В освещённых местах тени слабее (урон -15% в ярко освещённых зонах)",
    statMods: { damage: 1.0, speed: 1.1, defense: 1.0, energyRegen: 1.2, attackSpeed: 1.0 },
  },
  {
    id: "poison",
    name: "Supernova",
    nameRu: "Яд — Сверхновая",
    kanji: "毒",
    color: "#84cc16",
    glowColor: "#bef264",
    inspiration: "Дзюго (Спящий Дракон)",
    description: "Яд пронизывает плоть и CE. Каждый удар откладывает токсин — и через секунды враг начинает гнить изнутри.",
    passive: "Каждый удар накладывает 1 стак яда. 3 стака — враг теряет по 2 HP/сек в течение 4 сек",
    limitation: "Базовый урон снижен (-20%) — сила в накоплении, а не во взрыве",
    statMods: { damage: 0.8, speed: 1.0, defense: 1.1, energyRegen: 1.3, attackSpeed: 1.0 },
  },
  {
    id: "lightning",
    name: "Lightning",
    nameRu: "Джекпот — Молния",
    kanji: "雷",
    color: "#facc15",
    glowColor: "#fde68a",
    inspiration: "Кирара Хакари",
    description: "CE бьёт как молния — мгновенно и непредсказуемо. Но удача переменчива: иногда она ударяет дважды, иногда промахивается.",
    passive: "25% шанс удара молнией в случайного ближайшего врага после каждой атаки",
    limitation: "Молния может ударить в одного и того же врага повторно или промахнуться",
    statMods: { damage: 1.1, speed: 1.1, defense: 0.85, energyRegen: 1.0, attackSpeed: 1.15 },
  },
  {
    id: "max",
    name: "Hollow Purple",
    nameRu: "Пустотный пурпур",
    kanji: "虚",
    color: "#a855f7",
    glowColor: "#d8b4fe",
    inspiration: "Сатору Годзё — «Максимальный выброс CE»",
    description: "Столкновение Синего и Красного. Лиловый луч стирает всё на своём пути. Самая разрушительная техника — и самая дорогая.",
    passive: "Техника E наносит 3× урон всем врагам по прямой линии (не кружок, а луч)",
    limitation: "Высочайший расход CE (×2). При пустом CE — немедленно теряешь 5 HP",
    statMods: { damage: 1.6, speed: 0.85, defense: 0.7, energyRegen: 0.6, attackSpeed: 0.9 },
  },
];

// ── Техники сгруппированы по персонажам ──────────────────────────────────────

export interface Move {
  id: string;
  nameRu: string;
  nameJp?: string;
  description: string;
  ceCost: number;
  cooldownSec: number;
  key: string; // кнопка
}

export interface TechniqueGroup {
  character: string;
  energies: EnergyType[]; // для каких энергий доступна
  color: string;
  kanji: string;
  description: string;
  moves: Move[];
}

export const TECHNIQUE_GROUPS: TechniqueGroup[] = [
  {
    character: "Сатору Годзё",
    energies: ["infinity", "max"],
    color: "#60a5fa",
    kanji: "∞",
    description: "Техника Бесконечности — управление пространством и CE на высшем уровне",
    moves: [
      { id: "strike", nameRu: "Проклятый удар", key: "Z / X", ceCost: 0, cooldownSec: 0, description: "Базовый удар с CE. Урон зависит от энергии." },
      { id: "blue", nameRu: "Синий", nameJp: "蒼", key: "E", ceCost: 30, cooldownSec: 1.5, description: "Притягивает ближайшего врага к игроку с силой CE. Урон при столкновении." },
      { id: "red", nameRu: "Красный", nameJp: "赫", key: "Q", ceCost: 40, cooldownSec: 2.5, description: "Взрыв CE отталкивает всех врагов в радиусе 120px." },
      { id: "purple", nameRu: "Пустотный пурпур", nameJp: "虚式 茈", key: "R", ceCost: 80, cooldownSec: 8, description: "Луч, стирающий всё на пути. Только для max-энергии." },
    ],
  },
  {
    character: "Юдзи Итадори",
    energies: ["divergent"],
    color: "#818cf8",
    kanji: "裂",
    description: "Техника расщеплённого кулака — CE-волна с задержкой усиливает каждый удар",
    moves: [
      { id: "strike", nameRu: "Проклятый удар", key: "Z / X", ceCost: 0, cooldownSec: 0, description: "Расщеплённый кулак: вторая волна CE бьёт спустя 0.3 сек." },
      { id: "divergent_e", nameRu: "Blow (Праздник)", nameJp: "お祭り騒ぎ", key: "E", ceCost: 30, cooldownSec: 2, description: "Серия из трёх быстрых ударов с CE-вспышкой на каждом." },
      { id: "rush", nameRu: "Рывок CE", key: "Q", ceCost: 20, cooldownSec: 1.5, description: "Мгновенный рывок вперёд с уроном на пути." },
    ],
  },
  {
    character: "Нобара Кугисаки",
    energies: ["straw"],
    color: "#f59e0b",
    kanji: "藁",
    description: "Техника Соломенной куклы — гвозди и кровный резонанс",
    moves: [
      { id: "strike", nameRu: "Гвоздь (Удар)", key: "Z / X", ceCost: 0, cooldownSec: 0, description: "Забиваешь гвоздь в куклу — враг чувствует удар." },
      { id: "hairpin", nameRu: "Шпилька", nameJp: "共鳴り", key: "E", ceCost: 35, cooldownSec: 2.5, description: "Кровный резонанс — взрыв CE поражает всех врагов рядом." },
      { id: "resonance", nameRu: "Резонанс", key: "Q", ceCost: 25, cooldownSec: 3, description: "При получении урона — отправить 80% врагу с полным HP." },
    ],
  },
  {
    character: "Рёмен Сукуна",
    energies: ["dismantle", "cleave"],
    color: "#ef4444",
    kanji: "解",
    description: "Техники Короля проклятий: Разобрать и Рассечь",
    moves: [
      { id: "strike", nameRu: "Разобрать", nameJp: "解", key: "Z / X", ceCost: 0, cooldownSec: 0, description: "Режущий поток CE мгновенно. Шанс 30% — двойной удар." },
      { id: "dismantle_e", nameRu: "Разбрасывающий рассечь", key: "E", ceCost: 30, cooldownSec: 2, description: "Широкий веерный удар по всем врагам перед собой." },
      { id: "domain", nameRu: "Расширение области", nameJp: "領域展開", key: "Q", ceCost: 70, cooldownSec: 10, description: "На 5 сек все удары наносят двойной урон. Только Сукуна." },
    ],
  },
  {
    character: "Кэнто Нанами",
    energies: ["ratio"],
    color: "#fbbf24",
    kanji: "比",
    description: "Техника соотношения — точность важнее грубой силы",
    moves: [
      { id: "strike", nameRu: "Удар 7:3", key: "Z / X", ceCost: 0, cooldownSec: 0, description: "Каждый 7-й удар — в точку соотношения, +80% урона." },
      { id: "ratio_e", nameRu: "Сверхурочные", nameJp: "時間外労働", key: "E", ceCost: 30, cooldownSec: 2, description: "Серия усиленных ударов — как рабочий в конце смены." },
      { id: "blunt", nameRu: "Тупой клинок", key: "Q", ceCost: 20, cooldownSec: 1.5, description: "Удар с отдачей — враг теряет скорость на 3 сек." },
    ],
  },
  {
    character: "Аой Тодо",
    energies: ["boogie"],
    color: "#10b981",
    kanji: "交",
    description: "Бугги-Вугги — мастер телепортации и обмена позициями",
    moves: [
      { id: "strike", nameRu: "Усиленный удар", key: "Z / X", ceCost: 0, cooldownSec: 0, description: "Каждые 8 ударов — обмен местами с ближайшим врагом." },
      { id: "swap", nameRu: "Бугги-Вугги", nameJp: "芳心", key: "E", ceCost: 25, cooldownSec: 1.5, description: "Немедленный обмен позицией с целью. Цель дезориентирована 1 сек." },
      { id: "phantom", nameRu: "Фантомный хлопок", key: "Q", ceCost: 35, cooldownSec: 3, description: "Три быстрых обмена подряд — враги не успевают понять." },
    ],
  },
  {
    character: "Маки Зенин",
    energies: ["puppet"],
    color: "#94a3b8",
    kanji: "体",
    description: "Небесное ограничение — тело без CE, доведённое до предела",
    moves: [
      { id: "strike", nameRu: "Физический удар", key: "Z / X", ceCost: 0, cooldownSec: 0, description: "Чистая физическая сила без CE. +40% урона по умолчанию." },
      { id: "dash_atk", nameRu: "Рывок-удар", key: "E", ceCost: 0, cooldownSec: 1.5, description: "Стремительный рывок с ударом. CE не нужна." },
      { id: "block", nameRu: "Контрудар", key: "Q", ceCost: 0, cooldownSec: 2, description: "При атаке в этот момент — урон отражается обратно." },
    ],
  },
  {
    character: "Мегуми Фусигуро",
    energies: ["shadow"],
    color: "#6366f1",
    kanji: "影",
    description: "Техника десяти теней — призыв духовных зверей",
    moves: [
      { id: "strike", nameRu: "Теневой удар", key: "Z / X", ceCost: 0, cooldownSec: 0, description: "Удар из тени. После убийства — теневой след замедляет врагов." },
      { id: "divine_dog", nameRu: "Пёс-тень", nameJp: "玉犬", key: "E", ceCost: 30, cooldownSec: 2.5, description: "Призываешь теневого пса — тот атакует ближайшего врага." },
      { id: "nue", nameRu: "Нуэ", nameJp: "鵺", key: "Q", ceCost: 40, cooldownSec: 4, description: "Духовная птица бьёт врагов молнией с воздуха." },
    ],
  },
  {
    character: "Дзюго (Спящий Дракон)",
    energies: ["poison"],
    color: "#84cc16",
    kanji: "毒",
    description: "Техника яда — медленное, неизбежное уничтожение врагов",
    moves: [
      { id: "strike", nameRu: "Отравляющий удар", key: "Z / X", ceCost: 0, cooldownSec: 0, description: "Каждый удар накладывает 1 стак яда. 3 стака — 2 HP/сек 4 сек." },
      { id: "venom_burst", nameRu: "Взрыв яда", nameJp: "毒爆発", key: "E", ceCost: 30, cooldownSec: 2, description: "Мгновенный выброс яда — накладывает 2 стака на всех рядом." },
      { id: "miasma", nameRu: "Миазм", key: "Q", ceCost: 45, cooldownSec: 5, description: "Ядовитое облако на 4 сек. Враги в нём теряют HP." },
    ],
  },
  {
    character: "Кирара Хакари",
    energies: ["lightning"],
    color: "#facc15",
    kanji: "雷",
    description: "Джекпот — непредсказуемая удача, молния бьёт по-своему",
    moves: [
      { id: "strike", nameRu: "Удар с разрядом", key: "Z / X", ceCost: 0, cooldownSec: 0, description: "25% шанс молнии в случайного врага после удара." },
      { id: "jackpot", nameRu: "Джекпот!", nameJp: "大当たり", key: "E", ceCost: 30, cooldownSec: 3, description: "Случайный эффект: тройной удар, исцеление или цепная молния." },
      { id: "barrier", nameRu: "Барьер CE", key: "Q", ceCost: 35, cooldownSec: 4, description: "На 3 сек — электрический щит. Атаки по тебе бьют током." },
    ],
  },
];

export function getTechniqueGroup(energy: EnergyType): TechniqueGroup | undefined {
  return TECHNIQUE_GROUPS.find(g => g.energies.includes(energy));
}

// ── Прогресс персонажа ────────────────────────────────────────────────────────

export interface CharacterProgress {
  level: number;
  xp: number;
  xpToNext: number;
  unlockedTechniques: string[];
  energy: EnergyType;
  // квест
  activeQuest: string | null;
  questProgress: number;
  questGoal: number;
}

export function xpForLevel(lvl: number): number {
  return 60 + (lvl - 1) * 40;
}

export function createProgress(energy: EnergyType): CharacterProgress {
  return {
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    unlockedTechniques: ["strike"],
    energy,
    activeQuest: null,
    questProgress: 0,
    questGoal: 0,
  };
}

export function getEnergyDef(id: EnergyType): EnergyDef {
  return ENERGIES.find(e => e.id === id) ?? ENERGIES[0];
}

// ── Управление (кастомные кнопки) ─────────────────────────────────────────────

export interface KeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  attack: string;
  attack2: string;
  technique: string;
  technique2: string;
  interact: string;
}

export const DEFAULT_BINDINGS: KeyBindings = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  attack: "KeyZ",
  attack2: "KeyX",
  technique: "KeyE",
  technique2: "KeyQ",
  interact: "KeyE",
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
    Space:"Пробел", Enter:"Enter", ShiftLeft:"Shift", ControlLeft:"Ctrl",
    Digit1:"1", Digit2:"2", Digit3:"3", Digit4:"4", Digit5:"5",
    Digit6:"6", Digit7:"7", Digit8:"8", Digit9:"9", Digit0:"0",
  };
  return map[code] ?? code.replace("Key","");
}

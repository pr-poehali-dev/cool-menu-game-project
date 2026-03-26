// =========================================================
// gameState.ts — Cursed Legacy
// Энергии с отсылками к персонажам манги JJK
// =========================================================

export type EnergyType =
  | "infinity"    // Годзё — Бесконечность
  | "divergent"   // Годзё — Шесть глаз (расщепление)
  | "straw"       // Юдзи — Праздник / Разборки
  | "dismantle"   // Рёмен — Разобрать
  | "cleave"      // Рёмен — Рассечь
  | "ratio"       // Тодо — Пальцы / Обмен
  | "blood"       // Нобара — Резонанс крови
  | "puppet"      // Маки — Тело без CE
  | "shadow"      // Мегуми — Тень
  | "poison"      // Дзюго — Яд
  | "lightning"   // Наная — Молния
  | "max";        // Особый режим — Полный выброс CE

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
  inspiration: string; // ← отсылка к персонажу
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
    name: "Boogie Woogie",
    nameRu: "Бугги-Вугги",
    kanji: "交",
    color: "#10b981",
    glowColor: "#6ee7b7",
    inspiration: "Тодо Аой",
    description: "Хлопок — и ты меняешься местами с врагом или союзником. Пространство — это шутка, а ты знаешь punch-line.",
    passive: "Каждые 8 ударов — мгновенный обмен позицией с ближайшим врагом (сбивает его)",
    limitation: "Обмен активируется автоматически — не всегда в удобный момент",
    statMods: { damage: 1.0, speed: 1.3, defense: 1.0, energyRegen: 1.1, attackSpeed: 1.1 },
  },
  {
    id: "blood",
    name: "Hairpin",
    nameRu: "Шпилька",
    kanji: "血",
    color: "#be185d",
    glowColor: "#f9a8d4",
    inspiration: "Нобара Кугисаки",
    description: "Накапливаешь CE в крови — взрыв электрического резонанса поражает всех врагов рядом. Один выстрел — несколько целей.",
    passive: "При убийстве врага — мини-взрыв поражает ближайших на 50% от убивающего урона",
    limitation: "CE регенерация снижена (-30%) — техника дорогостоящая",
    statMods: { damage: 1.2, speed: 0.9, defense: 0.9, energyRegen: 0.7, attackSpeed: 0.85 },
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
    nameRu: "Сверхновая",
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
    nameRu: "Молния",
    kanji: "雷",
    color: "#facc15",
    glowColor: "#fde68a",
    inspiration: "Наная Хакари",
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

export interface Technique {
  id: string;
  name: string;
  nameRu: string;
  description: string;
  requiredLevel: number;
  ceCost: number;
  cooldown: number;
  compatibleEnergies?: EnergyType[];
}

export const TECHNIQUES: Technique[] = [
  {
    id: "basic_strike",
    name: "Cursed Strike",
    nameRu: "Проклятый удар",
    description: "Базовый удар, усиленный CE. Урон и эффект зависят от энергии.",
    requiredLevel: 1,
    ceCost: 0,
    cooldown: 0,
  },
  {
    id: "cursed_burst",
    name: "Cursed Burst",
    nameRu: "Выброс CE",
    description: "Волна CE вокруг тебя. Отталкивает и ранит всех в радиусе.",
    requiredLevel: 3,
    ceCost: 30,
    cooldown: 90,
  },
  {
    id: "cursed_dash",
    name: "Cursed Dash",
    nameRu: "Рывок CE",
    description: "Молниеносный рывок с нанесением урона на пути.",
    requiredLevel: 5,
    ceCost: 20,
    cooldown: 60,
  },
  {
    id: "reinforcement",
    name: "Body Reinforcement",
    nameRu: "Усиление тела",
    description: "5 секунд — половина входящего урона.",
    requiredLevel: 7,
    ceCost: 40,
    cooldown: 120,
  },
];

export interface CharacterProgress {
  energy: EnergyType;
  level: number;
  xp: number;
  xpToNext: number;
  unlockedTechniques: string[];
  comboCount: number;
  smolderingStacks: number;
  resonantStacks: number;
  hitsUntilPierce: number;
  freezeStacks: Map<number, number>;
  viscousStacks: Map<number, number>;
}

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.45, level - 1));
}

export function createProgress(energy: EnergyType): CharacterProgress {
  return {
    energy,
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    unlockedTechniques: ["basic_strike"],
    comboCount: 0,
    smolderingStacks: 0,
    resonantStacks: 0,
    hitsUntilPierce: 3,
    freezeStacks: new Map(),
    viscousStacks: new Map(),
  };
}

export function getEnergyDef(id: EnergyType): EnergyDef {
  return ENERGIES.find(e => e.id === id) ?? ENERGIES[0];
}

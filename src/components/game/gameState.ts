// ─── Врождённые энергии ──────────────────────────────────────────────────────

export type EnergyType =
  | "piercing"
  | "viscous"
  | "volatile"
  | "dense"
  | "frigid"
  | "smoldering"
  | "resonant"
  | "void"
  | "warped"
  | "charged"
  | "radiant"
  | "corrupted";

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
  statMods: {
    damage: number;      // множитель урона
    speed: number;       // множитель скорости
    defense: number;     // множитель защиты (кол-во HP)
    energyRegen: number; // множитель реген CE
    attackSpeed: number; // множитель скорости атаки
  };
}

export const ENERGIES: EnergyDef[] = [
  {
    id: "piercing",
    name: "Piercing",
    nameRu: "Острая",
    kanji: "刺",
    color: "#f87171",
    glowColor: "#dc2626",
    description: "Энергия словно лезвие — острая, пронизывающая насквозь.",
    passive: "Каждый 3-й удар пробивает защиту врага, нанося двойной урон.",
    limitation: "При каждом использовании техники теряешь 1 HP.",
    statMods: { damage: 1.6, speed: 1.0, defense: 0.7, energyRegen: 1.0, attackSpeed: 1.2 },
  },
  {
    id: "viscous",
    name: "Viscous",
    nameRu: "Вязкая",
    kanji: "粘",
    color: "#a3e635",
    glowColor: "#65a30d",
    description: "Тягучая как смола — прилипает к врагу и накапливает эффекты.",
    passive: "Удары накладывают «вязкость» — враг замедляется на 3 сек. После 4 стаков — обездвиживание.",
    limitation: "Собственная скорость передвижения снижена на 20%.",
    statMods: { damage: 1.0, speed: 0.8, defense: 1.1, energyRegen: 1.2, attackSpeed: 0.8 },
  },
  {
    id: "volatile",
    name: "Volatile",
    nameRu: "Взрывная",
    kanji: "爆",
    color: "#fb923c",
    glowColor: "#ea580c",
    description: "Нестабильна, готова разорваться в любой момент.",
    passive: "Удары имеют шанс 25% вызвать взрыв по области 80px. Техника — мощный самоподрыв-рывок.",
    limitation: "Взрыв наносит 0.5 урона самому себе.",
    statMods: { damage: 1.4, speed: 1.1, defense: 0.8, energyRegen: 0.9, attackSpeed: 1.0 },
  },
  {
    id: "dense",
    name: "Dense",
    nameRu: "Густая",
    kanji: "重",
    color: "#94a3b8",
    glowColor: "#475569",
    description: "Тяжёлая как ртуть — каждый удар ощущается как гиря.",
    passive: "Удары не прерываются. Третий удар подряд — нокдаун врага на 1 сек.",
    limitation: "Медленное восстановление CE, техника стоит на 50% дороже.",
    statMods: { damage: 1.5, speed: 0.9, defense: 1.3, energyRegen: 0.6, attackSpeed: 0.85 },
  },
  {
    id: "frigid",
    name: "Frigid",
    nameRu: "Холодная",
    kanji: "氷",
    color: "#7dd3fc",
    glowColor: "#0284c7",
    description: "Вымораживает всё вокруг — враги становятся хрупкими.",
    passive: "Удары накладывают «холод». 5 стаков — враг замораживается на 2 сек и получает +50% урона.",
    limitation: "Долгая «раскачка»: первые 10 сек боя урон снижен на 30%.",
    statMods: { damage: 1.1, speed: 1.0, defense: 1.0, energyRegen: 1.1, attackSpeed: 1.0 },
  },
  {
    id: "smoldering",
    name: "Smoldering",
    nameRu: "Тлеющая",
    kanji: "焦",
    color: "#fbbf24",
    glowColor: "#d97706",
    description: "Медленный жар, накапливающийся с каждой секундой боя.",
    passive: "Каждые 5 сек боя +10% к урону (макс. +100%). Прерывание цепочки атак сбрасывает бонус.",
    limitation: "Стартовый урон очень низкий. Без движения стаки не копятся.",
    statMods: { damage: 0.7, speed: 1.0, defense: 1.0, energyRegen: 1.3, attackSpeed: 1.1 },
  },
  {
    id: "resonant",
    name: "Resonant",
    nameRu: "Резонирующая",
    kanji: "響",
    color: "#c084fc",
    glowColor: "#9333ea",
    description: "Чувствует чужие вибрации — усиляется от получения урона.",
    passive: "Каждое попадание по тебе даёт +15% к урону (макс. +90%). Отражает часть урона обратно.",
    limitation: "Уязвим к оглушению. Требует постоянного контакта с врагом.",
    statMods: { damage: 1.0, speed: 1.05, defense: 0.85, energyRegen: 1.1, attackSpeed: 1.15 },
  },
  {
    id: "void",
    name: "Void",
    nameRu: "Пустотная",
    kanji: "空",
    color: "#818cf8",
    glowColor: "#4f46e5",
    description: "Поглощает всё — жизнь, энергию, техники врага.",
    passive: "Каждый нанесённый урон восстанавливает 0.5 HP и 5 CE.",
    limitation: "Базовый урон низкий. Не работает против «пустотных» врагов.",
    statMods: { damage: 0.85, speed: 1.0, defense: 1.2, energyRegen: 1.5, attackSpeed: 1.0 },
  },
  {
    id: "warped",
    name: "Warped",
    nameRu: "Искривлённая",
    kanji: "歪",
    color: "#34d399",
    glowColor: "#059669",
    description: "Искажает пространство вокруг — враги не понимают, откуда удар.",
    passive: "Техника — телепорт за спину ближайшего врага с мгновенной атакой.",
    limitation: "Высокая стоимость перемещений. Враги адаптируются со временем.",
    statMods: { damage: 1.2, speed: 1.3, defense: 0.9, energyRegen: 0.9, attackSpeed: 1.2 },
  },
  {
    id: "charged",
    name: "Charged",
    nameRu: "Заряженная",
    kanji: "充",
    color: "#f0abfc",
    glowColor: "#c026d3",
    description: "Требует накопления — зато выброс сокрушителен.",
    passive: "Удержание Z/X более 1 сек — усиленный заряженный удар, тройной урон.",
    limitation: "Без заряда обычные атаки очень слабы.",
    statMods: { damage: 1.0, speed: 0.95, defense: 1.0, energyRegen: 1.0, attackSpeed: 0.7 },
  },
  {
    id: "radiant",
    name: "Radiant",
    nameRu: "Лучистая",
    kanji: "輝",
    color: "#fde68a",
    glowColor: "#f59e0b",
    description: "Слепит и выжигает — чистейшая энергия, близкая к «позитивной» CE.",
    passive: "Атаки накладывают ослепление на 1.5 сек — враг бьёт мимо.",
    limitation: "Ослабленные духи устойчивы к свету. Очень редкая энергия.",
    statMods: { damage: 1.1, speed: 1.1, defense: 1.1, energyRegen: 1.1, attackSpeed: 1.1 },
  },
  {
    id: "corrupted",
    name: "Corrupted",
    nameRu: "Искажённая",
    kanji: "穢",
    color: "#4ade80",
    glowColor: "#16a34a",
    description: "Смешение проклятой и обратной энергий — непредсказуемо и опасно.",
    passive: "Каждая атака случайна: либо двойной урон, либо откат урона на себя.",
    limitation: "Нестабильна. Требует высокого мастерства для управления.",
    statMods: { damage: 1.3, speed: 1.0, defense: 0.9, energyRegen: 1.0, attackSpeed: 1.0 },
  },
];

// ─── Техники (разблокируются через прокачку) ─────────────────────────────────

export interface Technique {
  id: string;
  name: string;
  nameRu: string;
  description: string;
  requiredLevel: number;
  ceCost: number;
  cooldown: number;       // в тиках
  compatibleEnergies?: EnergyType[]; // если undefined — доступна всем
}

export const TECHNIQUES: Technique[] = [
  {
    id: "basic_strike",
    name: "Basic Strike",
    nameRu: "Базовый удар",
    description: "Простой удар с усилением CE. Разблокируется после первой тренировки.",
    requiredLevel: 1,
    ceCost: 0,
    cooldown: 24,
  },
  {
    id: "cursed_burst",
    name: "Cursed Burst",
    nameRu: "Взрыв CE",
    description: "Выброс проклятой энергии вокруг тебя. Отталкивает всех врагов.",
    requiredLevel: 3,
    ceCost: 30,
    cooldown: 90,
  },
  {
    id: "cursed_dash",
    name: "Cursed Dash",
    nameRu: "Рывок CE",
    description: "Мгновенный рывок в направлении движения, нанося урон на пути.",
    requiredLevel: 5,
    ceCost: 20,
    cooldown: 60,
  },
  {
    id: "reinforcement",
    name: "Reinforcement",
    nameRu: "Усиление тела",
    description: "Обволакиваешь тело CE — следующие 5 сек получаешь половину урона.",
    requiredLevel: 7,
    ceCost: 40,
    cooldown: 120,
  },
];

// ─── Прогресс персонажа ───────────────────────────────────────────────────────

export interface CharacterProgress {
  energy: EnergyType;
  level: number;
  xp: number;
  xpToNext: number;
  unlockedTechniques: string[];
  // stat накопители
  comboCount: number;       // кол-во ударов подряд
  smolderingStacks: number; // для Smoldering
  resonantStacks: number;   // для Resonant
  hitsUntilPierce: number;  // для Piercing (каждые 3 удара)
  freezeStacks: Map<number, number>; // enemyId -> стаки
  viscousStacks: Map<number, number>;
}

export const xpForLevel = (level: number) => Math.floor(100 * Math.pow(1.45, level - 1));

export const createProgress = (energy: EnergyType): CharacterProgress => ({
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
});

export const getEnergyDef = (id: EnergyType): EnergyDef =>
  ENERGIES.find(e => e.id === id)!;

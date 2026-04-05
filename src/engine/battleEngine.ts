import { Fighter, Ability, Ultimate } from '@/data/characters';

export type BattleLogEntry = {
  id: number;
  text: string;
  color: string;
  timestamp: number;
};

export type StatusEffect = {
  type: 'stun' | 'dot' | 'shield' | 'buff';
  value: number;
  duration: number;
  startTime: number;
  color?: string;
  label?: string;
};

export type CombatantState = {
  fighter: Fighter;
  hp: number;
  mana: number;
  shield: number;
  abilityCooldowns: Record<string, number>;
  ultimateCooldown: number;
  statusEffects: StatusEffect[];
  isStunned: boolean;
  atkBuff: number;
  totalDamageDealt: number;
  totalHealingDone: number;
  abilitiesUsed: number;
  isPlayer: boolean;
};

export type BattleState = {
  player: CombatantState;
  enemy: CombatantState;
  log: BattleLogEntry[];
  turn: number;
  phase: 'select' | 'battle' | 'victory' | 'defeat';
  ultimateCharge: number;
  lastActionTime: number;
  animating: boolean;
};

let logIdCounter = 0;

export function createCombatant(fighter: Fighter, isPlayer: boolean): CombatantState {
  return {
    fighter: { ...fighter, hp: fighter.maxHp, mana: fighter.maxMana },
    hp: fighter.maxHp,
    mana: fighter.maxMana,
    shield: 0,
    abilityCooldowns: {},
    ultimateCooldown: 0,
    statusEffects: [],
    isStunned: false,
    atkBuff: 0,
    totalDamageDealt: 0,
    totalHealingDone: 0,
    abilitiesUsed: 0,
    isPlayer,
  };
}

export function addLog(log: BattleLogEntry[], text: string, color: string): BattleLogEntry[] {
  const entry: BattleLogEntry = {
    id: ++logIdCounter,
    text,
    color,
    timestamp: Date.now(),
  };
  return [...log.slice(-30), entry];
}

export function applyDamage(
  target: CombatantState,
  rawDamage: number,
  attacker: CombatantState,
): { target: CombatantState; actualDamage: number } {
  const atkMult = 1 + attacker.atkBuff / 100;
  let damage = Math.floor(rawDamage * atkMult);
  
  const defFactor = target.fighter.baseDef / 200;
  damage = Math.floor(damage * (1 - defFactor));
  
  const crit = Math.random() < 0.1;
  if (crit) damage = Math.floor(damage * 1.5);

  let shieldAbsorbed = 0;
  let newShield = target.shield;
  if (newShield > 0) {
    shieldAbsorbed = Math.min(newShield, damage);
    newShield -= shieldAbsorbed;
    damage -= shieldAbsorbed;
  }

  const newHp = Math.max(0, target.hp - damage);
  return {
    target: { ...target, hp: newHp, shield: newShield, totalDamageDealt: target.totalDamageDealt },
    actualDamage: damage,
  };
}

export function applyHeal(target: CombatantState, amount: number): { target: CombatantState; actual: number } {
  const actual = Math.min(amount, target.fighter.maxHp - target.hp);
  return {
    target: { ...target, hp: target.hp + actual, totalHealingDone: target.totalHealingDone + actual },
    actual,
  };
}

export function applyAbility(
  abilityOrUlt: Ability | Ultimate,
  attacker: CombatantState,
  defender: CombatantState,
  log: BattleLogEntry[],
  isUltimate = false,
): { attacker: CombatantState; defender: CombatantState; log: BattleLogEntry[] } {
  let att = { ...attacker };
  let def = { ...defender };
  let newLog = [...log];

  att.mana -= abilityOrUlt.manaCost;
  if (att.mana < 0) att.mana = 0;
  att.abilitiesUsed += 1;

  const name = abilityOrUlt.name;
  const color = abilityOrUlt.color;
  const attName = att.fighter.name;
  const defName = def.fighter.name;

  if (isUltimate) {
    att.ultimateCooldown = abilityOrUlt.cooldown;
    newLog = addLog(newLog, `💥 ${attName} использует УЛЬТУ: ${name}!`, '#fbbf24');
  } else {
    const ab = abilityOrUlt as Ability;
    att.abilityCooldowns = { ...att.abilityCooldowns, [ab.id]: ab.cooldown };
    newLog = addLog(newLog, `⚡ ${attName}: ${name}`, color);
  }

  switch (abilityOrUlt.type) {
    case 'damage':
    case 'aoe': {
      const { target: newDef, actualDamage } = applyDamage(def, abilityOrUlt.damage, att);
      def = newDef;
      att.totalDamageDealt += actualDamage;
      newLog = addLog(newLog, `  → ${defName} получает ${actualDamage} урона`, '#ef4444');
      if (def.hp <= 0) newLog = addLog(newLog, `  💀 ${defName} ПОБЕЖДЁН!`, '#dc2626');
      break;
    }
    case 'heal': {
      const ab = abilityOrUlt as Ability;
      const healAmt = ab.healAmount ?? (abilityOrUlt as Ultimate).healAmount ?? 0;
      const { target: healed, actual } = applyHeal(att, healAmt);
      att = { ...healed, totalHealingDone: att.totalHealingDone + actual };
      newLog = addLog(newLog, `  → ${attName} восстанавливает ${actual} HP`, '#4ade80');
      if (ab.buffAtk) {
        att.atkBuff += ab.buffAtk;
        att.statusEffects = [
          ...att.statusEffects,
          { type: 'buff', value: ab.buffAtk, duration: ab.buffDuration ?? 3000, startTime: Date.now(), label: '+ATK' },
        ];
        newLog = addLog(newLog, `  → Атака усилена на ${ab.buffAtk}!`, '#fbbf24');
      }
      break;
    }
    case 'shield': {
      const amt = (abilityOrUlt as Ability).shieldAmount ?? 200;
      att.shield += amt;
      newLog = addLog(newLog, `  → ${attName} получает щит ${amt}`, '#e0f2fe');
      break;
    }
    case 'stun': {
      const { target: newDef, actualDamage } = applyDamage(def, abilityOrUlt.damage, att);
      def = newDef;
      att.totalDamageDealt += actualDamage;
      const stunDur = (abilityOrUlt as Ability).stunDuration ?? (abilityOrUlt as Ultimate).stunDuration ?? 2000;
      def.statusEffects = [
        ...def.statusEffects,
        { type: 'stun', value: 0, duration: stunDur, startTime: Date.now(), label: 'STUN' },
      ];
      def.isStunned = true;
      newLog = addLog(newLog, `  → ${defName} оглушён! (${stunDur / 1000}с)`, '#a78bfa');
      break;
    }
    case 'dot': {
      const { target: newDef, actualDamage } = applyDamage(def, abilityOrUlt.damage, att);
      def = newDef;
      att.totalDamageDealt += actualDamage;
      const ab = abilityOrUlt as Ability;
      const dotDmg = ab.dotDamage ?? 30;
      const dotDur = ab.dotDuration ?? 3000;
      def.statusEffects = [
        ...def.statusEffects,
        { type: 'dot', value: dotDmg, duration: dotDur, startTime: Date.now(), color, label: 'DoT' },
      ];
      newLog = addLog(newLog, `  → ${defName} получает ${dotDmg}/с урона (${dotDur / 1000}с)`, color);
      break;
    }
    case 'drain': {
      const { target: newDef, actualDamage } = applyDamage(def, abilityOrUlt.damage, att);
      def = newDef;
      att.totalDamageDealt += actualDamage;
      const drainAmt = (abilityOrUlt as Ability).drainAmount ?? 80;
      const { target: healed, actual } = applyHeal(att, drainAmt);
      att = { ...healed };
      newLog = addLog(newLog, `  → Высасывает ${drainAmt} HP у ${defName}`, '#f9a8d4');
      break;
    }
    case 'buff': {
      const ab = abilityOrUlt as Ability;
      const buffAtk = ab.buffAtk ?? 0;
      att.atkBuff += buffAtk;
      att.statusEffects = [
        ...att.statusEffects,
        { type: 'buff', value: buffAtk, duration: ab.buffDuration ?? 4000, startTime: Date.now(), label: `+${buffAtk}ATK` },
      ];
      newLog = addLog(newLog, `  → ${attName} усиливается! +${buffAtk} ATK`, '#fbbf24');
      break;
    }
    case 'summon': {
      const { target: newDef, actualDamage } = applyDamage(def, abilityOrUlt.damage, att);
      def = newDef;
      att.totalDamageDealt += actualDamage;
      newLog = addLog(newLog, `  → Призыв атакует ${defName}: ${actualDamage} урона`, color);
      break;
    }
    case 'teleport': {
      const { target: newDef, actualDamage } = applyDamage(def, abilityOrUlt.damage, att);
      def = newDef;
      att.totalDamageDealt += actualDamage;
      newLog = addLog(newLog, `  → Телепортация! Удар ${defName}: ${actualDamage}`, color);
      break;
    }
  }

  return { attacker: att, defender: def, log: newLog };
}

export function tickStatusEffects(
  state: CombatantState,
  attacker: CombatantState,
  log: BattleLogEntry[],
): { state: CombatantState; log: BattleLogEntry[] } {
  const now = Date.now();
  const s = { ...state };
  let newLog = [...log];
  const newEffects: StatusEffect[] = [];

  for (const effect of s.statusEffects) {
    const elapsed = now - effect.startTime;
    if (elapsed >= effect.duration) {
      if (effect.type === 'stun') {
        s.isStunned = false;
      }
      if (effect.type === 'buff') {
        s.atkBuff = Math.max(0, s.atkBuff - effect.value);
      }
      continue;
    }
    newEffects.push(effect);
    if (effect.type === 'dot') {
      const tickDmg = Math.floor(effect.value * 0.5);
      s.hp = Math.max(0, s.hp - tickDmg);
      attacker.totalDamageDealt += tickDmg;
      if (tickDmg > 0) {
        newLog = addLog(newLog, `  ☠ ${s.fighter.name} получает ${tickDmg} DoT урона`, effect.color ?? '#ef4444');
      }
    }
  }

  s.statusEffects = newEffects;
  return { state: s, log: newLog };
}

export function regenMana(state: CombatantState): CombatantState {
  const newMana = Math.min(state.fighter.maxMana, state.mana + state.fighter.manaRegen * 2);
  return { ...state, mana: newMana };
}

export function tickCooldowns(state: CombatantState): CombatantState {
  const newCooldowns: Record<string, number> = {};
  for (const [key, val] of Object.entries(state.abilityCooldowns)) {
    if (val > 1) newCooldowns[key] = val - 1;
  }
  const newUltCd = state.ultimateCooldown > 0 ? state.ultimateCooldown - 1 : 0;
  return { ...state, abilityCooldowns: newCooldowns, ultimateCooldown: newUltCd };
}

export type BotDifficulty = 'hard' | 'nightmare';

export function botDecide(
  bot: CombatantState,
  player: CombatantState,
  difficulty: BotDifficulty,
): { type: 'ability'; ability: Ability } | { type: 'ultimate' } | { type: 'wait' } {
  if (bot.isStunned) return { type: 'wait' };

  const hpRatio = bot.hp / bot.fighter.maxHp;
  const playerHpRatio = player.hp / player.fighter.maxHp;
  const isNightmare = difficulty === 'nightmare';

  if (bot.ultimateCooldown === 0 && bot.mana >= bot.fighter.ultimate.manaCost) {
    const shouldUseUlt = isNightmare
      ? Math.random() < 0.45
      : Math.random() < 0.3;
    if (shouldUseUlt || playerHpRatio < 0.3) {
      return { type: 'ultimate' };
    }
  }

  const available = bot.fighter.abilities.filter((ab) => {
    const cd = bot.abilityCooldowns[ab.id] ?? 0;
    return cd === 0 && bot.mana >= ab.manaCost;
  });

  if (available.length === 0) return { type: 'wait' };

  if (isNightmare) {
    if (hpRatio < 0.35) {
      const heal = available.find((ab) => ab.type === 'heal');
      if (heal) return { type: 'ability', ability: heal };
      const shield = available.find((ab) => ab.type === 'shield');
      if (shield) return { type: 'ability', ability: shield };
    }
    if (player.isStunned || player.shield < 50) {
      const highDmg = available.filter((ab) => ab.type === 'damage' || ab.type === 'aoe')
        .sort((a, b) => b.damage - a.damage)[0];
      if (highDmg) return { type: 'ability', ability: highDmg };
    }
    const dot = available.find((ab) => ab.type === 'dot' && !player.statusEffects.some((e) => e.type === 'dot'));
    if (dot) return { type: 'ability', ability: dot };
    const stun = available.find((ab) => ab.type === 'stun' && !player.isStunned);
    if (stun && Math.random() < 0.5) return { type: 'ability', ability: stun };
  } else {
    if (hpRatio < 0.4) {
      const heal = available.find((ab) => ab.type === 'heal');
      if (heal && Math.random() < 0.6) return { type: 'ability', ability: heal };
    }
  }

  const weighted = available.map((ab) => ({
    ab,
    weight: (ab.type === 'damage' || ab.type === 'aoe' ? 3 : 1) * (isNightmare ? 1.5 : 1),
  }));
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const { ab, weight } of weighted) {
    rand -= weight;
    if (rand <= 0) return { type: 'ability', ability: ab };
  }

  return { type: 'ability', ability: available[0] };
}
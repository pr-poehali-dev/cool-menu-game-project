import { useState, useEffect, useCallback, useRef } from 'react';  
import { Fighter, Ability } from '@/data/characters';
import {
  CombatantState,
  BattleLogEntry,
  BotDifficulty,
  createCombatant,
  applyAbility,
  tickStatusEffects,
  regenMana,
  tickCooldowns,
  botDecide,
  addLog,
} from '@/engine/battleEngine';

interface Props {
  playerFighter: Fighter;
  enemyFighter: Fighter;
  difficulty: BotDifficulty;
  onEnd: (result: 'victory' | 'defeat', stats: { damage: number; healing: number; abilities: number }) => void;
}

type FlashEffect = { id: number; text: string; color: string; side: 'player' | 'enemy' };

let flashCounter = 0;

export default function BattleScreen({ playerFighter, enemyFighter, difficulty, onEnd }: Props) {
  const [player, setPlayer] = useState<CombatantState>(() => createCombatant(playerFighter, true));
  const [enemy, setEnemy] = useState<CombatantState>(() => createCombatant(enemyFighter, false));
  const [log, setLog] = useState<BattleLogEntry[]>(() =>
    addLog([], `⚔️ БОЙ! ${playerFighter.name} vs ${enemyFighter.name}!`, '#fbbf24')
  );
  const [flashes, setFlashes] = useState<FlashEffect[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [playerLocked, setPlayerLocked] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const gameOver = useRef(false);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const addFlash = useCallback((text: string, color: string, side: 'player' | 'enemy') => {
    const id = ++flashCounter;
    setFlashes((prev) => [...prev, { id, text, color, side }]);
    setTimeout(() => setFlashes((prev) => prev.filter((f) => f.id !== id)), 1200);
  }, []);

  const checkDeath = useCallback(
    (p: CombatantState, e: CombatantState) => {
      if (gameOver.current) return false;
      if (p.hp <= 0) {
        gameOver.current = true;
        setTimeout(() => onEnd('defeat', { damage: p.totalDamageDealt, healing: p.totalHealingDone, abilities: p.abilitiesUsed }), 800);
        return true;
      }
      if (e.hp <= 0) {
        gameOver.current = true;
        setTimeout(() => onEnd('victory', { damage: p.totalDamageDealt, healing: p.totalHealingDone, abilities: p.abilitiesUsed }), 800);
        return true;
      }
      return false;
    },
    [onEnd]
  );

  const botTurn = useCallback(
    (currentPlayer: CombatantState, currentEnemy: CombatantState, currentLog: BattleLogEntry[]) => {
      if (gameOver.current) return;
      setIsBotThinking(true);
      const delay = difficulty === 'nightmare' ? 800 + Math.random() * 400 : 1200 + Math.random() * 600;

      setTimeout(() => {
        if (gameOver.current) return;
        setIsBotThinking(false);

        let tickedEnemy = tickCooldowns(regenMana(currentEnemy));
        let tickedPlayer = { ...currentPlayer };
        const tickP = tickStatusEffects(tickedPlayer, tickedEnemy, currentLog);
        const tickE = tickStatusEffects(tickedEnemy, tickedPlayer, tickP.log);
        tickedPlayer = tickP.state;
        tickedEnemy = tickE.state;
        let newLog = tickE.log;

        if (checkDeath(tickedPlayer, tickedEnemy)) {
          setPlayer(tickedPlayer);
          setEnemy(tickedEnemy);
          setLog(newLog);
          return;
        }

        if (tickedEnemy.isStunned) {
          newLog = addLog(newLog, `  ⚡ ${enemyFighter.name} оглушён — пропускает ход`, '#a78bfa');
          setEnemy(tickedEnemy);
          setPlayer(tickedPlayer);
          setLog(newLog);
          setPlayerLocked(false);
          return;
        }

        const decision = botDecide(tickedEnemy, tickedPlayer, difficulty);
        let newEnemy = tickedEnemy;
        let newPlayer = tickedPlayer;

        if (decision.type === 'ability') {
          const result = applyAbility(decision.ability, newEnemy, newPlayer, newLog, false);
          newEnemy = result.attacker;
          newPlayer = result.defender;
          newLog = result.log;
          addFlash(decision.ability.name, decision.ability.color, 'enemy');
          if (decision.ability.damage > 0) addFlash(`-${Math.floor(decision.ability.damage * 0.8)}`, '#ef4444', 'player');
        } else if (decision.type === 'ultimate') {
          const result = applyAbility(tickedEnemy.fighter.ultimate, newEnemy, newPlayer, newLog, true);
          newEnemy = result.attacker;
          newPlayer = result.defender;
          newLog = result.log;
          addFlash('💥 УЛЬТА!', '#fbbf24', 'enemy');
          if (tickedEnemy.fighter.ultimate.damage > 0) addFlash(`-${Math.floor(tickedEnemy.fighter.ultimate.damage * 0.8)}`, '#dc2626', 'player');
        } else {
          newLog = addLog(newLog, `  ⏳ ${enemyFighter.name} восстанавливается...`, '#64748b');
        }

        setEnemy(newEnemy);
        setPlayer(newPlayer);
        setLog(newLog);

        if (!checkDeath(newPlayer, newEnemy)) {
          setPlayerLocked(false);
        }
      }, delay);
    },
    [difficulty, enemyFighter.name, checkDeath, addFlash]
  );

  const playerUseAbility = useCallback(
    (ability: Ability) => {
      if (playerLocked || gameOver.current) return;
      if (player.isStunned) {
        setLog((prev) => addLog(prev, `  ⚡ Ты оглушён — не можешь действовать!`, '#a78bfa'));
        return;
      }
      const cd = player.abilityCooldowns[ability.id] ?? 0;
      if (cd > 0) return;
      if (player.mana < ability.manaCost) {
        setLog((prev) => addLog(prev, `  💧 Недостаточно маны для ${ability.name}!`, '#60a5fa'));
        return;
      }

      setPlayerLocked(true);
      const result = applyAbility(ability, player, enemy, log, false);
      addFlash(ability.name, ability.color, 'player');
      if (ability.damage > 0) addFlash(`-${Math.floor(ability.damage * 0.8)}`, '#ef4444', 'enemy');
      setPlayer(result.attacker);
      setEnemy(result.defender);
      setLog(result.log);

      if (!checkDeath(result.attacker, result.defender)) {
        botTurn(result.attacker, result.defender, result.log);
      }
    },
    [player, enemy, log, playerLocked, checkDeath, botTurn, addFlash]
  );

  const playerUseUltimate = useCallback(() => {
    if (playerLocked || gameOver.current) return;
    if (player.isStunned) return;
    if (player.ultimateCooldown > 0) return;
    if (player.mana < playerFighter.ultimate.manaCost) {
      setLog((prev) => addLog(prev, `  💧 Недостаточно маны для ульты!`, '#60a5fa'));
      return;
    }

    setPlayerLocked(true);
    const result = applyAbility(playerFighter.ultimate, player, enemy, log, true);
    addFlash('💥 УЛЬТА!', '#fbbf24', 'player');
    if (playerFighter.ultimate.damage > 0) addFlash(`-${Math.floor(playerFighter.ultimate.damage * 0.9)}`, '#dc2626', 'enemy');
    setPlayer(result.attacker);
    setEnemy(result.defender);
    setLog(result.log);

    if (!checkDeath(result.attacker, result.defender)) {
      botTurn(result.attacker, result.defender, result.log);
    }
  }, [player, enemy, log, playerLocked, playerFighter.ultimate, checkDeath, botTurn, addFlash]);

  const HpBar = ({ current, max, color }: { current: number; max: number; color: string }) => (
    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.max(0, (current / max) * 100)}%`, background: color }}
      />
    </div>
  );

  const ManaBar = ({ current, max }: { current: number; max: number }) => (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300 bg-blue-500"
        style={{ width: `${Math.max(0, (current / max) * 100)}%` }}
      />
    </div>
  );

  const renderFighter = (combatant: CombatantState, side: 'player' | 'enemy') => {
    const isDead = combatant.hp <= 0;
    const relevantFlashes = flashes.filter((f) => f.side === side);
    return (
      <div className={`relative flex flex-col items-center gap-2 flex-1 min-w-0 ${isDead ? 'opacity-50' : ''}`}>
        {relevantFlashes.map((f) => (
          <div
            key={f.id}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-sm font-bold pointer-events-none animate-bounce z-20 whitespace-nowrap"
            style={{ color: f.color }}
          >
            {f.text}
          </div>
        ))}
        <div
          className={`text-6xl md:text-8xl select-none transition-all ${
            combatant.isStunned ? 'opacity-50 grayscale' : ''
          } ${isBotThinking && side === 'enemy' ? 'animate-pulse' : ''}`}
        >
          {combatant.fighter.emoji}
        </div>
        <div className="text-center">
          <div className="text-xs md:text-sm font-bold" style={{ color: combatant.fighter.color }}>
            {combatant.fighter.name}
          </div>
          <div className="text-[10px] text-slate-500">{combatant.fighter.title}</div>
        </div>
        <div className="w-full px-2 space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>HP</span>
            <span>{combatant.hp}/{combatant.fighter.maxHp}</span>
          </div>
          <HpBar
            current={combatant.hp}
            max={combatant.fighter.maxHp}
            color={combatant.hp / combatant.fighter.maxHp > 0.5 ? '#22c55e' : combatant.hp / combatant.fighter.maxHp > 0.25 ? '#f59e0b' : '#ef4444'}
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>MP</span>
            <span>{combatant.mana}/{combatant.fighter.maxMana}</span>
          </div>
          <ManaBar current={combatant.mana} max={combatant.fighter.maxMana} />
          {combatant.shield > 0 && (
            <div className="text-[10px] text-cyan-300">🛡 Щит: {combatant.shield}</div>
          )}
        </div>
        <div className="flex gap-1 flex-wrap justify-center">
          {combatant.statusEffects.map((eff, i) => (
            <span
              key={i}
              className="text-[9px] px-1.5 py-0.5 rounded-full border"
              style={{ color: eff.color ?? '#a78bfa', borderColor: eff.color ?? '#a78bfa', background: `${eff.color ?? '#a78bfa'}22` }}
            >
              {eff.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050c1a] text-white flex flex-col" style={{ fontFamily: '"Russo One", sans-serif' }}>
      <div className="flex items-stretch gap-4 px-4 py-4 border-b border-white/10 bg-[#0a1628]">
        {renderFighter(player, 'player')}
        <div className="flex flex-col items-center justify-center gap-1 px-2">
          <div className="text-xl text-yellow-400">VS</div>
          <div className={`text-[10px] uppercase tracking-widest ${difficulty === 'nightmare' ? 'text-red-400' : 'text-orange-400'}`}>
            {difficulty === 'nightmare' ? '☠️ Кошмар' : '💀 Сложно'}
          </div>
          {isBotThinking && (
            <div className="text-[10px] text-slate-500 animate-pulse">думает...</div>
          )}
        </div>
        {renderFighter(enemy, 'enemy')}
      </div>

      <div ref={logRef} className="flex-1 overflow-y-auto px-3 py-2 min-h-[80px] max-h-[120px] bg-black/30 border-b border-white/10">
        {log.slice(-8).map((entry) => (
          <div key={entry.id} className="text-xs py-0.5" style={{ color: entry.color }}>
            {entry.text}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-[#0a1628]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 max-w-2xl mx-auto">
          {playerFighter.abilities.map((ability) => {
            const cd = player.abilityCooldowns[ability.id] ?? 0;
            const canUse = !playerLocked && cd === 0 && player.mana >= ability.manaCost && !player.isStunned;
            return (
              <button
                key={ability.id}
                onClick={() => playerUseAbility(ability)}
                disabled={!canUse}
                className={`relative p-2 border rounded text-left transition-all ${
                  canUse
                    ? 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 active:scale-95'
                    : 'border-white/5 bg-white/2 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full mb-1" style={{ background: ability.color }} />
                <div className="text-[10px] font-bold leading-tight mb-1">{ability.name}</div>
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span className="text-blue-400">{ability.manaCost} MP</span>
                  {ability.damage > 0 && <span className="text-orange-400">{ability.damage}</span>}
                </div>
                {cd > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded text-xs text-yellow-400">
                    {cd}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto">
          {(() => {
            const ult = playerFighter.ultimate;
            const cd = player.ultimateCooldown;
            const canUse = !playerLocked && cd === 0 && player.mana >= ult.manaCost && !player.isStunned;
            return (
              <button
                onClick={playerUseUltimate}
                disabled={!canUse}
                className={`w-full relative p-3 border-2 rounded transition-all ${
                  canUse
                    ? 'border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 active:scale-95 shadow-lg shadow-yellow-900/40'
                    : 'border-white/10 bg-white/2 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-yellow-400 font-bold">⚡ УЛЬТА: {ult.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{ult.description}</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-[10px] text-blue-400">{ult.manaCost} MP</div>
                    {ult.damage > 0 && <div className="text-[10px] text-orange-400">{ult.damage} урон</div>}
                  </div>
                </div>
                {cd > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded text-sm text-yellow-400">
                    Перезарядка: {cd}
                  </div>
                )}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
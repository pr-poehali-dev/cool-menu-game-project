import { useState } from 'react';
import { Fighter } from '@/data/characters';
import { BotDifficulty } from '@/engine/battleEngine';
import CharacterSelect from '@/components/game/CharacterSelect';
import BattleScreen from '@/components/game/BattleScreen';
import ResultScreen from '@/components/game/ResultScreen';

type Screen = 'select' | 'battle' | 'result';

interface BattleConfig {
  player: Fighter;
  enemy: Fighter;
  difficulty: BotDifficulty;
}

interface BattleResult {
  outcome: 'victory' | 'defeat';
  stats: { damage: number; healing: number; abilities: number };
}

export default function Index() {
  const [screen, setScreen] = useState<Screen>('select');
  const [config, setConfig] = useState<BattleConfig | null>(null);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [battleKey, setBattleKey] = useState(0);

  function handleStart(player: Fighter, enemy: Fighter, difficulty: BotDifficulty) {
    setConfig({ player, enemy, difficulty });
    setResult(null);
    setBattleKey((k) => k + 1);
    setScreen('battle');
  }

  function handleEnd(outcome: 'victory' | 'defeat', stats: { damage: number; healing: number; abilities: number }) {
    setResult({ outcome, stats });
    setScreen('result');
  }

  function handleRematch() {
    if (!config) return;
    setResult(null);
    setBattleKey((k) => k + 1);
    setScreen('battle');
  }

  function handleMenu() {
    setScreen('select');
  }

  if (screen === 'select') {
    return <CharacterSelect onStart={handleStart} />;
  }

  if (screen === 'battle' && config) {
    return (
      <BattleScreen
        key={battleKey}
        playerFighter={config.player}
        enemyFighter={config.enemy}
        difficulty={config.difficulty}
        onEnd={handleEnd}
      />
    );
  }

  if (screen === 'result' && config && result) {
    return (
      <ResultScreen
        result={result.outcome}
        player={config.player}
        enemy={config.enemy}
        stats={result.stats}
        difficulty={config.difficulty}
        onRematch={handleRematch}
        onMenu={handleMenu}
      />
    );
  }

  return null;
}

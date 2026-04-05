import { Fighter } from '@/data/characters';
import { BotDifficulty } from '@/engine/battleEngine';

interface Props {
  result: 'victory' | 'defeat';
  player: Fighter;
  enemy: Fighter;
  stats: { damage: number; healing: number; abilities: number };
  difficulty: BotDifficulty;
  onRematch: () => void;
  onMenu: () => void;
}

export default function ResultScreen({ result, player, enemy, stats, difficulty, onRematch, onMenu }: Props) {
  const isVictory = result === 'victory';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: isVictory
          ? 'radial-gradient(ellipse at center, #1a2e1a 0%, #050c1a 100%)'
          : 'radial-gradient(ellipse at center, #2e1a1a 0%, #050c1a 100%)',
        fontFamily: '"Russo One", sans-serif',
      }}
    >
      <div className="text-center max-w-lg w-full">
        <div className="text-8xl mb-4 animate-bounce">{isVictory ? '🏆' : '💀'}</div>

        <h1
          className="text-5xl md:text-7xl font-bold tracking-widest mb-2"
          style={{
            color: isVictory ? '#4ade80' : '#ef4444',
            textShadow: `0 0 40px ${isVictory ? '#4ade80' : '#ef4444'}88`,
          }}
        >
          {isVictory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
        </h1>

        <p className="text-slate-400 text-sm tracking-widest mb-8">
          {isVictory
            ? `${player.name} разгромил ${enemy.name}`
            : `${enemy.name} оказался сильнее`}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8 bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.damage.toLocaleString()}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Урон</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.healing.toLocaleString()}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Лечение</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.abilities}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Атак</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="text-center">
            <div className="text-4xl">{player.emoji}</div>
            <div className="text-xs mt-1" style={{ color: player.color }}>{player.name}</div>
          </div>
          <div className="text-2xl text-slate-600">VS</div>
          <div className="text-center">
            <div className="text-4xl">{enemy.emoji}</div>
            <div className="text-xs mt-1" style={{ color: enemy.color }}>{enemy.name}</div>
          </div>
        </div>

        <div className={`text-xs mb-6 tracking-widest uppercase ${difficulty === 'nightmare' ? 'text-red-400' : 'text-orange-400'}`}>
          {difficulty === 'nightmare' ? '☠️ Режим: Кошмар' : '💀 Режим: Сложно'}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRematch}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm tracking-widest uppercase font-bold transition-all transform hover:scale-105 active:scale-95 rounded"
          >
            ⚔️ Реванш!
          </button>
          <button
            onClick={onMenu}
            className="px-8 py-3 border border-white/20 text-slate-300 hover:text-white hover:border-white/40 text-sm tracking-widest uppercase transition-all rounded"
          >
            ← Выбор персонажа
          </button>
        </div>
      </div>
    </div>
  );
}

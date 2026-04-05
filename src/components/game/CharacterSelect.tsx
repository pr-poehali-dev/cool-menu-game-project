import { useState } from 'react';
import { Fighter, ALL_FIGHTERS, JJK_FIGHTERS, STAND_FIGHTERS } from '@/data/characters';
import { BotDifficulty } from '@/engine/battleEngine';

interface Props {
  onStart: (player: Fighter, enemy: Fighter, difficulty: BotDifficulty) => void;
}

export default function CharacterSelect({ onStart }: Props) {
  const [tab, setTab] = useState<'jjk' | 'stand'>('jjk');
  const [selected, setSelected] = useState<Fighter | null>(null);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('hard');

  const list = tab === 'jjk' ? JJK_FIGHTERS : STAND_FIGHTERS;

  function handleStart() {
    if (!selected) return;
    const enemies = ALL_FIGHTERS.filter((f) => f.id !== selected.id);
    const enemy = enemies[Math.floor(Math.random() * enemies.length)];
    onStart(selected, enemy, difficulty);
  }

  return (
    <div className="min-h-screen bg-[#050c1a] text-white flex flex-col" style={{ fontFamily: '"Russo One", sans-serif' }}>
      <div className="relative overflow-hidden py-8 px-4 text-center border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 to-transparent pointer-events-none" />
        <h1 className="relative text-4xl md:text-6xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400">
          CURSE ARENA
        </h1>
        <p className="relative mt-2 text-sm tracking-[0.4em] text-slate-400 uppercase">
          Выбери бойца и сразись
        </p>
      </div>

      <div className="flex gap-2 px-4 pt-4 justify-center">
        {(['jjk', 'stand'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelected(null); }}
            className={`px-6 py-2 text-sm tracking-widest uppercase border transition-all ${
              tab === t
                ? 'bg-purple-600 border-purple-400 text-white'
                : 'bg-transparent border-white/20 text-slate-400 hover:border-white/40'
            }`}
          >
            {t === 'jjk' ? '⚡ Маги JJK' : '✨ Стенды JoJo'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-6xl mx-auto">
          {list.map((fighter) => (
            <button
              key={fighter.id}
              onClick={() => setSelected(fighter)}
              className={`relative p-3 border-2 rounded text-left transition-all group ${
                selected?.id === fighter.id
                  ? 'border-yellow-400 bg-yellow-400/10 scale-105'
                  : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              <div className="text-3xl mb-2 text-center">{fighter.emoji}</div>
              <div className="text-xs font-bold text-center" style={{ color: fighter.color }}>
                {fighter.name}
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-0.5">{fighter.title}</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>HP</span>
                  <span style={{ color: fighter.color }}>{fighter.maxHp}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>ATK</span>
                  <span className="text-orange-400">{fighter.baseAtk}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>SPD</span>
                  <span className="text-cyan-400">{fighter.speed}</span>
                </div>
              </div>
              {selected?.id === fighter.id && (
                <div className="absolute top-1 right-1 text-yellow-400 text-xs">✓</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="border-t border-white/10 bg-[#0a1628] px-4 py-4">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{selected.emoji}</span>
                <div>
                  <div className="text-lg font-bold" style={{ color: selected.color }}>{selected.name}</div>
                  <div className="text-xs text-slate-400">{selected.title}</div>
                </div>
              </div>
              <p className="text-xs text-slate-300 mb-3 max-w-lg">{selected.lore}</p>
              <div className="grid grid-cols-2 gap-1 max-w-md">
                {selected.abilities.map((ab) => (
                  <div key={ab.id} className="flex items-center gap-2 bg-white/5 rounded px-2 py-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ab.color }} />
                    <span className="text-[10px] text-slate-300 truncate">{ab.name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1 col-span-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                  <span className="text-[10px] text-yellow-300 truncate">УЛЬТА: {selected.ultimate.name}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 items-center md:items-end">
              <div className="flex gap-2">
                {(['hard', 'nightmare'] as BotDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 text-xs tracking-widest uppercase border transition-all ${
                      difficulty === d
                        ? d === 'nightmare'
                          ? 'bg-red-700 border-red-400 text-white'
                          : 'bg-orange-700 border-orange-400 text-white'
                        : 'bg-transparent border-white/20 text-slate-400 hover:border-white/40'
                    }`}
                  >
                    {d === 'hard' ? '💀 Сложно' : '☠️ Кошмар'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleStart}
                className="px-10 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm tracking-widest uppercase font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-purple-900/50"
              >
                ⚔️ В БОЙ!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useRef, useState } from "react";
import { ENERGIES, EnergyType, EnergyDef } from "./gameState";

interface Props {
  onSelect: (energy: EnergyType) => void;
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const EnergySelect = ({ onSelect }: Props) => {
  // hover храним в ref — не вызываем rerender при onMouseMove
  const [selected, setSelected] = useState<EnergyType | null>(null);
  const [activeEnergy, setActiveEnergy] = useState<EnergyDef | null>(null);
  const [page, setPage] = useState(0);
  const hoverRef = useRef<EnergyType | null>(null);

  const perPage = 6;
  const pages = Math.ceil(ENERGIES.length / perPage);
  const visible = ENERGIES.slice(page * perPage, page * perPage + perPage);

  const handleConfirm = () => {
    if (selected) onSelect(selected);
  };

  const handleEnter = (e: EnergyDef) => {
    hoverRef.current = e.id;
    setActiveEnergy(e);
  };
  const handleLeave = () => {
    hoverRef.current = null;
    setActiveEnergy(selected ? ENERGIES.find(e => e.id === selected) ?? null : null);
  };
  const handleClick = (e: EnergyDef) => {
    setSelected(e.id);
    setActiveEnergy(e);
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "radial-gradient(ellipse at 50% 40%, #0e0a1f 0%, #04030d 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Georgia', serif",
      overflow: "hidden",
    }}>
      {/* Фоновые руны */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06, pointerEvents: "none" }}>
        {[...Array(6)].map((_, i) => (
          <circle key={i}
            cx={`${15 + i * 15}%`} cy={`${20 + Math.sin(i) * 30}%`}
            r={40 + i * 15} stroke="#7c3aed" strokeWidth="1" fill="none"
          />
        ))}
      </svg>

      <div style={{ color: "#6d28d9", fontSize: 11, letterSpacing: "0.3em", marginBottom: 6, textTransform: "uppercase" }}>
        Cursed Legacy — Пробуждение
      </div>
      <h1 style={{
        color: "#c4b5fd", fontSize: "clamp(20px,3.5vw,32px)",
        fontWeight: 900, letterSpacing: "0.15em",
        textShadow: "0 0 30px rgba(139,92,246,0.7)",
        margin: "0 0 4px",
      }}>
        Выбери свою врождённую энергию
      </h1>
      <p style={{ color: "#4c3a7a", fontSize: 12, letterSpacing: "0.1em", margin: "0 0 18px" }}>
        Это определит твой стиль боя навсегда
      </p>

      {/* Основной контент — фиксированная высота, без смещений */}
      <div style={{ display: "flex", gap: 20, width: "min(940px,96vw)", alignItems: "flex-start" }}>
        {/* Сетка карточек — фиксированная минимальная высота */}
        <div style={{ flex: "1 1 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            minHeight: 260,
          }}>
            {visible.map(e => {
              const isSelected = selected === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => handleClick(e)}
                  onMouseEnter={() => handleEnter(e)}
                  onMouseLeave={handleLeave}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, rgba(${hexToRgb(e.color)},0.18), rgba(${hexToRgb(e.glowColor)},0.08))`
                      : "rgba(10,8,24,0.85)",
                    border: isSelected ? `2px solid ${e.color}` : `1px solid rgba(109,40,217,0.25)`,
                    borderRadius: 8,
                    padding: "13px 11px",
                    cursor: "pointer",
                    textAlign: "left",
                    // НЕТ transform/translateY — это и было причиной скачков
                    transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                    boxShadow: isSelected ? `0 0 18px ${e.glowColor}44` : "none",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                    <span style={{
                      fontSize: 22, color: e.color, lineHeight: 1,
                      textShadow: isSelected ? `0 0 12px ${e.glowColor}` : "none",
                      fontWeight: 900, minWidth: 24,
                    }}>{e.kanji}</span>
                    <div>
                      <div style={{ color: e.color, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1.2 }}>
                        {e.nameRu}
                      </div>
                      <div style={{ color: "#4c3a7a", fontSize: 10, letterSpacing: "0.06em" }}>
                        {e.inspiration}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(["damage","speed","defense"] as const).map(s => {
                      const val = e.statMods[s];
                      const labels = { damage:"ATK", speed:"SPD", defense:"DEF" };
                      const c = val >= 1.2 ? "#4ade80" : val <= 0.85 ? "#f87171" : "#94a3b8";
                      const bg = val >= 1.2 ? "rgba(34,197,94,0.15)" : val <= 0.85 ? "rgba(239,68,68,0.15)" : "rgba(100,116,139,0.15)";
                      return (
                        <span key={s} style={{
                          fontSize: 9, padding: "1px 5px", borderRadius: 3,
                          background: bg, color: c, letterSpacing: "0.04em",
                        }}>
                          {labels[s]} {val >= 1 ? "+" : ""}{Math.round((val - 1) * 100)}%
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Пагинация */}
          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
              {[...Array(pages)].map((_, i) => (
                <button key={i} onClick={() => setPage(i)} style={{
                  width: 28, height: 28,
                  background: page === i ? "rgba(124,58,237,0.4)" : "rgba(10,8,24,0.8)",
                  border: page === i ? "1px solid #7c3aed" : "1px solid rgba(109,40,217,0.25)",
                  borderRadius: 4, color: page === i ? "#c4b5fd" : "#4c3a7a",
                  cursor: "pointer", fontSize: 12,
                }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          {/* Кнопка подтверждения */}
          <div style={{ marginTop: 14 }}>
            <button
              onClick={handleConfirm}
              disabled={!selected}
              style={{
                width: "100%", padding: "13px 0",
                background: selected ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : "rgba(50,40,70,0.5)",
                border: selected ? "1px solid #a78bfa" : "1px solid rgba(109,40,217,0.2)",
                borderRadius: 7, color: selected ? "#f1f5f9" : "#4c3a7a",
                fontFamily: "'Georgia', serif", fontSize: 15, letterSpacing: "0.15em",
                cursor: selected ? "pointer" : "not-allowed",
                boxShadow: selected ? "0 0 20px rgba(124,58,237,0.35)" : "none",
                transition: "all 0.2s",
              }}
            >
              {selected ? "▶  ПРИНЯТЬ ЭНЕРГИЮ" : "Выбери энергию..."}
            </button>
          </div>
        </div>

        {/* Панель деталей — фиксированные размеры, без прыжков */}
        <div style={{
          width: 220, flexShrink: 0,
          background: "rgba(10,8,24,0.92)",
          border: `1px solid ${activeEnergy ? activeEnergy.color + "55" : "rgba(109,40,217,0.2)"}`,
          borderRadius: 10, padding: 16,
          minHeight: 340,
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxShadow: activeEnergy ? `0 0 28px ${activeEnergy.glowColor}18` : "none",
        }}>
          {activeEnergy ? (
            <>
              <div style={{
                fontSize: 42, textAlign: "center", marginBottom: 7,
                color: activeEnergy.color,
                textShadow: `0 0 18px ${activeEnergy.glowColor}`,
                lineHeight: 1,
              }}>{activeEnergy.kanji}</div>
              <div style={{ color: activeEnergy.color, fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                {activeEnergy.nameRu}
              </div>
              <div style={{ color: "#60a5fa", fontSize: 10, marginBottom: 2, letterSpacing: "0.05em" }}>
                {activeEnergy.inspiration}
              </div>
              <div style={{ color: "#4c3a7a", fontSize: 10, marginBottom: 10, letterSpacing: "0.04em" }}>
                {activeEnergy.name}
              </div>
              <div style={{ color: "#8b7aa8", fontSize: 11, lineHeight: 1.55, marginBottom: 10 }}>
                {activeEnergy.description}
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ color: "#4ade80", fontSize: 9, letterSpacing: "0.12em", marginBottom: 3 }}>
                  ✦ ПАССИВНЫЙ ЭФФЕКТ
                </div>
                <div style={{ color: "#86efac", fontSize: 10, lineHeight: 1.5 }}>
                  {activeEnergy.passive}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "#f87171", fontSize: 9, letterSpacing: "0.12em", marginBottom: 3 }}>
                  ⚠ ОГРАНИЧЕНИЕ
                </div>
                <div style={{ color: "#fca5a5", fontSize: 10, lineHeight: 1.5 }}>
                  {activeEnergy.limitation}
                </div>
              </div>

              {/* Бары характеристик */}
              {(["damage","speed","defense","energyRegen"] as const).map(stat => {
                const val = activeEnergy.statMods[stat];
                const labels: Record<string, string> = { damage:"Урон", speed:"Скорость", defense:"Защита", energyRegen:"Реген CE" };
                const pct = Math.min(100, (val / 2) * 100);
                const color = val >= 1.2 ? "#4ade80" : val <= 0.85 ? "#f87171" : "#94a3b8";
                return (
                  <div key={stat} style={{ marginBottom: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ color: "#4c3a7a", fontSize: 9, letterSpacing: "0.06em" }}>{labels[stat]}</span>
                      <span style={{ color, fontSize: 9 }}>
                        {val >= 1 ? "+" : ""}{Math.round((val - 1) * 100)}%
                      </span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.25s" }} />
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ color: "#2d2148", fontSize: 12, textAlign: "center", marginTop: 60, lineHeight: 1.8 }}>
              Наведи на энергию<br />чтобы узнать подробности
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnergySelect;

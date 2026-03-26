import { useState } from "react";
import { ENERGIES, EnergyType, EnergyDef } from "./gameState";

interface Props {
  onSelect: (energy: EnergyType) => void;
}

const EnergySelect = ({ onSelect }: Props) => {
  const [hovered, setHovered] = useState<EnergyDef | null>(null);
  const [selected, setSelected] = useState<EnergyType | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 6;
  const pages = Math.ceil(ENERGIES.length / perPage);
  const visible = ENERGIES.slice(page * perPage, page * perPage + perPage);

  const handleConfirm = () => {
    if (selected) onSelect(selected);
  };

  const activeEnergy = hovered ?? (selected ? ENERGIES.find(e => e.id === selected) ?? null : null);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "radial-gradient(ellipse at 50% 40%, #0e0a1f 0%, #04030d 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 0,
      fontFamily: "'Georgia', serif",
      overflow: "hidden",
    }}>
      {/* Background runes */}
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
        color: "#c4b5fd", fontSize: "clamp(22px,4vw,36px)",
        fontWeight: 900, letterSpacing: "0.15em",
        textShadow: "0 0 30px rgba(139,92,246,0.7)",
        margin: "0 0 4px",
      }}>
        Выбери свою врождённую энергию
      </h1>
      <p style={{ color: "#4c3a7a", fontSize: 12, letterSpacing: "0.1em", margin: "0 0 20px" }}>
        Это определит твой стиль боя навсегда
      </p>

      <div style={{ display: "flex", gap: 24, width: "min(900px,96vw)", alignItems: "flex-start" }}>
        {/* Grid */}
        <div style={{ flex: "1 1 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}>
            {visible.map(e => {
              const isSelected = selected === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelected(e.id)}
                  onMouseEnter={() => setHovered(e)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, rgba(${hexToRgb(e.color)},0.18), rgba(${hexToRgb(e.glowColor)},0.08))`
                      : "rgba(10,8,24,0.8)",
                    border: isSelected ? `2px solid ${e.color}` : "1px solid rgba(109,40,217,0.25)",
                    borderRadius: 8,
                    padding: "14px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.18s",
                    boxShadow: isSelected ? `0 0 20px ${e.glowColor}55` : "none",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 22, color: e.color, lineHeight: 1,
                      textShadow: isSelected ? `0 0 12px ${e.glowColor}` : "none",
                      fontWeight: 900,
                    }}>{e.kanji}</span>
                    <div>
                      <div style={{ color: e.color, fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
                        {e.nameRu}
                      </div>
                      <div style={{ color: "#4c3a7a", fontSize: 10, letterSpacing: "0.08em" }}>
                        {e.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[
                      { label: "ATK", val: e.statMods.damage },
                      { label: "SPD", val: e.statMods.speed },
                      { label: "DEF", val: e.statMods.defense },
                    ].map(s => (
                      <span key={s.label} style={{
                        fontSize: 9, padding: "1px 5px", borderRadius: 3,
                        background: s.val >= 1.2 ? "rgba(34,197,94,0.2)" : s.val <= 0.85 ? "rgba(239,68,68,0.2)" : "rgba(100,116,139,0.2)",
                        color: s.val >= 1.2 ? "#4ade80" : s.val <= 0.85 ? "#f87171" : "#94a3b8",
                        letterSpacing: "0.05em",
                      }}>
                        {s.label} {s.val >= 1 ? "+" : ""}{Math.round((s.val - 1) * 100)}%
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
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
        </div>

        {/* Detail panel */}
        <div style={{
          width: 240, flexShrink: 0,
          background: "rgba(10,8,24,0.9)",
          border: `1px solid ${activeEnergy ? activeEnergy.color + "55" : "rgba(109,40,217,0.2)"}`,
          borderRadius: 10, padding: 18,
          minHeight: 300,
          transition: "border-color 0.2s",
          boxShadow: activeEnergy ? `0 0 30px ${activeEnergy.glowColor}22` : "none",
        }}>
          {activeEnergy ? (
            <>
              <div style={{
                fontSize: 44, textAlign: "center", marginBottom: 8,
                color: activeEnergy.color,
                textShadow: `0 0 20px ${activeEnergy.glowColor}`,
              }}>{activeEnergy.kanji}</div>
              <div style={{ color: activeEnergy.color, fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                {activeEnergy.nameRu}
              </div>
              <div style={{ color: "#4c3a7a", fontSize: 11, marginBottom: 12, letterSpacing: "0.05em" }}>
                {activeEnergy.name}
              </div>
              <div style={{ color: "#8b7aa8", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                {activeEnergy.description}
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ color: "#4ade80", fontSize: 10, letterSpacing: "0.1em", marginBottom: 4 }}>
                  ✦ ПАССИВНЫЙ ЭФФЕКТ
                </div>
                <div style={{ color: "#86efac", fontSize: 11, lineHeight: 1.5 }}>
                  {activeEnergy.passive}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ color: "#f87171", fontSize: 10, letterSpacing: "0.1em", marginBottom: 4 }}>
                  ✦ ОГРАНИЧЕНИЕ
                </div>
                <div style={{ color: "#fca5a5", fontSize: 11, lineHeight: 1.5 }}>
                  {activeEnergy.limitation}
                </div>
              </div>

              {/* Stat bars */}
              {(["damage", "speed", "defense", "energyRegen"] as const).map(stat => {
                const val = activeEnergy.statMods[stat];
                const labels: Record<string, string> = { damage: "Урон", speed: "Скорость", defense: "Защита", energyRegen: "Реген CE" };
                const pct = Math.min(100, (val / 2) * 100);
                const color = val >= 1.2 ? "#4ade80" : val <= 0.85 ? "#f87171" : "#94a3b8";
                return (
                  <div key={stat} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ color: "#6d5a8a", fontSize: 10 }}>{labels[stat]}</span>
                      <span style={{ color, fontSize: 10 }}>×{val.toFixed(1)}</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ color: "#3d2d60", fontSize: 13, textAlign: "center", marginTop: 60, lineHeight: 1.7 }}>
              Наведи на энергию,<br />чтобы узнать о ней
            </div>
          )}
        </div>
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selected}
        style={{
          marginTop: 22,
          padding: "13px 56px",
          background: selected ? "transparent" : "transparent",
          border: selected ? `2px solid ${ENERGIES.find(e => e.id === selected)?.color ?? "#7c3aed"}` : "1px solid rgba(109,40,217,0.2)",
          color: selected ? ENERGIES.find(e => e.id === selected)?.color ?? "#a78bfa" : "#3d2d60",
          fontSize: 15, letterSpacing: "0.25em",
          cursor: selected ? "pointer" : "default",
          fontFamily: "'Georgia', serif",
          fontWeight: 700,
          borderRadius: 4,
          transition: "all 0.2s",
          boxShadow: selected ? `0 0 24px ${ENERGIES.find(e => e.id === selected)?.glowColor ?? "#7c3aed"}55` : "none",
        }}
      >
        {selected ? `ПРИНЯТЬ ЭНЕРГИЮ — ${ENERGIES.find(e => e.id === selected)?.nameRu}` : "ВЫБЕРИ ЭНЕРГИЮ"}
      </button>
    </div>
  );
};

// Utility: hex to rgb triplet string
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default EnergySelect;

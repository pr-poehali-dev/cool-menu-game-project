import { useState, useEffect } from "react";
import { ENERGIES, ALL_TECHNIQUES, KeyBindings, loadBindings, saveBindings, resetBindings, keyCodeToLabel, DEFAULT_BINDINGS, MAX_SLOTS } from "./gameState";

interface Props {
  onClose: () => void;
}

type Tab = "controls" | "energies" | "techniques" | "lore";

const TAB_LABELS: Record<Tab, string> = {
  controls: "Управление",
  energies: "Энергии",
  techniques: "Техники",
  lore: "Лор",
};

const BIND_FIELDS: { key: keyof KeyBindings; label: string }[] = [
  { key: "up",        label: "Вверх" },
  { key: "down",      label: "Вниз" },
  { key: "left",      label: "Влево" },
  { key: "right",     label: "Вправо" },
  { key: "attack",    label: "Удар" },
  { key: "technique", label: "Техника (активная)" },
  { key: "nextTech",  label: "След. техника" },
  { key: "interact",  label: "Взаимодействие" },
  { key: "flee",      label: "Побег из боя" },
];


const InfoModal = ({ onClose }: Props) => {
  const [tab, setTab] = useState<Tab>("controls");
  const [bindings, setBindings] = useState<KeyBindings>(loadBindings);
  const [listening, setListening] = useState<keyof KeyBindings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!listening) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      setBindings(prev => ({ ...prev, [listening]: e.code }));
      setListening(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [listening]);

  const handleSave = () => {
    saveBindings(bindings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleReset = () => setBindings(resetBindings());

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(3,2,13,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Georgia', serif",
    }}>
      <div style={{
        width: "min(860px, 96vw)",
        background: "rgba(10,8,24,0.98)",
        border: "1px solid rgba(124,58,237,0.35)",
        borderRadius: 12,
        boxShadow: "0 0 60px rgba(109,40,217,0.2)",
        overflow: "hidden",
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Шапка */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(109,40,217,0.2)",
        }}>
          <div style={{ color: "#c4b5fd", fontSize: 18, fontWeight: 700, letterSpacing: "0.15em" }}>
            ✦ CURSED LEGACY — Справочник
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid rgba(109,40,217,0.3)",
            color: "#6d28d9", fontSize: 18, cursor: "pointer", width: 32, height: 32,
            borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Вкладки */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(109,40,217,0.15)" }}>
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "11px 0",
              background: tab === t ? "rgba(109,40,217,0.15)" : "transparent",
              border: "none",
              borderBottom: tab === t ? "2px solid #7c3aed" : "2px solid transparent",
              color: tab === t ? "#c4b5fd" : "#4c3a7a",
              fontSize: 12, letterSpacing: "0.1em", cursor: "pointer",
              transition: "all 0.15s",
            }}>
              {TAB_LABELS[t].toUpperCase()}
            </button>
          ))}
        </div>

        {/* Содержимое */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── УПРАВЛЕНИЕ ── */}
          {tab === "controls" && (
            <div>
              {/* Кастомные биндинги */}
              <div style={{
                marginTop: 4, padding: "16px 18px",
                background: "rgba(109,40,217,0.07)",
                border: "1px solid rgba(109,40,217,0.25)",
                borderRadius: 8,
              }}>
                <div style={{ color: "#7c3aed", fontSize: 10, letterSpacing: "0.18em", marginBottom: 12, fontFamily: "monospace" }}>
                  СМЕНА КНОПОК
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                  {BIND_FIELDS.map(field => {
                    const isActive = listening === field.key;
                    const val = bindings[field.key];
                    const isDefault = DEFAULT_BINDINGS[field.key] === val;
                    return (
                      <div key={field.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#8b7aa8", fontSize: 11, flex: 1 }}>{field.label}</span>
                        <button
                          onClick={() => setListening(isActive ? null : field.key)}
                          style={{
                            padding: "4px 12px", borderRadius: 4, cursor: "pointer",
                            background: isActive ? "#7c3aed" : "rgba(255,255,255,0.05)",
                            border: isActive ? "1px solid #a78bfa" : `1px solid ${isDefault ? "rgba(109,40,217,0.3)" : "#f59e0b44"}`,
                            color: isActive ? "#fff" : isDefault ? "#c4b5fd" : "#f59e0b",
                            fontSize: 12, fontFamily: "monospace",
                            minWidth: 64, textAlign: "center",
                          }}
                        >
                          {isActive ? "Жми..." : keyCodeToLabel(val)}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button onClick={handleSave} style={{
                    flex: 1, padding: "8px 0",
                    background: saved ? "rgba(34,197,94,0.2)" : "rgba(109,40,217,0.2)",
                    border: `1px solid ${saved ? "#22c55e" : "#7c3aed"}`,
                    borderRadius: 6, color: saved ? "#22c55e" : "#c4b5fd",
                    fontSize: 12, letterSpacing: "0.1em", cursor: "pointer",
                  }}>
                    {saved ? "✓ Сохранено" : "Сохранить"}
                  </button>
                  <button onClick={handleReset} style={{
                    padding: "8px 18px",
                    background: "transparent",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 6, color: "#f87171",
                    fontSize: 12, cursor: "pointer",
                  }}>
                    Сбросить
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ЭНЕРГИИ ── */}
          {tab === "energies" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {ENERGIES.map(e => (
                <div key={e.id} style={{
                  background: "rgba(10,8,24,0.8)",
                  border: `1px solid ${e.color}33`,
                  borderRadius: 8, padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 20, color: e.color, textShadow: `0 0 12px ${e.glowColor}` }}>{e.kanji}</span>
                    <div>
                      <div style={{ color: e.color, fontSize: 13, fontWeight: 700 }}>{e.nameRu}</div>
                    </div>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5, marginBottom: 6 }}>{e.description}</div>
                  <div style={{
                    background: `${e.color}11`, border: `1px solid ${e.color}22`,
                    borderRadius: 4, padding: "5px 8px",
                    color: e.color, fontSize: 10, lineHeight: 1.4,
                  }}>
                    ✦ {e.affinityDesc}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 7, flexWrap: "wrap" }}>
                    {(["damage","speed","defense"] as const).map(s => {
                      const val = e.statMods[s];
                      const labels = { damage:"ATK", speed:"SPD", defense:"DEF" };
                      const c = val >= 1.2 ? "#4ade80" : val <= 0.85 ? "#f87171" : "#94a3b8";
                      return (
                        <span key={s} style={{
                          fontSize: 9, padding: "1px 6px", borderRadius: 3,
                          background: "rgba(255,255,255,0.05)", color: c,
                        }}>
                          {labels[s]} {val >= 1 ? "+" : ""}{Math.round((val-1)*100)}%
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ТЕХНИКИ ── */}
          {tab === "techniques" && (
            <div>
              <div style={{
                background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                color: "#86efac", fontSize: 12, lineHeight: 1.6,
              }}>
                ✦ Техники можно учить все — энергия лишь даёт склонность.<br/>
                Всего {MAX_SLOTS} слотов: простая техника = 1 слот, средняя = 2, сложная = 3.<br/>
                Изучение требует XP — чем сложнее техника, тем дольше.
              </div>

              {/* Обратная техника — универсальная */}
              <div style={{
                marginBottom: 10,
                background: "rgba(34,197,94,0.05)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 8, padding: "10px 14px",
              }}>
                <div style={{ color: "#4ade80", fontSize: 11, letterSpacing: "0.12em", marginBottom: 6 }}>
                  ★ УНИВЕРСАЛЬНАЯ
                </div>
                {[ALL_TECHNIQUES.find(t => t.id === "reverse_curse")!].map(tech => (
                  <div key={tech.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 700 }}>{tech.nameRu}</span>
                      {tech.nameJp && <span style={{ color: "#374151", fontSize: 10 }}>{tech.nameJp}</span>}
                      <span style={{ marginLeft: "auto", color: "#6b7280", fontSize: 10 }}>
                        [{tech.slots} слот{tech.slots > 1 ? "а" : ""}] · {tech.ceCost} CE · {tech.xpToLearn} XP
                      </span>
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 11 }}>{tech.description}</div>
                  </div>
                ))}
              </div>

              {/* Остальные техники */}
              {ENERGIES.map(e => {
                const techs = ALL_TECHNIQUES.filter(t => t.energyAffinity?.includes(e.id));
                if (!techs.length) return null;
                return (
                  <div key={e.id} style={{
                    marginBottom: 10,
                    background: "rgba(10,8,24,0.8)",
                    border: `1px solid ${e.color}22`,
                    borderRadius: 8, padding: "10px 14px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 16, color: e.color }}>{e.kanji}</span>
                      <span style={{ color: e.color, fontSize: 11, letterSpacing: "0.1em" }}>{e.nameRu}</span>
                    </div>
                    {techs.map(tech => (
                      <div key={tech.id} style={{ marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ color: "#c4b5fd", fontSize: 12, fontWeight: 700 }}>{tech.nameRu}</span>
                          {tech.nameJp && <span style={{ color: "#374151", fontSize: 10 }}>{tech.nameJp}</span>}
                          <span style={{ marginLeft: "auto", color: "#4c3a7a", fontSize: 10 }}>
                            [{tech.slots} сл.] {tech.ceCost > 0 ? `${tech.ceCost} CE ·` : ""} {tech.xpToLearn} XP
                          </span>
                        </div>
                        <div style={{ color: "#6b7280", fontSize: 11 }}>{tech.description}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ЛОР ── */}
          {tab === "lore" && (
            <div>
              {[
                { title: "Мир Cursed Legacy", text: "Проклятые духи — порождения человеческих страхов. Они невидимы для обычных людей, но смертельно опасны. Маги проклятий — единственные, кто может с ними сражаться.\n\nТы — молодой экзорцист, только что пробудившийся к CE. Твоя врождённая энергия определяет склонность к тем или иным техникам, но любая техника доступна для изучения — было бы желание и время." },
                { title: "Проклятая энергия (CE)", text: "CE — это отрицательная эмоциональная энергия, преобразованная и направленная магом. Обратная техника использует позитивную CE для исцеления — редкое и сложное умение." },
                { title: "Техники", text: "Врождённые техники даются от рождения. Но упорной тренировкой маг способен освоить чужие приёмы — пусть и не с той же эффективностью, что их природный носитель." },
              ].map(s => (
                <div key={s.title} style={{ marginBottom: 18 }}>
                  <div style={{ color: "#7c3aed", fontSize: 10, letterSpacing: "0.18em", marginBottom: 8, fontFamily: "monospace" }}>
                    {s.title.toUpperCase()}
                  </div>
                  {s.text.split("\n\n").map((p, i) => (
                    <div key={i} style={{ color: "#8b7aa8", fontSize: 12, lineHeight: 1.8, marginBottom: 8 }}>{p}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
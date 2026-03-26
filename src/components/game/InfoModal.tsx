import { useState, useEffect } from "react";
import { ENERGIES, TECHNIQUE_GROUPS, KeyBindings, loadBindings, saveBindings, resetBindings, keyCodeToLabel, DEFAULT_BINDINGS } from "./gameState";

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

// ── Bind helper ────────────────────────────────────────────────────────────────

const BIND_FIELDS: { key: keyof KeyBindings; label: string; desc: string }[] = [
  { key: "up",         label: "Вверх",        desc: "Движение вверх" },
  { key: "down",       label: "Вниз",         desc: "Движение вниз" },
  { key: "left",       label: "Влево",        desc: "Движение влево" },
  { key: "right",      label: "Вправо",       desc: "Движение вправо" },
  { key: "attack",     label: "Удар 1",       desc: "Основная атака" },
  { key: "attack2",    label: "Удар 2",       desc: "Альтернативная атака" },
  { key: "technique",  label: "Техника E",    desc: "Активная техника / Взаимодействие в городе" },
  { key: "technique2", label: "Техника Q",    desc: "Вторичная техника" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ color: "#7c3aed", fontSize: 10, letterSpacing: "0.18em", marginBottom: 8, fontFamily: "monospace" }}>
      {title.toUpperCase()}
    </div>
    {children}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
    <span style={{ color: "#c4b5fd", fontSize: 12, fontFamily: "monospace", flexShrink: 0 }}>{label}</span>
    <span style={{ color: "#8b7aa8", fontSize: 12, textAlign: "right" }}>{value}</span>
  </div>
);

// ── Компонент ──────────────────────────────────────────────────────────────────

const InfoModal = ({ onClose }: Props) => {
  const [tab, setTab] = useState<Tab>("controls");

  // ── Управление: кастомные бинды ──
  const [bindings, setBindings] = useState<KeyBindings>(loadBindings);
  const [listening, setListening] = useState<keyof KeyBindings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!listening) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      setBindings(prev => {
        const next = { ...prev, [listening]: e.code };
        return next;
      });
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

  const handleReset = () => {
    const def = resetBindings();
    setBindings(def);
  };

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
              <Section title="Движение">
                <Row label="W / ↑" value="Вверх" />
                <Row label="S / ↓" value="Вниз" />
                <Row label="A / ←" value="Влево" />
                <Row label="D / →" value="Вправо" />
              </Section>
              <Section title="Боевая система">
                <Row label="Z / X (настраивается)" value="Удар — можно изменить ниже" />
                <Row label="E (настраивается)" value="Техника CE (требует 30 CE)" />
                <Row label="Удержи кнопку атаки" value="Накопи заряд → тройной удар" />
              </Section>
              <Section title="Город">
                <Row label="E (рядом с НПС)" value="Говорить / принять квест" />
                <Row label="Войти в зданте с духами" value="Начать бой" />
              </Section>
              <Section title="Система прогресса">
                <Row label="XP" value="Получай за убийство духов (+30 / +80)" />
                <Row label="Уровень" value="Прокачивает HP, CE, открывает техники" />
                <Row label="CE" value="Расходуется на технику, восстанавливается авто" />
              </Section>

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
                            animation: isActive ? "pulse 0.8s ease infinite alternate" : "none",
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
                    flex: 1, padding: "8px 0", background: "#6d28d9",
                    border: "none", borderRadius: 5, color: "#fff",
                    fontSize: 12, cursor: "pointer", letterSpacing: "0.08em",
                  }}>
                    {saved ? "✓ Сохранено" : "Сохранить"}
                  </button>
                  <button onClick={handleReset} style={{
                    padding: "8px 20px", background: "transparent",
                    border: "1px solid rgba(239,68,68,0.4)", borderRadius: 5,
                    color: "#f87171", fontSize: 12, cursor: "pointer",
                  }}>
                    Сбросить
                  </button>
                </div>
                <div style={{ color: "#4c3a7a", fontSize: 10, marginTop: 8 }}>
                  * Изменения применятся после перезапуска боя. Нажми кнопку рядом с действием, затем нажми нужную клавишу.
                </div>
              </div>

              <style>{`
                @keyframes pulse {
                  from { opacity: 0.6; } to { opacity: 1; }
                }
              `}</style>
            </div>
          )}

          {/* ── ЭНЕРГИИ ── */}
          {tab === "energies" && (
            <div>
              <p style={{ color: "#4c3a7a", fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
                Врождённая энергия определяется при рождении и не меняется. Она влияет на стиль боя,
                пассивные эффекты и эффективность техник. Выбирай с умом.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ENERGIES.map(e => (
                  <div key={e.id} style={{
                    background: "rgba(0,0,0,0.4)",
                    border: `1px solid ${e.color}33`,
                    borderRadius: 8, padding: "11px 14px",
                    display: "grid", gridTemplateColumns: "44px 1fr",
                    gap: "0 12px", alignItems: "start",
                  }}>
                    <div style={{ fontSize: 28, color: e.color, textShadow: `0 0 10px ${e.glowColor}`, textAlign: "center", paddingTop: 2 }}>
                      {e.kanji}
                    </div>
                    <div>
                      <div style={{ color: e.color, fontSize: 13, fontWeight: 700, marginBottom: 1 }}>
                        {e.nameRu} <span style={{ color: "#4c3a7a", fontSize: 10 }}>({e.name})</span>
                      </div>
                      <div style={{ color: "#60a5fa", fontSize: 10, marginBottom: 4 }}>вдохновение: {e.inspiration}</div>
                      <div style={{ color: "#8b7aa8", fontSize: 11, lineHeight: 1.5, marginBottom: 5 }}>{e.description}</div>
                      <div style={{ fontSize: 10, color: "#4ade80", marginBottom: 2 }}>✦ {e.passive}</div>
                      <div style={{ fontSize: 10, color: "#f87171", marginBottom: 5 }}>⚠ {e.limitation}</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {(["damage","speed","defense","energyRegen","attackSpeed"] as const).map(s => {
                          const v = e.statMods[s];
                          const labels: Record<string,string> = { damage:"Урон", speed:"Скорость", defense:"Защита", energyRegen:"Реген CE", attackSpeed:"Скор.атаки" };
                          const c = v >= 1.2 ? "#4ade80" : v <= 0.85 ? "#f87171" : "#94a3b8";
                          return (
                            <span key={s} style={{ fontSize:9, padding:"1px 5px", borderRadius:3,
                              background:v>=1.2?"rgba(34,197,94,0.12)":v<=0.85?"rgba(239,68,68,0.12)":"rgba(100,116,139,0.12)",
                              color:c }}>
                              {labels[s]} {v>=1?"+":""}{Math.round((v-1)*100)}%
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ТЕХНИКИ ── */}
          {tab === "techniques" && (
            <div>
              <p style={{ color: "#4c3a7a", fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>
                Каждая врождённая энергия принадлежит персонажу JJK. У каждого — своя школа техник.
                Выбери энергию — изучишь весь арсенал своего наставника.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {TECHNIQUE_GROUPS.map(group => (
                  <div key={group.character} style={{
                    background: "rgba(0,0,0,0.35)",
                    border: `1px solid ${group.color}44`,
                    borderRadius: 10, overflow: "hidden",
                  }}>
                    {/* Заголовок группы */}
                    <div style={{
                      padding: "10px 14px",
                      background: `${group.color}12`,
                      borderBottom: `1px solid ${group.color}33`,
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <span style={{ fontSize: 22, color: group.color }}>{group.kanji}</span>
                      <div>
                        <div style={{ color: group.color, fontSize: 13, fontWeight: 700 }}>{group.character}</div>
                        <div style={{ color: "#4c3a7a", fontSize: 10 }}>
                          Энергии: {group.energies.join(", ")} · {group.description}
                        </div>
                      </div>
                    </div>
                    {/* Приёмы */}
                    <div style={{ padding: "8px 14px 12px" }}>
                      {group.moves.map((move, i) => (
                        <div key={move.id} style={{
                          display: "grid", gridTemplateColumns: "56px 1fr auto",
                          gap: 8, alignItems: "start",
                          paddingBottom: i < group.moves.length - 1 ? 8 : 0,
                          borderBottom: i < group.moves.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          marginBottom: i < group.moves.length - 1 ? 8 : 0,
                        }}>
                          <div style={{
                            background: `${group.color}18`,
                            border: `1px solid ${group.color}33`,
                            borderRadius: 4, padding: "3px 0",
                            textAlign: "center",
                            color: group.color, fontSize: 11, fontFamily: "monospace",
                          }}>
                            {move.key}
                          </div>
                          <div>
                            <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                              {move.nameRu}
                              {move.nameJp && <span style={{ color: "#4c3a7a", fontSize: 10, marginLeft: 6 }}>({move.nameJp})</span>}
                            </div>
                            <div style={{ color: "#8b7aa8", fontSize: 11, lineHeight: 1.45 }}>{move.description}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            {move.ceCost > 0 && (
                              <div style={{ color: "#818cf8", fontSize: 10 }}>{move.ceCost} CE</div>
                            )}
                            {move.cooldownSec > 0 && (
                              <div style={{ color: "#6b7280", fontSize: 10 }}>КД {move.cooldownSec}с</div>
                            )}
                            {move.ceCost === 0 && move.cooldownSec === 0 && (
                              <div style={{ color: "#374151", fontSize: 10 }}>авто</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ЛОР ── */}
          {tab === "lore" && (
            <div>
              <div style={{ color: "#6d28d9", fontSize: 10, letterSpacing: "0.2em", marginBottom: 12 }}>
                МИРОУСТРОЙСТВО
              </div>
              <p style={{ color: "#8b7aa8", fontSize: 13, lineHeight: 1.8, marginBottom: 16 }}>
                Проклятая энергия — результат накопленных человеческих страхов и негативных эмоций.
                Из неё рождаются духи, невидимые обычным людям. Маги — те, кто способен управлять CE
                и уничтожать духов. Технические школы передаются по крови. Некоторые маги так сильны,
                что само пространство вокруг них искажается.
              </p>
              <div style={{ color: "#6d28d9", fontSize: 10, letterSpacing: "0.2em", marginBottom: 12 }}>
                ПЕРСОНАЖИ
              </div>
              {[
                { name:"Сатору Годзё", kanji:"∞", color:"#60a5fa", desc:"Сильнейший маг поколения. Техника Бесконечности — непроницаемая защита. Шесть глаз позволяют видеть CE." },
                { name:"Юдзи Итадори", kanji:"裂", color:"#818cf8", desc:"Носитель пальцев Сукуны. Расщеплённый кулак — вторая волна CE бьёт чуть позже первой." },
                { name:"Нобара Кугисаки", kanji:"藁", color:"#f59e0b", desc:"Техника Соломенной куклы и Шпильки. Гвозди + кровный резонанс — дальнобойная атака." },
                { name:"Рёмен Сукуна", kanji:"解", color:"#ef4444", desc:"Король проклятий. Разобрать и Рассечь — режущий CE без замаха. Расширение области." },
                { name:"Мегуми Фусигуро", kanji:"影", color:"#6366f1", desc:"Техника Десяти теней — призывает духовных зверей из теней. Один из самых перспективных магов." },
                { name:"Аой Тодо", kanji:"交", color:"#10b981", desc:"Бугги-Вугги — обмен позициями хлопком. Один из сильнейших студентов, непредсказуемый боец." },
              ].map(c => (
                <div key={c.name} style={{
                  display: "flex", gap: 10, marginBottom: 10,
                  background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "8px 12px",
                  border: `1px solid ${c.color}22`,
                }}>
                  <span style={{ fontSize: 22, color: c.color, flexShrink: 0, lineHeight: 1 }}>{c.kanji}</span>
                  <div>
                    <div style={{ color: c.color, fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5 }}>{c.desc}</div>
                  </div>
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

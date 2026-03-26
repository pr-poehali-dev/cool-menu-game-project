import { useState } from "react";
import { ENERGIES } from "./gameState";

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

const InfoModal = ({ onClose }: Props) => {
  const [tab, setTab] = useState<Tab>("controls");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(3,2,13,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Georgia', serif",
    }}>
      <div style={{
        width: "min(820px, 96vw)",
        background: "rgba(10,8,24,0.98)",
        border: "1px solid rgba(124,58,237,0.35)",
        borderRadius: 12,
        boxShadow: "0 0 60px rgba(109,40,217,0.2)",
        overflow: "hidden",
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
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

        {/* Tabs */}
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

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {tab === "controls" && (
            <div>
              <Section title="Движение">
                <Row label="W / ↑" value="Вверх по экрану" />
                <Row label="S / ↓" value="Вниз по экрану" />
                <Row label="A / ←" value="Влево по экрану" />
                <Row label="D / →" value="Вправо по экрану" />
                <Row label="Диагонали" value="Комбинируй клавиши — движение по экрану, не по сетке" />
              </Section>
              <Section title="Боевая система">
                <Row label="Z или X" value="Удар проклятой энергией в направлении движения" />
                <Row label="E" value="Техника CE (требует 30 CE, разблокируется на уровне 3)" />
                <Row label="Charged: удержи Z/X" value="Накопи заряд (1.5 сек) → отпусти для тройного удара" />
              </Section>
              <Section title="Система прогресса">
                <Row label="XP" value="Получай за убийство духов (+30 обычный, +80 особый класс)" />
                <Row label="Уровень" value="Прокачивает HP, CE, открывает новые техники" />
                <Row label="CE — проклятая энергия" value="Расходуется на технику, восстанавливается автоматически" />
              </Section>
              <Section title="Статусы врагов">
                <Row label="❄ Заморожен" value="Не двигается 2 сек, получает +50% урона" />
                <Row label="◉ Прилипание" value="Движение снижено на 80%, накоплено 4+ стаков вязкости" />
              </Section>
            </div>
          )}

          {tab === "energies" && (
            <div>
              <p style={{ color: "#4c3a7a", fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
                Врождённая энергия определяется при рождении и не меняется. Она влияет на стиль боя,
                пассивные эффекты и эффективность техник. Выбирай с умом.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {ENERGIES.map(e => (
                  <div key={e.id} style={{
                    background: "rgba(0,0,0,0.4)",
                    border: `1px solid ${e.color}33`,
                    borderRadius: 8, padding: "12px 16px",
                    display: "grid", gridTemplateColumns: "48px 1fr",
                    gap: "0 14px", alignItems: "start",
                  }}>
                    <div style={{ fontSize: 32, color: e.color, textShadow: `0 0 12px ${e.glowColor}`, textAlign: "center", paddingTop: 4 }}>
                      {e.kanji}
                    </div>
                    <div>
                      <div style={{ color: e.color, fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                        {e.nameRu} <span style={{ color: "#4c3a7a", fontSize: 11 }}>({e.name})</span>
                      </div>
                      <div style={{ color: "#60a5fa", fontSize: 10, marginBottom: 3 }}>вдохновение: {e.inspiration}</div>
                      <div style={{ color: "#8b7aa8", fontSize: 11, lineHeight: 1.5, marginBottom: 6 }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 2 }}>✦ {e.passive}</div>
                      <div style={{ fontSize: 11, color: "#f87171" }}>⚠ {e.limitation}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                        {(["damage","speed","defense","energyRegen","attackSpeed"] as const).map(s => {
                          const v=e.statMods[s];
                          const labels: Record<string,string>={damage:"Урон",speed:"Скорость",defense:"Защита",energyRegen:"Реген CE",attackSpeed:"Скор. атаки"};
                          const c=v>=1.2?"#4ade80":v<=0.85?"#f87171":"#94a3b8";
                          return (
                            <span key={s} style={{ fontSize:9, padding:"1px 6px", borderRadius:3,
                              background:v>=1.2?"rgba(34,197,94,0.12)":v<=0.85?"rgba(239,68,68,0.12)":"rgba(100,116,139,0.12)",
                              color:c, letterSpacing:"0.04em" }}>
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

          {tab === "techniques" && (
            <div>
              <p style={{ color: "#4c3a7a", fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
                Техники открываются по мере роста уровня. Они усиливаются и трансформируются
                в зависимости от твоей врождённой энергии.
              </p>
              <Section title="Разблокированные по умолчанию">
                <TechRow
                  key_="Z / X" name="Базовый удар" level={1}
                  desc="Удар с усилением CE. Урон и радиус зависят от твоей энергии."
                  cost="0 CE"
                />
              </Section>
              <Section title="Уровень 3">
                <TechRow
                  key_="E" name="Взрыв CE" level={3}
                  desc="Выброс проклятой энергии вокруг тебя в радиусе 110px. Отталкивает всех врагов."
                  cost="30 CE / КД 1.5 сек"
                />
              </Section>
              <Section title="Уровень 5 (скоро)">
                <TechRow
                  key_="—" name="Рывок CE" level={5}
                  desc="Мгновенный рывок в направлении движения с нанесением урона на пути."
                  cost="20 CE / КД 1 сек"
                />
              </Section>
              <Section title="Уровень 7 (скоро)">
                <TechRow
                  key_="—" name="Усиление тела" level={7}
                  desc="Обволакиваешь тело CE — следующие 5 сек получаешь половину урона."
                  cost="40 CE / КД 2 сек"
                />
              </Section>
              <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(109,40,217,0.08)", borderRadius: 8, border: "1px solid rgba(109,40,217,0.2)" }}>
                <div style={{ color: "#7c3aed", fontSize: 11, letterSpacing: "0.1em", marginBottom: 6 }}>ОСОБЫЕ ЭФФЕКТЫ ПО ЭНЕРГИИ</div>
                <div style={{ color: "#6d5a8a", fontSize: 11, lineHeight: 1.7 }}>
                  <b style={{color:"#a78bfa"}}>Искривлённая</b>: Взрыв CE → телепорт за спину ближайшему врагу + мгновенный удар<br/>
                  <b style={{color:"#a78bfa"}}>Взрывная</b>: 25% шанс цепного взрыва при каждом ударе<br/>
                  <b style={{color:"#a78bfa"}}>Холодная</b>: 5 стаков удара → заморозка врага на 2 сек<br/>
                  <b style={{color:"#a78bfa"}}>Вязкая</b>: 4 стака → обездвиживание<br/>
                  <b style={{color:"#a78bfa"}}>Заряженная</b>: удержи Z/X 1.5 сек → тройной удар<br/>
                  <b style={{color:"#a78bfa"}}>Пустотная</b>: каждый удар восстанавливает HP и CE<br/>
                  <b style={{color:"#a78bfa"}}>Резонирующая</b>: каждый полученный удар +15% к урону
                </div>
              </div>
            </div>
          )}

          {tab === "lore" && (
            <div style={{ color: "#8b7aa8", fontSize: 13, lineHeight: 1.8 }}>
              <div style={{ color: "#c4b5fd", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>О мире</div>
              <p>
                Мир пронизан <span style={{color:"#a78bfa"}}>проклятой энергией</span> — невидимой силой,
                рождённой из негативных эмоций людей. Большинство не осознаёт её существования.
                Но некоторые рождаются с особой восприимчивостью — они становятся <span style={{color:"#a78bfa"}}>магами</span>.
              </p>
              <p style={{marginTop:12}}>
                Каждый маг несёт в себе <span style={{color:"#fbbf24"}}>врождённую энергию</span> — уникальную
                природу своей CE. Она не выбирается и не меняется. Острая или Холодная, Взрывная или Пустотная —
                это сама суть человека, выраженная в проклятии.
              </p>
              <p style={{marginTop:12}}>
                <span style={{color:"#ef4444"}}>Духи-проклятия</span> рождаются из накопленного страха и ненависти.
                Чем сильнее коллективный страх — тем мощнее дух. Особые духи-проклятия способны уничтожить
                целые кварталы. Только маги с развитой CE могут противостоять им.
              </p>
              <p style={{marginTop:12}}>
                Ты — новобранец <span style={{color:"#7c3aed"}}>Высшей Школы Магии</span>. Твоя энергия только
                пробуждается. Впереди — тренировки, битвы и путь к овладению своей техникой.
                Никто не рождается мастером. Даже Годзё начинал с нуля.
              </p>
              <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)", color: "#fca5a5", fontSize: 11, lineHeight: 1.6 }}>
                呪術廻戦 — Cursed Legacy — фанатская игра, вдохновлённая манго Гэгэ Акутами.
                Все концепции энергий и механик придуманы авторами как оригинальное расширение вселенной.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ color: "#7c3aed", fontSize: 10, letterSpacing: "0.15em", marginBottom: 10, borderBottom: "1px solid rgba(109,40,217,0.15)", paddingBottom: 5 }}>
      {title.toUpperCase()}
    </div>
    {children}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: "flex", gap: 12, marginBottom: 7, alignItems: "baseline" }}>
    <span style={{ color: "#c4b5fd", fontSize: 12, fontFamily: "monospace", minWidth: 120, flexShrink: 0 }}>{label}</span>
    <span style={{ color: "#6d5a8a", fontSize: 12, lineHeight: 1.5 }}>{value}</span>
  </div>
);

const TechRow = ({ key_, name, level, desc, cost }: { key_: string; name: string; level: number; desc: string; cost: string }) => (
  <div style={{ display: "flex", gap: 14, marginBottom: 14, background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "10px 14px" }}>
    <div style={{ textAlign: "center", minWidth: 40 }}>
      <div style={{ color: "#7c3aed", fontSize: 13, fontFamily: "monospace", fontWeight: 700 }}>{key_}</div>
      <div style={{ color: "#3d2d60", fontSize: 9, marginTop: 3 }}>УР.{level}</div>
    </div>
    <div>
      <div style={{ color: "#c4b5fd", fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{name}</div>
      <div style={{ color: "#6d5a8a", fontSize: 11, lineHeight: 1.5, marginBottom: 4 }}>{desc}</div>
      <div style={{ color: "#4c3a7a", fontSize: 10, fontFamily: "monospace" }}>{cost}</div>
    </div>
  </div>
);

export default InfoModal;
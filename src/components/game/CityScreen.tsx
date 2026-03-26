import { useEffect, useRef, useState } from "react";
import { EnergyType, getEnergyDef, CharacterProgress } from "./gameState";

interface Props {
  energy: EnergyType;
  progress: CharacterProgress;
  onGoToBattle: (prog: CharacterProgress) => void;
  onGoToTraining: (prog: CharacterProgress) => void;
}

const W = 900, H = 520;
const PERSP = 0.72;

function toScreen(wx: number, wy: number, camX: number, camY: number) {
  return {
    sx: (wx - camX) + W / 2,
    sy: (wy - camY) * PERSP + H / 2,
  };
}

// ── НПС (учителя) ──────────────────────────────────────────────────────────

interface NPC {
  id: string;
  x: number; y: number;
  name: string;
  role: string;
  color: string;
  hairColor: string;
  bodyColor: string;
  interactRadius: number;
  dialogue: string[][];  // массив квестовых диалогов
  questName: string;
  questDesc: string;
  teachesEnergy?: EnergyType; // энергию какого персонажа обучает
}

const NPCS: NPC[] = [
  {
    id: "gojo",
    x: 380, y: 240,
    name: "Сатору Годзё",
    role: "Учитель высшей школы",
    color: "#60a5fa",
    hairColor: "#ffffff",
    bodyColor: "#1e3a5f",
    interactRadius: 55,
    teachesEnergy: "infinity",
    questName: "Урок бесконечности",
    questDesc: "Годзё предлагает обучить тебя технике Бесконечности — но сначала тебе нужно доказать, что ты справишься с особым духом в учебном зале.",
    dialogue: [
      [
        "О, ещё один новобранец. Что ж, посмотрим, чего ты стоишь.",
        "Я — Сатору Годзё. Сильнейший маг нашего поколения. Да-да, без ложной скромности.",
        "Ты чувствуешь свою CE? Хорошо. Значит, ты не полный ноль.",
        "Я могу научить тебя технике Бесконечности. Но сначала — маленькое испытание."
      ],
      [
        "Квест: «Урок бесконечности»",
        "В учебном зале засел дух уровня 2. Победи его — вернись ко мне.",
        "Только не умри. Это было бы неловко для нас обоих.",
      ],
    ],
  },
  {
    id: "nanami",
    x: 620, y: 310,
    name: "Кэнто Нанами",
    role: "Маг класса 1",
    color: "#fbbf24",
    hairColor: "#d4a574",
    bodyColor: "#374151",
    interactRadius: 50,
    teachesEnergy: "ratio",
    questName: "Принцип 7:3",
    questDesc: "Нанами объяснит тебе своё оружие — технику соотношения. Но сначала нужно зачистить квартал от трёх духов.",
    dialogue: [
      [
        "Ты новенький? Понятно.",
        "Меня зовут Нанами. Маг класса 1. Урочные часы закончились, но раз уж ты здесь...",
        "Я работаю с техникой соотношения — 7:3. Каждую цель делю в уме на десять частей.",
        "Удар в точку разделения наносит увеличенный урон. Звучит просто. На практике — нет."
      ],
      [
        "Квест: «Принцип 7:3»",
        "Три духа в восточном квартале. Уничтожь их — я скажу тебе, как применять соотношение.",
        "Только не тяни. Сверхурочные не оплачиваются.",
      ],
    ],
  },
  {
    id: "nobara",
    x: 200, y: 380,
    name: "Нобара Кугисаки",
    role: "Студент первого курса",
    color: "#f59e0b",
    hairColor: "#8b4513",
    bodyColor: "#1f2937",
    interactRadius: 50,
    teachesEnergy: "straw",
    questName: "Резонанс крови",
    questDesc: "Нобара учит технике Соломенной куклы. Нужно собрать три стека боевых резонансов — ударь врага, потом прими урон сам.",
    dialogue: [
      [
        "Эй! Ты тоже студент? Здорово.",
        "Я Нобара Кугисаки. Первый курс. И да, я лучше большинства второкурсников.",
        "Моя техника — Соломенная кукла. Забиваешь гвоздь в куклу — и враг чувствует удар.",
        "Есть ещё Шпилька — взрыв кровного резонанса. Зрелище что надо!"
      ],
      [
        "Квест: «Резонанс крови»",
        "Нанеси удар по врагу, прими один удар сам — и активируй резонанс три раза.",
        "Кровный резонанс — это красиво. Поверь мне.",
      ],
    ],
  },
  {
    id: "megumi",
    x: 480, y: 430,
    name: "Мегуми Фусигуро",
    role: "Студент первого курса",
    color: "#6366f1",
    hairColor: "#1a1a1a",
    bodyColor: "#111827",
    interactRadius: 50,
    teachesEnergy: "shadow",
    questName: "Десять теней",
    questDesc: "Мегуми расскажет о технике Десяти теней и покажет, как использовать тень врага против него самого.",
    dialogue: [
      [
        "Ты ищешь учителя? Почему именно я?",
        "Я — Мегуми Фусигуро. Техника Десяти теней. Могу призывать духов из теней.",
        "Главный — Пёс-тень. Но техника сложнее, чем кажется.",
        "Если хочешь обучиться... я подумаю."
      ],
      [
        "Квест: «Десять теней»",
        "Убей пятерых духов, оставив теневые следы на месте смерти каждого.",
        "Тени не прощают суеты. Действуй точно.",
      ],
    ],
  },
  {
    id: "todo",
    x: 700, y: 180,
    name: "Аой Тодо",
    role: "Студент третьего курса, Киотская школа",
    color: "#10b981",
    hairColor: "#4a4a4a",
    bodyColor: "#14532d",
    interactRadius: 55,
    teachesEnergy: "ratio",
    questName: "Бугги-Вугги",
    questDesc: "Тодо обучит тебя технике обмена позициями. Но сначала — кто твоя любимая женщина-знаменитость?",
    dialogue: [
      [
        "Стоп. Прежде чем я что-то скажу — кто твоя любимая женщина-знаменитость?",
        "...",
        "Хм. Достойный ответ. Мы могли бы стать лучшими друзьями.",
        "Меня зовут Аой Тодо. Моя техника — Бугги-Вугги. Хлопок — и я меняю местами любые два объекта."
      ],
      [
        "Квест: «Бугги-Вугги»",
        "Используй обмен позицией пять раз в бою — запутай врагов, телепортируясь между ними.",
        "Враги не успеют понять, что происходит. Это красиво.",
      ],
    ],
  },
];

// Строения города
interface Building {
  x: number; y: number; w: number; h: number;
  wallH: number;
  colorRoof: string; colorFront: string; colorSide: string;
  windows: boolean;
  type: "shop" | "house" | "school" | "dojo";
}

const BUILDINGS: Building[] = [
  { x:50, y:50, w:120, h:70, wallH:90, colorRoof:"#e8d5b7", colorFront:"#f5e6d0", colorSide:"#d4b896", windows:true, type:"school" },
  { x:220, y:60, w:80, h:50, wallH:70, colorRoof:"#c8e6c9", colorFront:"#e8f5e9", colorSide:"#a5d6a7", windows:true, type:"house" },
  { x:550, y:50, w:150, h:80, wallH:110, colorRoof:"#e3d5f0", colorFront:"#f3e8ff", colorSide:"#c8a8e0", windows:true, type:"dojo" },
  { x:750, y:70, w:90, h:55, wallH:75, colorRoof:"#fde68a", colorFront:"#fef9c3", colorSide:"#fcd34d", windows:true, type:"shop" },
  { x:60, y:380, w:100, h:60, wallH:80, colorRoof:"#fed7aa", colorFront:"#ffedd5", colorSide:"#fdba74", windows:false, type:"shop" },
  { x:780, y:350, w:80, h:60, wallH:75, colorRoof:"#c7d2fe", colorFront:"#e0e7ff", colorSide:"#a5b4fc", windows:true, type:"house" },
  { x:300, y:460, w:120, h:50, wallH:65, colorRoof:"#bbf7d0", colorFront:"#dcfce7", colorSide:"#86efac", windows:false, type:"house" },
  { x:500, y:470, w:90, h:55, wallH:70, colorRoof:"#fecaca", colorFront:"#fee2e2", colorSide:"#fca5a5", windows:true, type:"shop" },
];

// Дорожки/тротуары
const PATHS = [
  { x:160, y:160, w:540, h:20 },  // горизонтальная
  { x:380, y:160, w:20, h:260 },  // вертикальная
];

// ── Рисовалки ──────────────────────────────────────────────────────────────

const drawCityFloor = (ctx: CanvasRenderingContext2D, camX: number, camY: number, tick: number) => {
  // Небо / фон — светло-серо-голубой
  ctx.fillStyle = "#e8edf2";
  ctx.fillRect(0, 0, W, H);

  const ts = 64;
  const wx0 = Math.floor((camX - W/2) / ts) * ts;
  const wy0 = Math.floor((camY - H/(2*PERSP)) / ts) * ts;
  for (let wx = wx0; wx < camX + W/2 + ts; wx += ts) {
    for (let wy = wy0; wy < camY + H/(2*PERSP) + ts; wy += ts) {
      const tl = toScreen(wx, wy, camX, camY);
      const br = toScreen(wx+ts, wy+ts, camX, camY);
      if (br.sx < -2 || tl.sx > W+2 || br.sy < -2 || tl.sy > H+2) continue;
      // Тротуары
      let ispath = false;
      for (const p of PATHS) {
        if (wx >= p.x && wx+ts <= p.x+p.w && wy >= p.y && wy+ts <= p.y+p.h) { ispath=true; break; }
      }
      if (ispath) {
        ctx.fillStyle = "#d1d5db";
      } else {
        const xi = Math.floor(wx/ts), yi = Math.floor(wy/ts);
        ctx.fillStyle = (xi+yi)%2===0 ? "#dde3e8" : "#e8edf2";
      }
      ctx.fillRect(tl.sx, tl.sy, Math.max(1,br.sx-tl.sx), Math.max(1,br.sy-tl.sy));
      ctx.strokeStyle = "rgba(150,160,170,0.15)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(tl.sx, tl.sy, br.sx-tl.sx, br.sy-tl.sy);
    }
  }

  // Декоративные деревья/фонари
  const decos = [{x:170,y:170},{x:370,y:165},{x:575,y:165},{x:760,y:200},{x:165,y:420},{x:790,y:420}];
  decos.forEach(({x,y}) => {
    const { sx, sy } = toScreen(x, y, camX, camY);
    if (sx<-20||sx>W+20) return;
    // Ствол
    ctx.fillStyle = "#8B5E3C";
    ctx.fillRect(sx-3, sy-25, 6, 25);
    // Крона
    ctx.beginPath(); ctx.arc(sx, sy-30, 18, 0, Math.PI*2);
    ctx.fillStyle = `rgba(34,197,94,${0.7+0.15*Math.sin(tick*0.03+x*0.01)})`; ctx.fill();
    ctx.beginPath(); ctx.arc(sx-8, sy-35, 12, 0, Math.PI*2);
    ctx.fillStyle = `rgba(22,163,74,${0.6+0.1*Math.sin(tick*0.03+y*0.01)})`; ctx.fill();
    ctx.beginPath(); ctx.arc(sx+6, sy-34, 10, 0, Math.PI*2);
    ctx.fillStyle = "rgba(16,185,129,0.6)"; ctx.fill();
  });
};

const drawBuilding = (ctx: CanvasRenderingContext2D, b: Building, camX: number, camY: number) => {
  const tl = toScreen(b.x, b.y, camX, camY);
  const tr = toScreen(b.x+b.w, b.y, camX, camY);
  const br = toScreen(b.x+b.w, b.y+b.h, camX, camY);
  const bl = toScreen(b.x, b.y+b.h, camX, camY);
  if (tr.sx < -20 || bl.sx > W+20 || tl.sy > H+b.wallH || br.sy < -b.wallH) return;
  const wH = b.wallH;

  // Передняя стена
  ctx.beginPath();
  ctx.moveTo(bl.sx,bl.sy); ctx.lineTo(br.sx,br.sy);
  ctx.lineTo(br.sx,br.sy-wH); ctx.lineTo(bl.sx,bl.sy-wH); ctx.closePath();
  ctx.fillStyle = b.colorFront; ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth=1; ctx.stroke();

  // Боковая стена
  ctx.beginPath();
  ctx.moveTo(br.sx,br.sy); ctx.lineTo(tr.sx,tr.sy);
  ctx.lineTo(tr.sx,tr.sy-wH); ctx.lineTo(br.sx,br.sy-wH); ctx.closePath();
  ctx.fillStyle = b.colorSide; ctx.fill(); ctx.stroke();

  // Крыша
  ctx.beginPath();
  ctx.moveTo(tl.sx,tl.sy-wH); ctx.lineTo(tr.sx,tr.sy-wH);
  ctx.lineTo(br.sx,br.sy-wH); ctx.lineTo(bl.sx,bl.sy-wH); ctx.closePath();
  ctx.fillStyle = b.colorRoof; ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.stroke();

  // Окна
  if (b.windows) {
    const rows = Math.max(1,Math.floor(wH/32));
    const cols = Math.max(1,Math.floor((br.sx-bl.sx)/30));
    for (let row=0;row<rows;row++) {
      for (let col=0;col<cols;col++) {
        const wx2 = bl.sx + (br.sx-bl.sx)*(col+0.5)/cols - 5;
        const wy2 = bl.sy - wH*(0.8 - row*0.3);
        ctx.fillStyle = "rgba(219,234,254,0.8)";
        ctx.fillRect(wx2, wy2, 10, 12);
        ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth=0.5; ctx.strokeRect(wx2, wy2, 10, 12);
      }
    }
  }

  // Вывеска для магазинов
  if (b.type==="shop") {
    const cx = (bl.sx+br.sx)/2;
    const cy = bl.sy - wH*0.35;
    ctx.fillStyle = "rgba(254,243,199,0.9)"; ctx.fillRect(cx-22,cy-8,44,16);
    ctx.strokeStyle="rgba(180,120,0,0.5)"; ctx.lineWidth=1; ctx.strokeRect(cx-22,cy-8,44,16);
    ctx.fillStyle="#92400e"; ctx.font="bold 9px monospace"; ctx.textAlign="center";
    ctx.fillText("ЛАВКА",cx,cy+4); ctx.textAlign="left";
  }
  if (b.type==="school") {
    const cx = (bl.sx+br.sx)/2;
    const cy = bl.sy - wH*0.35;
    ctx.fillStyle="rgba(219,234,254,0.9)"; ctx.fillRect(cx-38,cy-8,76,16);
    ctx.strokeStyle="rgba(37,99,235,0.3)"; ctx.lineWidth=1; ctx.strokeRect(cx-38,cy-8,76,16);
    ctx.fillStyle="#1d4ed8"; ctx.font="bold 9px monospace"; ctx.textAlign="center";
    ctx.fillText("ВЫСШАЯ ШКОЛА МАГИИ",cx,cy+4); ctx.textAlign="left";
  }
  if (b.type==="dojo") {
    const cx = (bl.sx+br.sx)/2;
    const cy = bl.sy - wH*0.35;
    ctx.fillStyle="rgba(243,232,255,0.9)"; ctx.fillRect(cx-22,cy-8,44,16);
    ctx.strokeStyle="rgba(109,40,217,0.3)"; ctx.lineWidth=1; ctx.strokeRect(cx-22,cy-8,44,16);
    ctx.fillStyle="#6d28d9"; ctx.font="bold 9px monospace"; ctx.textAlign="center";
    ctx.fillText("ДОДЗЁ",cx,cy+4); ctx.textAlign="left";
  }
};

const drawNPC = (
  ctx: CanvasRenderingContext2D, npc: NPC, camX: number, camY: number,
  tick: number, isNear: boolean
) => {
  const { sx, sy } = toScreen(npc.x, npc.y, camX, camY);
  if (sx < -50 || sx > W+50 || sy < -100 || sy > H+50) return;

  // Индикатор взаимодействия
  if (isNear) {
    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.12);
    ctx.beginPath(); ctx.arc(sx, sy-70, 12+pulse*4, 0, Math.PI*2);
    ctx.fillStyle = `${npc.color}${Math.floor(pulse*80+40).toString(16).padStart(2,"0")}`;
    ctx.fill();
    ctx.fillStyle = npc.color; ctx.font = "bold 14px sans-serif"; ctx.textAlign="center";
    ctx.fillText("!", sx, sy-64);
    ctx.textAlign="left";

    // Подсказка
    ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(sx-40,sy-105,80,18);
    ctx.fillStyle = "#f1f5f9"; ctx.font = "10px monospace"; ctx.textAlign="center";
    ctx.fillText("[E] — говорить",sx,sy-93); ctx.textAlign="left";
  }

  // Тень
  ctx.beginPath(); ctx.ellipse(sx, sy+2, 14, 5, 0, 0, Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();

  const sway = Math.sin(tick*0.04 + npc.x*0.01)*2;
  ctx.save(); ctx.translate(sx, sy);

  // Ноги
  [[-5,sway*0.04],[5,-sway*0.04]].forEach(([lx,rot])=>{
    ctx.fillStyle = "#374151"; ctx.save();
    ctx.translate(lx,0); ctx.rotate(rot);
    ctx.fillRect(-3,0,6,18);
    ctx.fillStyle = "#1f2937"; ctx.fillRect(-4,15,9,5);
    ctx.restore();
  });

  // Тело
  ctx.fillStyle = npc.bodyColor;
  ctx.fillRect(-9,-24,18,22);
  ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth=1; ctx.strokeRect(-9,-24,18,22);

  // Руки
  [[-11,0],[11,0]].forEach(([ax])=>{
    ctx.fillStyle = npc.bodyColor; ctx.save();
    ctx.translate(ax,-21);
    ctx.rotate(sway*0.02*(ax>0?-1:1));
    ctx.fillRect(-3,0,6,15);
    ctx.fillStyle="#d4a574"; ctx.beginPath(); ctx.arc(0,17,4,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });

  // Шея
  ctx.fillStyle="#c9a87c"; ctx.fillRect(-3,-29,6,7);

  // Голова
  ctx.fillStyle="#e8c9a0";
  ctx.beginPath(); ctx.ellipse(0,-36,7,8,0,0,Math.PI*2); ctx.fill();

  // Волосы
  ctx.fillStyle = npc.hairColor;
  ctx.beginPath(); ctx.ellipse(0,-40,7,5,0,0,Math.PI*2); ctx.fill();

  // Глаза
  ctx.fillStyle="#1a1a2e";
  ctx.fillRect(-4,-35,4,2); ctx.fillRect(2,-35,4,2);

  // Имя
  ctx.fillStyle="rgba(0,0,0,0.55)"; ctx.fillRect(-32,-54,64,14);
  ctx.fillStyle=npc.color; ctx.font="bold 9px sans-serif"; ctx.textAlign="center";
  ctx.fillText(npc.name,0,-43); ctx.textAlign="left";

  ctx.restore();
};

const drawPlayer = (ctx: CanvasRenderingContext2D, px: number, py: number, camX: number, camY: number, tick: number, facing: {x:number;y:number}, isMoving: boolean, walkCycle: number, energyColor: string) => {
  const { sx, sy } = toScreen(px, py, camX, camY);
  const legSwing = isMoving ? Math.sin(walkCycle)*7 : 0;
  const armSwing = isMoving ? Math.sin(walkCycle+Math.PI)*5 : 0;
  const flip = facing.x >= 0 ? 1 : -1;

  ctx.save(); ctx.translate(sx, sy);

  // Тень
  ctx.beginPath(); ctx.ellipse(0,2,10,4,0,0,Math.PI*2);
  ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.fill();

  // CE ауара
  ctx.beginPath(); ctx.arc(0,-16,18+Math.sin(tick*0.08)*2,0,Math.PI*2);
  ctx.strokeStyle=`${energyColor}44`; ctx.lineWidth=1.5; ctx.stroke();

  // Ноги
  [[-flip*5,-legSwing*0.04],[flip*5,legSwing*0.04]].forEach(([lx,rot])=>{
    ctx.fillStyle="#111827"; ctx.save();
    ctx.translate(lx as number,0); ctx.rotate(rot as number);
    ctx.fillRect(-3.5,0,7,18);
    ctx.fillStyle="#1f2937"; ctx.fillRect(-4.5,15,10,5);
    ctx.restore();
  });

  // Тело
  ctx.fillStyle="#0f172a"; ctx.fillRect(-9,-24,18,22);
  ctx.strokeStyle="#1e3a5f"; ctx.lineWidth=1; ctx.strokeRect(-9,-24,18,22);
  ctx.fillStyle="#2d3f5a";
  for (let i=0;i<4;i++) ctx.fillRect(-1,-22+i*5,2,2);

  // Руки
  [[-flip*10,armSwing*0.05],[flip*10,-armSwing*0.05]].forEach(([ax,rot])=>{
    ctx.fillStyle="#0f172a"; ctx.save();
    ctx.translate(ax as number,-21);
    ctx.rotate(rot as number);
    ctx.fillRect(-3,0,6,16);
    ctx.fillStyle="#d4a574";
    ctx.beginPath(); ctx.arc(0,18,4,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });

  // Шея
  ctx.fillStyle="#c9a87c"; ctx.fillRect(-3,-29,6,7);

  // Голова
  ctx.fillStyle="#e8c9a0";
  ctx.beginPath(); ctx.ellipse(0,-36,7,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#1a1a1a";
  ctx.beginPath(); ctx.ellipse(0,-40,7,5,0,0,Math.PI*2); ctx.fill();
  [[-6,-38,-9,-46],[0,-41,0,-48],[6,-38,9,-46]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath(); ctx.moveTo(x1-3,y1); ctx.lineTo(x2,y2); ctx.lineTo(x1+3,y1); ctx.closePath(); ctx.fill();
  });
  ctx.fillStyle="#1a1a2e";
  ctx.fillRect(flip-4,-35,5,3); ctx.fillRect(flip+3,-35,5,3);

  ctx.restore();
};

// ── Диалоговое окно ─────────────────────────────────────────────────────────

interface DialogState {
  npc: NPC;
  lineIdx: number;
  dialogIdx: number;
}

// ── Компонент ────────────────────────────────────────────────────────────────

const CityScreen = ({ energy, progress, onGoToBattle, onGoToTraining }: Props) => {
  const energyDef = getEnergyDef(energy);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    px: 390, py: 340,
    vx: 0, vy: 0,
    walkCycle: 0,
    facing: { x: 1, y: 0 },
    camX: 390, camY: 340,
    keys: new Set<string>(),
    tick: 0,
    nearNpc: null as NPC | null,
  });
  const animRef = useRef<number>(0);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const dialogRef = useRef<DialogState | null>(null);

  const SPEED = energyDef.statMods.speed * 2.4;

  const openDialog = (npc: NPC) => {
    const d: DialogState = { npc, lineIdx: 0, dialogIdx: 0 };
    setDialog(d);
    dialogRef.current = d;
  };

  const advanceDialog = () => {
    setDialog(prev => {
      if (!prev) return null;
      const lines = prev.npc.dialogue[prev.dialogIdx];
      if (prev.lineIdx < lines.length - 1) {
        const next = { ...prev, lineIdx: prev.lineIdx + 1 };
        dialogRef.current = next;
        return next;
      }
      // последняя реплика — следующий блок или закрыть
      if (prev.dialogIdx < prev.npc.dialogue.length - 1) {
        const next = { ...prev, dialogIdx: prev.dialogIdx + 1, lineIdx: 0 };
        dialogRef.current = next;
        return next;
      }
      dialogRef.current = null;
      return null;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const s = stateRef.current;
      if (down) {
        s.keys.add(e.code);
        // Взаимодействие
        if (e.code === "KeyE" && !dialogRef.current) {
          if (s.nearNpc) openDialog(s.nearNpc);
        }
        if (e.code === "KeyE" && dialogRef.current) {
          advanceDialog();
        }
        if ((e.code === "Space" || e.code === "Enter") && dialogRef.current) {
          advanceDialog();
        }
        // Выход в бой
        if (e.code === "KeyF") {
          onGoToBattle({ ...progress });
        }
      } else {
        s.keys.delete(e.code);
      }
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))
        e.preventDefault();
    };
    const kd=(e:KeyboardEvent)=>onKey(e,true);
    const ku=(e:KeyboardEvent)=>onKey(e,false);
    window.addEventListener("keydown",kd);
    window.addEventListener("keyup",ku);

    const loop = () => {
      const s = stateRef.current;
      s.tick++;

      if (!dialogRef.current) {
        let mvx=0,mvy=0;
        if (s.keys.has("ArrowLeft")||s.keys.has("KeyA")) mvx-=1;
        if (s.keys.has("ArrowRight")||s.keys.has("KeyD")) mvx+=1;
        if (s.keys.has("ArrowUp")||s.keys.has("KeyW")) mvy-=1;
        if (s.keys.has("ArrowDown")||s.keys.has("KeyS")) mvy+=1;

        if (mvx!==0||mvy!==0) {
          const len=Math.sqrt(mvx*mvx+mvy*mvy);
          s.vx=(mvx/len)*SPEED; s.vy=(mvy/len)*SPEED;
          s.facing={x:mvx/len,y:mvy/len};
          s.walkCycle+=0.18;
        } else {
          s.vx*=0.45; s.vy*=0.45;
        }

        s.px=Math.max(30,Math.min(870,s.px+s.vx));
        s.py=Math.max(30,Math.min(520,s.py+s.vy));
      }

      // Ближайший НПС
      let nearest: NPC|null = null;
      let nearDist = 999;
      NPCS.forEach(npc => {
        const dx=s.px-npc.x, dy=s.py-npc.y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if (d<npc.interactRadius&&d<nearDist) { nearest=npc; nearDist=d; }
      });
      s.nearNpc = nearest;

      s.camX += (s.px-s.camX)*0.1;
      s.camY += (s.py-s.camY)*0.1;
      s.camX = Math.max(200,Math.min(700,s.camX));
      s.camY = Math.max(200,Math.min(400,s.camY));

      // ── Рендер ──
      drawCityFloor(ctx,s.camX,s.camY,s.tick);

      // Объекты с depth sort
      const dl: {y:number;draw:()=>void}[] = [];
      BUILDINGS.forEach(b => dl.push({y:b.y+b.h,draw:()=>drawBuilding(ctx,b,s.camX,s.camY)}));
      NPCS.forEach(npc => dl.push({y:npc.y,draw:()=>drawNPC(ctx,npc,s.camX,s.camY,s.tick,s.nearNpc?.id===npc.id)}));
      dl.push({y:s.py,draw:()=>drawPlayer(ctx,s.px,s.py,s.camX,s.camY,s.tick,s.facing,Math.abs(s.vx)>0.1||Math.abs(s.vy)>0.1,s.walkCycle,energyDef.color)});
      dl.sort((a,b)=>a.y-b.y);
      dl.forEach(d=>d.draw());

      // HUD
      ctx.fillStyle="rgba(255,255,255,0.85)";
      ctx.fillRect(12,12,200,52);
      ctx.strokeStyle="rgba(0,0,0,0.12)"; ctx.lineWidth=1; ctx.strokeRect(12,12,200,52);
      ctx.fillStyle=energyDef.color; ctx.font="bold 12px monospace";
      ctx.fillText(`${energyDef.kanji}  ${energyDef.nameRu}`,20,30);
      ctx.fillStyle="#374151"; ctx.font="10px monospace";
      ctx.fillText(`Ур.${progress.level}  XP: ${progress.xp}/${progress.xpToNext}`,20,46);
      ctx.fillStyle="#6b7280"; ctx.font="9px monospace";
      ctx.fillText(`[${energyDef.inspiration}]`,20,58);

      // Подсказки управления
      ctx.fillStyle="rgba(255,255,255,0.8)";
      ctx.fillRect(W/2-160,H-28,320,18);
      ctx.strokeStyle="rgba(0,0,0,0.1)"; ctx.lineWidth=1; ctx.strokeRect(W/2-160,H-28,320,18);
      ctx.fillStyle="#6b7280"; ctx.font="9px monospace"; ctx.textAlign="center";
      ctx.fillText("WASD — движение    E — говорить с НПС    F — выйти на поле боя",W/2,H-15);
      ctx.textAlign="left";

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return ()=>{
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown",kd);
      window.removeEventListener("keyup",ku);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, background:"#e8edf2" }}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ display:"block", width:"100%", height:"100%" }} />

      {/* Диалоговое окно */}
      {dialog && (
        <div style={{
          position:"absolute", bottom:40, left:"50%", transform:"translateX(-50%)",
          width:"min(700px,90vw)",
          background:"rgba(255,255,255,0.97)",
          border:`2px solid ${dialog.npc.color}88`,
          borderRadius:10,
          boxShadow:"0 4px 32px rgba(0,0,0,0.18)",
          padding:"18px 24px 14px",
          fontFamily:"'Georgia', serif",
        }}>
          {/* Шапка */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,borderBottom:`1px solid ${dialog.npc.color}33`,paddingBottom:10}}>
            <div style={{
              width:40,height:40,borderRadius:"50%",
              background:`${dialog.npc.color}22`,
              border:`2px solid ${dialog.npc.color}66`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:18, color:dialog.npc.color, flexShrink:0,
            }}>
              {dialog.npc.name[0]}
            </div>
            <div>
              <div style={{color:dialog.npc.color,fontWeight:700,fontSize:14}}>{dialog.npc.name}</div>
              <div style={{color:"#9ca3af",fontSize:11}}>{dialog.npc.role}</div>
            </div>
            {dialog.npc.teachesEnergy && (
              <div style={{marginLeft:"auto",fontSize:10,color:"#9ca3af",textAlign:"right"}}>
                <div>обучает технике</div>
                <div style={{color:dialog.npc.color,fontWeight:700}}>{getEnergyDef(dialog.npc.teachesEnergy).nameRu}</div>
              </div>
            )}
          </div>

          {/* Текст */}
          <div style={{color:"#1f2937",fontSize:15,lineHeight:1.7,minHeight:50}}>
            {dialog.npc.dialogue[dialog.dialogIdx][dialog.lineIdx]}
          </div>

          {/* Квест-блок */}
          {dialog.dialogIdx === 1 && dialog.lineIdx === 0 && (
            <div style={{
              marginTop:12, padding:"10px 14px",
              background:`${dialog.npc.color}10`,
              border:`1px solid ${dialog.npc.color}44`,
              borderRadius:6,
            }}>
              <div style={{color:dialog.npc.color,fontSize:11,fontWeight:700,letterSpacing:"0.12em",marginBottom:4}}>
                ✦ КВЕСТ: {dialog.npc.questName}
              </div>
              <div style={{color:"#4b5563",fontSize:12,lineHeight:1.5}}>
                {dialog.npc.questDesc}
              </div>
            </div>
          )}

          {/* Прогресс и кнопка */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12}}>
            <div style={{display:"flex",gap:4}}>
              {dialog.npc.dialogue.map((block,bi)=>
                block.map((_,li)=>(
                  <div key={`${bi}-${li}`} style={{
                    width:6,height:6,borderRadius:"50%",
                    background:bi<dialog.dialogIdx||(bi===dialog.dialogIdx&&li<=dialog.lineIdx)
                      ? dialog.npc.color : "#e5e7eb",
                  }} />
                ))
              )}
            </div>
            <button onClick={advanceDialog} style={{
              padding:"8px 20px",
              background:dialog.npc.color,
              color:"#fff", border:"none", borderRadius:5,
              fontFamily:"'Georgia',serif", fontSize:13,
              cursor:"pointer", letterSpacing:"0.05em",
            }}>
              {dialog.lineIdx < dialog.npc.dialogue[dialog.dialogIdx].length-1
                ? "Далее →"
                : dialog.dialogIdx < dialog.npc.dialogue.length-1
                ? "Принять квест ✦"
                : "Понятно"}
            </button>
          </div>
        </div>
      )}

      {/* Кнопка F — в бой */}
      <div style={{
        position:"absolute", bottom:10, right:14,
        display:"flex", gap:8,
      }}>
        <button onClick={()=>onGoToTraining({...progress})} style={{
          padding:"8px 16px",
          background:"rgba(255,255,255,0.9)",
          border:"1px solid rgba(0,0,0,0.15)",
          borderRadius:6, color:"#374151",
          fontFamily:"'Georgia',serif", fontSize:12,
          cursor:"pointer",
        }}>
          Тренировочный зал
        </button>
        <button onClick={()=>onGoToBattle({...progress})} style={{
          padding:"8px 20px",
          background:"#1d4ed8",
          color:"#fff", border:"none", borderRadius:6,
          fontFamily:"'Georgia',serif", fontSize:13,
          cursor:"pointer", fontWeight:700,
          boxShadow:"0 2px 12px rgba(29,78,216,0.3)",
        }}>
          В бой [F]
        </button>
      </div>
    </div>
  );
};

export default CityScreen;

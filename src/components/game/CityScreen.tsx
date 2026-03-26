import { useEffect, useRef, useState } from "react";
import { EnergyType, getEnergyDef, CharacterProgress, loadBindings } from "./gameState";

interface Props {
  energy: EnergyType;
  progress: CharacterProgress;
  onGoToBattle: (prog: CharacterProgress) => void;
  onQuestUpdate: (prog: CharacterProgress) => void;
}

// Мировые размеры
const W = 900, H = 520;
const WORLD_W = 1800, WORLD_H = 1400;
const PERSP = 0.68;

function toScreen(wx: number, wy: number, camX: number, camY: number) {
  return { sx: (wx - camX) + W / 2, sy: (wy - camY) * PERSP + H / 2 };
}

// ── Типы тайлов пола ─────────────────────────────────────────────────────────
type TileType = "grass" | "grass2" | "dirt" | "sidewalk" | "road" | "crosswalk" | "gravel";

interface TileDef { color: string; altColor?: string; border?: string; }

const TILE_DEFS: Record<TileType, TileDef> = {
  grass:     { color: "#3a5c2a", altColor: "#3d6130", border: "rgba(30,70,20,0.3)" },
  grass2:    { color: "#2e4d22", altColor: "#325228", border: "rgba(20,60,15,0.3)" },
  dirt:      { color: "#6b4f35", altColor: "#7a5a3e", border: "rgba(80,50,20,0.2)" },
  sidewalk:  { color: "#b0a898", altColor: "#bcb4aa", border: "rgba(150,140,120,0.4)" },
  road:      { color: "#3c3c42", altColor: "#404046", border: "rgba(20,20,30,0.5)" },
  crosswalk: { color: "#3c3c42", altColor: "#e8e0d0", border: "rgba(20,20,30,0.4)" },
  gravel:    { color: "#787070", altColor: "#827a72", border: "rgba(60,55,50,0.3)" },
};

// Генерация тайловой карты
const TILE_SIZE = 40;
const MAP_W = Math.ceil(WORLD_W / TILE_SIZE);
const MAP_H = Math.ceil(WORLD_H / TILE_SIZE);

function buildTileMap(): TileType[][] {
  const map: TileType[][] = Array.from({length: MAP_H}, () => Array(MAP_W).fill("grass") as TileType[]);

  // Главная горизонтальная дорога
  for (let x=0;x<MAP_W;x++) {
    for (let y=12;y<=15;y++) map[y][x] = "road";
    map[11][x] = "sidewalk"; map[16][x] = "sidewalk";
  }

  // Вертикальная дорога в центре
  for (let y=0;y<MAP_H;y++) {
    for (let x=20;x<=23;x++) map[y][x] = "road";
    map[y][19] = "sidewalk"; map[y][24] = "sidewalk";
  }

  // Вторая вертикальная дорога (правее)
  for (let y=0;y<MAP_H;y++) {
    for (let x=34;x<=37;x++) map[y][x] = "road";
    map[y][33] = "sidewalk"; map[y][38] = "sidewalk";
  }

  // Горизонтальная дорога внизу
  for (let x=0;x<MAP_W;x++) {
    for (let y=25;y<=28;y++) map[y][x] = "road";
    map[24][x] = "sidewalk"; map[29][x] = "sidewalk";
  }

  // Переходы (зебра)
  for (let y=12;y<=15;y++) { map[y][20]="crosswalk"; map[y][21]="crosswalk"; map[y][22]="crosswalk"; map[y][23]="crosswalk"; }
  for (let y=12;y<=15;y++) { map[y][34]="crosswalk"; map[y][35]="crosswalk"; map[y][36]="crosswalk"; map[y][37]="crosswalk"; }
  for (let y=25;y<=28;y++) { map[y][20]="crosswalk"; map[y][21]="crosswalk"; }

  // Тротуары вокруг зданий
  const sidewalkZones = [{x1:2,y1:2,x2:18,y2:10},{x1:25,y1:2,x2:32,y2:10},{x1:2,y1:17,x2:18,y2:23},{x1:25,y1:17,x2:32,y2:23},{x1:39,y1:2,x2:44,y2:23}];
  sidewalkZones.forEach(({x1,y1,x2,y2})=>{
    for (let y=y1;y<=y2;y++) for (let x=x1;x<=x2;x++) {
      if (map[y]&&map[y][x]==="grass") map[y][x]="gravel";
    }
  });

  // Парки (трава внутри кварталов)
  const parks = [{x1:4,y1:4,x2:10,y2:9},{x1:26,y1:4,x2:31,y2:9},{x1:4,y1:18,x2:10,y2:22}];
  parks.forEach(({x1,y1,x2,y2})=>{
    for (let y=y1;y<=y2;y++) for (let x=x1;x<=x2;x++) if (map[y]&&map[y][x]) map[y][x]="grass2";
  });

  return map;
}

const TILE_MAP = buildTileMap();

// ── Здания ────────────────────────────────────────────────────────────────────
interface Building {
  x: number; y: number; w: number; h: number;
  wallH: number;
  front: string; side: string; roof: string;
  type: "school" | "shop" | "house" | "dojo" | "cursed";
  label?: string;
  labelColor?: string;
}

const BUILDINGS: Building[] = [
  // Квартал 1 (верх-лево)
  { x:60,  y:60,  w:130,h:80,  wallH:120, front:"#e8e0d4", side:"#ccc4b8", roof:"#a08878", type:"school", label:"ВЫСШАЯ ШКОЛА МАГИИ", labelColor:"#1d4ed8" },
  { x:250, y:70,  w:80, h:60,  wallH:90,  front:"#d4e8d4", side:"#b8cdb8", roof:"#5a7a5a", type:"house" },
  { x:350, y:55,  w:60, h:50,  wallH:75,  front:"#e8d8c8", side:"#ccbca8", roof:"#8a6a5a", type:"shop", label:"ЛАВКА", labelColor:"#92400e" },

  // Квартал 2 (верх-право)
  { x:1020,y:60,  w:120,h:80,  wallH:110, front:"#d8d0f0", side:"#c0b8d8", roof:"#6040a0", type:"dojo", label:"ДОДЗЁ", labelColor:"#6d28d9" },
  { x:1170,y:70,  w:80, h:60,  wallH:90,  front:"#f0e8d8", side:"#d8d0c0", roof:"#c0905a", type:"shop", label:"МАГАЗИН", labelColor:"#92400e" },

  // Квартал 3 (середина-лево)
  { x:60,  y:720, w:100,h:70,  wallH:100, front:"#e8f0e8", side:"#c8d8c8", roof:"#5a8a5a", type:"house" },
  { x:180, y:730, w:80, h:60,  wallH:85,  front:"#f0e0d0", side:"#d8c8b8", roof:"#a87848", type:"shop" },
  { x:300, y:720, w:60, h:50,  wallH:70,  front:"#e8e8f0", side:"#d0d0e0", roof:"#6070a0", type:"house" },

  // Квартал 4 (середина-право)
  { x:1020,y:730, w:90, h:65,  wallH:95,  front:"#f0d8d8", side:"#d8c0c0", roof:"#a04040", type:"shop" },
  { x:1130,y:720, w:100,h:70,  wallH:100, front:"#d8e8f8", side:"#c0d0e8", roof:"#4060a0", type:"house" },

  // Квартал 5 (дальний правый)
  { x:1420,y:60,  w:120,h:80,  wallH:115, front:"#ffe8d0", side:"#e8d0b8", roof:"#c08040", type:"shop", label:"РЫНОК", labelColor:"#b45309" },
  { x:1560,y:70,  w:80, h:60,  wallH:90,  front:"#e0e8e0", side:"#c8d0c8", roof:"#608060", type:"house" },

  // ПРОКЛЯТОЕ МЕСТО — зона с духами
  { x:700, y:680, w:180,h:120, wallH:160, front:"#1a0a2e", side:"#120820", roof:"#0d0520", type:"cursed", label:"⚠ ПРОКЛЯТОЕ МЕСТО", labelColor:"#a855f7" },

  // Дополнительные здания
  { x:450, y:730, w:70, h:55,  wallH:80,  front:"#e8e0f0", side:"#d0c8e0", roof:"#7060a0", type:"house" },
  { x:1300,y:55,  w:60, h:50,  wallH:70,  front:"#f0f0e0", side:"#d8d8c0", roof:"#9090507", type:"house" },
];

// ── НПС ────────────────────────────────────────────────────────────────────────
interface NPC {
  id: string; x: number; y: number;
  name: string; role: string; color: string;
  hairColor: string; bodyColor: string;
  interactRadius: number;
  dialogue: string[][];
  questName: string; questDesc: string; questGoal: number;
}

const NPCS: NPC[] = [
  {
    // Годзё — стоит у школы магии, не перекрывает проклятое место
    id:"gojo", x:200, y:520, name:"Сатору Годзё", role:"Учитель высшей школы",
    color:"#60a5fa", hairColor:"#fff", bodyColor:"#1e3a5f",
    interactRadius:55,
    questName:"Урок бесконечности", questGoal:5,
    questDesc:"Победи 5 проклятых духов в Проклятом месте. Докажи, что готов к технике Бесконечности.",
    dialogue:[
      ["Ты чувствуешь свою CE? Хорошо. Значит, ты не полный ноль.", "Я — Сатору Годзё. Сильнейший маг нашего поколения.", "Я могу научить тебя Бесконечности. Но сначала — маленькое испытание."],
      ["Квест: «Урок бесконечности»", "В Проклятом месте засели духи. Победи пятерых — вернись ко мне.", "Только не умри. Это было бы неловко для нас обоих."],
    ],
  },
  {
    // Нанами — стоит на дороге между зданиями
    id:"nanami", x:550, y:520, name:"Кэнто Нанами", role:"Маг класса 1",
    color:"#1e40af", hairColor:"#d4a574", bodyColor:"#374151",
    interactRadius:50,
    questName:"Принцип 7:3", questGoal:3,
    questDesc:"Уничтожь 3 духа в Проклятом месте, используя технику соотношения.",
    dialogue:[
      ["Меня зовут Нанами. Маг класса 1.", "Работаю с техникой соотношения — 7:3. Удар в точку раздела наносит увеличенный урон.", "Звучит просто. На практике — нет."],
      ["Квест: «Принцип 7:3»", "Три духа в Проклятом месте. Уничтожь их — расскажу о соотношении.", "Только не тяни. Сверхурочные не оплачиваются."],
    ],
  },
  {
    // Нобара — левая сторона от проклятого места
    id:"nobara", x:520, y:860, name:"Нобара Кугисаки", role:"Студент первого курса",
    color:"#f59e0b", hairColor:"#8b4513", bodyColor:"#1f2937",
    interactRadius:50,
    questName:"Резонанс крови", questGoal:4,
    questDesc:"Победи 4 духа, используя Соломенную куклу. Почувствуй резонанс.",
    dialogue:[
      ["Я Нобара Кугисаки. Первый курс. И да, я лучше большинства второкурсников.", "Моя техника — Соломенная кукла. Забиваешь гвоздь в куклу — и враг чувствует удар."],
      ["Квест: «Резонанс крови»", "Победи четырёх духов в Проклятом месте. Кровный резонанс — это красиво."],
    ],
  },
  {
    // Мегуми — правая сторона от проклятого места
    id:"megumi", x:960, y:860, name:"Мегуми Фусигуро", role:"Студент первого курса",
    color:"#6b7280", hairColor:"#1a1a1a", bodyColor:"#111827",
    interactRadius:50,
    questName:"Десять теней", questGoal:5,
    questDesc:"Убей пятерых духов в Проклятом месте. Тени не прощают суеты.",
    dialogue:[
      ["Ты ищешь учителя? Почему именно я?", "Техника Десяти теней. Могу призывать духов из теней.", "Если хочешь обучиться... я подумаю."],
      ["Квест: «Десять теней»", "Убей пятерых духов в Проклятом месте. Действуй точно."],
    ],
  },
  {
    // Тодо — правее, у дороги
    id:"todo", x:1100, y:520, name:"Аой Тодо", role:"Студент третьего курса",
    color:"#7dd3fc", hairColor:"#4a4a4a", bodyColor:"#14532d",
    interactRadius:55,
    questName:"Бугги-Вугги", questGoal:3,
    questDesc:"Победи 3 особых духа в Проклятом месте. Это будет красиво.",
    dialogue:[
      ["Стоп. Прежде чем я что-то скажу — кто твоя любимая женщина-знаменитость?", "...", "Хм. Достойный ответ. Мы могли бы стать лучшими друзьями.", "Моя техника — Бугги-Вугги. Хлопок — и я меняю местами любые два объекта."],
      ["Квест: «Бугги-Вугги»", "Победи трёх особых духов в Проклятом месте.", "Враги не успеют понять, что происходит. Это красиво."],
    ],
  },
];

// ── Деревья и декор ──────────────────────────────────────────────────────────
const TREES = [
  {x:160,y:160},{x:260,y:180},{x:160,y:560},{x:260,y:560},
  {x:500,y:160},{x:560,y:180},{x:500,y:560},
  {x:920,y:160},{x:980,y:180},{x:920,y:560},
  {x:1200,y:160},{x:1260,y:180},
  {x:1430,y:560},{x:1490,y:580},
  {x:100,y:900},{x:180,y:920},{x:100,y:1150},{x:180,y:1170},
  {x:500,y:900},{x:560,y:920},{x:500,y:1150},
  {x:920,y:900},{x:1000,y:920},
  {x:1200,y:900},{x:1300,y:920},{x:1200,y:1150},
  {x:1500,y:900},{x:1580,y:920},
];

const BENCHES = [
  {x:200,y:580},{x:450,y:580},{x:650,y:580},{x:900,y:580},
  {x:1100,y:580},{x:1350,y:580},
];

const LIGHTS = [
  {x:180,y:630},{x:460,y:630},{x:700,y:630},
  {x:900,y:630},{x:1100,y:630},{x:1360,y:630},
  {x:200,y:440},{x:460,y:440},{x:700,y:440},{x:900,y:440},
];

// ── Рисовалки ────────────────────────────────────────────────────────────────
const drawFloor = (ctx: CanvasRenderingContext2D, camX: number, camY: number, tick: number) => {
  ctx.fillStyle = "#3a5c2a"; ctx.fillRect(0,0,W,H);

  const ts = TILE_SIZE;
  const wx0 = Math.floor((camX - W/2) / ts) * ts;
  const wy0 = Math.floor((camY - H/(2*PERSP)) / ts) * ts;

  for (let wx=wx0; wx<camX+W/2+ts; wx+=ts) {
    for (let wy=wy0; wy<camY+H/(2*PERSP)+ts; wy+=ts) {
      const tl = toScreen(wx, wy, camX, camY);
      const br = toScreen(wx+ts, wy+ts, camX, camY);
      if (br.sx<-2||tl.sx>W+2||br.sy<-2||tl.sy>H+10) continue;

      const tx = Math.floor(wx/ts);
      const ty = Math.floor(wy/ts);
      if (tx<0||ty<0||tx>=MAP_W||ty>=MAP_H) continue;
      const tile = TILE_MAP[ty][tx];
      const def = TILE_DEFS[tile];
      const pw = br.sx-tl.sx, ph = br.sy-tl.sy;
      if (pw<=0||ph<=0) continue;

      if (tile==="crosswalk") {
        // Зебра: чередование полос
        ctx.fillStyle = def.color!;
        ctx.fillRect(tl.sx, tl.sy, pw, ph);
        if ((tx+ty)%2===0) {
          ctx.fillStyle = def.altColor!;
          ctx.fillRect(tl.sx, tl.sy, pw, ph);
        }
      } else if (tile==="road") {
        ctx.fillStyle = (tx+ty)%2===0 ? def.color! : def.altColor!;
        ctx.fillRect(tl.sx, tl.sy, pw, ph);
        // Разметка дороги
        if (ty>=12&&ty<=15&&tx%4===2) {
          ctx.fillStyle = "rgba(255,220,0,0.4)";
          ctx.fillRect(tl.sx+pw*0.4, tl.sy, pw*0.2, ph);
        }
      } else if (tile==="grass"||tile==="grass2") {
        ctx.fillStyle = (tx+ty)%2===0 ? def.color! : def.altColor!;
        ctx.fillRect(tl.sx, tl.sy, pw, ph);
        // Травинки
        if ((tx*3+ty*7)%11===0) {
          ctx.fillStyle = "rgba(0,80,0,0.25)";
          ctx.fillRect(tl.sx+pw*0.3, tl.sy+ph*0.2, pw*0.05, ph*0.4);
          ctx.fillRect(tl.sx+pw*0.6, tl.sy+ph*0.3, pw*0.04, ph*0.35);
        }
      } else {
        ctx.fillStyle = (tx+ty)%2===0 ? def.color! : def.altColor!;
        ctx.fillRect(tl.sx, tl.sy, pw, ph);
      }

      // Граница тайла
      if (def.border) {
        ctx.strokeStyle = def.border;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tl.sx, tl.sy, pw, ph);
      }
    }
  }

  // Дорожная разметка: осевые линии
  const roadLineY1 = 13*ts+ts/2, roadLineY2 = 26*ts+ts/2;
  [roadLineY1, roadLineY2].forEach(wy=>{
    for (let wx=0; wx<WORLD_W; wx+=ts*3) {
      const s1=toScreen(wx+ts*0.2, wy, camX, camY);
      const s2=toScreen(wx+ts*1.8, wy, camX, camY);
      ctx.strokeStyle="rgba(255,220,0,0.55)"; ctx.lineWidth=2; ctx.setLineDash([8,8]);
      ctx.beginPath(); ctx.moveTo(s1.sx,s1.sy); ctx.lineTo(s2.sx,s2.sy); ctx.stroke();
    }
  });
  ctx.setLineDash([]);

  // Фонарные столбы (свет на полу)
  LIGHTS.forEach(({x,y})=>{
    const { sx, sy } = toScreen(x, y, camX, camY);
    const pulse = 0.05+0.03*Math.sin(tick*0.05+x*0.01);
    ctx.beginPath(); ctx.ellipse(sx, sy+10, 20, 8, 0, 0, Math.PI*2);
    ctx.fillStyle=`rgba(255,200,80,${pulse})`; ctx.fill();
  });
};

const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, camX: number, camY: number, tick: number) => {
  const { sx, sy } = toScreen(x, y, camX, camY);
  if (sx<-40||sx>W+40||sy<-80||sy>H+20) return;
  // Тень
  ctx.beginPath(); ctx.ellipse(sx, sy+4, 16, 6, 0, 0, Math.PI*2);
  ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.fill();
  // Ствол
  ctx.fillStyle="#6b4226";
  ctx.fillRect(Math.round(sx-3), Math.round(sy-22), 6, 22);
  // Крона — 3 эллипса для объёма
  ctx.fillStyle=`rgba(34,120,50,${0.8+0.1*Math.sin(tick*0.025+x*0.01)})`;
  ctx.beginPath(); ctx.ellipse(sx, sy-30, 16, 14, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(28,100,42,0.9)";
  ctx.beginPath(); ctx.ellipse(sx-6, sy-34, 11, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(40,140,58,0.85)";
  ctx.beginPath(); ctx.ellipse(sx+4, sy-33, 10, 9, 0, 0, Math.PI*2); ctx.fill();
};

const drawBench = (ctx: CanvasRenderingContext2D, x: number, y: number, camX: number, camY: number) => {
  const { sx, sy } = toScreen(x, y, camX, camY);
  if (sx<-30||sx>W+30) return;
  ctx.fillStyle="#7a5c3a";
  ctx.fillRect(Math.round(sx-14), Math.round(sy-8), 28, 5);
  ctx.fillRect(Math.round(sx-12), Math.round(sy-3), 4, 10);
  ctx.fillRect(Math.round(sx+8),  Math.round(sy-3), 4, 10);
  ctx.fillStyle="#5a4228";
  ctx.fillRect(Math.round(sx-14), Math.round(sy-14), 28, 4);
};

const drawLamp = (ctx: CanvasRenderingContext2D, x: number, y: number, camX: number, camY: number, tick: number) => {
  const { sx, sy } = toScreen(x, y, camX, camY);
  if (sx<-20||sx>W+20) return;
  // Столб
  ctx.fillStyle="#4a4a5a";
  ctx.fillRect(Math.round(sx-2), Math.round(sy-38), 4, 38);
  // Перекладина
  ctx.fillRect(Math.round(sx-2), Math.round(sy-40), 14, 3);
  // Плафон
  ctx.fillStyle="#888";
  ctx.fillRect(Math.round(sx+8), Math.round(sy-44), 8, 7);
  // Свет
  const pulse = 0.6+0.3*Math.sin(tick*0.06+x*0.01);
  ctx.beginPath(); ctx.arc(sx+12, sy-40, 4, 0, Math.PI*2);
  ctx.fillStyle=`rgba(255,220,100,${pulse})`; ctx.fill();
};

const drawBuilding = (ctx: CanvasRenderingContext2D, b: Building, camX: number, camY: number, tick: number) => {
  const tl=toScreen(b.x,b.y,camX,camY);
  const tr=toScreen(b.x+b.w,b.y,camX,camY);
  const br=toScreen(b.x+b.w,b.y+b.h,camX,camY);
  const bl=toScreen(b.x,b.y+b.h,camX,camY);
  if (tr.sx<-20||bl.sx>W+20||bl.sy<-b.wallH||tl.sy>H+b.wallH) return;
  const wH=b.wallH;

  // Передняя стена
  ctx.beginPath(); ctx.moveTo(bl.sx,bl.sy); ctx.lineTo(br.sx,br.sy);
  ctx.lineTo(br.sx,br.sy-wH); ctx.lineTo(bl.sx,bl.sy-wH); ctx.closePath();
  ctx.fillStyle=b.front; ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.15)"; ctx.lineWidth=1; ctx.stroke();

  // Боковая стена
  ctx.beginPath(); ctx.moveTo(br.sx,br.sy); ctx.lineTo(tr.sx,tr.sy);
  ctx.lineTo(tr.sx,tr.sy-wH); ctx.lineTo(br.sx,br.sy-wH); ctx.closePath();
  ctx.fillStyle=b.side; ctx.fill(); ctx.stroke();

  // Крыша
  ctx.beginPath(); ctx.moveTo(tl.sx,tl.sy-wH); ctx.lineTo(tr.sx,tr.sy-wH);
  ctx.lineTo(br.sx,br.sy-wH); ctx.lineTo(bl.sx,bl.sy-wH); ctx.closePath();
  ctx.fillStyle=b.roof; ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.18)"; ctx.stroke();

  // Окна — только для обычных зданий
  if (b.type !== "cursed") {
    const rows=Math.max(1,Math.floor(wH/36)), cols=Math.max(1,Math.floor((br.sx-bl.sx)/32));
    for (let row=0;row<rows;row++) {
      for (let col=0;col<cols;col++) {
        const wx2=bl.sx+(br.sx-bl.sx)*(col+0.5)/cols-5;
        const wy2=bl.sy-wH*(0.85-row*0.28);
        if (wy2 > bl.sy || wy2 < bl.sy - wH) continue;
        const litUp=(row*cols+col+b.x)%3!==0;
        ctx.fillStyle=litUp?"rgba(255,220,120,0.65)":"rgba(40,60,100,0.4)";
        ctx.fillRect(Math.round(wx2), Math.round(wy2), 10, 13);
        ctx.strokeStyle="rgba(0,0,0,0.25)"; ctx.lineWidth=0.5;
        ctx.strokeRect(Math.round(wx2), Math.round(wy2), 10, 13);
      }
    }
  }

  // Вывеска
  if (b.label&&b.labelColor) {
    const cx=(bl.sx+br.sx)/2;
    const cy=bl.sy-wH*0.35;
    const tw=b.label.length*6+12;
    ctx.fillStyle="rgba(250,250,240,0.92)"; ctx.fillRect(cx-tw/2,cy-8,tw,16);
    ctx.strokeStyle=b.labelColor+"66"; ctx.lineWidth=1; ctx.strokeRect(cx-tw/2,cy-8,tw,16);
    ctx.fillStyle=b.labelColor; ctx.font="bold 9px monospace"; ctx.textAlign="center";
    ctx.fillText(b.label,cx,cy+4); ctx.textAlign="left";
  }

  // Проклятое место — пульсирующий эффект
  if (b.type==="cursed") {
    const pulse=0.15+0.1*Math.sin(tick*0.08);
    ctx.beginPath(); ctx.ellipse((bl.sx+br.sx)/2, bl.sy-wH/2, (br.sx-bl.sx)/2+10, wH/2+10, 0, 0, Math.PI*2);
    ctx.strokeStyle=`rgba(168,85,247,${pulse})`; ctx.lineWidth=3; ctx.stroke();
    // Значок входа
    const ex=(bl.sx+br.sx)/2;
    const ey=bl.sy-wH*0.15;
    ctx.fillStyle="rgba(168,85,247,0.9)";
    ctx.font="bold 11px monospace"; ctx.textAlign="center";
    ctx.fillText("[E] Войти",ex,ey); ctx.textAlign="left";
  }
};

const drawNPC = (
  ctx: CanvasRenderingContext2D, npc: NPC, camX: number, camY: number,
  tick: number, isNear: boolean
) => {
  const { sx, sy } = toScreen(npc.x, npc.y, camX, camY);
  if (sx<-60||sx>W+60||sy<-120||sy>H+60) return;

  ctx.save(); ctx.translate(Math.round(sx), Math.round(sy));
  ctx.imageSmoothingEnabled = false;

  // Зона взаимодействия
  if (isNear) {
    const pulse = 0.5+0.5*Math.sin(tick*0.12);
    ctx.beginPath(); ctx.arc(0,-72,10+pulse*3,0,Math.PI*2);
    ctx.fillStyle=`${npc.color}${Math.floor(pulse*100+40).toString(16).padStart(2,"0")}`;
    ctx.fill();
    ctx.fillStyle=npc.color; ctx.font="bold 13px sans-serif"; ctx.textAlign="center";
    ctx.fillText("!",0,-66); ctx.textAlign="left";
    ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(-36,-108,72,18);
    ctx.fillStyle="#f1f5f9"; ctx.font="10px monospace"; ctx.textAlign="center";
    ctx.fillText("[E] говорить",0,-96); ctx.textAlign="left";
  }

  // Тень
  ctx.beginPath(); ctx.ellipse(0,2,12,4,0,0,Math.PI*2);
  ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.fill();

  const sway = Math.sin(tick*0.04+npc.x*0.01)*1.5;

  // Ноги
  ctx.fillStyle="#374151";
  ctx.fillRect(-6,0,5,18); ctx.fillRect(1,0,5,18);
  ctx.fillStyle="#1f2937";
  ctx.fillRect(-7,15,7,5); ctx.fillRect(0,15,7,5);

  // Тело
  ctx.fillStyle=npc.bodyColor;
  ctx.fillRect(-8,-22+sway,16,22);
  ctx.strokeStyle="rgba(0,0,0,0.2)"; ctx.lineWidth=1;
  ctx.strokeRect(-8,-22+sway,16,22);

  // Руки
  ctx.fillStyle=npc.bodyColor;
  ctx.fillRect(-12,-20+sway,5,14); ctx.fillRect(7,-20+sway,5,14);
  ctx.fillStyle="#d4a574";
  ctx.fillRect(-12,-7+sway,5,5); ctx.fillRect(7,-7+sway,5,5);

  // Шея
  ctx.fillStyle="#c9a87c";
  ctx.fillRect(-2,-26+sway,4,5);

  // Голова
  ctx.fillStyle="#e8c9a0";
  ctx.fillRect(-6,-36+sway,12,12);
  ctx.strokeStyle="#c9a87c"; ctx.lineWidth=1;
  ctx.strokeRect(-6,-36+sway,12,12);

  // Волосы
  ctx.fillStyle=npc.hairColor;
  ctx.fillRect(-7,-40+sway,14,6);
  ctx.fillRect(-8,-38+sway,3,7);
  ctx.fillRect(5,-38+sway,3,7);

  // Глаза
  ctx.fillStyle="#fff";
  ctx.fillRect(-4,-32+sway,3,2); ctx.fillRect(1,-32+sway,3,2);
  ctx.fillStyle="#1a1a2e";
  ctx.fillRect(-3,-32+sway,2,2); ctx.fillRect(2,-32+sway,2,2);

  // Имя
  ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(-28,-52+sway,56,13);
  ctx.fillStyle=npc.color; ctx.font="bold 9px sans-serif"; ctx.textAlign="center";
  ctx.fillText(npc.name,0,-42+sway); ctx.textAlign="left";

  ctx.restore();
};

const drawPlayer = (ctx: CanvasRenderingContext2D, px: number, py: number, camX: number, camY: number, tick: number, facing: {x:number;y:number}, isMoving: boolean, walkCycle: number, energyColor: string) => {
  const { sx, sy } = toScreen(px, py, camX, camY);
  const walkFrame = Math.floor(walkCycle/5)%4;
  const flip = facing.x >= 0 ? 1 : -1;

  ctx.save(); ctx.translate(Math.round(sx), Math.round(sy));
  ctx.imageSmoothingEnabled = false;

  // CE-аура
  ctx.beginPath(); ctx.arc(0,-18,20+Math.sin(tick*0.07)*1.5,0,Math.PI*2);
  ctx.strokeStyle=`${energyColor}44`; ctx.lineWidth=1.5; ctx.stroke();

  // Тень
  ctx.beginPath(); ctx.ellipse(0,2,10,4,0,0,Math.PI*2);
  ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.fill();

  // Ноги
  const legL_dy = isMoving?(walkFrame<2?-2:2):0;
  const legR_dy = isMoving?(walkFrame<2?2:-2):0;
  ctx.fillStyle="#0f1a2e";
  ctx.fillRect(-8,legL_dy,5,16); ctx.fillRect(3,legR_dy,5,16);
  ctx.fillStyle="#0a0f1c";
  ctx.fillRect(-9,14+legL_dy,7,5); ctx.fillRect(2,14+legR_dy,7,5);

  // Тело
  ctx.fillStyle="#0f172a"; ctx.fillRect(-8,-22,16,22);
  ctx.strokeStyle="#1e3a5f"; ctx.lineWidth=1; ctx.strokeRect(-8,-22,16,22);
  ctx.beginPath(); ctx.moveTo(-4,-22); ctx.lineTo(0,-16); ctx.lineTo(4,-22);
  ctx.strokeStyle="#2d4a7a"; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle=energyColor;
  for (let i=0;i<3;i++) { ctx.beginPath(); ctx.arc(0,-19+i*5,1.5,0,Math.PI*2); ctx.fill(); }

  // Руки
  const armSwing=isMoving?(walkFrame%2===0?2:-2):0;
  ctx.fillStyle="#0f172a";
  ctx.fillRect(-13,-20+armSwing,5,14); ctx.fillRect(8,-20-armSwing,5,14);
  ctx.fillStyle="#d4a574";
  ctx.fillRect(-13,-7+armSwing,5,5); ctx.fillRect(8,-7-armSwing,5,5);

  // Шея
  ctx.fillStyle="#c9a87c"; ctx.fillRect(-2,-27,4,6);

  // Голова
  ctx.fillStyle="#e8c9a0"; ctx.fillRect(-7,-37,14,14);
  ctx.strokeStyle="#c9a87c"; ctx.lineWidth=1; ctx.strokeRect(-7,-37,14,14);

  // Волосы
  ctx.fillStyle="#1a1a1a";
  ctx.fillRect(-7,-41,14,6);
  ctx.fillRect(-9,-39,3,7); ctx.fillRect(6,-39,3,7);
  for (let i=0;i<3;i++) {
    ctx.beginPath(); ctx.moveTo(-5+i*5,-41); ctx.lineTo(-3+i*5,-46); ctx.lineTo(-1+i*5,-41); ctx.closePath(); ctx.fill();
  }

  // Глаза
  ctx.fillStyle="#fff";
  ctx.fillRect(-5,-32,4,3); ctx.fillRect(1,-32,4,3);
  ctx.fillStyle="#1a1a2e";
  ctx.fillRect(-5+(flip>0?2:0),-32,2,3); ctx.fillRect(1+(flip>0?2:0),-32,2,3);
  ctx.fillStyle="#111";
  ctx.fillRect(-flip*6-2,-35,5,2); ctx.fillRect(flip*2-2,-35,5,2);

  ctx.restore();
};

// ── Диалог ────────────────────────────────────────────────────────────────────
interface DialogState {
  npc: NPC;
  lineIdx: number;
  dialogIdx: number;
}

// ── Компонент ─────────────────────────────────────────────────────────────────
const CityScreen = ({ energy, progress, onGoToBattle, onQuestUpdate }: Props) => {
  const energyDef = getEnergyDef(energy);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    px: 900, py: 350,
    vx: 0, vy: 0,
    walkCycle: 0,
    facing: { x: 1, y: 0 },
    camX: 900, camY: 350,
    keys: new Set<string>(),
    tick: 0,
    nearNpc: null as NPC | null,
    nearCursed: false,
  });
  const animRef = useRef<number>(0);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const dialogRef = useRef<DialogState | null>(null);
  // Храним progress в ref — чтобы callback внутри useEffect всегда видел актуальный
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const bindings = loadBindings();

  const SPEED = energyDef.statMods.speed * 2.5;

  const openDialog = (npc: NPC) => {
    const d: DialogState = { npc, lineIdx: 0, dialogIdx: 0 };
    setDialog(d); dialogRef.current = d;
  };

  const advanceDialog = () => {
    setDialog(prev => {
      if (!prev) return null;
      const lines = prev.npc.dialogue[prev.dialogIdx];
      if (prev.lineIdx < lines.length-1) {
        const next = {...prev, lineIdx: prev.lineIdx+1};
        dialogRef.current = next; return next;
      }
      if (prev.dialogIdx < prev.npc.dialogue.length-1) {
        const next = {...prev, dialogIdx: prev.dialogIdx+1, lineIdx:0};
        dialogRef.current = next; return next;
      }
      // Принятие квеста
      const newProg: CharacterProgress = {
        ...progressRef.current,
        activeQuest: prev.npc.questName,
        questProgress: 0,
        questGoal: prev.npc.questGoal,
      };
      onQuestUpdate(newProg);
      dialogRef.current = null; return null;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const b = bindings;
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const s = stateRef.current;
      if (down) {
        s.keys.add(e.code);
        if (e.code===b.interact||e.code==="KeyF"||e.code===b.technique) {
          if (!dialogRef.current && s.nearNpc) openDialog(s.nearNpc);
          else if (dialogRef.current) advanceDialog();
          else if (!dialogRef.current && s.nearCursed) onGoToBattle({...progressRef.current});
        }
      } else {
        s.keys.delete(e.code);
      }
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
    };
    const kd=(e:KeyboardEvent)=>onKey(e,true);
    const ku=(e:KeyboardEvent)=>onKey(e,false);
    window.addEventListener("keydown",kd);
    window.addEventListener("keyup",ku);

    const loop = () => {
      const s = stateRef.current;
      s.tick++;

      if (!dialogRef.current) {
        let mvx=0, mvy=0;
        if (s.keys.has(b.left)||s.keys.has("ArrowLeft"))  mvx-=1;
        if (s.keys.has(b.right)||s.keys.has("ArrowRight")) mvx+=1;
        if (s.keys.has(b.up)||s.keys.has("ArrowUp"))       mvy-=1;
        if (s.keys.has(b.down)||s.keys.has("ArrowDown"))   mvy+=1;
        if (mvx!==0||mvy!==0) {
          const len=Math.sqrt(mvx*mvx+mvy*mvy);
          s.vx=(mvx/len)*SPEED; s.vy=(mvy/len)*SPEED;
          s.facing={x:mvx/len,y:mvy/len};
          s.walkCycle+=0.18;
        } else { s.vx*=0.45; s.vy*=0.45; }

        // Коллизии с зданиями
        const pr = 18; // радиус игрока
        const nx = s.px + s.vx;
        const ny = s.py + s.vy;
        let blockX = false, blockY = false;
        BUILDINGS.forEach(bd => {
          // AABB коллизия с небольшим отступом
          const bx1 = bd.x - pr, bx2 = bd.x + bd.w + pr;
          const by1 = bd.y - pr, by2 = bd.y + bd.h + pr;
          if (nx > bx1 && nx < bx2 && s.py > bd.y - pr && s.py < bd.y + bd.h + pr) blockX = true;
          if (s.px > bx1 && s.px < bx2 && ny > by1 && ny < by2) blockY = true;
        });
        if (!blockX) s.px = nx;
        if (!blockY) s.py = ny;
        s.px=Math.max(30,Math.min(WORLD_W-30,s.px));
        s.py=Math.max(30,Math.min(WORLD_H-30,s.py));
      }

      // Ближайший НПС
      let nearest: NPC|null=null, nearDist=999;
      NPCS.forEach(npc=>{
        const dx=s.px-npc.x, dy=s.py-npc.y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if (d<npc.interactRadius&&d<nearDist) { nearest=npc; nearDist=d; }
      });
      s.nearNpc=nearest;

      // Рядом с проклятым местом?
      const cb=BUILDINGS.find(b=>b.type==="cursed")!;
      const cdx=s.px-(cb.x+cb.w/2), cdy=s.py-(cb.y+cb.h/2);
      s.nearCursed=Math.sqrt(cdx*cdx+cdy*cdy)<120;

      // Камера
      s.camX+=(s.px-s.camX)*0.1; s.camY+=(s.py-s.camY)*0.1;
      s.camX=Math.max(W/2,Math.min(WORLD_W-W/2,s.camX));
      s.camY=Math.max(H/2,Math.min(WORLD_H-H/2,s.camY));

      // Рендер
      drawFloor(ctx,s.camX,s.camY,s.tick);

      // Декор — деревья, скамейки, фонари (до зданий и персонажей)
      BENCHES.forEach(b2=>drawBench(ctx,b2.x,b2.y,s.camX,s.camY));
      LIGHTS.forEach(l=>drawLamp(ctx,l.x,l.y,s.camX,s.camY,s.tick));

      // Depth sort
      const dl: {y:number;draw:()=>void}[]=[];
      TREES.forEach(t=>dl.push({y:t.y+20,draw:()=>drawTree(ctx,t.x,t.y,s.camX,s.camY,s.tick)}));
      BUILDINGS.forEach(b2=>dl.push({y:b2.y+b2.h,draw:()=>drawBuilding(ctx,b2,s.camX,s.camY,s.tick)}));
      NPCS.forEach(npc=>dl.push({y:npc.y,draw:()=>drawNPC(ctx,npc,s.camX,s.camY,s.tick,s.nearNpc?.id===npc.id)}));
      dl.push({y:s.py,draw:()=>drawPlayer(ctx,s.px,s.py,s.camX,s.camY,s.tick,s.facing,Math.abs(s.vx)>0.1||Math.abs(s.vy)>0.1,s.walkCycle,energyDef.color)});
      dl.sort((a,b2)=>a.y-b2.y);
      dl.forEach(d=>d.draw());

      // Подсказка у проклятого места
      if (s.nearCursed&&!dialogRef.current) {
        const { sx,sy }=toScreen(cb.x+cb.w/2, cb.y+cb.h/2, s.camX, s.camY);
        ctx.fillStyle="rgba(168,85,247,0.85)"; ctx.fillRect(sx-60,sy-90,120,20);
        ctx.fillStyle="#fff"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("[E] Войти в бой",sx,sy-76); ctx.textAlign="left";
      }

      // HUD — всегда читаем из progressRef для актуальных данных
      const curProg = progressRef.current;
      const eq = curProg.equippedTechniques;
      const activeTechName = eq && eq.length > 0
        ? (eq[Math.min(curProg.activeSlot ?? 0, eq.length-1)] ?? "Проклятый удар")
        : "Проклятый удар";
      ctx.fillStyle="rgba(10,8,24,0.88)";
      ctx.fillRect(12,12,210,52);
      ctx.strokeStyle=energyDef.color+"44"; ctx.lineWidth=1; ctx.strokeRect(12,12,210,52);
      ctx.fillStyle=energyDef.color; ctx.font="bold 12px monospace";
      ctx.fillText(`${energyDef.kanji}  ${energyDef.nameRu}`,20,30);
      ctx.fillStyle="#c4b5fd"; ctx.font="10px monospace";
      ctx.fillText(`Ур.${curProg.level}  XP: ${curProg.xp}/${curProg.xpToNext}`,20,46);
      ctx.fillStyle="#6d28d9"; ctx.font="9px monospace";
      ctx.fillText(`[E]: ${activeTechName.slice(0,20)}`,20,58);

      animRef.current=requestAnimationFrame(loop);
    };

    animRef.current=requestAnimationFrame(loop);
    return ()=>{ cancelAnimationFrame(animRef.current); window.removeEventListener("keydown",kd); window.removeEventListener("keyup",ku); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  return (
    <div style={{ position:"fixed", inset:0, background:"#3a5c2a" }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ display:"block",width:"100%",height:"100%" }} />

      {/* Диалоговое окно */}
      {dialog && (
        <div style={{
          position:"absolute", bottom:32, left:"50%", transform:"translateX(-50%)",
          width:"min(680px,90vw)",
          background:"rgba(255,255,255,0.97)",
          border:`2px solid ${dialog.npc.color}88`,
          borderRadius:10,
          boxShadow:"0 4px 32px rgba(0,0,0,0.18)",
          padding:"16px 22px 12px",
          fontFamily:"'Georgia',serif",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,borderBottom:`1px solid ${dialog.npc.color}33`,paddingBottom:8}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:`${dialog.npc.color}22`,border:`2px solid ${dialog.npc.color}66`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:dialog.npc.color,flexShrink:0}}>
              {dialog.npc.name[0]}
            </div>
            <div>
              <div style={{color:dialog.npc.color,fontWeight:700,fontSize:13}}>{dialog.npc.name}</div>
              <div style={{color:"#9ca3af",fontSize:10}}>{dialog.npc.role}</div>
            </div>
          </div>

          <div style={{color:"#1f2937",fontSize:14,lineHeight:1.7,minHeight:44}}>
            {dialog.npc.dialogue[dialog.dialogIdx][dialog.lineIdx]}
          </div>

          {/* Квест */}
          {dialog.dialogIdx===1 && dialog.lineIdx===0 && (
            <div style={{marginTop:10,padding:"9px 12px",background:`${dialog.npc.color}10`,border:`1px solid ${dialog.npc.color}44`,borderRadius:6}}>
              <div style={{color:dialog.npc.color,fontSize:10,fontWeight:700,letterSpacing:"0.1em",marginBottom:3}}>
                ✦ КВЕСТ: {dialog.npc.questName}
              </div>
              <div style={{color:"#4b5563",fontSize:11,lineHeight:1.5}}>
                {dialog.npc.questDesc}
              </div>
              <div style={{color:"#6b7280",fontSize:10,marginTop:4}}>
                Цель: {dialog.npc.questGoal} духов
              </div>
            </div>
          )}

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10}}>
            <div style={{display:"flex",gap:3}}>
              {dialog.npc.dialogue.map((block,bi)=>block.map((_,li)=>(
                <div key={`${bi}-${li}`} style={{width:5,height:5,borderRadius:"50%",
                  background:bi<dialog.dialogIdx||(bi===dialog.dialogIdx&&li<=dialog.lineIdx)?dialog.npc.color:"#e5e7eb"}} />
              )))}
            </div>
            <button onClick={advanceDialog} style={{
              padding:"7px 18px",background:dialog.npc.color,color:"#fff",
              border:"none",borderRadius:5,fontFamily:"'Georgia',serif",fontSize:13,cursor:"pointer",
            }}>
              {dialog.lineIdx<dialog.npc.dialogue[dialog.dialogIdx].length-1?"Далее →":dialog.dialogIdx<dialog.npc.dialogue.length-1?"Принять квест ✦":"Понятно"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityScreen;
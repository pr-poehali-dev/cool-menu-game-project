import { useEffect, useRef, useCallback } from "react";
import { EnergyType, getEnergyDef, CharacterProgress, xpForLevel, TECHNIQUES } from "./gameState";

interface Props {
  energy: EnergyType;
  progress: CharacterProgress;
  onGameOver: (finalProgress: CharacterProgress) => void;
}

const W = 900, H = 520;
const WORLD_W = 2000, WORLD_H = 1400;
const CAMERA_LERP = 0.09;
const ATTACK_RANGE = 54;
const ATTACK_COOLDOWN = 24;
const SPECIAL_COOLDOWN = 90;

// Iso projection — screen-space controls
// LEFT key  → screen (-1, 0) → world move left-on-screen
// RIGHT key → screen (+1, 0) → world move right-on-screen
// UP key    → screen (0, -1) → world move up-on-screen
// DOWN key  → screen (0, +1) → world move down-on-screen
const ISO_X = 0.7, ISO_Y = 0.35;

function toScreen(wx: number, wy: number, camX: number, camY: number) {
  return {
    sx: (wx - wy) * ISO_X - (camX - camY) * ISO_X + W / 2,
    sy: (wx + wy) * ISO_Y - (camX + camY) * ISO_Y + H / 3,
  };
}

// Convert screen-space direction to world-space direction (iso inverse)
function screenDirToWorld(screenX: number, screenY: number) {
  const wx = (screenX / ISO_X + screenY / ISO_Y) / 2;
  const wy = (screenY / ISO_Y - screenX / ISO_X) / 2;
  return { wx, wy };
}

interface Vec2 { x: number; y: number; }

interface Player {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  attackTimer: number; invincible: number;
  facing: Vec2;
  attacking: boolean; attackAnim: number;
  ce: number; maxCe: number;
  specialTimer: number;
  walkCycle: number;
  combo: number; comboTimer: number;
  smolderingBonus: number; smolderingTimer: number;
  resonantBonus: number;
  hitsUntilPierce: number;
  chargeTimer: number; chargeReady: boolean;
  level: number; xp: number; xpToNext: number;
  xpGain: number; xpGainTimer: number;
}

interface Enemy {
  id: number;
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; alive: boolean;
  type: "curse" | "special";
  aiTimer: number; hitFlash: number;
  walkCycle: number; facing: number;
  viscousStacks: number; viscousTimer: number;
  freezeStacks: number; freezeTimer: number;
  frozen: boolean; frozenTimer: number;
  slowTimer: number;
}

interface Obstacle {
  x: number; y: number; w: number; h: number;
  wallH: number; type: "building" | "pillar" | "ruin";
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  shape: "circle" | "spark" | "ring";
}

interface FloatText {
  x: number; y: number; text: string; color: string;
  life: number; vy: number;
}

interface GameData {
  player: Player; enemies: Enemy[]; obstacles: Obstacle[];
  particles: Particle[]; floatTexts: FloatText[];
  camX: number; camY: number;
  keys: Set<string>; tick: number; running: boolean;
}

let enemyIdCounter = 0;

const createObstacles = (): Obstacle[] => {
  const obs: Obstacle[] = [];
  const rng = (a: number, b: number) => a + Math.random() * (b - a);
  const clusters = [
    {cx:350,cy:250},{cx:800,cy:180},{cx:550,cy:650},
    {cx:1200,cy:350},{cx:950,cy:800},{cx:1550,cy:550},
    {cx:400,cy:1000},{cx:1400,cy:950},{cx:1100,cy:1150},
  ];
  clusters.forEach(({cx,cy}) => {
    for (let i=0;i<3+Math.floor(Math.random()*3);i++) {
      const type: Obstacle["type"] = Math.random()<0.45?"building":Math.random()<0.5?"pillar":"ruin";
      const w = type==="pillar"?30+rng(0,20):55+rng(0,60);
      const h = type==="pillar"?30+rng(0,20):50+rng(0,50);
      obs.push({ x:cx+rng(-100,100)-w/2, y:cy+rng(-100,100)-h/2, w, h,
        wallH:type==="pillar"?60+rng(0,40):100+rng(0,120), type });
    }
  });
  for (let i=0;i<15;i++) obs.push({
    x:rng(80,WORLD_W-80), y:rng(80,WORLD_H-80),
    w:24+rng(0,16), h:24+rng(0,16), wallH:50+rng(0,50), type:"pillar",
  });
  return obs;
};

const spawnEnemies = (): Enemy[] => {
  const positions = [
    {x:480,y:280},{x:750,y:580},{x:1050,y:200},{x:1200,y:750},
    {x:580,y:950},{x:1450,y:380},{x:1700,y:820},{x:850,y:1100},
    {x:1350,y:1200},{x:280,y:1200},{x:1850,y:650},{x:1800,y:1300},
  ];
  return positions.map((p,i) => {
    const isSpecial = i%4===3;
    return {
      id: ++enemyIdCounter,
      x:p.x, y:p.y, vx:0, vy:0,
      hp:isSpecial?8:3, maxHp:isSpecial?8:3,
      alive:true, type:isSpecial?"special":"curse",
      aiTimer:Math.floor(Math.random()*120), hitFlash:0,
      walkCycle:Math.random()*Math.PI*2, facing:1,
      viscousStacks:0, viscousTimer:0,
      freezeStacks:0, freezeTimer:0,
      frozen:false, frozenTimer:0,
      slowTimer:0,
    };
  });
};

const circleRect = (cx:number,cy:number,r:number,rx:number,ry:number,rw:number,rh:number) => {
  const nx=Math.max(rx,Math.min(cx,rx+rw));
  const ny=Math.max(ry,Math.min(cy,ry+rh));
  return (cx-nx)**2+(cy-ny)**2<r*r;
};

const drawFloor = (ctx: CanvasRenderingContext2D, camX: number, camY: number, tick: number) => {
  ctx.fillStyle="#07060f"; ctx.fillRect(0,0,W,H);
  const ts=80;
  const sx0=Math.floor((camX-500)/ts)*ts, sy0=Math.floor((camY-500)/ts)*ts;
  for (let wx=sx0;wx<camX+500;wx+=ts) {
    for (let wy=sy0;wy<camY+500;wy+=ts) {
      const tl=toScreen(wx,wy,camX,camY);
      const tr=toScreen(wx+ts,wy,camX,camY);
      const br=toScreen(wx+ts,wy+ts,camX,camY);
      const bl=toScreen(wx,wy+ts,camX,camY);
      if (tr.sx<-10||bl.sx>W+10||tl.sy>H+20||br.sy<-20) continue;
      ctx.beginPath();
      ctx.moveTo(tl.sx,tl.sy); ctx.lineTo(tr.sx,tr.sy);
      ctx.lineTo(br.sx,br.sy); ctx.lineTo(bl.sx,bl.sy); ctx.closePath();
      const xi=Math.floor(wx/ts),yi=Math.floor(wy/ts);
      ctx.fillStyle=(xi+yi)%2===0?"#09080f":"#0c0b16"; ctx.fill();
      ctx.strokeStyle="rgba(67,56,202,0.06)"; ctx.lineWidth=1; ctx.stroke();
    }
  }
  const circles=[{wx:700,wy:450,r:110},{wx:1300,wy:700,r:85},{wx:450,wy:1050,r:95},{wx:1700,wy:380,r:75}];
  circles.forEach(({wx,wy,r})=>{
    const c=toScreen(wx,wy,camX,camY);
    const e=toScreen(wx+r,wy,camX,camY);
    const rx=Math.abs(e.sx-c.sx), ry=rx*ISO_Y/ISO_X;
    const pulse=0.1+0.07*Math.sin(tick*0.035);
    ctx.beginPath(); ctx.ellipse(c.sx,c.sy,rx,ry,0,0,Math.PI*2);
    ctx.strokeStyle=`rgba(139,92,246,${pulse})`; ctx.lineWidth=2; ctx.stroke();
    for (let i=0;i<5;i++) {
      const a1=(i/5)*Math.PI*2+tick*0.005, a2=((i+2)/5)*Math.PI*2+tick*0.005;
      ctx.beginPath();
      ctx.moveTo(c.sx+Math.cos(a1)*rx*0.75,c.sy+Math.sin(a1)*ry*0.75);
      ctx.lineTo(c.sx+Math.cos(a2)*rx*0.75,c.sy+Math.sin(a2)*ry*0.75);
      ctx.strokeStyle=`rgba(124,58,237,${pulse*0.5})`; ctx.lineWidth=1; ctx.stroke();
    }
  });
};

const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, camX: number, camY: number) => {
  const tl=toScreen(obs.x,obs.y,camX,camY);
  const tr=toScreen(obs.x+obs.w,obs.y,camX,camY);
  const br=toScreen(obs.x+obs.w,obs.y+obs.h,camX,camY);
  const bl=toScreen(obs.x,obs.y+obs.h,camX,camY);
  if (tr.sx<-20||bl.sx>W+20||tl.sy>H+obs.wallH||br.sy<-obs.wallH) return;
  const wH=obs.wallH;
  if (obs.type==="building") {
    ctx.beginPath(); ctx.moveTo(tr.sx,tr.sy); ctx.lineTo(tr.sx,tr.sy-wH);
    ctx.lineTo(br.sx,br.sy-wH); ctx.lineTo(br.sx,br.sy); ctx.closePath();
    ctx.fillStyle="#0c111e"; ctx.fill(); ctx.strokeStyle="#1e2a40"; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bl.sx,bl.sy); ctx.lineTo(bl.sx,bl.sy-wH);
    ctx.lineTo(br.sx,br.sy-wH); ctx.lineTo(br.sx,br.sy); ctx.closePath();
    ctx.fillStyle="#0a0e1a"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tl.sx,tl.sy-wH); ctx.lineTo(tr.sx,tr.sy-wH);
    ctx.lineTo(br.sx,br.sy-wH); ctx.lineTo(bl.sx,bl.sy-wH); ctx.closePath();
    ctx.fillStyle="#1a2035"; ctx.fill(); ctx.strokeStyle="#2d3a56"; ctx.stroke();
    const numWin=Math.max(1,Math.floor(wH/30));
    ctx.fillStyle="rgba(251,191,36,0.5)";
    for (let row=0;row<numWin;row++) {
      const wy2=tr.sy-wH*0.85+row*(wH/(numWin+1));
      ctx.fillRect(tr.sx+(br.sx-tr.sx)*0.2,wy2,8,10);
      ctx.fillRect(tr.sx+(br.sx-tr.sx)*0.6,wy2,8,10);
    }
  } else if (obs.type==="pillar") {
    const cx=(tl.sx+br.sx)/2, cy=(tl.sy+br.sy)/2;
    const rx=Math.abs(tr.sx-tl.sx)/2+2, ry=Math.abs(br.sy-tr.sy)/2+2;
    ctx.beginPath(); ctx.moveTo(cx-rx,cy); ctx.lineTo(cx-rx,cy-wH);
    ctx.lineTo(cx+rx,cy-wH); ctx.lineTo(cx+rx,cy); ctx.fillStyle="#1c1c2e"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx,cy-wH,rx,ry,0,0,Math.PI*2);
    ctx.fillStyle="#2e2e45"; ctx.fill(); ctx.strokeStyle="#4a4a6a"; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
    ctx.fillStyle="#252535"; ctx.fill(); ctx.stroke();
    ctx.strokeStyle="rgba(139,92,246,0.25)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx-rx*0.3,cy-wH*0.15); ctx.lineTo(cx+rx*0.1,cy-wH*0.6);
    ctx.lineTo(cx-rx*0.2,cy-wH*0.9); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(tl.sx,tl.sy); ctx.lineTo(tl.sx,tl.sy-wH*0.6);
    ctx.lineTo(tr.sx,tr.sy-wH*0.4); ctx.lineTo(tr.sx,tr.sy); ctx.closePath();
    ctx.fillStyle="#18181a"; ctx.fill(); ctx.strokeStyle="#2d2d35"; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(br.sx,br.sy); ctx.lineTo(br.sx,br.sy-wH*0.5);
    ctx.lineTo(bl.sx,bl.sy-wH*0.7); ctx.lineTo(bl.sx,bl.sy); ctx.closePath();
    ctx.fillStyle="#141416"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tl.sx,tl.sy-wH*0.6); ctx.lineTo(tr.sx,tr.sy-wH*0.4);
    ctx.lineTo(br.sx,br.sy-wH*0.5); ctx.lineTo(bl.sx,bl.sy-wH*0.7); ctx.closePath();
    ctx.fillStyle="#1e1e22"; ctx.fill();
    ctx.strokeStyle="rgba(139,92,246,0.2)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(tl.sx+4,tl.sy-8); ctx.lineTo((tl.sx+br.sx)/2,(tl.sy+br.sy)/2-wH*0.3); ctx.stroke();
  }
};

const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, tick: number, camX: number, camY: number, energyColor: string, glowColor: string) => {
  const { sx, sy } = toScreen(p.x, p.y, camX, camY);
  if (p.invincible>0&&Math.floor(tick/4)%2===0) return;
  const isMoving=Math.abs(p.vx)>0.2||Math.abs(p.vy)>0.2;
  const legSwing=isMoving?Math.sin(p.walkCycle)*6:0;
  const armSwing=isMoving?Math.sin(p.walkCycle+Math.PI)*5:0;
  // Use screen-space facing for flip
  const flip=p.facing.x>=0?1:-1;

  ctx.save(); ctx.translate(sx,sy);

  // CE aura rings (no shadow oval)
  const cePct=p.ce/p.maxCe;
  if (cePct>0.1) {
    for (let r=0;r<2;r++) {
      ctx.beginPath();
      ctx.arc(0,-14,20+r*8+Math.sin(tick*0.1+r)*2,0,Math.PI*2);
      ctx.strokeStyle=`${energyColor}${Math.floor(cePct*(0.4-r*0.15)*255).toString(16).padStart(2,"0")}`;
      ctx.lineWidth=1.5-r*0.4; ctx.stroke();
    }
  }
  if (p.smolderingBonus>0) {
    ctx.beginPath(); ctx.arc(0,-14,22+Math.sin(tick*0.08)*3,0,Math.PI*2);
    ctx.strokeStyle=`rgba(251,146,60,${p.smolderingBonus*0.6})`; ctx.lineWidth=2; ctx.stroke();
  }
  if (p.chargeTimer>30) {
    const cp=Math.min(1,(p.chargeTimer-30)/60);
    ctx.beginPath(); ctx.arc(0,-14,24,-Math.PI/2,-Math.PI/2+Math.PI*2*cp);
    ctx.strokeStyle=p.chargeReady?"#f0abfc":`rgba(192,132,252,${cp})`; ctx.lineWidth=3; ctx.stroke();
  }

  // Legs
  [[-flip*5,-legSwing*0.04],[flip*5,legSwing*0.04]].forEach(([lx,rot])=>{
    ctx.fillStyle="#111827"; ctx.save();
    ctx.translate(lx as number,0); ctx.rotate(rot as number);
    ctx.fillRect(-3.5,0,7,20);
    ctx.fillStyle="#1f2937"; ctx.fillRect(-4.5,16,10,6);
    ctx.restore();
  });

  // Body
  ctx.fillStyle="#0f172a"; ctx.fillRect(-9,-24,18,22);
  ctx.strokeStyle="#1e3a5f"; ctx.lineWidth=1; ctx.strokeRect(-9,-24,18,22);
  ctx.fillStyle="#2d3f5a";
  for (let i=0;i<4;i++) ctx.fillRect(-1,-22+i*5,2,2);
  ctx.strokeStyle="#2d4a7a"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-5,-24); ctx.lineTo(0,-17); ctx.lineTo(5,-24); ctx.stroke();

  // Arms
  [[-flip*10,armSwing*0.05,false],[flip*10,-armSwing*0.05,true]].forEach(([ax,rot,isRight])=>{
    const isAttackArm = p.attacking&&((isRight&&flip>0)||(!isRight&&flip<0));
    ctx.fillStyle="#0f172a"; ctx.save();
    ctx.translate(ax as number,-21);
    ctx.rotate((rot as number)+(isAttackArm?-0.5*flip:0));
    ctx.fillRect(-3,0,6,isAttackArm?22:16);
    ctx.fillStyle="#d4a574";
    ctx.beginPath(); ctx.arc(0,isAttackArm?24:18,4,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });

  // Neck
  ctx.fillStyle="#c9a87c"; ctx.fillRect(-3,-29,6,7);

  // Head
  ctx.fillStyle="#e8c9a0";
  ctx.beginPath(); ctx.ellipse(0,-36,7,8,0,0,Math.PI*2); ctx.fill();

  // Hair
  ctx.fillStyle="#1a1a1a";
  ctx.beginPath(); ctx.ellipse(0,-40,7,5,0,0,Math.PI*2); ctx.fill();
  [[-6,-38,-9,-46],[0,-41,0,-48],[6,-38,9,-46]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath(); ctx.moveTo(x1-3,y1); ctx.lineTo(x2,y2); ctx.lineTo(x1+3,y1); ctx.closePath(); ctx.fill();
  });

  // Eyes
  ctx.fillStyle="#1a1a2e";
  ctx.fillRect(flip-4,-35,5,3); ctx.fillRect(flip+3,-35,5,3);
  ctx.fillStyle="#6b7280";
  ctx.fillRect(flip-3,-35,2,2); ctx.fillRect(flip+4,-35,2,2);

  // Attack slash
  if (p.attacking&&p.attackAnim>0) {
    const prog=p.attackAnim/12;
    // Convert screen facing to angle for slash
    const ang=Math.atan2(p.facing.y*ISO_Y, p.facing.x*ISO_X);
    ctx.beginPath(); ctx.moveTo(0,-14);
    ctx.arc(0,-14,ATTACK_RANGE*0.65,ang-0.9,ang+0.9); ctx.closePath();
    ctx.fillStyle=`${energyColor}${Math.floor(prog*60).toString(16).padStart(2,"0")}`; ctx.fill();
    ctx.strokeStyle=`${glowColor}${Math.floor(prog*200).toString(16).padStart(2,"0")}`;
    ctx.lineWidth=3; ctx.stroke();
  }

  ctx.restore();
};

const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy, camX: number, camY: number, tick: number) => {
  if (!e.alive) return;
  const { sx, sy } = toScreen(e.x,e.y,camX,camY);
  if (sx<-80||sx>W+80||sy<-150||sy>H+80) return;
  const flash=e.hitFlash>0;
  const wc=e.walkCycle;
  ctx.save(); ctx.translate(sx,sy);

  if (e.type==="special") {
    const ls=Math.sin(wc)*7;
    [[-10,ls],[10,-ls]].forEach(([lx,rot])=>{
      ctx.fillStyle=flash?"#fff":"#7c0000"; ctx.save();
      ctx.translate(lx as number,2); ctx.rotate((rot as number)*0.04);
      ctx.fillRect(-6,0,12,22);
      ctx.fillStyle=flash?"#fca5a5":"#450a0a";
      [-4,0,4].forEach(cx2=>ctx.fillRect(cx2-1,22,3,7));
      ctx.restore();
    });
    ctx.fillStyle=flash?"#fff":"#991b1b";
    ctx.beginPath(); ctx.ellipse(0,-18,20,16,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=flash?"#fbbf24":"#7f1d1d"; ctx.lineWidth=2; ctx.stroke();
    [[-22,1],[22,-1]].forEach(([ax,sw])=>{
      ctx.fillStyle=flash?"#fff":"#b91c1c"; ctx.save();
      ctx.translate(ax as number,-22); ctx.rotate((sw as number)*Math.sin(wc)*0.08);
      ctx.fillRect(-5,0,10,26);
      ctx.fillStyle=flash?"#fca5a5":"#450a0a";
      [-3,0,3].forEach(cx2=>ctx.fillRect(cx2-1,26,3,8));
      ctx.restore();
    });
    ctx.fillStyle=flash?"#fff":"#7c0000";
    ctx.beginPath(); ctx.ellipse(0,-40,18,16,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=flash?"#fbbf24":"#dc2626"; ctx.lineWidth=2; ctx.stroke();
    [[-8,-43],[8,-43],[0,-36]].forEach(([ex2,ey2])=>{
      ctx.beginPath(); ctx.arc(ex2 as number,ey2 as number,4,0,Math.PI*2);
      ctx.fillStyle=flash?"#dc2626":"#fbbf24"; ctx.fill();
      ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(ex2 as number,ey2 as number,2,0,Math.PI*2); ctx.fill();
    });
    if (e.frozen) {
      ctx.beginPath(); ctx.ellipse(0,-20,22,28,0,0,Math.PI*2);
      ctx.fillStyle="rgba(125,211,252,0.35)"; ctx.fill();
      ctx.strokeStyle="#7dd3fc"; ctx.lineWidth=2; ctx.stroke();
    }
    if (e.viscousStacks>0) {
      ctx.beginPath(); ctx.ellipse(0,-14,20+e.viscousStacks*2,22+e.viscousStacks*2,0,0,Math.PI*2);
      ctx.fillStyle=`rgba(163,230,53,${e.viscousStacks*0.08})`; ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(0,-20,28+Math.sin(tick*0.08)*4,22+Math.sin(tick*0.08)*3,0,0,Math.PI*2);
    ctx.strokeStyle=`rgba(220,38,38,${0.25+0.15*Math.sin(tick*0.07)})`; ctx.lineWidth=3; ctx.stroke();
  } else {
    const sway=Math.sin(wc*0.5)*4;
    if (!flash) {
      for (let i=0;i<4;i++) {
        const ta=(i/4)*Math.PI*2+tick*0.06;
        const tx2=Math.cos(ta)*(12+Math.sin(tick*0.05+i)*4);
        const ty2=Math.sin(ta)*(7+Math.sin(tick*0.05+i)*3);
        ctx.beginPath(); ctx.moveTo(0,-14);
        ctx.quadraticCurveTo(tx2*0.5,-14+ty2*0.5,tx2,-10+ty2);
        ctx.strokeStyle=`rgba(109,40,217,${0.4+0.2*Math.sin(tick*0.07+i)})`;
        ctx.lineWidth=3; ctx.lineCap="round"; ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.moveTo(0,-28+sway);
    for (let i=0;i<=8;i++) {
      const a=(i/8)*Math.PI*2;
      const br=14+Math.sin(tick*0.07+i*1.4)*4;
      if (i===0) { ctx.moveTo(Math.cos(a)*br,Math.sin(a)*br-14+sway); }
      else { ctx.lineTo(Math.cos(a)*br,Math.sin(a)*br-14+sway); }
    }
    ctx.closePath();
    ctx.fillStyle=flash?"#fff":(e.frozen?"#bfdbfe":"#2d1b69"); ctx.fill();
    ctx.strokeStyle=flash?"#c4b5fd":"#5b21b6"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0,-16+sway,7,5,0,0,Math.PI*2);
    ctx.fillStyle=flash?"#fbbf24":"#a78bfa"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0,-16+sway,3,4,0,0,Math.PI*2);
    ctx.fillStyle="#000"; ctx.fill();
    ctx.beginPath(); ctx.arc(-2,-18+sway,1.5,0,Math.PI*2);
    ctx.fillStyle="#fff"; ctx.fill();
    if (e.frozen) {
      ctx.fillStyle="rgba(125,211,252,0.4)";
      ctx.beginPath(); ctx.ellipse(0,-14+sway,16,12,0,0,Math.PI*2); ctx.fill();
    }
  }

  ctx.restore();

  // HP bar
  const bw=e.type==="special"?50:36;
  const hby=sy-(e.type==="special"?68:44), hbx=sx-bw/2;
  ctx.fillStyle="rgba(0,0,0,0.65)"; ctx.fillRect(hbx-1,hby-1,bw+2,7);
  ctx.fillStyle="#ef4444"; ctx.fillRect(hbx,hby,bw,5);
  ctx.fillStyle="#22c55e"; ctx.fillRect(hbx,hby,bw*(e.hp/e.maxHp),5);
  if (e.frozen) { ctx.fillStyle="#7dd3fc"; ctx.font="9px monospace"; ctx.fillText("❄",hbx+bw+3,hby+5); }
  if (e.viscousStacks>=4) { ctx.fillStyle="#a3e635"; ctx.font="9px monospace"; ctx.fillText("◉",hbx+bw+(e.frozen?14:3),hby+5); }
};

const drawParticle = (ctx: CanvasRenderingContext2D, pt: Particle, camX: number, camY: number) => {
  const { sx, sy } = toScreen(pt.x,pt.y,camX,camY);
  const a=pt.life/pt.maxLife;
  ctx.globalAlpha=a;
  if (pt.shape==="ring") {
    ctx.beginPath(); ctx.arc(sx,sy,pt.size*(1.5-a),0,Math.PI*2);
    ctx.strokeStyle=pt.color; ctx.lineWidth=2; ctx.stroke();
  } else if (pt.shape==="spark") {
    const { sx:tx, sy:ty }=toScreen(pt.x-pt.vx*3,pt.y-pt.vy*3,camX,camY);
    ctx.strokeStyle=pt.color; ctx.lineWidth=pt.size*0.5; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(tx,ty); ctx.stroke();
  } else {
    ctx.fillStyle=pt.color;
    ctx.beginPath(); ctx.arc(sx,sy,pt.size*a+0.5,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
};

const drawHUD = (
  ctx: CanvasRenderingContext2D, p: Player,
  energyColor: string, energyNameRu: string, kanji: string,
  unlockedTechniques: string[], specialTimer: number
) => {
  ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(12,12,180,22);
  const hpPct=p.hp/p.maxHp;
  ctx.fillStyle=hpPct>0.6?"#22c55e":hpPct>0.3?"#f59e0b":"#ef4444";
  ctx.fillRect(14,14,176*hpPct,18);
  ctx.strokeStyle="#4338ca"; ctx.lineWidth=1; ctx.strokeRect(12,12,180,22);
  ctx.fillStyle="#f1f5f9"; ctx.font="bold 11px monospace";
  ctx.fillText(`HP  ${p.hp} / ${p.maxHp}`,18,26);

  ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(12,40,180,14);
  const cePct=p.ce/p.maxCe;
  ctx.fillStyle=energyColor; ctx.fillRect(14,42,176*cePct,10);
  ctx.strokeStyle="#4338ca"; ctx.strokeRect(12,40,180,14);
  ctx.fillStyle="#c4b5fd"; ctx.font="9px monospace";
  ctx.fillText(`CE  ${Math.floor(p.ce)}/${p.maxCe}`,16,51);

  ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(12,60,180,12);
  const xpPct=p.xp/p.xpToNext;
  ctx.fillStyle="#fbbf24"; ctx.fillRect(14,62,176*xpPct,8);
  ctx.strokeStyle="#4338ca"; ctx.strokeRect(12,60,180,12);
  ctx.fillStyle="#fde68a"; ctx.font="8px monospace";
  ctx.fillText(`XP  ${p.xp}/${p.xpToNext}  ·  Ур.${p.level}`,16,70);

  ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(12,78,180,20);
  ctx.strokeStyle=energyColor+"55"; ctx.strokeRect(12,78,180,20);
  ctx.fillStyle=energyColor; ctx.font="bold 11px monospace";
  ctx.fillText(`${kanji}  ${energyNameRu}`,18,92);

  let bonusY=107;
  if (p.smolderingBonus>0) {
    ctx.fillStyle="rgba(251,146,60,0.9)"; ctx.font="10px monospace";
    ctx.fillText(`🔥 Тление +${Math.floor(p.smolderingBonus*100)}%`,18,bonusY); bonusY+=14;
  }
  if (p.resonantBonus>0) {
    ctx.fillStyle="rgba(192,132,252,0.9)"; ctx.font="10px monospace";
    ctx.fillText(`⚡ Резонанс +${Math.floor(p.resonantBonus*100)}%`,18,bonusY);
  }

  // Technique slots
  const techs=TECHNIQUES.filter(t=>unlockedTechniques.includes(t.id));
  techs.slice(0,4).forEach((tech,i)=>{
    const bx=12+i*52, by=H-56;
    const isSpecialSlot=tech.id!=="basic_strike";
    ctx.fillStyle="rgba(0,0,0,0.8)"; ctx.fillRect(bx,by,44,44);
    ctx.strokeStyle=isSpecialSlot?"#7c3aed":"#4338ca";
    ctx.lineWidth=1; ctx.strokeRect(bx,by,44,44);
    ctx.fillStyle="#c4b5fd"; ctx.font="bold 10px monospace";
    ctx.fillText(tech.id==="basic_strike"?"Z / X":"E",bx+5,by+15);
    ctx.fillStyle="#6d28d9"; ctx.font="8px monospace";
    ctx.fillText(tech.nameRu.split(" ")[0],bx+3,by+27);
    // cooldown overlay
    if (isSpecialSlot&&specialTimer>0) {
      const cdPct=specialTimer/SPECIAL_COOLDOWN;
      ctx.fillStyle="rgba(0,0,0,0.65)";
      ctx.fillRect(bx,by,44,44*cdPct);
      ctx.fillStyle="#a78bfa"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
      ctx.fillText(`${Math.ceil(specialTimer/60)}s`,bx+22,by+38);
      ctx.textAlign="left";
    }
  });

  if (p.xpGainTimer>0&&p.xpGain>0) {
    const a=Math.min(1,p.xpGainTimer/20);
    ctx.globalAlpha=a;
    ctx.fillStyle="#fbbf24"; ctx.font="bold 14px monospace"; ctx.textAlign="center";
    ctx.fillText(`+${p.xpGain} XP`,W/2,(H/2)-20+((45-p.xpGainTimer)*1.2));
    ctx.textAlign="left"; ctx.globalAlpha=1;
  }

  ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(W/2-190,H-28,380,20);
  ctx.fillStyle="#475569"; ctx.font="9px monospace"; ctx.textAlign="center";
  ctx.fillText("WASD / ↑↓←→  Движение    Z/X  Удар    E  Техника (если разблокирована)",W/2,H-13);
  ctx.textAlign="left";
};

// ─── Component ────────────────────────────────────────────────────────────────

const GameScreen = ({ energy, progress, onGameOver }: Props) => {
  const energyDef = getEnergyDef(energy);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData | null>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef<CharacterProgress>({ ...progress });

  const addParticle = (g: GameData, x: number, y: number, color: string, count=5, shape: Particle["shape"]="circle") => {
    for (let i=0;i<count;i++) {
      g.particles.push({ x,y, vx:(Math.random()-0.5)*7, vy:(Math.random()-0.5)*7,
        life:25+Math.random()*20, maxLife:45, color, size:3+Math.random()*4, shape });
    }
  };

  const addFloat = (g: GameData, x: number, y: number, text: string, color: string) => {
    g.floatTexts.push({ x,y,text,color,life:40,vy:-1.2 });
  };

  const gainXp = useCallback((g: GameData, amount: number) => {
    const p=g.player;
    p.xp+=amount; p.xpGain=amount; p.xpGainTimer=45;
    if (p.xp>=p.xpToNext) {
      p.level++; p.xp-=p.xpToNext; p.xpToNext=xpForLevel(p.level);
      p.maxHp=Math.floor(8*energyDef.statMods.defense+(p.level-1));
      p.hp=Math.min(p.hp+2,p.maxHp);
      p.maxCe=100+(p.level-1)*10;
      if (p.level>=3&&!progressRef.current.unlockedTechniques.includes("cursed_burst"))
        progressRef.current.unlockedTechniques.push("cursed_burst");
      if (p.level>=5&&!progressRef.current.unlockedTechniques.includes("cursed_dash"))
        progressRef.current.unlockedTechniques.push("cursed_dash");
    }
    progressRef.current.level=p.level;
    progressRef.current.xp=p.xp;
    progressRef.current.xpToNext=p.xpToNext;
  }, [energyDef.statMods.defense]);

  const initGame = useCallback(() => {
    const emod=energyDef.statMods;
    const player: Player = {
      x:120,y:120,vx:0,vy:0,
      hp:Math.floor(8*emod.defense),maxHp:Math.floor(8*emod.defense),
      attackTimer:0,invincible:0,
      facing:{x:1,y:0},
      attacking:false,attackAnim:0,
      ce:100,maxCe:100,
      specialTimer:0,
      walkCycle:0,
      combo:0,comboTimer:0,
      smolderingBonus:0,smolderingTimer:0,
      resonantBonus:0,
      hitsUntilPierce:3,
      chargeTimer:0,chargeReady:false,
      level:progress.level,xp:progress.xp,xpToNext:progress.xpToNext,
      xpGain:0,xpGainTimer:0,
    };
    gameRef.current={
      player,enemies:spawnEnemies(),obstacles:createObstacles(),
      particles:[],floatTexts:[],
      camX:120,camY:120,
      keys:new Set(),tick:0,running:true,
    };
  }, [energyDef.statMods, progress]);

  useEffect(() => {
    initGame();
    const canvas=canvasRef.current;
    if (!canvas) return;
    const ctx=canvas.getContext("2d");
    if (!ctx) return;

    const onKey=(e: KeyboardEvent, down: boolean)=>{
      const g=gameRef.current; if (!g) return;
      if (down) g.keys.add(e.code); else g.keys.delete(e.code);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))
        e.preventDefault();
    };
    const kd=(e:KeyboardEvent)=>onKey(e,true);
    const ku=(e:KeyboardEvent)=>onKey(e,false);
    window.addEventListener("keydown",kd);
    window.addEventListener("keyup",ku);

    const emod=energyDef.statMods;
    const SPEED=emod.speed*2.8;
    const pr=12;

    const gameLoop=()=>{
      const g=gameRef.current;
      if (!g||!g.running) return;
      g.tick++;
      const { player:p, enemies, obstacles, keys }=g;

      // ── Screen-space movement ──
      let smx=0,smy=0;
      if (keys.has("ArrowLeft")||keys.has("KeyA"))  smx-=1;
      if (keys.has("ArrowRight")||keys.has("KeyD")) smx+=1;
      if (keys.has("ArrowUp")||keys.has("KeyW"))    smy-=1;
      if (keys.has("ArrowDown")||keys.has("KeyS"))  smy+=1;

      if (smx!==0||smy!==0) {
        const len=Math.sqrt(smx*smx+smy*smy);
        const { wx,wy }=screenDirToWorld(smx/len,smy/len);
        const wl=Math.sqrt(wx*wx+wy*wy)||1;
        p.vx=(wx/wl)*SPEED; p.vy=(wy/wl)*SPEED;
        p.facing={ x:smx/len, y:smy/len };
        p.walkCycle+=0.18;
        if (energy==="smoldering") p.smolderingTimer=120;
      } else {
        p.vx*=0.5; p.vy*=0.5;
        if (energy==="smoldering") p.smolderingBonus=Math.max(0,p.smolderingBonus-0.004);
      }

      // Smoldering accumulate while moving
      if ((smx!==0||smy!==0)&&energy==="smoldering")
        p.smolderingBonus=Math.min(1,p.smolderingBonus+0.0008);

      // Charged: hold to charge
      if (energy==="charged"&&(keys.has("KeyZ")||keys.has("KeyX"))) {
        p.chargeTimer++; if (p.chargeTimer>90) p.chargeReady=true;
      }

      // Move + collide
      const nx=p.x+p.vx, ny=p.y+p.vy;
      let bx=false,by=false;
      obstacles.forEach(o=>{
        if (circleRect(nx,p.y,pr,o.x,o.y,o.w,o.h)) bx=true;
        if (circleRect(p.x,ny,pr,o.x,o.y,o.w,o.h)) by=true;
      });
      if (!bx) p.x=nx; if (!by) p.y=ny;
      p.x=Math.max(pr,Math.min(WORLD_W-pr,p.x));
      p.y=Math.max(pr,Math.min(WORLD_H-pr,p.y));

      // ── Attack ──
      const atkKey=keys.has("KeyZ")||keys.has("KeyX");
      const chargedRelease=energy==="charged"&&!atkKey&&p.chargeTimer>0&&p.chargeTimer<90;
      const chargedStrike=energy==="charged"&&!atkKey&&p.chargeReady;
      const normalAtk=atkKey&&energy!=="charged"&&p.attackTimer<=0;

      if (normalAtk||chargedRelease||chargedStrike) {
        const isCharged=chargedStrike;
        p.attacking=true;
        p.attackTimer=Math.max(12,Math.floor(ATTACK_COOLDOWN/emod.attackSpeed));
        p.attackAnim=12;
        if (energy==="charged") { p.chargeTimer=0; p.chargeReady=false; }
        if (energy==="piercing") { p.hp=Math.max(1,p.hp-1); addParticle(g,p.x,p.y,"#fca5a5",3); }

        const { wx:fwx,wy:fwy }=screenDirToWorld(p.facing.x,p.facing.y);
        const fl=Math.sqrt(fwx*fwx+fwy*fwy)||1;
        const nfx=fwx/fl, nfy=fwy/fl;

        enemies.forEach(e=>{
          if (!e.alive) return;
          const dx=e.x-p.x, dy=e.y-p.y;
          const dist=Math.sqrt(dx*dx+dy*dy);
          const dot=nfx*dx+nfy*dy;
          if (dist<ATTACK_RANGE+e.maxHp&&dot>-8) {
            let dmg=Math.max(1,Math.floor(
              emod.damage*(isCharged?3:1)*
              (energy==="piercing"&&p.hitsUntilPierce===3?2:1)*
              (1+p.smolderingBonus)*(1+p.resonantBonus)
            ));
            if (energy==="smoldering"&&g.tick<600) dmg=Math.max(1,Math.floor(dmg*0.5));

            if (energy==="volatile"&&Math.random()<0.25) {
              addParticle(g,e.x,e.y,"#fb923c",14,"ring");
              addFloat(g,e.x,e.y,"ВЗРЫВ!","#fb923c");
              enemies.forEach(e2=>{ if (!e2.alive) return;
                const d2x=e2.x-e.x,d2y=e2.y-e.y;
                if (d2x*d2x+d2y*d2y<80*80) { e2.hp-=2; e2.hitFlash=8; }
              });
              p.hp=Math.max(1,p.hp-1);
            }
            if (energy==="void") { p.hp=Math.min(p.maxHp,p.hp+1); p.ce=Math.min(p.maxCe,p.ce+5); }
            if (energy==="corrupted") {
              if (Math.random()<0.3) { dmg*=2; addFloat(g,e.x,e.y,"КРИТ×2","#4ade80"); }
              else if (Math.random()<0.15) { p.hp=Math.max(1,p.hp-1); addFloat(g,p.x,p.y,"ОТКАТ","#ef4444"); }
            }

            e.hp-=dmg; e.hitFlash=10; e.vx=nfx*4; e.vy=nfy*4;

            if (energy==="viscous") {
              e.viscousStacks=Math.min(6,e.viscousStacks+1); e.viscousTimer=180; e.slowTimer=60;
              if (e.viscousStacks>=4) addFloat(g,e.x,e.y,"ПРИЛИПАНИЕ","#a3e635");
            }
            if (energy==="frigid") {
              e.freezeStacks=Math.min(6,e.freezeStacks+1); e.freezeTimer=180;
              if (e.freezeStacks>=5&&!e.frozen) {
                e.frozen=true; e.frozenTimer=120; e.freezeStacks=0;
                addFloat(g,e.x,e.y,"ЗАМОРОЖЕН","#7dd3fc");
              }
            }
            if (energy==="radiant") addParticle(g,e.x,e.y,"#fde68a",6,"ring");

            addParticle(g,e.x,e.y,energyDef.color,5,"spark");
            addFloat(g,e.x,e.y,`-${dmg}`,energyDef.color);

            if (e.hp<=0) {
              e.alive=false;
              const xpAmt=e.type==="special"?80:30;
              gainXp(g,xpAmt);
              addParticle(g,e.x,e.y,"#fbbf24",16);
              addFloat(g,e.x,e.y,`+${xpAmt} XP`,"#fbbf24");
            }
          }
        });

        if (energy==="piercing") { p.hitsUntilPierce--; if (p.hitsUntilPierce<=0) p.hitsUntilPierce=3; }
      }

      if (p.attackTimer>0) p.attackTimer--;
      if (p.attackAnim>0) p.attackAnim--;
      if (p.attackTimer===0) p.attacking=false;
      if (p.invincible>0) p.invincible--;
      if (p.specialTimer>0) p.specialTimer--;
      if (p.xpGainTimer>0) p.xpGainTimer--;
      p.ce=Math.min(p.maxCe,p.ce+emod.energyRegen*0.15);

      // ── Special (E) ──
      if (keys.has("KeyE")&&p.specialTimer<=0&&p.ce>=30&&progressRef.current.unlockedTechniques.includes("cursed_burst")) {
        p.ce-=30; p.specialTimer=SPECIAL_COOLDOWN;
        if (energy==="warped") {
          let nearest: Enemy|null=null, nd=9999;
          enemies.forEach(e=>{ if (!e.alive) return;
            const dx=e.x-p.x,dy=e.y-p.y,d=Math.sqrt(dx*dx+dy*dy);
            if (d<nd) { nd=d; nearest=e; }
          });
          if (nearest) {
            const ne=nearest as Enemy;
            const { wx:fwx2,wy:fwy2 }=screenDirToWorld(p.facing.x,p.facing.y);
            const fl2=Math.sqrt(fwx2*fwx2+fwy2*fwy2)||1;
            p.x=ne.x-(fwx2/fl2)*25; p.y=ne.y-(fwy2/fl2)*25;
            addParticle(g,p.x,p.y,energyDef.color,18,"ring");
            ne.hp-=4; ne.hitFlash=15;
            if (ne.hp<=0) { ne.alive=false; gainXp(g,80); addParticle(g,ne.x,ne.y,"#fbbf24",16); }
          }
        } else {
          enemies.forEach(e=>{ if (!e.alive) return;
            const dx=e.x-p.x,dy=e.y-p.y;
            if (dx*dx+dy*dy<110*110) {
              const dmg=Math.floor(3*emod.damage*(1+p.smolderingBonus));
              e.hp-=dmg; e.hitFlash=18; e.vx=dx*0.08; e.vy=dy*0.08;
              addParticle(g,e.x,e.y,energyDef.color,10,"spark");
              if (e.hp<=0) { e.alive=false; gainXp(g,80); addParticle(g,e.x,e.y,"#fbbf24",18); }
            }
          });
          for (let i=0;i<24;i++) {
            const a=(i/24)*Math.PI*2;
            g.particles.push({ x:p.x+Math.cos(a)*8,y:p.y+Math.sin(a)*8,
              vx:Math.cos(a)*9,vy:Math.sin(a)*9,life:35,maxLife:35,color:energyDef.color,size:5,shape:"spark" });
          }
        }
      }

      // ── Enemy AI ──
      enemies.forEach(e=>{
        if (!e.alive) return;
        e.aiTimer++; e.walkCycle+=0.12;
        if (e.frozen) { if (--e.frozenTimer<=0) e.frozen=false; e.vx*=0.1; e.vy*=0.1; }
        if (e.viscousTimer>0) e.viscousTimer--; else e.viscousStacks=Math.max(0,e.viscousStacks-1);
        if (e.freezeTimer>0) e.freezeTimer--; else e.freezeStacks=Math.max(0,e.freezeStacks-1);
        if (e.slowTimer>0) e.slowTimer--;

        const dx=p.x-e.x,dy=p.y-e.y,dist=Math.sqrt(dx*dx+dy*dy);
        const slow=e.slowTimer>0?0.4:e.viscousStacks>0?(1-e.viscousStacks*0.12):1;
        const spd=(e.type==="special"?1.2:1.6)*slow;

        if (!e.frozen&&dist>0&&dist<380) {
          e.vx+=(dx/dist)*spd*0.28; e.vy+=(dy/dist)*spd*0.28;
          const s=Math.sqrt(e.vx*e.vx+e.vy*e.vy);
          if (s>spd) { e.vx=e.vx/s*spd; e.vy=e.vy/s*spd; }
          e.facing=dx>0?1:-1;
        } else if (!e.frozen&&e.aiTimer%80===0) {
          e.vx=(Math.random()-0.5)*1.4; e.vy=(Math.random()-0.5)*1.4;
        }
        e.vx*=0.82; e.vy*=0.82;

        const er=e.type==="special"?18:12;
        const enx=e.x+e.vx,eny=e.y+e.vy;
        let ebx=false,eby=false;
        obstacles.forEach(o=>{
          if (circleRect(enx,e.y,er,o.x,o.y,o.w,o.h)) ebx=true;
          if (circleRect(e.x,eny,er,o.x,o.y,o.w,o.h)) eby=true;
        });
        if (!ebx) e.x=enx; if (!eby) e.y=eny;
        e.x=Math.max(er,Math.min(WORLD_W-er,e.x));
        e.y=Math.max(er,Math.min(WORLD_H-er,e.y));
        if (e.hitFlash>0) e.hitFlash--;

        if (p.invincible<=0&&dist<pr+er+2) {
          if (energy==="resonant") {
            p.resonantBonus=Math.min(0.9,p.resonantBonus+0.15);
            addFloat(g,p.x,p.y,"РЕЗОНАНС!","#c084fc");
          }
          const blocked=energy==="dense"&&Math.random()<0.4;
          if (!blocked) {
            p.hp--; p.invincible=65; addParticle(g,p.x,p.y,"#dc2626",8);
            if (p.hp<=0) {
              g.running=false;
              progressRef.current.level=p.level;
              progressRef.current.xp=p.xp;
              progressRef.current.xpToNext=p.xpToNext;
              onGameOver({...progressRef.current});
            }
          } else {
            p.invincible=20; addFloat(g,p.x,p.y,"БЛОК","#94a3b8");
          }
        }
      });

      g.particles=g.particles.filter(pt=>{ pt.x+=pt.vx; pt.y+=pt.vy; pt.vx*=0.88; pt.vy*=0.88; return --pt.life>0; });
      g.floatTexts=g.floatTexts.filter(ft=>{ ft.y+=ft.vy; return --ft.life>0; });

      g.camX+=(p.x-g.camX)*CAMERA_LERP;
      g.camY+=(p.y-g.camY)*CAMERA_LERP;
      g.camX=Math.max(0,Math.min(WORLD_W,g.camX));
      g.camY=Math.max(0,Math.min(WORLD_H,g.camY));

      // ── Render ──
      drawFloor(ctx,g.camX,g.camY,g.tick);
      g.particles.forEach(pt=>drawParticle(ctx,pt,g.camX,g.camY));

      const dl: {y:number;draw:()=>void}[]=[];
      g.obstacles.forEach(o=>dl.push({y:o.y+o.h/2,draw:()=>drawObstacle(ctx,o,g.camX,g.camY)}));
      enemies.forEach(e=>{ if (e.alive) dl.push({y:e.y,draw:()=>drawEnemy(ctx,e,g.camX,g.camY,g.tick)}); });
      dl.push({y:p.y,draw:()=>drawPlayer(ctx,p,g.tick,g.camX,g.camY,energyDef.color,energyDef.glowColor)});
      dl.sort((a,b)=>a.y-b.y);
      dl.forEach(d=>d.draw());

      g.floatTexts.forEach(ft=>{
        const {sx,sy}=toScreen(ft.x,ft.y,g.camX,g.camY);
        ctx.globalAlpha=Math.min(1,ft.life/20);
        ctx.fillStyle=ft.color; ctx.font="bold 12px monospace"; ctx.textAlign="center";
        ctx.fillText(ft.text,sx,sy-20+((40-ft.life)*0.8));
        ctx.textAlign="left"; ctx.globalAlpha=1;
      });

      drawHUD(ctx,p,energyDef.color,energyDef.nameRu,energyDef.kanji,progressRef.current.unlockedTechniques,p.specialTimer);
      animRef.current=requestAnimationFrame(gameLoop);
    };

    animRef.current=requestAnimationFrame(gameLoop);
    return ()=>{ cancelAnimationFrame(animRef.current); window.removeEventListener("keydown",kd); window.removeEventListener("keyup",ku); };
  },[initGame,onGameOver,energy,energyDef,gainXp]);

  return (
    <canvas ref={canvasRef} width={W} height={H}
      style={{display:"block",width:"100%",height:"100%",background:"#07060f"}} />
  );
};

export default GameScreen;

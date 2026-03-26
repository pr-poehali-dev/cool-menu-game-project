import { useEffect, useRef, useState } from "react";

interface Props {
  onPlay: () => void;
  onInfo: () => void;
}

const MenuScreen = ({ onPlay, onInfo }: Props) => {
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    setTimeout(() => setVisible(true), 120);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;
    let tick = 0;

    // Rune circles
    const runes = Array.from({ length: 5 }, (_, i) => ({
      x: W * (0.15 + i * 0.18),
      y: H * (0.3 + Math.sin(i * 1.7) * 0.25),
      r: 60 + i * 20,
      speed: 0.003 + i * 0.001,
      segments: 5 + i,
    }));

    // Floating particles
    const particles: { x: number; y: number; vx: number; vy: number; r: number; t: number; color: string }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.3 - Math.random() * 0.5,
        r: 1 + Math.random() * 2,
        t: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? "#7c3aed" : "#a78bfa",
      });
    }

    // Cursed cracks in background
    const cracks: { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      cracks.push({
        x1: sx, y1: sy,
        x2: sx + (Math.random() - 0.5) * 200,
        y2: sy + (Math.random() - 0.5) * 200,
        x3: sx + (Math.random() - 0.5) * 300,
        y3: sy + (Math.random() - 0.5) * 300,
      });
    }

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
      bg.addColorStop(0, "#0d0b1e");
      bg.addColorStop(0.5, "#08061a");
      bg.addColorStop(1, "#030208");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Cursed cracks
      ctx.save();
      cracks.forEach((c, ci) => {
        const alpha = 0.08 + 0.06 * Math.sin(tick * 0.02 + ci);
        ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(c.x1, c.y1);
        ctx.lineTo(c.x2, c.y2);
        ctx.lineTo(c.x3, c.y3);
        ctx.stroke();
      });
      ctx.restore();

      // Floating cursed particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.t += 0.03;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }

        const alpha = 0.4 + 0.4 * Math.abs(Math.sin(p.t));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(")", `,${alpha})`).replace("rgb", "rgba");
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Rotating rune circles
      runes.forEach((ru, ri) => {
        const angle = tick * ru.speed + ri;
        const pulseR = ru.r + Math.sin(tick * 0.04 + ri) * 8;

        ctx.save();
        ctx.translate(ru.x, ru.y);
        ctx.rotate(angle);

        ctx.strokeStyle = `rgba(124,58,237,${0.15 + 0.1 * Math.sin(tick * 0.05 + ri)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        // Pentagon/star rune
        ctx.beginPath();
        for (let i = 0; i <= ru.segments; i++) {
          const a = (i / ru.segments) * Math.PI * 2;
          const rx = Math.cos(a) * pulseR * 0.85;
          const ry = Math.sin(a) * pulseR * 0.85;
          if (i === 0) { ctx.moveTo(rx, ry); } else { ctx.lineTo(rx, ry); }
        }
        ctx.strokeStyle = `rgba(167,139,250,${0.12 + 0.08 * Math.sin(tick * 0.04 + ri)})`;
        ctx.stroke();

        // Inner rune lines (star pattern)
        for (let i = 0; i < ru.segments; i++) {
          const a1 = (i / ru.segments) * Math.PI * 2;
          const a2 = ((i + 2) / ru.segments) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a1) * pulseR * 0.85, Math.sin(a1) * pulseR * 0.85);
          ctx.lineTo(Math.cos(a2) * pulseR * 0.85, Math.sin(a2) * pulseR * 0.85);
          ctx.strokeStyle = `rgba(139,92,246,${0.08 + 0.06 * Math.sin(tick * 0.06)})`;
          ctx.stroke();
        }

        ctx.restore();
      });

      // Central glow behind title
      const cg = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, 200);
      cg.addColorStop(0, `rgba(109,40,217,${0.12 + 0.06 * Math.sin(tick * 0.05)})`);
      cg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(W / 2 - 200, H * 0.38 - 200, 400, 400);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="menu-screen">
      <canvas ref={canvasRef} className="menu-canvas" />
      <div className={`menu-overlay ${visible ? "menu-visible" : ""}`}>
        <div className="menu-logo">
          <div className="menu-logo-cursed">CURSED</div>
          <div className="menu-logo-legacy">LEGACY</div>
        </div>
        <div className="menu-subtitle">呪術廻戦 — Проклятая энергия пробуждается</div>
        <div className="menu-controls-hint">
          <span>WASD / ↑↓←→ Движение</span>
          <span>Z / X Удар</span>
          <span>E Техника</span>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
          <button className="menu-play-btn" onClick={onPlay}>
            <span className="menu-play-arrow">▶</span>
            НАЧАТЬ ПУТЬ
          </button>
          <button className="menu-play-btn" onClick={onInfo} style={{ fontSize: 15, padding: "14px 28px", opacity: 0.75 }}>
            ✦ ИНФО
          </button>
        </div>
      </div>

      <style>{`
        .menu-screen {
          position: fixed; inset: 0;
          background: #030208;
          display: flex; align-items: center; justify-content: center;
        }
        .menu-canvas {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
        }
        .menu-overlay {
          position: relative; z-index: 10;
          display: flex; flex-direction: column;
          align-items: center; gap: 20px;
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .menu-overlay.menu-visible {
          opacity: 1; transform: translateY(0);
        }
        .menu-logo {
          text-align: center;
          line-height: 1;
        }
        .menu-logo-cursed {
          font-family: 'Georgia', serif;
          font-size: clamp(52px, 8vw, 88px);
          font-weight: 900;
          letter-spacing: 0.18em;
          color: #a78bfa;
          text-shadow: 0 0 30px rgba(139,92,246,0.9), 0 0 60px rgba(109,40,217,0.5);
          animation: cursedPulse 3s ease-in-out infinite;
        }
        .menu-logo-legacy {
          font-family: 'Georgia', serif;
          font-size: clamp(36px, 5.5vw, 60px);
          font-weight: 400;
          letter-spacing: 0.55em;
          color: #c4b5fd;
          text-shadow: 0 0 20px rgba(196,181,253,0.6);
          margin-top: -8px;
        }
        @keyframes cursedPulse {
          0%, 100% { text-shadow: 0 0 30px rgba(139,92,246,0.9), 0 0 60px rgba(109,40,217,0.5); }
          50% { text-shadow: 0 0 50px rgba(139,92,246,1), 0 0 100px rgba(109,40,217,0.8), 0 0 140px rgba(88,28,135,0.4); }
        }
        .menu-subtitle {
          font-family: monospace;
          font-size: 14px;
          color: #7c3aed;
          letter-spacing: 0.15em;
          opacity: 0.85;
        }
        .menu-controls-hint {
          display: flex; gap: 28px;
          font-family: monospace;
          font-size: 12px;
          color: #6d28d9;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(109,40,217,0.3);
          padding: 10px 24px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }
        .menu-play-btn {
          display: flex; align-items: center; gap: 12px;
          background: transparent;
          border: 2px solid #7c3aed;
          color: #a78bfa;
          font-family: 'Georgia', serif;
          font-size: 18px;
          letter-spacing: 0.25em;
          padding: 14px 40px;
          cursor: pointer;
          transition: all 0.25s ease;
          text-shadow: 0 0 10px rgba(167,139,250,0.5);
          box-shadow: 0 0 20px rgba(124,58,237,0.2), inset 0 0 20px rgba(124,58,237,0.05);
        }
        .menu-play-btn:hover {
          background: rgba(124,58,237,0.15);
          border-color: #a78bfa;
          color: #c4b5fd;
          box-shadow: 0 0 40px rgba(124,58,237,0.5), inset 0 0 20px rgba(124,58,237,0.1);
          transform: scale(1.04);
        }
        .menu-play-arrow { font-size: 14px; }
      `}</style>
    </div>
  );
};

export default MenuScreen;
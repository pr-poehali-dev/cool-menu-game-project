import { useEffect, useRef, useState } from "react";

interface Props {
  onPlay: () => void;
}

const MenuScreen = ({ onPlay }: Props) => {
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const buildings: { x: number; w: number; h: number; lit: { x: number; y: number; on: boolean }[] }[] = [];
    const count = Math.floor(canvas.width / 60) + 2;

    for (let i = 0; i < count; i++) {
      const w = 40 + Math.random() * 60;
      const h = 80 + Math.random() * 280;
      const x = i * (canvas.width / count);
      const lit = [];
      for (let wy = 0; wy < Math.floor(h / 24); wy++) {
        for (let wx = 0; wx < Math.floor(w / 18); wx++) {
          lit.push({ x: wx * 18 + 4, y: wy * 24 + 4, on: Math.random() > 0.4 });
        }
      }
      buildings.push({ x, w, h, lit });
    }

    let tick = 0;
    const stars: { x: number; y: number; r: number; t: number }[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.5,
      r: Math.random() * 1.5 + 0.3,
      t: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#080c18");
      grad.addColorStop(1, "#0d1a2e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((s) => {
        s.t += 0.02;
        const alpha = 0.4 + 0.6 * Math.abs(Math.sin(s.t));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      });

      const moonX = canvas.width * 0.8;
      const moonY = canvas.height * 0.15;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 36, 0, Math.PI * 2);
      ctx.fillStyle = "#f0e6c8";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(moonX + 14, moonY - 8, 30, 0, Math.PI * 2);
      ctx.fillStyle = "#0d1a2e";
      ctx.fill();

      buildings.forEach((b) => {
        const groundY = canvas.height - 80;
        const bx = b.x;
        const by = groundY - b.h;

        ctx.fillStyle = "#111827";
        ctx.fillRect(bx, by, b.w, b.h);

        ctx.strokeStyle = "#1f2d45";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, b.w, b.h);

        b.lit.forEach((w) => {
          if (tick % 180 === 0 && Math.random() > 0.85) w.on = !w.on;
          if (w.on) {
            ctx.fillStyle = "#fbbf24";
            ctx.globalAlpha = 0.85;
            ctx.fillRect(bx + w.x, by + w.y, 10, 14);
            ctx.globalAlpha = 1;
          }
        });

        ctx.fillStyle = "#1a2438";
        ctx.fillRect(bx + b.w / 2 - 6, groundY - b.h, 3, b.h * 0.08);
        ctx.beginPath();
        ctx.arc(bx + b.w / 2 - 4.5, groundY - b.h, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
      });

      const groundY = canvas.height - 80;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, groundY, canvas.width, 80);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, groundY, canvas.width, 3);

      for (let rx = 0; rx < canvas.width; rx += 120) {
        ctx.fillStyle = "#facc15";
        ctx.globalAlpha = 0.7;
        ctx.fillRect(rx + (tick * 0.5) % 120, groundY + 35, 60, 4);
        ctx.globalAlpha = 1;
      }

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
          <span className="menu-logo-accent">NIGHT</span>
          <span className="menu-logo-main">RUNNER</span>
        </div>
        <div className="menu-subtitle">2D городской экшен</div>
        <div className="menu-controls-hint">
          <span>← → Движение</span>
          <span>↑ Прыжок</span>
          <span>Z Удар</span>
        </div>
        <button className="menu-play-btn" onClick={onPlay}>
          <span className="menu-play-arrow">▶</span>
          ИГРАТЬ
        </button>
      </div>
    </div>
  );
};

export default MenuScreen;

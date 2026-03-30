"use client";

import { useEffect, useRef } from "react";

const COUNT = 1200;
const BASE_HUE = 45;

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
  hue: number;
  lightness: number;
}

function create(w: number, h: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * Math.min(w, h) * 0.35;
  return {
    x: w / 2 + Math.cos(angle) * radius,
    y: h / 2 + Math.sin(angle) * radius,
    z: Math.random(),
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    phase: Math.random() * Math.PI * 2,
    size: 1 + Math.random() * 2,
    hue: BASE_HUE + (Math.random() - 0.5) * 20,
    lightness: 30 + Math.random() * 40,
  };
}

export default function ParticleCanvas2D() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    let particles: Particle[] = [];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    function init() {
      resize();
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      particles = Array.from({ length: COUNT }, () => create(w, h));
    }

    function draw(t: number) {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const time = t * 0.001;

      for (const p of particles) {
        // orbital drift
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const orbitSpeed = 0.15 / (dist * 0.01 + 1);

        p.x += -dy * orbitSpeed + p.vx;
        p.y += dx * orbitSpeed + p.vy;

        // subtle breathing
        const breathe = Math.sin(time * 0.8 + p.phase) * 0.4;
        p.x += (cx - p.x) * 0.001 * (1 + breathe);
        p.y += (cy - p.y) * 0.001 * (1 + breathe);

        // wrap
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // depth flicker
        const flicker = 0.5 + 0.5 * Math.sin(time * 1.5 + p.phase);
        const alpha = (0.3 + p.z * 0.5) * (0.6 + flicker * 0.4);
        const sz = p.size * (0.6 + p.z * 0.8);

        // glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 4);
        gradient.addColorStop(0, `hsla(${p.hue}, 90%, ${p.lightness}%, ${alpha})`);
        gradient.addColorStop(0.4, `hsla(${p.hue}, 80%, ${p.lightness * 0.7}%, ${alpha * 0.3})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 70%, ${p.lightness * 0.5}%, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, sz * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, ${Math.min(p.lightness + 30, 90)}%, ${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    init();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", init);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useWeather } from "./WeatherProvider";
import { classifyWeather, type Weather, type WeatherKind } from "@/lib/weather";

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Flake {
  x: number;
  y: number;
  vy: number;
  size: number;
  alpha: number;
  drift: number;
}

export default function WeatherParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weather = useWeather();
  const weatherRef = useRef<Weather | null>(weather);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let drops: Drop[] = [];
    let flakes: Flake[] = [];
    let activeKind: WeatherKind | "none" = "none";

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (activeKind === "rain" || activeKind === "thunder") {
        spawnDrops(drops.length || 280);
      } else if (activeKind === "snow") {
        spawnFlakes(flakes.length || 140);
      }
    };

    const spawnDrops = (count: number) => {
      const wx = weatherRef.current;
      const windDeg = wx?.wind?.deg ?? 0;
      // Wind comes FROM windDeg; horizontal component drives drop slant
      const windRad = (windDeg * Math.PI) / 180;
      const horizSpeed = Math.sin(windRad) * 180;
      drops = Array.from({ length: count }, () => ({
        x: Math.random() * (w + 100) - 50,
        y: Math.random() * h,
        vx: horizSpeed + (Math.random() - 0.5) * 40,
        vy: 700 + Math.random() * 350,
      }));
    };

    const spawnFlakes = (count: number) => {
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: 30 + Math.random() * 35,
        size: 1.5 + Math.random() * 1.6,
        alpha: 0.5 + Math.random() * 0.4,
        drift: Math.random() * Math.PI * 2,
      }));
    };

    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, w, h);

      const wx = weatherRef.current;
      const kind: WeatherKind = wx
        ? classifyWeather(wx.weather[0]?.id ?? 800)
        : "clear";
      const visibility = wx?.visibility ?? 10000;
      const rainMm = wx?.rain?.["1h"] ?? 0;
      const snowMm = wx?.snow?.["1h"] ?? 0;

      if (kind !== activeKind) {
        if (kind === "rain" || kind === "thunder") {
          const count = Math.floor(200 + Math.min(1, rainMm / 6) * 350);
          spawnDrops(count);
          flakes = [];
        } else if (kind === "snow") {
          const count = Math.floor(100 + Math.min(1, snowMm / 4) * 120);
          spawnFlakes(count);
          drops = [];
        } else {
          drops = [];
          flakes = [];
        }
        activeKind = kind;
      }

      if (kind === "rain" || kind === "thunder") {
        ctx.strokeStyle = "rgba(190,210,230,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of drops) {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          if (d.y > h + 20) {
            d.y = -10;
            d.x = Math.random() * w;
          }
          if (d.x > w + 30) d.x -= w + 60;
          if (d.x < -30) d.x += w + 60;
          const tx = d.x - d.vx * 0.018;
          const ty = d.y - d.vy * 0.018;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(tx, ty);
        }
        ctx.stroke();
      }

      if (kind === "snow") {
        ctx.fillStyle = "#f0eee8";
        for (const f of flakes) {
          f.drift += dt * 0.6;
          f.x += Math.sin(f.drift) * 0.4;
          f.y += f.vy * dt;
          if (f.y > h + 5) {
            f.y = -5;
            f.x = Math.random() * w;
          }
          if (f.x > w + 5) f.x = -5;
          if (f.x < -5) f.x = w + 5;
          ctx.globalAlpha = f.alpha;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (kind === "fog") {
        // visibility 10000m = clear; 0m = thick fog
        const fogAlpha = Math.min(0.35, (1 - visibility / 10000) * 0.45);
        if (fogAlpha > 0.02) {
          ctx.fillStyle = `rgba(225,225,220,${fogAlpha})`;
          ctx.fillRect(0, 0, w, h);
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[5] h-full w-full"
      aria-hidden="true"
    />
  );
}

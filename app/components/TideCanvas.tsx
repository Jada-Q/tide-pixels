"use client";

import { useEffect, useRef } from "react";
import { getSkyPalette, type SkyPalette } from "@/lib/sky";
import { getTideState, getMoonInfo, getSunInfo } from "@/lib/tide";
import type { Location } from "@/lib/locations";

export default function TideCanvas({ location }: { location: Location }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    const stars = generateStars(60);
    let nextMeteorAt = start + 8000;
    let activeMeteor: Meteor | null = null;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const date = new Date();
      const palette = getSkyPalette(date, location.timezone);
      const tide = getTideState(date, location.lat, location.lng);
      const moon = getMoonInfo(date, location.lat, location.lng);
      const sun = getSunInfo(date, location.lat, location.lng);

      const horizonY = h * 0.62 - tide.level * h * 0.04;
      const nightFactor = computeNight(sun.altitude);

      drawSky(ctx, w, h, horizonY, palette);
      if (nightFactor > 0.05) drawStars(ctx, w, horizonY, stars, t, nightFactor);
      drawCelestialBodies(
        ctx,
        w,
        h,
        horizonY,
        palette,
        sun.altitude,
        sun.azimuth,
        moon.altitude,
        moon.azimuth,
        moon.phase,
        moon.fraction,
      );

      if (nightFactor > 0.5) {
        if (!activeMeteor && now > nextMeteorAt) {
          activeMeteor = spawnMeteor(now, w, horizonY);
          nextMeteorAt = now + 30000 + Math.random() * 60000;
        }
        if (activeMeteor) {
          const finished = drawMeteor(ctx, activeMeteor, now, nightFactor);
          if (finished) activeMeteor = null;
        }
      }

      drawSea(ctx, w, h, horizonY, palette, t, tide.level);
      drawNoise(ctx, w, h);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [location.lat, location.lng, location.timezone]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-full w-full"
      aria-label="Tide Pixels — Tokyo Bay"
    />
  );
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  p: SkyPalette,
) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
  grad.addColorStop(0, p.top);
  grad.addColorStop(0.55, p.mid);
  grad.addColorStop(1, p.horizon);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, horizonY);
}

function drawCelestialBodies(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  p: SkyPalette,
  sunAlt: number,
  sunAz: number,
  moonAlt: number,
  moonAz: number,
  moonPhase: number,
  _moonFrac: number,
) {
  // Sun
  if (sunAlt > -0.1) {
    const { x, y } = celestialToScreen(sunAlt, sunAz, w, horizonY);
    const r = 26;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    glow.addColorStop(0, "rgba(255,236,200,0.55)");
    glow.addColorStop(1, "rgba(255,236,200,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = sunAlt < 0.1 ? "#ffd49a" : "#fff4d8";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moon
  if (moonAlt > -0.05) {
    const { x, y } = celestialToScreen(moonAlt, moonAz, w, horizonY);
    const r = 22;
    const moonFrac = _moonFrac;

    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    glow.addColorStop(0, "rgba(240,236,220,0.35)");
    glow.addColorStop(1, "rgba(240,236,220,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    // dark base
    ctx.fillStyle = p.top;
    ctx.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2);

    // lit half (waxing = right, waning = left)
    const waxing = moonPhase < 0.5;
    ctx.fillStyle = "#f0ecdc";
    if (waxing) ctx.fillRect(x, y - r - 1, r + 1, r * 2 + 2);
    else ctx.fillRect(x - r - 1, y - r - 1, r + 1, r * 2 + 2);

    // terminator ellipse: shrinks lit when crescent, expands lit when gibbous
    const ellipseRx = Math.abs(1 - 2 * moonFrac) * r;
    if (moonFrac < 0.5) {
      ctx.fillStyle = p.top;
    } else {
      ctx.fillStyle = "#f0ecdc";
    }
    ctx.beginPath();
    ctx.ellipse(x, y, ellipseRx, r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function celestialToScreen(
  altitude: number, // radians, -PI/2..PI/2
  azimuth: number, // radians, 0=south, +west, suncalc convention
  w: number,
  horizonY: number,
) {
  // Map azimuth: south=center, east=left, west=right
  // Normalize azimuth to [-PI, PI]
  let az = azimuth;
  while (az > Math.PI) az -= Math.PI * 2;
  while (az < -Math.PI) az += Math.PI * 2;
  // x: -PI/2 (east) → 0.05*w; +PI/2 (west) → 0.95*w; 0 (south) → 0.5*w
  const x = w * 0.5 + (az / (Math.PI / 2)) * w * 0.45;
  // y: altitude PI/2 (zenith) → 0.05*horizonY; 0 (horizon) → horizonY*0.95
  const y = horizonY * (1 - Math.max(0, altitude) / (Math.PI / 2)) - 8;
  return { x, y };
}

function drawSea(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  p: SkyPalette,
  t: number,
  tideLevel: number,
) {
  // Sea base gradient
  const grad = ctx.createLinearGradient(0, horizonY, 0, h);
  grad.addColorStop(0, p.sea);
  grad.addColorStop(1, p.seaDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Multi-layer wave bands — translucent strokes only, no fills
  const layers = [
    { amp: 1.2, freq: 0.014, speed: 0.5, alpha: 0.18, yOffset: 4 },
    { amp: 2, freq: 0.009, speed: 0.7, alpha: 0.13, yOffset: 22 },
    { amp: 3, freq: 0.006, speed: 0.35, alpha: 0.09, yOffset: 56 },
    { amp: 4.5, freq: 0.004, speed: 0.18, alpha: 0.06, yOffset: 110 },
  ];

  layers.forEach((layer, i) => {
    ctx.strokeStyle = hexWithAlpha(p.foam, layer.alpha);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y =
        horizonY +
        layer.yOffset +
        Math.sin(x * layer.freq + t * layer.speed + i) * layer.amp +
        Math.sin(x * layer.freq * 2.3 + t * layer.speed * 0.7) * layer.amp * 0.4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // Crisp horizon line at the lift
  const lineAlpha = 0.55 + tideLevel * 0.2;
  ctx.strokeStyle = hexWithAlpha(p.foam, Math.max(0.25, Math.min(0.8, lineAlpha)));
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const y = horizonY + Math.sin(x * 0.02 + t * 0.5) * 0.6;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Deep sea floor vignette (bottom 40% darker)
  const vignette = ctx.createLinearGradient(0, h * 0.7, 0, h);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
}

function drawNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  // Subtle film grain — sample sparse pixels for performance
  ctx.fillStyle = "rgba(255,255,255,0.012)";
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.fillStyle = "rgba(0,0,0,0.015)";
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillRect(x, y, 1, 1);
  }
}

function hexWithAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleOffset: number;
}

interface Meteor {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  startMs: number;
  durationMs: number;
}

function generateStars(count: number): Star[] {
  // Seeded LCG so star field is deterministic across reloads
  let seed = 1337;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand() * 0.6, // top 60% of sky
    size: rand() * 1.3 + 0.4,
    brightness: rand() * 0.6 + 0.4,
    twinkleOffset: rand() * Math.PI * 2,
  }));
}

function computeNight(sunAltitude: number): number {
  // Linear ramp: sun above horizon = 0, sun -0.3 rad (~-17°) = 1
  if (sunAltitude > 0) return 0;
  return Math.min(1, -sunAltitude / 0.3);
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  stars: Star[],
  t: number,
  nightFactor: number,
) {
  for (const s of stars) {
    const sx = s.x * w;
    const sy = s.y * horizonY;
    const twinkle = 0.75 + 0.25 * Math.sin(t * 1.3 + s.twinkleOffset);
    const alpha = nightFactor * s.brightness * twinkle;
    ctx.fillStyle = `rgba(245,245,235,${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function spawnMeteor(nowMs: number, w: number, horizonY: number): Meteor {
  const x0 = Math.random() * w;
  const y0 = Math.random() * horizonY * 0.4;
  // Diagonal toward bottom-left or bottom-right (avoid pure vertical)
  const angle = (Math.PI / 4) + (Math.random() * Math.PI / 4); // 45-90 deg
  const dirSign = Math.random() > 0.5 ? 1 : -1;
  const speed = 380; // px/sec
  return {
    x0,
    y0,
    vx: Math.cos(angle) * speed * dirSign,
    vy: Math.sin(angle) * speed,
    startMs: nowMs,
    durationMs: 1100 + Math.random() * 400,
  };
}

function drawMeteor(
  ctx: CanvasRenderingContext2D,
  m: Meteor,
  nowMs: number,
  nightFactor: number,
): boolean {
  const elapsed = (nowMs - m.startMs) / 1000;
  if (elapsed * 1000 > m.durationMs) return true;
  const progress = (elapsed * 1000) / m.durationMs;
  const cx = m.x0 + m.vx * elapsed;
  const cy = m.y0 + m.vy * elapsed;
  const trailLen = 70;
  const tx = cx - (m.vx / 380) * trailLen;
  const ty = cy - (m.vy / 380) * trailLen;
  // Fade in then out
  const fade = Math.sin(progress * Math.PI) * nightFactor;

  const grad = ctx.createLinearGradient(cx, cy, tx, ty);
  grad.addColorStop(0, `rgba(255,255,250,${0.95 * fade})`);
  grad.addColorStop(0.5, `rgba(255,255,250,${0.4 * fade})`);
  grad.addColorStop(1, "rgba(255,255,250,0)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(cx, cy);
  ctx.stroke();

  // Bright head
  ctx.fillStyle = `rgba(255,255,250,${fade})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
  ctx.fill();

  return false;
}

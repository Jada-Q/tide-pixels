"use client";

import { useEffect, useRef } from "react";

// 10 wide × 12 tall. Char map:
// . transparent, W bandana, H hair, S skin, O eye, B body (海女着), F feet, K basket (魚籠), L basket rim (light)
const FRAME_IDLE_A = [
  "..WWWW....",
  ".HWHHWH...",
  ".HSSSSH...",
  ".HSOOSH...",
  "..HHHH....",
  ".BBBBBB...",
  ".BBBBBB.LL",
  ".BBBBBB.KK",
  "..BBBB..KK",
  "..B..B....",
  "..B..B....",
  "..FF.FF...",
];

const FRAME_IDLE_B = [
  "..WWWW....",
  ".HWHHWH...",
  ".HSSSSH...",
  ".HSOOSH...",
  ".BHHHHB...",
  ".BBBBBB...",
  ".BBBBBB.LL",
  ".BBBBBB.KK",
  "..BBBB..KK",
  "..B..B....",
  "..B..B....",
  "..FF.FF...",
];

const FRAME_DIVE_A = [
  "..........",
  "..WWWW....",
  ".HWHHWH...",
  ".HSSSSH...",
  ".HSOOSH...",
  "..HHHH....",
  ".BBBBBB...",
  ".BBBBBB.LL",
  ".BBBBBB.KK",
  "..BBBB..KK",
  "..B..B....",
  "..FF.FF...",
];

const FRAME_DIVE_B = [
  "..........",
  "..........",
  "..........",
  "..WWWW....",
  ".HWHHWH...",
  ".HSSSSH...",
  ".BHHHHB...",
  ".BBBBBB.LL",
  ".BBBBBB.KK",
  ".BBBBBB.KK",
  "..BBBB....",
  "..FF.FF...",
];

const FRAME_DIVE_C = [
  "..........",
  "..........",
  "..........",
  "..........",
  "..........",
  "..WWWW....",
  ".HHHHHH.LL",
  ".BBBBBB.KK",
  ".BBBBBB.KK",
  "..BBBB....",
  "..........",
  "..........",
];

const COLORS: Record<string, string> = {
  W: "#f8f4ec",
  H: "#1a1612",
  S: "#e8c9a8",
  O: "#1a1612",
  B: "#8a3a2c",
  F: "#3a2418",
  K: "#8a6638", // 魚籠 wicker brown
  L: "#b8915c", // 魚籠 rim highlight
};

const PIXEL = 6;
const CANVAS_W = 10 * PIXEL;
const CANVAS_H = 13 * PIXEL;

// Movement bounds (y=0 = surface, y>0 = diving deeper)
const Y_SURFACE = 0;
const Y_MAX_DIVE = 240; // ~240px deepest dive
const X_PADDING = 20;
const MOVE_SPEED = 220; // px/sec

function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: string[],
  yOffset = 0,
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      const color = COLORS[c];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL, (y + yOffset) * PIXEL, PIXEL, PIXEL);
      }
    }
  }
}

function drawRipple(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(2 * PIXEL, 6 * PIXEL, 4 * PIXEL, 1);
  ctx.fillRect(1 * PIXEL, 6 * PIXEL + 2, 6 * PIXEL, 1);
}

export default function NagiSprite() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const keys = new Set<string>();
    let pos = { x: 0, y: 0 };
    let lastInputAt = 0; // when keyboard last used
    let autoState: "idle" | "diving" | "underwater" | "surfacing" = "idle";
    let autoStateStart = performance.now();
    let frameToggle = 0;
    let lastFrameSwap = performance.now();
    let lastTick = performance.now();
    let raf = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (
        k === "ArrowUp" ||
        k === "ArrowDown" ||
        k === "ArrowLeft" ||
        k === "ArrowRight" ||
        k === "w" ||
        k === "a" ||
        k === "s" ||
        k === "d"
      ) {
        keys.add(k);
        lastInputAt = performance.now();
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const tick = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      // Position update from keys
      let dx = 0,
        dy = 0;
      if (keys.has("ArrowLeft") || keys.has("a")) dx -= MOVE_SPEED * dt;
      if (keys.has("ArrowRight") || keys.has("d")) dx += MOVE_SPEED * dt;
      if (keys.has("ArrowUp") || keys.has("w")) dy -= MOVE_SPEED * dt;
      if (keys.has("ArrowDown") || keys.has("s")) dy += MOVE_SPEED * dt;

      pos.x += dx;
      pos.y += dy;
      // clamp y: surface (0) → max dive (Y_MAX_DIVE)
      // "上不超水面" = y can't go below Y_SURFACE (which is 0)
      pos.y = Math.max(Y_SURFACE, Math.min(Y_MAX_DIVE, pos.y));
      // clamp x to viewport
      const halfW = window.innerWidth / 2;
      pos.x = Math.max(-halfW + X_PADDING, Math.min(halfW - X_PADDING, pos.x));

      // Apply position to wrapper
      wrap.style.transform = `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`;

      // Frame toggle every 600ms
      if (now - lastFrameSwap > 600) {
        frameToggle = 1 - frameToggle;
        lastFrameSwap = now;
      }

      const userActive = now - lastInputAt < 1500;

      let frame: string[] | null = null;
      let yOffset = 0;

      if (userActive) {
        // Position-driven frame selection based on y
        if (pos.y < 8) {
          frame = frameToggle ? FRAME_IDLE_A : FRAME_IDLE_B;
          yOffset = frameToggle ? 1 : 0;
        } else if (pos.y < 60) {
          frame = FRAME_DIVE_A;
        } else if (pos.y < 140) {
          frame = FRAME_DIVE_B;
        } else if (pos.y < 220) {
          frame = FRAME_DIVE_C;
        } else {
          // fully underwater — just ripple
          drawRipple(ctx);
          raf = requestAnimationFrame(tick);
          return;
        }
      } else {
        // Auto-cycle when user idle
        const stateMs = now - autoStateStart;
        if (autoState === "idle" && stateMs > 25000 + Math.random() * 15000) {
          autoState = "diving";
          autoStateStart = now;
        } else if (autoState === "diving" && stateMs > 1400) {
          autoState = "underwater";
          autoStateStart = now;
        } else if (
          autoState === "underwater" &&
          stateMs > 4000 + Math.random() * 4000
        ) {
          autoState = "surfacing";
          autoStateStart = now;
        } else if (autoState === "surfacing" && stateMs > 1400) {
          autoState = "idle";
          autoStateStart = now;
        }

        if (autoState === "idle") {
          frame = frameToggle ? FRAME_IDLE_A : FRAME_IDLE_B;
          yOffset = frameToggle ? 1 : 0;
        } else if (autoState === "diving") {
          const step = Math.floor((stateMs / 1400) * 3);
          frame =
            step === 0
              ? FRAME_DIVE_A
              : step === 1
                ? FRAME_DIVE_B
                : FRAME_DIVE_C;
        } else if (autoState === "surfacing") {
          const step = Math.floor((stateMs / 1400) * 3);
          frame =
            step === 0
              ? FRAME_DIVE_C
              : step === 1
                ? FRAME_DIVE_B
                : FRAME_DIVE_A;
        } else {
          drawRipple(ctx);
          raf = requestAnimationFrame(tick);
          return;
        }
      }

      if (frame) drawFrame(ctx, frame, yOffset);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none fixed left-1/2 z-10 hidden select-none md:block"
      style={{
        top: "calc(66% - 36px)",
        width: `${CANVAS_W}px`,
        height: `${CANVAS_H}px`,
        transform: "translateX(-50%)",
        willChange: "transform",
      }}
      aria-label="Nagi 凪 — 海女 (方向キーで操作)"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          width: `${CANVAS_W}px`,
          height: `${CANVAS_H}px`,
          imageRendering: "pixelated",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
        }}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

// Pixel sprite: 8 wide × 12 tall. Chars: . transparent, W bandana, H hair, S skin, B body (海女着, weathered red), F feet, O eye
const FRAME_IDLE_A = [
  "..WWWW..",
  ".HWHHWH.",
  ".HSSSSH.",
  ".HSOOSH.",
  "..HHHH..",
  ".BBBBBB.",
  ".BBBBBB.",
  ".BBBBBB.",
  "..BBBB..",
  "..B..B..",
  "..B..B..",
  "..FF.FF.",
];

const FRAME_IDLE_B = [
  "..WWWW..",
  ".HWHHWH.",
  ".HSSSSH.",
  ".HSOOSH.",
  ".BHHHHB.",
  ".BBBBBB.",
  ".BBBBBB.",
  ".BBBBBB.",
  "..BBBB..",
  "..B..B..",
  "..B..B..",
  "..FF.FF.",
];

const FRAME_DIVE_A = [
  "........",
  "..WWWW..",
  ".HWHHWH.",
  ".HSSSSH.",
  ".HSOOSH.",
  "..HHHH..",
  ".BBBBBB.",
  ".BBBBBB.",
  ".BBBBBB.",
  "..BBBB..",
  "..B..B..",
  "..FF.FF.",
];

const FRAME_DIVE_B = [
  "........",
  "........",
  "........",
  "..WWWW..",
  ".HWHHWH.",
  ".HSSSSH.",
  ".BHHHHB.",
  ".BBBBBB.",
  ".BBBBBB.",
  ".BBBBBB.",
  "..BBBB..",
  "..FF.FF.",
];

const FRAME_DIVE_C = [
  "........",
  "........",
  "........",
  "........",
  "........",
  "..WWWW..",
  ".HHHHHH.",
  ".BBBBBB.",
  ".BBBBBB.",
  "..BBBB..",
  "........",
  "........",
];

const COLORS: Record<string, string> = {
  W: "#f8f4ec",
  H: "#1a1612",
  S: "#e8c9a8",
  O: "#1a1612",
  B: "#8a3a2c",
  F: "#3a2418",
};

const PIXEL = 6; // each sprite pixel = 6 css px
const CANVAS_W = 8 * PIXEL;
const CANVAS_H = 13 * PIXEL; // 1 extra row to accommodate vertical bob

function drawFrame(ctx: CanvasRenderingContext2D, frame: string[], yOffset = 0) {
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

type State = "idle" | "diving" | "underwater" | "surfacing";

export default function NagiSprite() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let state: State = "idle";
    let stateStart = performance.now();
    let frameToggle = 0;
    let lastFrameSwap = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const stateMs = now - stateStart;

      // swap idle/dive frames every 600ms
      if (now - lastFrameSwap > 600) {
        frameToggle = 1 - frameToggle;
        lastFrameSwap = now;
      }

      // state machine
      if (state === "idle" && stateMs > 25000 + Math.random() * 15000) {
        state = "diving";
        stateStart = now;
      } else if (state === "diving" && stateMs > 1400) {
        state = "underwater";
        stateStart = now;
      } else if (state === "underwater" && stateMs > 4000 + Math.random() * 4000) {
        state = "surfacing";
        stateStart = now;
      } else if (state === "surfacing" && stateMs > 1400) {
        state = "idle";
        stateStart = now;
      }

      // pick frame to draw
      let frame: string[];
      let yOffset = 1; // default: anchor bottom (drop by 1 sprite row)
      if (state === "idle") {
        frame = frameToggle ? FRAME_IDLE_A : FRAME_IDLE_B;
        yOffset = frameToggle ? 1 : 0; // bob 1 sprite-pixel = 6 css-pixel
      } else if (state === "diving") {
        const step = Math.floor((stateMs / 1400) * 3);
        frame = step === 0 ? FRAME_DIVE_A : step === 1 ? FRAME_DIVE_B : FRAME_DIVE_C;
      } else if (state === "surfacing") {
        const step = Math.floor((stateMs / 1400) * 3);
        frame = step === 0 ? FRAME_DIVE_C : step === 1 ? FRAME_DIVE_B : FRAME_DIVE_A;
      } else {
        // underwater — ripple on the surface
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        const ripple = 6 * PIXEL; // row where surface is
        ctx.fillRect(2 * PIXEL, ripple, 4 * PIXEL, 1);
        ctx.fillRect(1 * PIXEL, ripple + 2, 6 * PIXEL, 1);
        raf = requestAnimationFrame(tick);
        return;
      }

      drawFrame(ctx, frame, yOffset);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-10 hidden -translate-x-1/2 select-none md:block"
      style={{
        top: "calc(66% - 36px)",
        width: `${CANVAS_W}px`,
        height: `${CANVAS_H}px`,
      }}
      aria-label="Nagi 凪 — 海女"
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

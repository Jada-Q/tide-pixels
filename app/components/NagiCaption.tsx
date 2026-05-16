"use client";

import { useEffect, useState } from "react";

const NAGI_GIST_RAW =
  "https://gist.githubusercontent.com/Jada-Q/7b6bdc4f08bd298529616897d71202e2/raw/nagi-init.md";

export default function NagiCaption() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    fetch(`${NAGI_GIST_RAW}?t=${today}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then((body) => {
        if (cancelled) return;
        const trimmed = body.trim();
        if (trimmed && !trimmed.startsWith("🌊 Nagi — initializing")) {
          setText(trimmed);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!text) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-32 left-1/2 z-10 hidden -translate-x-1/2 select-none px-4 text-center font-serif text-white md:block lg:bottom-40"
      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.55)" }}
    >
      <div className="mb-1 text-[10px] uppercase tracking-[0.25em] opacity-45">
        from the bay
      </div>
      <div className="max-w-[420px] whitespace-pre-wrap text-[12px] italic leading-relaxed opacity-70">
        {text}
      </div>
    </div>
  );
}

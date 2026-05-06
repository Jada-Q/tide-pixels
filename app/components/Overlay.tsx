"use client";

import { useEffect, useState } from "react";
import {
  getTideState,
  getMoonInfo,
  phaseLabel,
  moonPhaseLabel,
} from "@/lib/tide";
import type { Location } from "@/lib/locations";

export default function Overlay({ location }: { location: Location }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const tide = getTideState(now, location.lat, location.lng);
  const moon = getMoonInfo(now, location.lat, location.lng);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: location.timezone,
  }).format(now);
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: location.timezone,
  }).format(now);
  const tzAbbr = getTzAbbr(now, location.timezone);

  const tideArrow =
    tide.phase === "rising" ? "↑" : tide.phase === "falling" ? "↓" : "—";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 select-none text-white"
      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.55)" }}
    >
      <div className="absolute left-6 top-6 font-serif text-sm tracking-wide md:left-10 md:top-10">
        <div className="text-xs uppercase tracking-[0.3em] opacity-60">
          Tide Pixels
        </div>
        <div className="mt-2 text-xs opacity-70">
          {location.label} · {formatCoord(location.lat, true)}{" "}
          {formatCoord(location.lng, false)}
        </div>
      </div>

      <div className="absolute right-6 top-6 text-right font-serif md:right-10 md:top-10">
        <div className="font-mono text-3xl tracking-tight md:text-4xl">
          {time}
        </div>
        <div className="mt-1 text-xs opacity-70">
          {dateStr} {tzAbbr}
        </div>
      </div>

      <div className="absolute bottom-6 left-6 space-y-3 font-serif md:bottom-10 md:left-10">
        <Row label="潮位" value={`${phaseLabel(tide.phase)} ${tideArrow}`} sub={`次の転換まで ${tide.nextTransitMinutes} 分`} />
        <Row label="月相" value={moonPhaseLabel(moon.phase)} sub={`照度 ${(moon.fraction * 100).toFixed(0)}%`} />
      </div>

      <div className="absolute bottom-10 right-10 hidden max-w-[260px] text-right font-serif text-xs italic opacity-50 md:block">
        潮汐を月の南中時刻から推算。<br />
        正確値ではなく芸術的近似。
      </div>
    </div>
  );
}

function formatCoord(value: number, isLat: boolean): string {
  const dir = isLat ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(4)}°${dir}`;
}

function getTzAbbr(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    }).formatToParts(date);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

function Row({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="leading-tight">
      <div className="text-[10px] uppercase tracking-[0.25em] opacity-50">
        {label}
      </div>
      <div className="mt-0.5 text-base">{value}</div>
      {sub && <div className="text-[11px] opacity-50">{sub}</div>}
    </div>
  );
}

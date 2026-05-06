export interface SkyPalette {
  top: string;
  mid: string;
  horizon: string;
  sea: string;
  seaDeep: string;
  foam: string;
}

const KEYFRAMES: Array<{ h: number; palette: SkyPalette }> = [
  {
    h: 0,
    palette: {
      top: "#05060f",
      mid: "#0c1024",
      horizon: "#1a1838",
      sea: "#0e1428",
      seaDeep: "#03050d",
      foam: "#5b6584",
    },
  },
  {
    h: 4,
    palette: {
      top: "#13132a",
      mid: "#2c2350",
      horizon: "#5a3a6e",
      sea: "#1a1c3a",
      seaDeep: "#080a18",
      foam: "#9a8aac",
    },
  },
  {
    h: 5.5,
    palette: {
      top: "#3a3a6c",
      mid: "#a36a8a",
      horizon: "#f4a988",
      sea: "#3d3a5e",
      seaDeep: "#1a1e36",
      foam: "#f4d4c0",
    },
  },
  {
    h: 7,
    palette: {
      top: "#a4c8e8",
      mid: "#dbe3ea",
      horizon: "#f5e9d8",
      sea: "#6a8aac",
      seaDeep: "#2c4868",
      foam: "#ffffff",
    },
  },
  {
    h: 12,
    palette: {
      top: "#5fa8d4",
      mid: "#a4cce4",
      horizon: "#dceaf2",
      sea: "#3a78a4",
      seaDeep: "#1a3a5c",
      foam: "#ffffff",
    },
  },
  {
    h: 16.5,
    palette: {
      top: "#6a92c0",
      mid: "#e0b994",
      horizon: "#f4cf9a",
      sea: "#4a6a8c",
      seaDeep: "#1a2e48",
      foam: "#ffe8c8",
    },
  },
  {
    h: 18,
    palette: {
      top: "#3a3868",
      mid: "#c4644e",
      horizon: "#e89464",
      sea: "#3a3a5c",
      seaDeep: "#181a2c",
      foam: "#f4b888",
    },
  },
  {
    h: 19.5,
    palette: {
      top: "#1a1a3a",
      mid: "#4a3858",
      horizon: "#7a4868",
      sea: "#1c2040",
      seaDeep: "#080a1c",
      foam: "#9a7898",
    },
  },
  {
    h: 22,
    palette: {
      top: "#0a0c1e",
      mid: "#161a36",
      horizon: "#2a2848",
      sea: "#10142a",
      seaDeep: "#04060f",
      foam: "#6a708c",
    },
  },
  {
    h: 24,
    palette: {
      top: "#05060f",
      mid: "#0c1024",
      horizon: "#1a1838",
      sea: "#0e1428",
      seaDeep: "#03050d",
      foam: "#5b6584",
    },
  },
];

export function getSkyPalette(date: Date, timezone: string = "Asia/Tokyo"): SkyPalette {
  const localHour = getLocalHour(date, timezone);
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (localHour >= a.h && localHour <= b.h) {
      const t = (localHour - a.h) / (b.h - a.h);
      return {
        top: lerpColor(a.palette.top, b.palette.top, t),
        mid: lerpColor(a.palette.mid, b.palette.mid, t),
        horizon: lerpColor(a.palette.horizon, b.palette.horizon, t),
        sea: lerpColor(a.palette.sea, b.palette.sea, t),
        seaDeep: lerpColor(a.palette.seaDeep, b.palette.seaDeep, t),
        foam: lerpColor(a.palette.foam, b.palette.foam, t),
      };
    }
  }
  return KEYFRAMES[0].palette;
}

function getLocalHour(date: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return (h + m / 60) % 24;
  } catch {
    // Fallback to UTC if timezone is invalid
    return (date.getUTCHours() + date.getUTCMinutes() / 60) % 24;
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

export interface Weather {
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    temp_min?: number;
    temp_max?: number;
  };
  clouds: { all: number };
  wind: { speed: number; deg: number; gust?: number };
  visibility?: number;
  rain?: { "1h"?: number; "3h"?: number };
  snow?: { "1h"?: number; "3h"?: number };
  dt: number;
  sys?: {
    sunrise?: number;
    sunset?: number;
    country?: string;
  };
  name?: string;
}

export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<Weather> {
  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY not set");
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`upstream ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export type WeatherKind =
  | "clear"
  | "clouds"
  | "rain"
  | "snow"
  | "fog"
  | "thunder";

export function classifyWeather(id: number): WeatherKind {
  if (id >= 200 && id < 300) return "thunder";
  if (id >= 300 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "fog";
  if (id === 800) return "clear";
  if (id > 800 && id < 900) return "clouds";
  return "clear";
}

export function windCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

// Dev/QA helper: synthesize a weather payload for a target condition,
// preserving lat/lng-derived fields from a real response when available.
export function synthWeather(kind: string, base?: Weather | null): Weather {
  const seed: Weather = base ?? {
    weather: [],
    main: { temp: 15, feels_like: 14, humidity: 70, pressure: 1013 },
    clouds: { all: 50 },
    wind: { speed: 5, deg: 180 },
    visibility: 10000,
    dt: Math.floor(Date.now() / 1000),
  };
  const PRESETS: Record<string, Partial<Weather>> = {
    rain: {
      weather: [
        { id: 502, main: "Rain", description: "heavy intensity rain", icon: "10d" },
      ],
      clouds: { all: 95 },
      rain: { "1h": 6 },
      wind: { speed: 9, deg: 200 },
      visibility: 4000,
    },
    drizzle: {
      weather: [
        { id: 300, main: "Drizzle", description: "light drizzle", icon: "09d" },
      ],
      clouds: { all: 85 },
      rain: { "1h": 0.5 },
      visibility: 7000,
    },
    snow: {
      weather: [
        { id: 601, main: "Snow", description: "snow", icon: "13d" },
      ],
      clouds: { all: 90 },
      snow: { "1h": 2 },
      wind: { speed: 3, deg: 0 },
      visibility: 5000,
    },
    fog: {
      weather: [{ id: 741, main: "Fog", description: "fog", icon: "50d" }],
      clouds: { all: 100 },
      visibility: 1500,
    },
    thunder: {
      weather: [
        { id: 211, main: "Thunderstorm", description: "thunderstorm", icon: "11d" },
      ],
      clouds: { all: 100 },
      rain: { "1h": 8 },
      wind: { speed: 14, deg: 240 },
      visibility: 2500,
    },
    clear: {
      weather: [{ id: 800, main: "Clear", description: "clear sky", icon: "01d" }],
      clouds: { all: 0 },
    },
  };
  const patch = PRESETS[kind] ?? {};
  return { ...seed, ...patch };
}

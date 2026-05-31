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

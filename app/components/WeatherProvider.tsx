"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Weather } from "@/lib/weather";
import type { Location } from "@/lib/locations";

const WeatherContext = createContext<Weather | null>(null);
export const useWeather = () => useContext(WeatherContext);

const REFRESH_MS = 10 * 60 * 1000;

export function WeatherProvider({
  initialWeather,
  location,
  enabled,
  children,
}: {
  initialWeather: Weather | null;
  location: Location;
  enabled: boolean;
  children: ReactNode;
}) {
  const [weather, setWeather] = useState<Weather | null>(initialWeather);

  useEffect(() => {
    setWeather(initialWeather);
  }, [initialWeather]);

  useEffect(() => {
    if (!enabled) return;
    const url = `/api/weather?lat=${location.lat}&lng=${location.lng}`;
    const tick = async () => {
      try {
        const r = await fetch(url);
        if (r.ok) {
          const data = (await r.json()) as Weather;
          setWeather(data);
        }
      } catch {
        // swallow — keep last known weather
      }
    };
    const id = setInterval(tick, REFRESH_MS);
    return () => clearInterval(id);
  }, [enabled, location.lat, location.lng]);

  return (
    <WeatherContext.Provider value={weather}>
      {children}
    </WeatherContext.Provider>
  );
}

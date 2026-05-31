import TideCanvas from "./components/TideCanvas";
import Overlay from "./components/Overlay";
import CitySwitcher from "./components/CitySwitcher";
import NagiSprite from "./components/NagiSprite";
import { WeatherProvider } from "./components/WeatherProvider";
import { resolveLocation, type UrlParams } from "@/lib/locations";
import { fetchWeather, type Weather } from "@/lib/weather";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const params: UrlParams = {
    c: pickString(raw.c),
    lat: pickString(raw.lat),
    lng: pickString(raw.lng),
    label: pickString(raw.label),
    tz: pickString(raw.tz),
  };
  const location = resolveLocation(params);
  const activeKey = (params.c?.toLowerCase()) || (params.lat ? "" : "tokyo");

  const weatherDisabled = pickString(raw.weather) === "off";
  let initialWeather: Weather | null = null;
  if (!weatherDisabled) {
    initialWeather = await fetchWeather(location.lat, location.lng).catch(
      () => null,
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <WeatherProvider
        initialWeather={initialWeather}
        location={location}
        enabled={!weatherDisabled}
      >
        <TideCanvas location={location} />
        <Overlay location={location} />
      </WeatherProvider>
      <CitySwitcher active={activeKey} />
      <NagiSprite />
    </main>
  );
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

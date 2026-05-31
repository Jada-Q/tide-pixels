import { headers } from "next/headers";
import { resolveLocation, type UrlParams } from "@/lib/locations";

export const dynamic = "force-dynamic";

export default async function DebugWeather({
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

  const h = await headers();
  const host = h.get("host") ?? "localhost:3011";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const apiUrl = `${proto}://${host}/api/weather?lat=${location.lat}&lng=${location.lng}`;

  let body: unknown = null;
  let status: number | string = "n/a";
  let err: string | null = null;
  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    status = res.status;
    body = await res.json();
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  const w = body as Record<string, unknown> | null;
  const weatherArr = (w?.weather as Array<Record<string, unknown>>) ?? [];
  const main = (w?.main as Record<string, unknown>) ?? {};
  const clouds = (w?.clouds as Record<string, unknown>) ?? {};
  const wind = (w?.wind as Record<string, unknown>) ?? {};
  const rain = w?.rain as Record<string, unknown> | undefined;
  const snow = w?.snow as Record<string, unknown> | undefined;

  return (
    <main className="min-h-screen bg-neutral-950 p-6 font-mono text-sm text-neutral-200">
      <h1 className="mb-4 text-base font-bold text-amber-300">
        debug / weather spike
      </h1>

      <section className="mb-6 rounded border border-neutral-700 p-3">
        <h2 className="mb-2 text-xs uppercase text-neutral-400">location</h2>
        <pre className="text-xs leading-5">{JSON.stringify(location, null, 2)}</pre>
        <div className="mt-2 break-all text-[10px] text-neutral-500">
          fetch → {apiUrl}
        </div>
        <div className="mt-1 text-[10px] text-neutral-500">
          status: {String(status)}
          {err ? ` · error: ${err}` : ""}
        </div>
      </section>

      <section className="mb-6 rounded border border-neutral-700 p-3">
        <h2 className="mb-2 text-xs uppercase text-neutral-400">parsed</h2>
        <table className="w-full text-xs">
          <tbody>
            <Row label="weather[0].id" v={weatherArr[0]?.id} />
            <Row label="weather[0].main" v={weatherArr[0]?.main} />
            <Row label="weather[0].description" v={weatherArr[0]?.description} />
            <Row label="weather[0].icon" v={weatherArr[0]?.icon} />
            <Row label="main.temp" v={main.temp} suffix="°C" />
            <Row label="main.feels_like" v={main.feels_like} suffix="°C" />
            <Row label="main.humidity" v={main.humidity} suffix="%" />
            <Row label="clouds.all" v={clouds.all} suffix="%" />
            <Row label="wind.speed" v={wind.speed} suffix=" m/s" />
            <Row label="wind.deg" v={wind.deg} suffix="°" />
            <Row label="rain.1h" v={rain?.["1h"]} suffix=" mm (absent if 0)" />
            <Row label="snow.1h" v={snow?.["1h"]} suffix=" mm (absent if 0)" />
            <Row label="visibility" v={w?.visibility} suffix=" m" />
            <Row label="sys.sunrise" v={fmtUnix(w?.sys, "sunrise")} />
            <Row label="sys.sunset" v={fmtUnix(w?.sys, "sunset")} />
            <Row label="dt (now)" v={fmtUnix(w, "dt")} />
          </tbody>
        </table>
      </section>

      <section className="rounded border border-neutral-700 p-3">
        <h2 className="mb-2 text-xs uppercase text-neutral-400">raw</h2>
        <pre className="overflow-auto text-[10px] leading-4 text-neutral-400">
          {JSON.stringify(body, null, 2)}
        </pre>
      </section>

      <footer className="mt-6 text-[10px] text-neutral-600">
        try: /debug/weather?c=tokyo · ?c=reykjavik · ?c=nyc · ?lat=64.0&lng=-21.9
      </footer>
    </main>
  );
}

function Row({
  label,
  v,
  suffix,
}: {
  label: string;
  v: unknown;
  suffix?: string;
}) {
  const display = v === undefined || v === null ? "—" : String(v);
  return (
    <tr className="border-b border-neutral-800">
      <td className="py-1 pr-4 text-neutral-500">{label}</td>
      <td className="py-1 text-neutral-200">
        {display}
        {v !== undefined && v !== null && suffix ? (
          <span className="text-neutral-500">{suffix}</span>
        ) : null}
      </td>
    </tr>
  );
}

function fmtUnix(obj: unknown, key: string): string | undefined {
  const o = obj as Record<string, unknown> | undefined;
  const v = o?.[key];
  if (typeof v !== "number") return undefined;
  return `${v} (${new Date(v * 1000).toISOString()})`;
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

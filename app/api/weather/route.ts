import type { NextRequest } from "next/server";
import { fetchWeather } from "@/lib/weather";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  if (!lat || !lng) {
    return Response.json(
      { error: "lat and lng query params required" },
      { status: 400 },
    );
  }
  const latN = Number(lat);
  const lngN = Number(lng);
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
    return Response.json(
      { error: "lat and lng must be numeric" },
      { status: 400 },
    );
  }

  try {
    const data = await fetchWeather(latN, lngN);
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isConfig = msg.includes("OPENWEATHER_API_KEY");
    return Response.json(
      { error: isConfig ? msg : "upstream", detail: isConfig ? undefined : msg },
      { status: isConfig ? 500 : 502 },
    );
  }
}

import { getMoonInfo, getSunInfo, getTideState } from "@/lib/tide";

// Normalized 0..1 signals consumed by the BGM engine's preset mappings.
// Pure SunCalc math — no network, safe to call every poll tick.
export function getSignals(lat: number, lng: number): Record<string, number> {
  const now = new Date();
  const tide = getTideState(now, lat, lng);
  const moon = getMoonInfo(now, lat, lng);
  const sun = getSunInfo(now, lat, lng);
  return {
    // level -1..1 → 0..1
    tideLevel: (tide.level + 1) / 2,
    // altitude -π/2..π/2 rad → 0..1, below horizon clamps to 0
    moonAltitude: Math.min(1, Math.max(0, moon.altitude / (Math.PI / 2) + 0.5)),
    isNight: sun.altitude < 0 ? 1 : 0,
  };
}

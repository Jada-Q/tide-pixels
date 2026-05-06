import SunCalc from "suncalc";

// Tokyo Bay 観測点
export const TOKYO = { lat: 35.6543, lng: 139.7644, label: "TOKYO" };

export type TidePhase = "rising" | "falling" | "high" | "low";

export interface TideState {
  level: number; // -1 (low) .. +1 (high)
  phase: TidePhase;
  nextTransitMinutes: number;
}

// 月の南中時刻を中心に半日周期で潮位を推定。
// 精密ではないが、芸術用には十分。
// 極地（極昼/極夜）では rise/set が null になるため、
// 月-太陽角度ベースの近似にフォールバック。
export function getTideState(date: Date, lat: number, lng: number): TideState {
  const moonTimes = SunCalc.getMoonTimes(date, lat, lng);
  const yesterdayTimes = SunCalc.getMoonTimes(
    new Date(date.getTime() - 86400000),
    lat,
    lng,
  );
  const tomorrowTimes = SunCalc.getMoonTimes(
    new Date(date.getTime() + 86400000),
    lat,
    lng,
  );

  const peaks: number[] = [];
  for (const t of [yesterdayTimes, moonTimes, tomorrowTimes]) {
    if (t.rise && t.set) {
      const upper = (t.rise.getTime() + t.set.getTime()) / 2;
      const lower = upper + 12 * 3600 * 1000;
      peaks.push(upper, lower);
    }
  }
  peaks.sort((a, b) => a - b);

  // Polar fallback: insufficient transits → use semi-diurnal sine driven by
  // hour-angle of the moon (approximated via UTC time + lng).
  if (peaks.length < 2) {
    const M2_PERIOD_MS = 12.42 * 3600 * 1000; // principal lunar tidal period
    const phaseOffset =
      (((date.getUTCHours() + lng / 15) % 24) / 24) * Math.PI * 2;
    const level = Math.cos(phaseOffset);
    const derivative = -Math.sin(phaseOffset);
    let phase: TidePhase;
    if (level > 0.95) phase = "high";
    else if (level < -0.95) phase = "low";
    else phase = derivative < 0 ? "rising" : "falling";
    const nextTransitMinutes = Math.round(
      (M2_PERIOD_MS / 2 - ((phaseOffset / (Math.PI * 2)) * M2_PERIOD_MS) % (M2_PERIOD_MS / 2)) /
        60000,
    );
    return { level, phase, nextTransitMinutes };
  }

  const now = date.getTime();
  let prev = peaks[0];
  let next = peaks[peaks.length - 1];
  for (let i = 0; i < peaks.length - 1; i++) {
    if (peaks[i] <= now && peaks[i + 1] > now) {
      prev = peaks[i];
      next = peaks[i + 1];
      break;
    }
  }

  const totalSpan = next - prev;
  const elapsed = now - prev;
  const t = elapsed / totalSpan;

  const prevIdx = peaks.indexOf(prev);
  const startsHigh = prevIdx % 2 === 0;
  const level = startsHigh
    ? Math.cos(t * Math.PI)
    : -Math.cos(t * Math.PI);

  let phase: TidePhase;
  if (t < 0.05) phase = startsHigh ? "high" : "low";
  else if (t > 0.95) phase = startsHigh ? "low" : "high";
  else phase = startsHigh ? "falling" : "rising";

  return {
    level,
    phase,
    nextTransitMinutes: Math.round((next - now) / 60000),
  };
}

export function getMoonInfo(date: Date, lat: number, lng: number) {
  const pos = SunCalc.getMoonPosition(date, lat, lng);
  const illum = SunCalc.getMoonIllumination(date);
  return {
    altitude: pos.altitude, // radians, negative = below horizon
    azimuth: pos.azimuth, // radians from south, clockwise
    phase: illum.phase, // 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
    fraction: illum.fraction, // 0..1 illuminated portion
  };
}

export function getSunInfo(date: Date, lat: number, lng: number) {
  const pos = SunCalc.getPosition(date, lat, lng);
  return {
    altitude: pos.altitude,
    azimuth: pos.azimuth,
  };
}

export function phaseLabel(phase: TidePhase): string {
  return {
    rising: "満潮へ",
    falling: "干潮へ",
    high: "満潮",
    low: "干潮",
  }[phase];
}

export function moonPhaseLabel(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "新月";
  if (phase < 0.22) return "三日月";
  if (phase < 0.28) return "上弦";
  if (phase < 0.47) return "十三夜";
  if (phase < 0.53) return "満月";
  if (phase < 0.72) return "十六夜";
  if (phase < 0.78) return "下弦";
  return "有明月";
}

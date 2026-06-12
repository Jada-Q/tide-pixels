"use client";

import { useCallback } from "react";
import { BgmToggle, useBgm } from "@/lib/bgm/engine";
import { preset } from "@/lib/bgm/preset";
import { getSignals } from "@/lib/bgm/signals";
import type { Location } from "@/lib/locations";

export default function Bgm({ location, variant }: { location: Location; variant: string }) {
  const getSignalsForLocation = useCallback(
    () => getSignals(location.lat, location.lng),
    [location.lat, location.lng],
  );
  const bgm = useBgm({ preset, variant, getSignals: getSignalsForLocation });
  return (
    <BgmToggle status={bgm.status} embed={bgm.embed} debug={bgm.debug} onToggle={bgm.toggle} />
  );
}

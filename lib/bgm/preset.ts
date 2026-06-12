import type { BgmPreset } from "./engine";

// Ocean: warm D major-pentatonic drone, bell sparkles on moonrise,
// pink-noise surf swelling with the tide.
export const preset: BgmPreset = {
  key: "tide-pixels",
  rootNote: "D2",
  scale: "majorPentatonic",
  masterVolumeDb: -16,
  reverbDecaySec: 11,
  pad: {
    enabled: true,
    volumeDb: -14,
    synth: "fatsine",
    chordSize: 3,
    changeEverySec: [25, 45],
    attackSec: 6,
    releaseSec: 10,
    filterCutoffHz: [350, 1400],
  },
  melody: {
    enabled: true,
    volumeDb: -20,
    instrument: "bell",
    octaves: [4, 5],
    baseIntervalSec: [7, 18],
    eventTriggered: false,
  },
  texture: {
    enabled: true,
    volumeDb: -18,
    kind: "ocean",
    lfoRateHz: [0.04, 0.12],
  },
  percussion: {
    enabled: false,
    volumeDb: -30,
    kind: "none",
    bpm: [0, 0],
  },
  mappings: [
    // high tide = bright open pad, low tide = dark and muffled
    { signal: "tideLevel", target: "pad.cutoff", range: [0.15, 1], curve: "exp" },
    // surf louder as the tide comes in
    { signal: "tideLevel", target: "texture.volume", range: [0.3, 1] },
    // moon high in the sky → bells ring higher
    { signal: "moonAltitude", target: "melody.octaveBias", range: [0, 1] },
    // night dims the whole mix
    { signal: "isNight", target: "master.brightness", range: [1, 0.55] },
  ],
};

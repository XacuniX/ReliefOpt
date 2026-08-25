export const disasterTypes = Object.freeze([
  "Flood",
  "Cyclone",
  "Earthquake",
  "Fire",
  "Landslide",
  "Drought",
  "River Erosion",
  "Tornado",
  "Thunderstorm",
  "Heatwave",
  "Cold Wave",
  "Tsunami",
  "Epidemic",
  "Building Collapse",
  "Explosion",
  "Chemical Spill",
  "Transport Accident",
  "Other",
]);

const DISASTER_ALIASES = Object.freeze({
  Flood: [
    "flood", "flooding", "flooded", "flash flood", "river flood", "urban flood",
    "coastal flood", "waterlogging", "water logged", "inundation", "inundated",
    "storm surge", "embankment breach", "dam breach", "overflowing river",
  ],
  Cyclone: [
    "cyclone", "hurricane", "typhoon", "tropical storm", "cyclonic storm",
    "severe storm", "windstorm", "storm winds",
  ],
  Earthquake: [
    "earthquake", "earth quake", "tremor", "tremors", "aftershock", "aftershocks",
    "seismic event", "ground shaking",
  ],
  Fire: [
    "fire", "blaze", "burning", "wildfire", "forest fire", "house fire",
    "building fire", "factory fire", "electrical fire", "market fire", "warehouse fire",
  ],
  Landslide: [
    "landslide", "land slide", "mudslide", "mud slide", "rockslide", "rock slide",
    "hill collapse", "slope collapse", "debris flow",
  ],
  Drought: [
    "drought", "dry spell", "water shortage", "crop failure", "severe dryness",
  ],
  "River Erosion": [
    "river erosion", "riverbank erosion", "river bank erosion", "bank erosion",
    "riverbank collapse", "river bank collapse", "land erosion",
  ],
  Tornado: ["tornado", "twister", "funnel cloud"],
  Thunderstorm: [
    "thunderstorm", "thunder storm", "lightning storm", "lightning strike",
    "lightning strikes", "hailstorm", "hail storm", "severe lightning",
  ],
  Heatwave: ["heatwave", "heat wave", "extreme heat", "heat emergency", "heat stroke"],
  "Cold Wave": ["cold wave", "cold spell", "extreme cold", "cold emergency", "severe cold"],
  Tsunami: ["tsunami", "tidal wave", "seismic sea wave"],
  Epidemic: [
    "epidemic", "pandemic", "disease outbreak", "viral outbreak", "cholera outbreak",
    "dengue outbreak", "diarrhea outbreak", "health emergency", "mass illness",
  ],
  "Building Collapse": [
    "building collapse", "collapsed building", "house collapse", "roof collapse",
    "structural collapse", "wall collapse",
  ],
  Explosion: [
    "explosion", "blast", "bomb blast", "gas explosion", "boiler explosion",
    "factory explosion", "cylinder blast",
  ],
  "Chemical Spill": [
    "chemical spill", "chemical leak", "gas leak", "toxic leak", "oil spill",
    "hazardous material", "hazmat", "contamination",
  ],
  "Transport Accident": [
    "transport accident", "road accident", "traffic accident", "vehicle crash",
    "bus crash", "truck crash", "train crash", "train derailment", "derailment",
    "boat capsize", "boat capsized", "ferry accident", "ferry capsize", "plane crash",
  ],
  Other: [],
});

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SEARCHABLE_DISASTERS = Object.freeze(
  disasterTypes.flatMap((type) =>
    DISASTER_ALIASES[type].map((alias) => ({ type, alias: normalize(alias) })),
  ),
);

export function findDisasterType(value) {
  const normalized = normalize(value);
  if (!normalized) return null;

  const padded = ` ${normalized} `;
  let bestMatch = null;
  for (const candidate of SEARCHABLE_DISASTERS) {
    const index = padded.indexOf(` ${candidate.alias} `);
    if (index === -1) continue;
    if (
      !bestMatch ||
      index < bestMatch.index ||
      (index === bestMatch.index && candidate.alias.length > bestMatch.alias.length)
    ) {
      bestMatch = { ...candidate, index };
    }
  }

  return bestMatch?.type ?? null;
}

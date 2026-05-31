// ─── March 10, 2026 Hail Event — Verified NWS Data ───────────────────────────
// Source: National Weather Service Chicago (weather.gov/lot/2026_03_10_Severe_Weather)
// Retrieved: May 2026

export const STORM_EVENT_DATE = "March 10, 2026";
export const CLAIM_DEADLINE = "March 10, 2027";
export const NWS_SOURCE_URL = "https://www.weather.gov/lot/2026_03_10_Severe_Weather";
export const NWS_SOURCE_LABEL = "NWS Chicago — March 10, 2026 Severe Weather Summary";
export const NWS_RETRIEVED_DATE = "May 2026";

export interface CityStormData {
  slug: string;
  name: string;
  county: string;
  state: string;
  hailSize: string;
  hailSizeInches: number;
  hailComparison: string;
  affectedProperties: number;
  stormTime: string;
  zipCodes: string[];
  nwsQuote: string;
  nwsSourceUrl: string;
  urgencyNote: string;
  heroTagline: string;
  stormTimeline: Array<{ time: string; event: string; detail: string }>;
}

export const CITY_STORM_DATA: Record<string, CityStormData> = {
  naperville: {
    slug: "naperville",
    name: "Naperville",
    county: "DuPage / Will",
    state: "IL",
    hailSize: '1.00"–1.25"',
    hailSizeInches: 1.25,
    hailComparison: "Quarter to Half-Dollar Sized",
    affectedProperties: 106,
    stormTime: "5:40–6:15 PM CDT",
    zipCodes: ["60540", "60563", "60564", "60565", "60566", "60567"],
    nwsQuote:
      "NWS Chicago confirmed hail impacting approximately 106 properties in the Naperville corridor on March 10, 2026, as the supercell tracked northeast through DuPage County.",
    nwsSourceUrl: "https://www.weather.gov/lot/2026_03_10_Severe_Weather",
    urgencyNote:
      "Illinois insurance carriers allow one year from the date of loss to file a storm claim. Your deadline is March 10, 2027.",
    heroTagline: "Your Naperville Home Was In The Path of The March 10 Hail Storm",
    stormTimeline: [
      {
        time: "3:55 PM",
        event: "Tornado Watch Issued",
        detail: "NWS Chicago issues Tornado Watch covering DuPage County and surrounding areas.",
      },
      {
        time: "5:39 PM",
        event: "Severe Thunderstorm Warning",
        detail: "Severe Thunderstorm Warning issued for east central DuPage County including Naperville.",
      },
      {
        time: "5:40 PM",
        event: "Hail Begins",
        detail: "Quarter to half-dollar sized hail begins falling across the Naperville corridor.",
      },
      {
        time: "5:47 PM",
        event: "Peak Intensity",
        detail: "Storm reaches peak intensity over Naperville. 1.00\"–1.25\" hail confirmed by NWS trained spotters.",
      },
      {
        time: "6:15 PM",
        event: "Storm Clears",
        detail: "Supercell moves northeast. Approximately 106 properties impacted in the Naperville area.",
      },
    ],
  },

  "willow-springs": {
    slug: "willow-springs",
    name: "Willow Springs",
    county: "Cook",
    state: "IL",
    hailSize: '1.00"–1.50"',
    hailSizeInches: 1.5,
    hailComparison: "Quarter to Ping-Pong Sized",
    affectedProperties: 85,
    stormTime: "5:50–6:20 PM CDT",
    zipCodes: ["60480"],
    nwsQuote:
      "WGN meteorologist Tom Skilling confirmed Willow Springs was in the preliminary storm path on March 10, 2026, as the supercell tracked northeast through Cook County's southwest suburbs.",
    nwsSourceUrl: "https://www.weather.gov/lot/2026_03_10_Severe_Weather",
    urgencyNote:
      "Illinois insurance carriers allow one year from the date of loss to file a storm claim. Your deadline is March 10, 2027.",
    heroTagline: "Your Willow Springs Home Was In The Path of The March 10 Hail Storm",
    stormTimeline: [
      {
        time: "3:55 PM",
        event: "Tornado Watch Issued",
        detail: "NWS Chicago issues Tornado Watch covering Cook County and surrounding areas.",
      },
      {
        time: "5:39 PM",
        event: "Severe Thunderstorm Warning",
        detail: "Severe Thunderstorm Warning issued for southwest Cook County including Willow Springs.",
      },
      {
        time: "5:50 PM",
        event: "Hail Begins",
        detail: "Quarter to ping-pong sized hail begins falling across the Willow Springs area.",
      },
      {
        time: "6:00 PM",
        event: "Peak Intensity",
        detail: "Storm reaches peak intensity. 1.00\"–1.50\" hail confirmed in the Willow Springs corridor.",
      },
      {
        time: "6:20 PM",
        event: "Storm Clears",
        detail: "Supercell moves northeast. Approximately 85 properties impacted in the Willow Springs area.",
      },
    ],
  },

  "sag-bridge": {
    slug: "sag-bridge",
    name: "Sag Bridge",
    county: "Cook / Will",
    state: "IL",
    hailSize: '1.00"–1.25"',
    hailSizeInches: 1.25,
    hailComparison: "Quarter to Half-Dollar Sized",
    affectedProperties: 62,
    stormTime: "5:45–6:10 PM CDT",
    zipCodes: ["60525", "60439"],
    nwsQuote:
      "NWS Chicago confirmed the supercell produced quarter to half-dollar sized hail across the Sag Bridge and Lemont corridor on March 10, 2026.",
    nwsSourceUrl: "https://www.weather.gov/lot/2026_03_10_Severe_Weather",
    urgencyNote:
      "Illinois insurance carriers allow one year from the date of loss to file a storm claim. Your deadline is March 10, 2027.",
    heroTagline: "Your Sag Bridge Home Was In The Path of The March 10 Hail Storm",
    stormTimeline: [
      {
        time: "3:55 PM",
        event: "Tornado Watch Issued",
        detail: "NWS Chicago issues Tornado Watch covering Cook and Will counties.",
      },
      {
        time: "5:39 PM",
        event: "Severe Thunderstorm Warning",
        detail: "Severe Thunderstorm Warning issued for the Sag Bridge / Lemont corridor.",
      },
      {
        time: "5:45 PM",
        event: "Hail Begins",
        detail: "Quarter to half-dollar sized hail begins falling across the Sag Bridge area.",
      },
      {
        time: "5:55 PM",
        event: "Peak Intensity",
        detail: "Storm reaches peak intensity. 1.00\"–1.25\" hail confirmed in the Sag Bridge corridor.",
      },
      {
        time: "6:10 PM",
        event: "Storm Clears",
        detail: "Supercell moves northeast. Approximately 62 properties impacted in the Sag Bridge area.",
      },
    ],
  },

  palisades: {
    slug: "palisades",
    name: "Palisades",
    county: "Cook",
    state: "IL",
    hailSize: '1.00"–1.25"',
    hailSizeInches: 1.25,
    hailComparison: "Quarter to Half-Dollar Sized",
    affectedProperties: 48,
    stormTime: "5:50–6:15 PM CDT",
    zipCodes: ["60525", "60480"],
    nwsQuote:
      "NWS Chicago confirmed the March 10, 2026 supercell produced quarter to half-dollar sized hail across the Palisades area of Cook County.",
    nwsSourceUrl: "https://www.weather.gov/lot/2026_03_10_Severe_Weather",
    urgencyNote:
      "Illinois insurance carriers allow one year from the date of loss to file a storm claim. Your deadline is March 10, 2027.",
    heroTagline: "Your Palisades Home Was In The Path of The March 10 Hail Storm",
    stormTimeline: [
      {
        time: "3:55 PM",
        event: "Tornado Watch Issued",
        detail: "NWS Chicago issues Tornado Watch covering Cook County.",
      },
      {
        time: "5:39 PM",
        event: "Severe Thunderstorm Warning",
        detail: "Severe Thunderstorm Warning issued for the Palisades area of Cook County.",
      },
      {
        time: "5:50 PM",
        event: "Hail Begins",
        detail: "Quarter to half-dollar sized hail begins falling across the Palisades area.",
      },
      {
        time: "6:00 PM",
        event: "Peak Intensity",
        detail: "Storm reaches peak intensity. 1.00\"–1.25\" hail confirmed in the Palisades corridor.",
      },
      {
        time: "6:15 PM",
        event: "Storm Clears",
        detail: "Supercell moves northeast. Approximately 48 properties impacted in the Palisades area.",
      },
    ],
  },
};

export const HAIL_SIZE_DAMAGE_GUIDE = [
  { size: '0.75"', comparison: "Penny", damage: "Cosmetic marks on soft metals" },
  { size: '1.00"', comparison: "Quarter", damage: "Granule loss begins on asphalt shingles" },
  { size: '1.25"', comparison: "Half Dollar", damage: "Significant granule loss, shingle bruising" },
  { size: '1.50"', comparison: "Ping Pong Ball", damage: "Shingle cracking, dents in gutters & vents" },
  { size: '1.75"', comparison: "Golf Ball", damage: "Structural shingle damage, underlayment impact" },
  { size: '2.50"', comparison: "Tennis Ball", damage: "Severe structural damage, possible deck penetration" },
];

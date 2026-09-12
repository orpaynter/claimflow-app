import type { Building, Place } from "@/lib/geo/types";
import { roofAreaSqft } from "@/lib/geo/insurance";
import { hashString, mulberry32, pick } from "./rng";
import type { HousePalette, HouseSpec, HouseStyle } from "./types";

const PALETTES: HousePalette[] = [
  {
    body: "#c4b39a",
    trim: "#f1ece3",
    roof: "#4d524c",
    shutters: "#2f3330",
    door: "#6b2e24",
    foundation: "#6d675d",
    glass: "#9eb4b8",
  },
  {
    body: "#efe6d4",
    trim: "#f7f3ea",
    roof: "#3c3a37",
    shutters: "#1f2320",
    door: "#1f2320",
    foundation: "#5c5850",
    glass: "#8aa3ae",
  },
  {
    body: "#7d8a6c",
    trim: "#ece4d4",
    roof: "#4a4038",
    shutters: "#3a332c",
    door: "#6b2e24",
    foundation: "#6a6358",
    glass: "#95aeb0",
  },
  {
    body: "#8a5a44",
    trim: "#e7ddd0",
    roof: "#5a4e44",
    shutters: "#3a2c26",
    door: "#2b241f",
    foundation: "#6b5c50",
    glass: "#8da0a6",
  },
  {
    body: "#6b6a4e",
    trim: "#e8e0d0",
    roof: "#4a5544",
    shutters: "#2d3328",
    door: "#4a2c22",
    foundation: "#6a6356",
    glass: "#90a7a4",
  },
  {
    body: "#8b8680",
    trim: "#f0ebe3",
    roof: "#5c6164",
    shutters: "#2a2d2c",
    door: "#7a2f28",
    foundation: "#5a5854",
    glass: "#8ea4ab",
  },
  {
    body: "#d7c4a3",
    trim: "#f4efe6",
    roof: "#5a5046",
    shutters: "#3d4a3c",
    door: "#3d4a3c",
    foundation: "#6e675c",
    glass: "#9ab0ae",
  },
];

const STYLE_META: Record<
  HouseStyle,
  { label: string; stories: 1 | 2; pitch: number; gableStreet: boolean }
> = {
  cape: { label: "Cape", stories: 1, pitch: 0.72, gableStreet: false },
  colonial: { label: "Colonial", stories: 2, pitch: 0.5, gableStreet: false },
  victorian: { label: "Victorian", stories: 2, pitch: 0.78, gableStreet: true },
  ranch: { label: "Ranch", stories: 1, pitch: 0.32, gableStreet: false },
  craftsman: { label: "Craftsman", stories: 1, pitch: 0.42, gableStreet: false },
  farmhouse: { label: "Farmhouse", stories: 2, pitch: 0.56, gableStreet: false },
};

function preferStyle(address: string, rng: () => number): HouseStyle {
  const a = address.toLowerCase();
  if (/cape|barnstable|provincetown|chatham|falmouth|hyannis|wellfleet|truro|orleans/.test(a))
    return "cape";
  if (/farm|lane|rd\b|rural|creek/.test(a)) return rng() < 0.7 ? "farmhouse" : "cape";
  if (/ave|avenue|square|park/.test(a)) return rng() < 0.6 ? "colonial" : "victorian";
  if (/blvd|drive|way|court/.test(a)) return rng() < 0.55 ? "ranch" : "craftsman";
  if (/street|st\b/.test(a)) return pick(rng, ["colonial", "victorian", "craftsman", "cape"]);
  return pick(rng, ["cape", "colonial", "victorian", "ranch", "craftsman", "farmhouse"]);
}

export function normalizeAddress(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function buildSpec(rawAddress: string): HouseSpec {
  const address = normalizeAddress(rawAddress);
  const seed = hashString(address.toLowerCase());
  const rng = mulberry32(seed);
  const style = preferStyle(address, rng);
  const meta = STYLE_META[style];
  const numMatch = address.match(/\d+/);
  const number = numMatch?.[0] ?? String((seed % 88) + 7);
  const afterNum = address.replace(/^\s*\d+\s*/, "");
  const parts = afterNum.split(",").map((p) => p.trim()).filter(Boolean);
  const street = parts[0] || "the lot";
  const locality = parts.slice(1).join(", ");

  const scale = 0.92 + (Number.parseInt(number, 10) % 17) * 0.012;
  const width =
    (style === "ranch" ? 11.4 : style === "colonial" ? 8.2 : style === "cape" ? 7.1 : 7.8) *
    scale;
  const depth =
    (style === "ranch" ? 5.8 : style === "victorian" ? 7.2 : 6.4) * (0.94 + rng() * 0.12);

  const hasPorch = style === "ranch" ? rng() < 0.35 : style === "colonial" ? rng() < 0.45 : true;
  const porchWrap = style === "farmhouse" || (style === "victorian" && rng() < 0.5);
  const hasGarage = style === "ranch" || (style !== "victorian" && rng() < 0.42);
  const hasChimney = style !== "ranch" || rng() < 0.4;
  const hasTurret = style === "victorian";
  const dormers =
    style === "cape" ? 2 : style === "craftsman" ? 1 : style === "farmhouse" ? (rng() < 0.5 ? 1 : 0) : 0;
  const windowCols = style === "colonial" ? 5 : style === "ranch" ? 4 : 3;
  const treeCount = 4 + Math.floor(rng() * 6);
  const hasFence = rng() < 0.78;
  const palette = PALETTES[Math.floor(rng() * PALETTES.length)] as HousePalette;

  const notes = [
    `${meta.label} massing on a ${width > 9 ? "wide" : "tight"} lot`,
    hasPorch ? (porchWrap ? "wrap porch" : "front porch") : "flush entry",
    hasChimney ? "working chimney" : "no stack",
    `${treeCount} trees on the windward side`,
  ].join(" · ");

  return {
    seed,
    address,
    number,
    street,
    locality,
    style,
    styleLabel: meta.label,
    stories: meta.stories,
    width,
    depth,
    storyHeight: style === "ranch" ? 2.55 : 2.7,
    roofPitch: meta.pitch,
    gableStreetFacing: meta.gableStreet,
    palette,
    hasPorch,
    porchWrap,
    hasGarage,
    hasChimney,
    hasTurret,
    dormers,
    windowCols,
    treeCount,
    hasFence,
    notes,
  };
}

export function buildSpecFromBuilding(
  place: Place,
  building: Building,
  areaCode: string,
): HouseSpec {
  const number = building.houseNumber || place.number || "";
  const street = building.street || place.street || "the lot";
  const locality = [place.city, place.stateCode || place.state].filter(Boolean).join(", ");
  const address = [number, street, locality, place.postcode].filter(Boolean).join(", ");
  const base = buildSpec(address || place.displayName);
  const width = clamp(building.widthM, 6.2, 14);
  const depth = clamp(building.depthM, 5.2, 10.5);
  const stories: 1 | 2 = building.levels >= 2 ? 2 : base.stories;
  const footprintSqft = Math.round(building.areaM2 * 10.764);
  const roofSqft = roofAreaSqft(building.areaM2, base.roofPitch);
  const sourceNote =
    building.source === "osm"
      ? `OSM footprint ${footprintSqft.toLocaleString()} ft²`
      : building.source === "usa"
        ? `USA Structures footprint ${footprintSqft.toLocaleString()} ft²`
        : building.source === "microsoft"
          ? `Microsoft footprint ${footprintSqft.toLocaleString()} ft²`
          : `Illustrative massing ${footprintSqft.toLocaleString()} ft² — no public outline here`;
  return {
    ...base,
    address: address || place.displayName,
    number: number || base.number,
    street,
    locality,
    stories,
    width,
    depth,
    lat: building.centroid.lat,
    lon: building.centroid.lon,
    footprintSqft,
    roofSqft,
    levels: building.levels,
    source: building.source,
    areaCode,
    osmId: building.osmId,
    notes: [sourceNote, base.notes, areaCode ? `territory ${areaCode}` : ""].filter(Boolean).join(" · "),
  };
}

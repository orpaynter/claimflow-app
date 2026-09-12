import { haversineM, ringAreaM2, ringBounds, ringCentroid } from "./project";
import type { Building, LatLng, Place, PropertyRecord } from "./types";

const UA = "Galehouse/1.0 (OrPaynter, Inc.; Oliver@OrPaynter.com)";

interface Geojson {
  features?: {
    properties?: Record<string, unknown>;
    geometry?: { type?: string; coordinates?: unknown };
  }[];
}

function ringFrom(g: { type?: string; coordinates?: unknown } | undefined): LatLng[] | null {
  if (!g?.coordinates) return null;
  let ring: unknown = g.type === "MultiPolygon" ? (g.coordinates as unknown[])[0] : g.coordinates;
  if (Array.isArray(ring) && Array.isArray(ring[0]) && Array.isArray((ring[0] as unknown[])[0])) {
    ring = (ring as unknown[])[0];
  }
  if (!Array.isArray(ring) || ring.length < 4) return null;
  const out: LatLng[] = [];
  for (const pt of ring) {
    if (!Array.isArray(pt) || typeof pt[0] !== "number" || typeof pt[1] !== "number") continue;
    out.push({ lon: pt[0], lat: pt[1] });
  }
  return out.length >= 4 ? out : null;
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function fromRing(
  id: string,
  ring: LatLng[],
  extra: Partial<Building> & { source: Building["source"] },
): Building | null {
  const areaM2 = extra.areaM2 && extra.areaM2 > 20 ? extra.areaM2 : ringAreaM2(ring);
  if (areaM2 < 22 || areaM2 > 8000) return null;
  const bounds = ringBounds(ring);
  const levels = Math.max(1, Math.min(4, extra.levels ?? 1));
  return {
    id,
    osmId: extra.osmId ?? "",
    ring,
    centroid: ringCentroid(ring),
    widthM: bounds.widthM,
    depthM: bounds.depthM,
    areaM2,
    levels,
    use: extra.use || "house",
    houseNumber: extra.houseNumber || "",
    street: extra.street || "",
    year: extra.year || "",
    material: extra.material || "",
    roofShape: extra.roofShape || "",
    hit: 0,
    source: extra.source,
    enterable: areaM2 >= 36 && areaM2 <= 1200,
  };
}

async function queryEsri(url: string, lat: number, lon: number, meters: number): Promise<Geojson> {
  const d = meters / 111320;
  const params = new URLSearchParams({
    where: "1=1",
    geometry: `${lon - d},${lat - d},${lon + d},${lat + d}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "true",
    f: "geojson",
    resultRecordCount: "80",
  });
  const res = await fetch(`${url}?${params}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`esri ${res.status}`);
  return (await res.json()) as Geojson;
}

export async function microsoftFootprints(lat: number, lon: number): Promise<Building[]> {
  const body = await queryEsri(
    "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/MSBFP2/FeatureServer/0/query",
    lat,
    lon,
    220,
  );
  const out: Building[] = [];
  for (const f of body.features ?? []) {
    const ring = ringFrom(f.geometry);
    if (!ring) continue;
    const b = fromRing(`ms-${str(f.properties?.OBJECTID) || out.length}`, ring, { source: "microsoft" });
    if (b) out.push(b);
  }
  return out;
}

export async function usaStructures(lat: number, lon: number): Promise<{
  buildings: Building[];
  property: PropertyRecord | null;
}> {
  const body = await queryEsri(
    "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/USA_Structures_View/FeatureServer/0/query",
    lat,
    lon,
    220,
  );
  const buildings: Building[] = [];
  let nearest: { dist: number; rec: PropertyRecord; building: Building } | null = null;
  const origin = { lat, lon };
  for (const f of body.features ?? []) {
    const p = f.properties ?? {};
    const ring = ringFrom(f.geometry);
    if (!ring) continue;
    const addr = str(p.PROP_ADDR);
    const number = addr.match(/^\s*(\d+[A-Za-z]?)/)?.[1] ?? "";
    const street = addr.replace(/^\s*\d+[A-Za-z]?\s*/, "");
    const sqm = num(p.SQMETERS);
    const height = num(p.HEIGHT);
    const levels = height > 2.4 ? Math.max(1, Math.min(4, Math.round(height / 3.1))) : 1;
    const b = fromRing(`usa-${str(p.BUILD_ID) || buildings.length}`, ring, {
      source: "usa",
      osmId: str(p.BUILD_ID),
      areaM2: sqm || undefined,
      levels,
      houseNumber: number,
      street,
      use: str(p.OCC_CLS) || "house",
    });
    if (!b) continue;
    buildings.push(b);
    const dist = haversineM(origin, b.centroid);
    const rec: PropertyRecord = {
      apn: str(p.BUILD_ID),
      owner: "",
      yearBuilt: "",
      assessed: 0,
      className: [str(p.OCC_CLS), str(p.PRIM_OCC)].filter(Boolean).join(" · "),
      source: "usa-structures",
      sqft: Math.round(num(p.SQFEET) || b.areaM2 * 10.764),
      heightM: height || 0,
    };
    if (!nearest || dist < nearest.dist) nearest = { dist, rec, building: b };
  }
  return { buildings, property: nearest && nearest.dist < 80 ? nearest.rec : null };
}

export async function nationalFootprints(place: Place): Promise<{
  buildings: Building[];
  property: PropertyRecord | null;
}> {
  const [ms, usa] = await Promise.all([
    microsoftFootprints(place.lat, place.lon).catch(() => [] as Building[]),
    usaStructures(place.lat, place.lon).catch(() => ({ buildings: [] as Building[], property: null })),
  ]);
  return { buildings: [...usa.buildings, ...ms], property: usa.property };
}

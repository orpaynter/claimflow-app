import { createServerFn } from "@tanstack/react-start";
import { planHailPath } from "./hail";
import { sketchInsurance } from "./insurance";
import { mapsDir } from "./links";
import {
  driveMinutes,
  haversineM,
  offsetLatLng,
  rectRing,
  ringAreaM2,
  ringBounds,
  ringCentroid,
  stateCodeOf,
} from "./project";
import { nationalFootprints } from "./footprints";
import type {
  Building,
  LatLng,
  Place,
  Poi,
  PropertyRecord,
  ResolveResult,
  Road,
  Site,
  StormCell,
  Zone,
} from "./types";

const UA = "Galehouse/1.0 (OrPaynter, Inc.; Oliver@OrPaynter.com)";
const SKIP_USE = /^(shed|garage|carport|roof|parking|tank|silo|greenhouse|ruins|construction)$/i;

function headers(): HeadersInit {
  return { Accept: "application/json", "User-Agent": UA };
}

async function getJson<T>(url: string, ms: number): Promise<T> {
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return (await res.json()) as T;
}

async function getText(url: string, ms: number): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return res.text();
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function areaCode(stateCode: string, county: string, lat: number, lon: number): string {
  const cty = (county.replace(/county/i, "").trim() || "LOT").slice(0, 3).toUpperCase();
  const cell = Math.abs(Math.round((lat + 90) * 20) * 17 + Math.round((lon + 180) * 20)) % 48;
  return `${stateCode || "XX"}-${cty}-${String(cell).padStart(2, "0")}`;
}

function unescapeXml(v: string): string {
  return v
    .replaceAll("&" + "amp;", "&")
    .replaceAll("&" + "lt;", "<")
    .replaceAll("&" + "gt;", ">")
    .replaceAll("&" + "quot;", '"')
    .replaceAll("&" + "apos;", "'");
}

function ringFromGeojson(g: { type?: string; coordinates?: unknown } | undefined): LatLng[] | null {
  if (!g?.coordinates) return null;
  let ring: unknown;
  if (g.type === "Polygon") ring = (g.coordinates as unknown[])[0];
  else if (g.type === "MultiPolygon") ring = (g.coordinates as unknown[])[0] as unknown[];
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

function buildingFromRing(
  id: string,
  osmId: string,
  ring: LatLng[],
  tags: Record<string, string>,
  source: Building["source"],
): Building | null {
  const areaM2 = ringAreaM2(ring);
  if (areaM2 < 28 || areaM2 > 2800) return null;
  const use = (tags.building || "yes").toLowerCase();
  if (SKIP_USE.test(use)) return null;
  const bounds = ringBounds(ring);
  const levels = Math.max(
    1,
    Math.min(4, Number.parseInt(tags["building:levels"] || tags.levels || "1", 10) || 1),
  );
  const enterable =
    areaM2 >= 40 && areaM2 <= 900 && !/industrial|warehouse|retail|commercial|school|church/.test(use);
  return {
    id,
    osmId,
    ring,
    centroid: ringCentroid(ring),
    widthM: bounds.widthM,
    depthM: bounds.depthM,
    areaM2,
    levels,
    use,
    houseNumber: tags["addr:housenumber"] || "",
    street: tags["addr:street"] || "",
    year: tags.start_date || "",
    material: tags["building:material"] || "",
    roofShape: tags["roof:shape"] || "",
    hit: 0,
    source,
    enterable,
  };
}

interface NominatimHit {
  lat: string;
  lon: string;
  display_name?: string;
  osm_id?: number;
  osm_type?: string;
  class?: string;
  category?: string;
  type?: string;
  address?: Record<string, string>;
  geojson?: { type?: string; coordinates?: unknown };
}

interface PhotonHit {
  features?: {
    geometry?: { coordinates?: number[] };
    properties?: Record<string, string | undefined>;
  }[];
}

function placeFromParts(
  query: string,
  lat: number,
  lon: number,
  display: string,
  addr: Record<string, string | undefined>,
  osmId = "",
): Place {
  const number = addr.house_number || addr.housenumber || query.match(/\d+/)?.[0] || "";
  const street = addr.road || addr.street || addr.pedestrian || "";
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || "";
  const county = addr.county || "";
  const state = addr.state || "";
  return {
    query,
    displayName: display,
    lat,
    lon,
    number,
    street,
    city,
    county,
    state,
    stateCode: stateCodeOf(addr.state_code || state),
    postcode: addr.postcode || "",
    country: addr.country || "United States",
    osmId,
  };
}

function hasHouseNumber(query: string): boolean {
  return /^\s*\d+[A-Za-z]?\b/.test(query);
}

function houseNumberOf(query: string): string {
  return query.match(/^\s*(\d+[A-Za-z]?)\b/)?.[1] ?? "";
}

function wantedState(query: string): string {
  const named = query.match(
    /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i,
  );
  if (named?.[1]) return stateCodeOf(named[1]);
  const code = query.match(
    /(?:^|[\s,])(A[KLRSZ]|C[AOT]|D[EC]|F[LM]|G[AU]|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|P[AR]|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])(?:\s+\d{5}|\s*$|,)/i,
  );
  return code?.[1] ? code[1].toUpperCase() : "";
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Tx|Ny|Ca)\b/g, (c) => c.toUpperCase());
}

function inWantedState(place: Place, query: string): boolean {
  const want = wantedState(query);
  if (!want) return true;
  return place.stateCode === want || stateCodeOf(place.state) === want;
}

function isLocalityHit(cls: string, type: string): boolean {
  if (cls === "boundary" || type === "administrative") return true;
  if (cls === "place" && /city|town|village|hamlet|municipality|county|state|suburb/.test(type)) return true;
  return false;
}

interface GeoCandidate {
  place: Place;
  ring: LatLng[] | null;
  rank: number;
}

async function geocodeNominatim(query: string): Promise<GeoCandidate | null> {
  const hits = await getJson<NominatimHit[]>(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&polygon_geojson=1&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`,
    8000,
  );
  const numbered = hasHouseNumber(query);
  for (const hit of hits ?? []) {
    const lat = Number(hit.lat);
    const lon = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const cls = (hit as { class?: string; category?: string }).class || (hit as { category?: string }).category || "";
    const type = hit.type || "";
    if (numbered && isLocalityHit(cls, type)) continue;
    const place = placeFromParts(
      query,
      lat,
      lon,
      hit.display_name || query,
      hit.address ?? {},
      hit.osm_id ? String(hit.osm_id) : "",
    );
    if (!inWantedState(place, query)) continue;
    if (!place.number) place.number = houseNumberOf(query);
    const house = Boolean(place.number) && (cls === "place" || cls === "building" || type === "house" || Boolean(hit.address?.house_number));
    const rank = house ? 1 : numbered && isLocalityHit(cls, type) ? 90 : 5;
    return { place, ring: ringFromGeojson(hit.geojson), rank };
  }
  return null;
}

interface EsriCand {
  address?: string;
  score?: number;
  location?: { x?: number; y?: number };
  attributes?: Record<string, string | number | undefined>;
}

async function geocodeEsri(query: string): Promise<GeoCandidate | null> {
  const data = await getJson<{ candidates?: EsriCand[] }>(
    `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&maxLocations=5&outFields=Addr_type,AddNum,StName,StType,City,Region,RegionAbbr,Postal,PlaceName,Country&forStorage=false&countryCode=USA&singleLine=${encodeURIComponent(query)}`,
    8000,
  );
  const order = ["PointAddress", "Subaddress", "StreetAddress", "StreetInt", "StreetName"];
  const numbered = hasHouseNumber(query);
  const cands = [...(data.candidates ?? [])]
    .filter((c) => (c.score ?? 0) >= 78 && Number.isFinite(c.location?.x) && Number.isFinite(c.location?.y))
    .sort((a, b) => {
      const ta = order.indexOf(String(a.attributes?.Addr_type ?? ""));
      const tb = order.indexOf(String(b.attributes?.Addr_type ?? ""));
      const ra = ta < 0 ? 99 : ta;
      const rb = tb < 0 ? 99 : tb;
      if (ra !== rb) return ra - rb;
      return (b.score ?? 0) - (a.score ?? 0);
    });
  for (const c of cands) {
    const kind = String(c.attributes?.Addr_type ?? "");
    if (numbered && /Locality|POI|Postal|Admin/.test(kind)) continue;
    const a = c.attributes ?? {};
    const lat = Number(c.location?.y);
    const lon = Number(c.location?.x);
    const street = [a.StName, a.StType].filter(Boolean).join(" ").trim();
    const place = placeFromParts(
      query,
      lat,
      lon,
      c.address || query,
      {
        house_number: String(a.AddNum || houseNumberOf(query) || ""),
        road: street,
        city: String(a.City || a.PlaceName || ""),
        state: String(a.Region || a.RegionAbbr || ""),
        state_code: String(a.RegionAbbr || ""),
        postcode: String(a.Postal || ""),
        country: "United States",
      },
    );
    if (!inWantedState(place, query)) continue;
    const rank = kind === "PointAddress" || kind === "Subaddress" ? 2 : kind === "StreetAddress" ? 4 : 6;
    return { place, ring: null, rank };
  }
  return null;
}

async function geocodeCensus(query: string): Promise<GeoCandidate | null> {
  const data = await getJson<{
    result?: {
      addressMatches?: {
        matchedAddress?: string;
        coordinates?: { x?: number; y?: number };
        addressComponents?: Record<string, string>;
      }[];
    };
  }>(
    `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=${encodeURIComponent(query)}`,
    9000,
  );
  const m = data.result?.addressMatches?.[0];
  const lat = Number(m?.coordinates?.y);
  const lon = Number(m?.coordinates?.x);
  if (!m || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const c = m.addressComponents ?? {};
  const place = placeFromParts(
    query,
    lat,
    lon,
    titleCase(m.matchedAddress || query),
    {
      house_number: houseNumberOf(query) || c.fromAddress || "",
      road: titleCase(c.streetName || ""),
      city: titleCase(c.city || ""),
      state: c.state || "",
      state_code: c.state || "",
      postcode: c.zip || "",
      country: "United States",
    },
  );
  if (!inWantedState(place, query)) return null;
  return { place, ring: null, rank: 3 };
}

async function geocodePhoton(query: string): Promise<GeoCandidate | null> {
  const photon = await getJson<PhotonHit>(
    `https://photon.komoot.io/api/?limit=5&lang=en&q=${encodeURIComponent(query)}`,
    8000,
  );
  const numbered = hasHouseNumber(query);
  for (const f of photon.features ?? []) {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const p = f.properties ?? {};
    if (numbered && p.type === "city") continue;
    const place = placeFromParts(
      query,
      coords[1]!,
      coords[0]!,
      [p.housenumber, p.street, p.city || p.locality, p.state, p.postcode].filter(Boolean).join(", ") || query,
      {
        house_number: p.housenumber || houseNumberOf(query),
        road: p.street,
        city: p.city || p.locality,
        county: p.county,
        state: p.state,
        postcode: p.postcode,
        country: p.country,
      },
      p.osm_id || "",
    );
    if (!inWantedState(place, query)) continue;
    const rank = p.housenumber ? 5 : p.street ? 7 : 12;
    return { place, ring: null, rank };
  }
  return null;
}

async function geocodeGoogle(query: string): Promise<GeoCandidate | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return null;
  const data = await getJson<{
    results?: {
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      address_components?: { long_name?: string; short_name?: string; types?: string[] }[];
    }[];
  }>(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`,
    8000,
  );
  const hit = data.results?.[0];
  const lat = hit?.geometry?.location?.lat;
  const lon = hit?.geometry?.location?.lng;
  if (hit == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const parts: Record<string, string> = {};
  for (const c of hit.address_components ?? []) {
    const types = c.types ?? [];
    if (types.includes("street_number")) parts.house_number = c.long_name || "";
    if (types.includes("route")) parts.road = c.long_name || "";
    if (types.includes("locality")) parts.city = c.long_name || "";
    if (types.includes("administrative_area_level_2")) parts.county = c.long_name || "";
    if (types.includes("administrative_area_level_1")) {
      parts.state = c.long_name || "";
      parts.state_code = c.short_name || "";
    }
    if (types.includes("postal_code")) parts.postcode = c.long_name || "";
    if (types.includes("country")) parts.country = c.long_name || "";
  }
  const place = placeFromParts(query, lat as number, lon as number, hit.formatted_address || query, parts);
  if (!inWantedState(place, query)) return null;
  return { place, ring: null, rank: 2 };
}

function queryCity(query: string): string {
  const parts = query.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return "";
  const city = parts[1]!;
  if (/^[A-Z]{2}$/i.test(city) || /^\d{5}/.test(city)) return "";
  return city.replace(/\s+(TX|Texas|[A-Z]{2})\s+\d{5}.*$/i, "").trim();
}

function queryZip(query: string): string {
  return query.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? "";
}

function fitRank(c: GeoCandidate, query: string): number {
  let r = c.rank;
  const q = query.toLowerCase();
  const city = c.place.city.toLowerCase();
  const zip = c.place.postcode.slice(0, 5);
  if (city && q.includes(city)) r -= 2;
  if (zip && q.includes(zip)) r -= 2;
  const wantCity = queryCity(query).toLowerCase();
  if (wantCity && city && city !== wantCity && !city.includes(wantCity) && !wantCity.includes(city)) r += 5;
  const wantZip = queryZip(query);
  if (wantZip && zip && zip !== wantZip) r += 2;
  return r;
}

async function geocode(query: string): Promise<{ place: Place; ring: LatLng[] | null }> {
  const settled = await Promise.allSettled([
    geocodeNominatim(query),
    geocodeEsri(query),
    geocodeCensus(query),
    geocodePhoton(query),
    geocodeGoogle(query),
  ]);
  const hits: GeoCandidate[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value) hits.push(r.value);
  }
  hits.sort((a, b) => fitRank(a, query) - fitRank(b, query));
  const best = hits[0];
  if (!best) throw new Error("not found");
  const place = { ...best.place };
  if (!place.number) place.number = houseNumberOf(query);
  if (!place.street) {
    const afterNum = query.replace(/^\s*\d+[A-Za-z]?\s*/, "").split(",")[0]?.trim() ?? "";
    if (afterNum) place.street = afterNum;
  }
  const typedCity = queryCity(query);
  if (typedCity) place.city = typedCity;
  const typedZip = queryZip(query);
  if (typedZip && !place.postcode) place.postcode = typedZip;
  return { place, ring: best.ring };
}


async function reverseGeocode(
  lat: number,
  lon: number,
  query: string,
): Promise<{ place: Place; ring: LatLng[] | null }> {
  try {
    const hit = await getJson<NominatimHit>(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&polygon_geojson=1`,
      8000,
    );
    const place = placeFromParts(
      query,
      Number(hit.lat) || lat,
      Number(hit.lon) || lon,
      hit.display_name || query,
      hit.address ?? {},
      hit.osm_id ? String(hit.osm_id) : "",
    );
    return { place, ring: ringFromGeojson(hit.geojson) };
  } catch {
    return { place: placeFromParts(query, lat, lon, query, {}), ring: null };
  }
}

function suburbanGrid(place: Place): Building[] {
  const n0 = Number.parseInt(place.number, 10) || 40;
  const seed = hash32(place.displayName);
  const out: Building[] = [];
  let k = 0;
  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      if (row === 0 && col === 0) {
        k++;
        continue;
      }
      const lat = place.lat + row * 0.00027;
      const lon = place.lon + col * 0.00036;
      const w = 8.4 + (k % 4) * 0.7;
      const d = 6.6 + (k % 3) * 0.5;
      const center = { lat, lon };
      const ring = rectRing(center, w, d);
      const b = buildingFromRing(
        `est-${k}`,
        "",
        ring,
        {
          building: "house",
          "addr:housenumber": String((() => {
            const n = Math.max(1, n0 + col * 2 + (row + 2) * 8);
            return n === n0 ? n + 4 : n;
          })()),
          "addr:street": place.street || "the lot",
        },
        "estimated",
      );
      if (b) out.push({ ...b, enterable: true, levels: (seed + k) % 5 === 0 ? 2 : 1 });
      k++;
    }
  }
  return out;
}

function parseOsmXml(xml: string): { buildings: Building[]; roads: Road[] } {
  const nodes = new Map<string, LatLng>();
  const nodeRe = /<node\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = nodeRe.exec(xml))) {
    const attrs = m[1] ?? "";
    const id = attrs.match(/\bid="(\d+)"/)?.[1];
    const lat = attrs.match(/\blat="([^"]+)"/)?.[1];
    const lon = attrs.match(/\blon="([^"]+)"/)?.[1];
    if (id && lat && lon) nodes.set(id, { lat: Number(lat), lon: Number(lon) });
  }
  const buildings: Building[] = [];
  const roads: Road[] = [];
  const wayChunks = xml.split("<way ");
  for (let i = 1; i < wayChunks.length; i++) {
    const block = wayChunks[i]!;
    const id = block.match(/id="(\d+)"/)?.[1] ?? String(i);
    const tags: Record<string, string> = {};
    const tagRe = /<tag k="([^"]+)" v="([^"]*)"/g;
    let t: RegExpExecArray | null;
    while ((t = tagRe.exec(block))) tags[unescapeXml(t[1]!)] = unescapeXml(t[2]!);
    const nds: LatLng[] = [];
    const ndRe = /<nd ref="(\d+)"/g;
    let n: RegExpExecArray | null;
    while ((n = ndRe.exec(block))) {
      const p = nodes.get(n[1]!);
      if (p) nds.push(p);
    }
    if (tags.building && nds.length >= 4) {
      const b = buildingFromRing(`osm-${id}`, id, nds, tags, "osm");
      if (b) buildings.push(b);
    } else if (tags.highway && nds.length >= 2) {
      roads.push({
        id: `rd-${id}`,
        path: nds,
        name: tags.name || "",
        kind: tags.highway,
      });
    }
  }
  return { buildings, roads };
}

async function osmMapAround(lat: number, lon: number): Promise<{ buildings: Building[]; roads: Road[] }> {
  const dlat = 0.0026;
  const dlon = 0.0032;
  const bbox = `${(lon - dlon).toFixed(5)},${(lat - dlat).toFixed(5)},${(lon + dlon).toFixed(5)},${(lat + dlat).toFixed(5)}`;
  const xml = await getText(`https://api.openstreetmap.org/api/0.6/map?bbox=${bbox}`, 8000);
  return parseOsmXml(xml);
}

function seedPois(place: Place, zone: Zone): Poi[] {
  const city = place.city || "Local";
  const a = offsetLatLng(place, 1800, 900);
  const b = offsetLatLng(place, -2400, 1600);
  const c = offsetLatLng(place, 900, -2100);
  const mk = (
    id: string,
    kind: Poi["kind"],
    name: string,
    p: { lat: number; lon: number },
    extra: Partial<Poi>,
  ): Poi => {
    const meters = Math.round(haversineM(place, p));
    return {
      id,
      kind,
      name,
      lat: p.lat,
      lon: p.lon,
      meters,
      minutes: driveMinutes(meters),
      source: "estimated",
      stock: [],
      crew: "",
      areaCode: zone.areaCode,
      url: mapsDir(p.lat, p.lon),
      phone: "",
      ...extra,
    };
  };
  return [
    mk("est-sup-1", "supplier", `${city} Lumber & Supply`, a, {
      stock: ["Architectural shingles", "Ice-and-water", "2x6", "Flashing"],
    }),
    mk("est-con-1", "contractor", `${city} Exteriors`, b, { crew: "3-man roof crew" }),
    mk("est-ins-1", "insurance", `${city} Insurance`, c, {}),
  ];
}

const POI_KINDS: Poi["kind"][] = ["contractor", "supplier", "insurance"];

function mergePois(estimated: Poi[], live: Poi[]): Poi[] {
  const out: Poi[] = [];
  for (const kind of POI_KINDS) {
    const g = live.filter((p) => p.kind === kind);
    const e = estimated.filter((p) => p.kind === kind);
    out.push(...(g.length > 0 ? g : e));
  }
  return out;
}

interface NwsPoint {
  properties?: {
    cwa?: string;
    gridId?: string;
    gridX?: number;
    gridY?: number;
  };
}

interface Meteo {
  current?: { temperature_2m?: number; wind_speed_10m?: number };
}

async function loadZone(place: Place): Promise<Zone> {
  const code = areaCode(place.stateCode, place.county, place.lat, place.lon);
  const zone: Zone = {
    office: "",
    county: place.county,
    gridId: "",
    gridX: 0,
    gridY: 0,
    areaCode: code,
    forecast: "",
    tempF: 0,
    windMph: 0,
  };
  try {
    const pt = await getJson<NwsPoint>(
      `https://api.weather.gov/points/${place.lat.toFixed(4)},${place.lon.toFixed(4)}`,
      7000,
    );
    const p = pt.properties ?? {};
    zone.office = p.cwa || "";
    zone.gridId = p.gridId || "";
    zone.gridX = p.gridX || 0;
    zone.gridY = p.gridY || 0;
  } catch {
    /* optional */
  }
  try {
    const wx = await getJson<Meteo>(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`,
      6000,
    );
    zone.tempF = Math.round(wx.current?.temperature_2m ?? 0);
    zone.windMph = Math.round(wx.current?.wind_speed_10m ?? 0);
  } catch {
    /* optional */
  }
  return zone;
}

interface NwsAlert {
  id?: string;
  geometry?: { type?: string; coordinates?: unknown };
  properties?: {
    event?: string;
    headline?: string;
    severity?: string;
    expires?: string;
  };
}

function centroidOfGeom(geom: NwsAlert["geometry"]): { lat: number; lon: number } | null {
  if (!geom?.coordinates) return null;
  const walk = (node: unknown, acc: number[]): void => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      acc.push(node[0] as number, node[1] as number);
      return;
    }
    for (const n of node) walk(n, acc);
  };
  const flat: number[] = [];
  walk(geom.coordinates, flat);
  if (flat.length < 2) return null;
  let lon = 0;
  let lat = 0;
  let n = 0;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    lon += flat[i]!;
    lat += flat[i + 1]!;
    n++;
  }
  if (n === 0) return null;
  return { lat: lat / n, lon: lon / n };
}

function alertToCell(a: NwsAlert): StormCell | null {
  const c = centroidOfGeom(a.geometry);
  if (!c) return null;
  const event = a.properties?.event || "Severe weather";
  const sev = (a.properties?.severity || "").toLowerCase();
  return {
    id: a.id || `nws-${c.lat}-${c.lon}`,
    name: event,
    event,
    headline: a.properties?.headline || event,
    lat: c.lat,
    lon: c.lon,
    radiusKm: /tornado/i.test(event) ? 12 : /hail|thunder/i.test(event) ? 18 : 22,
    severity: sev === "extreme" || sev === "severe" ? "severe" : /watch/i.test(event) ? "watch" : "moderate",
    source: "nws",
    expires: a.properties?.expires,
  };
}

async function alertsNear(lat: number, lon: number): Promise<StormCell[]> {
  try {
    const data = await getJson<{ features?: NwsAlert[] }>(
      `https://api.weather.gov/alerts/active?point=${lat.toFixed(3)},${lon.toFixed(3)}`,
      7000,
    );
    return (data.features ?? []).map(alertToCell).filter((x): x is StormCell => x !== null).slice(0, 12);
  } catch {
    return [];
  }
}

async function alertsConus(): Promise<StormCell[]> {
  const events = [
    "Severe Thunderstorm Warning",
    "Tornado Warning",
    "Severe Thunderstorm Watch",
    "Tornado Watch",
  ]
    .map(encodeURIComponent)
    .join(",");
  try {
    const data = await getJson<{ features?: NwsAlert[] }>(
      `https://api.weather.gov/alerts/active?status=actual&message_type=alert&event=${events}`,
      9000,
    );
    const cells = (data.features ?? []).map(alertToCell).filter((x): x is StormCell => x !== null);
    const seen = new Set<string>();
    const out: StormCell[] = [];
    for (const c of cells) {
      const k = `${c.lat.toFixed(2)},${c.lon.toFixed(2)},${c.event}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
      if (out.length >= 36) break;
    }
    return out;
  } catch {
    return [];
  }
}

function assembleSite(
  place: Place,
  mapped: { buildings: Building[]; roads: Road[] },
  zone: Zone,
  storms: StormCell[],
  geocodedRing: LatLng[] | null,
  stormName?: string,
  extras?: { pois?: Poi[]; property?: PropertyRecord | null; national?: Building[] },
): Site {
  const origin = { lat: place.lat, lon: place.lon };
  let buildings = [...mapped.buildings, ...(extras?.national ?? [])];

  if (geocodedRing && geocodedRing.length >= 4) {
    const tagged = buildingFromRing(
      place.osmId ? `osm-${place.osmId}` : "geocoded",
      place.osmId,
      geocodedRing,
      {
        building: "house",
        "addr:housenumber": place.number,
        "addr:street": place.street,
      },
      "osm",
    );
    if (tagged) {
      buildings = buildings.filter((b) => b.osmId !== place.osmId && b.id !== tagged.id);
      buildings.unshift(tagged);
    }
  }

  buildings.sort((a, b) => haversineM(origin, a.centroid) - haversineM(origin, b.centroid));
  const realCount = buildings.filter((b) => b.source !== "estimated" && b.enterable).length;
  if (realCount < 4) {
    buildings = [...buildings, ...suburbanGrid(place)];
  }
  const seen = new Set<string>();
  buildings = buildings.filter((b) => {
    const k = b.osmId || `${b.houseNumber}-${b.street}-${b.centroid.lat.toFixed(5)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 80);

  let matched =
    buildings.find((b) => b.enterable && b.source !== "estimated" && b.houseNumber === place.number) ??
    buildings.find((b) => b.source === "usa" && b.enterable && haversineM(origin, b.centroid) < 50) ??
    buildings.find((b) => b.source === "microsoft" && b.enterable && haversineM(origin, b.centroid) < 40) ??
    buildings.find((b) => b.source === "osm" && b.enterable && haversineM(origin, b.centroid) < 55) ??
    buildings.find((b) => b.enterable && b.houseNumber === place.number) ??
    (place.osmId ? buildings.find((b) => b.osmId === place.osmId && b.enterable) : undefined) ??
    buildings.filter((b) => b.enterable && b.source !== "estimated").sort((a, b) => haversineM(origin, a.centroid) - haversineM(origin, b.centroid))[0] ??
    buildings.filter((b) => b.enterable).sort((a, b) => haversineM(origin, a.centroid) - haversineM(origin, b.centroid))[0] ??
    buildings[0] ??
    null;

  if (matched && place.number && !buildings.some((b) => b.houseNumber === place.number)) {
    matched = { ...matched, houseNumber: place.number, street: matched.street || place.street };
    buildings = buildings.map((b) => (b.id === matched!.id ? matched! : b));
  }

  if (!matched) {
    const grid = suburbanGrid(place);
    buildings = grid;
    matched = grid[0]!;
  }

  const hail = planHailPath(matched.centroid, hash32(place.displayName));
  const localStorm: StormCell = {
    id: "local-cell",
    name: stormName || "Hail cell",
    event: "Hail",
    headline: stormName ? `${stormName} walking the block` : "Local hail walk over the geocoded lot",
    lat: matched.centroid.lat,
    lon: matched.centroid.lon,
    radiusKm: hail.radiusM / 1000,
    severity: "moderate",
    source: "local",
  };

  const insurance = sketchInsurance(place, matched, zone);
  const pois = mergePois(seedPois(place, zone), extras?.pois ?? []);

  return {
    place,
    buildings,
    roads: mapped.roads.slice(0, 70),
    storms: [localStorm, ...storms.filter((s) => s.source === "nws")].slice(0, 8),
    pois,
    zone,
    hail,
    matchedId: matched.id,
    insurance,
    property: extras?.property ?? null,
  };
}

export const resolveSite = createServerFn({ method: "POST" })
  .validator((input: { query?: string; lat?: number; lon?: number; stormName?: string }) => input)
  .handler(async ({ data }): Promise<ResolveResult> => {
    try {
      const q = (data.query ?? "").trim();
      let geo: { place: Place; ring: LatLng[] | null };
      if (typeof data.lat === "number" && typeof data.lon === "number" && Number.isFinite(data.lat)) {
        geo = await reverseGeocode(data.lat, data.lon, q || `${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}`);
      } else {
        if (q.length < 3) return { ok: false, error: "Enter a street address." };
        geo = await geocode(q);
      }
      const { place, ring } = geo;
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
        return { ok: false, error: "That address did not resolve." };
      }
      const { googlePlaces, attomProperty } = await import("./keyed");
      const zoneP = loadZone(place);
      const [mapped, zone, storms, livePois, property, national] = await Promise.all([
        osmMapAround(place.lat, place.lon).catch(() => ({ buildings: [] as Building[], roads: [] as Road[] })),
        zoneP,
        alertsNear(place.lat, place.lon),
        zoneP.then((z) => googlePlaces(place, z)).catch(() => [] as Poi[]),
        attomProperty(place).catch(() => null),
        nationalFootprints(place).catch(() => ({ buildings: [] as Building[], property: null })),
      ]);
      const site = assembleSite(place, mapped, zone, storms, ring, data.stormName, {
        pois: livePois,
        property: property ?? national.property,
        national: national.buildings,
      });
      return { ok: true, site };
    } catch {
      return { ok: false, error: "Could not locate that address. Try a fuller street, city, and state." };
    }
  });

async function lsrCells(): Promise<StormCell[]> {
  try {
    const data = await getJson<{ features?: { properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }[] }>(
      "https://mesonet.agron.iastate.edu/geojson/lsr.php?hours=48",
      8000,
    );
    const out: StormCell[] = [];
    for (const f of data.features ?? []) {
      const p = f.properties ?? {};
      const type = String(p.typetext || p.type || "");
      if (!/hail|thunder|tornado|wind/i.test(type)) continue;
      const lat = Number(p.lat);
      const lon = Number(p.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const mag = p.magnitude != null ? String(p.magnitude) : "";
      const city = String(p.city || "report");
      const st = String(p.st || p.state || "");
      out.push({
        id: `lsr-${out.length}-${p.product_id || `${lat}-${lon}`}`,
        name: mag && /hail/i.test(type) ? `${mag}" hail` : type,
        event: type,
        headline: [type, mag && /hail/i.test(type) ? `${mag} in` : "", city, st].filter(Boolean).join(" · "),
        lat,
        lon,
        radiusKm: /tornado/i.test(type) ? 8 : 14,
        severity: /tornado/i.test(type) || Number(mag) >= 1.5 ? "severe" : "moderate",
        source: "lsr",
      });
      if (out.length >= 28) break;
    }
    return out;
  } catch {
    return [];
  }
}

export const listStorms = createServerFn({ method: "GET" }).handler(async (): Promise<StormCell[]> => {
  const [nws, lsr] = await Promise.all([alertsConus(), lsrCells()]);
  return [...nws, ...lsr].slice(0, 48);
});

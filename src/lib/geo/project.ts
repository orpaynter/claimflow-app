import type { LatLng } from "./types";

const M_PER_DEG_LAT = 110540;

export function haversineM(a: LatLng, b: LatLng): number {
  const r = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function metersPerDegLon(lat: number): number {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}

export function offsetLatLng(origin: LatLng, eastM: number, northM: number): LatLng {
  return {
    lat: origin.lat + northM / M_PER_DEG_LAT,
    lon: origin.lon + eastM / metersPerDegLon(origin.lat),
  };
}

export function ringAreaM2(ring: LatLng[]): number {
  if (ring.length < 3) return 0;
  const lat0 = ring[0]!.lat;
  const mx = metersPerDegLon(lat0);
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    const x1 = ring[i]!.lon * mx;
    const y1 = ring[i]!.lat * M_PER_DEG_LAT;
    const x2 = ring[j]!.lon * mx;
    const y2 = ring[j]!.lat * M_PER_DEG_LAT;
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function ringCentroid(ring: LatLng[]): LatLng {
  if (ring.length === 0) return { lat: 0, lon: 0 };
  let lat = 0;
  let lon = 0;
  const n = ring.length;
  for (const p of ring) {
    lat += p.lat;
    lon += p.lon;
  }
  return { lat: lat / n, lon: lon / n };
}

export function ringBounds(ring: LatLng[]): { widthM: number; depthM: number } {
  if (ring.length === 0) return { widthM: 8, depthM: 6 };
  const lat0 = ring[0]!.lat;
  const mx = metersPerDegLon(lat0);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of ring) {
    const x = p.lon * mx;
    const y = p.lat * M_PER_DEG_LAT;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { widthM: Math.max(4, maxX - minX), depthM: Math.max(4, maxY - minY) };
}

export function rectRing(center: LatLng, widthM: number, depthM: number): LatLng[] {
  const hw = widthM / 2;
  const hd = depthM / 2;
  return [
    offsetLatLng(center, -hw, -hd),
    offsetLatLng(center, hw, -hd),
    offsetLatLng(center, hw, hd),
    offsetLatLng(center, -hw, hd),
  ];
}

export function distToSegmentM(p: LatLng, a: LatLng, b: LatLng): number {
  const lat0 = a.lat;
  const mx = metersPerDegLon(lat0);
  const px = (p.lon - a.lon) * mx;
  const py = (p.lat - a.lat) * M_PER_DEG_LAT;
  const bx = (b.lon - a.lon) * mx;
  const by = (b.lat - a.lat) * M_PER_DEG_LAT;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  const dx = px - bx * t;
  const dy = py - by * t;
  return Math.hypot(dx, dy);
}

export function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
}

export function driveMinutes(meters: number): number {
  return Math.max(2, Math.round(meters / 11.1 / 60));
}

export function stateCodeOf(state: string): string {
  const s = state.trim();
  if (s.length === 2) return s.toUpperCase();
  const map: Record<string, string> = {
    alabama: "AL",
    alaska: "AK",
    arizona: "AZ",
    arkansas: "AR",
    california: "CA",
    colorado: "CO",
    connecticut: "CT",
    delaware: "DE",
    florida: "FL",
    georgia: "GA",
    hawaii: "HI",
    idaho: "ID",
    illinois: "IL",
    indiana: "IN",
    iowa: "IA",
    kansas: "KS",
    kentucky: "KY",
    louisiana: "LA",
    maine: "ME",
    maryland: "MD",
    massachusetts: "MA",
    michigan: "MI",
    minnesota: "MN",
    mississippi: "MS",
    missouri: "MO",
    montana: "MT",
    nebraska: "NE",
    nevada: "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    ohio: "OH",
    oklahoma: "OK",
    oregon: "OR",
    pennsylvania: "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    tennessee: "TN",
    texas: "TX",
    utah: "UT",
    vermont: "VT",
    virginia: "VA",
    washington: "WA",
    "west virginia": "WV",
    wisconsin: "WI",
    wyoming: "WY",
    "district of columbia": "DC",
  };
  return map[s.toLowerCase()] ?? s.slice(0, 2).toUpperCase();
}

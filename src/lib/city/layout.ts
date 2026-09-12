import { metersPerDegLon } from "@/lib/geo/project";
import type { Building, Poi, Site } from "@/lib/geo/types";

export type ZoneKind = "R" | "C" | "I";

export interface CityLot {
  id: string;
  points: [number, number][];
  height: number;
  zone: ZoneKind;
  hit: 0 | 1 | 2 | 3;
  enterable: boolean;
  label: string;
  cx: number;
  cz: number;
}

export interface CityRoad {
  id: string;
  points: [number, number][];
  named: boolean;
}

export interface CityNode {
  id: string;
  kind: Poi["kind"];
  x: number;
  z: number;
  name: string;
  minutes: number;
  meters: number;
  stock: string[];
  crew: string;
  placed: "true" | "belt";
}

export interface CityLayout {
  lots: CityLot[];
  roads: CityRoad[];
  nodes: CityNode[];
  radius: number;
}

export function zoneOf(b: Building): ZoneKind {
  const u = (b.use || "").toLowerCase();
  if (/industrial|warehouse|factory|garage|shed/.test(u) && b.areaM2 > 160) return "I";
  if (/retail|commercial|office|shop|school|church|yes/.test(u) && b.areaM2 > 400 && !b.enterable) return "C";
  return "R";
}

export function project(lat: number, lon: number, oLat: number, oLon: number): [number, number] {
  const x = (lon - oLon) * metersPerDegLon(oLat);
  const z = -(lat - oLat) * 110540;
  return [x, z];
}

export function layoutCity(site: Site): CityLayout {
  const oLat = site.place.lat;
  const oLon = site.place.lon;
  const lots: CityLot[] = [];
  for (const b of site.buildings) {
    if (b.ring.length < 4) continue;
    const points = b.ring.map((p) => project(p.lat, p.lon, oLat, oLon));
    const cx = points.reduce((n, p) => n + p[0], 0) / points.length;
    const cz = points.reduce((n, p) => n + p[1], 0) / points.length;
    const height = Math.max(4.2, Math.min(28, (b.levels || 1) * 3.4 + Math.sqrt(b.areaM2) * 0.08));
    lots.push({
      id: b.id,
      points,
      height,
      zone: zoneOf(b),
      hit: b.hit,
      enterable: b.enterable,
      label: [b.houseNumber, b.street].filter(Boolean).join(" ") || "lot",
      cx,
      cz,
    });
  }
  const roads: CityRoad[] = site.roads.slice(0, 48).map((r) => ({
    id: r.id,
    named: Boolean(r.name),
    points: r.path.map((p) => project(p.lat, p.lon, oLat, oLon)),
  }));
  const kindAngle: Record<Poi["kind"], number> = {
    supplier: 0.45,
    contractor: 2.35,
    insurance: 4.15,
  };
  const nodes: CityNode[] = site.pois.map((p, i) => {
    const [x0, z0] = project(p.lat, p.lon, oLat, oLon);
    const d = Math.hypot(x0, z0) || 1;
    const belt = d > 620;
    if (!belt) return {
      id: p.id,
      kind: p.kind,
      x: x0,
      z: z0,
      name: p.name,
      minutes: p.minutes,
      meters: p.meters,
      stock: p.stock,
      crew: p.crew,
      placed: "true" as const,
    };
    const a = kindAngle[p.kind] + i * 0.18;
    return {
      id: p.id,
      kind: p.kind,
      x: Math.cos(a) * 310,
      z: Math.sin(a) * 310,
      name: p.name,
      minutes: p.minutes,
      meters: p.meters,
      stock: p.stock,
      crew: p.crew,
      placed: "belt" as const,
    };
  });
  let radius = 180;
  for (const l of lots) radius = Math.max(radius, Math.hypot(l.cx, l.cz) + 40);
  for (const n of nodes) radius = Math.max(radius, Math.hypot(n.x, n.z) + 50);
  return { lots, roads, nodes, radius };
}

export const ZONE_COLOR: Record<ZoneKind, string> = {
  R: "#c4b49a",
  C: "#8a9aa8",
  I: "#6a8f7a",
};

export const NODE_COLOR: Record<Poi["kind"], string> = {
  supplier: "#6a8f7a",
  contractor: "#8a9aa8",
  insurance: "#d7ddd4",
};

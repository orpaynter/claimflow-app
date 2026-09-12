import { distToSegmentM, lerpLatLng, offsetLatLng } from "./project";
import type { Building, HailPath, LatLng } from "./types";

export const HAIL_DURATION = 9.2;
export const HAIL_CORE = 0.28;
export const HAIL_SEVERE = 0.62;

export function planHailPath(origin: LatLng, seed: number): HailPath {
  const a = ((seed % 360) * Math.PI) / 180;
  const span = 520 + (seed % 180);
  const radiusM = 140 + (seed % 70);
  const start = offsetLatLng(origin, Math.cos(a) * -span, Math.sin(a) * -span * 0.7);
  const end = offsetLatLng(origin, Math.cos(a) * span, Math.sin(a) * span * 0.7);
  return { start, end, radiusM };
}

export function hailCenterAt(path: HailPath, t: number): LatLng {
  const u = Math.max(0, Math.min(1, t / HAIL_DURATION));
  const ease = u < 0.12 ? u / 0.12 : u > 0.88 ? 1 : 0.12 + ((u - 0.12) / 0.76) * 0.76;
  return lerpLatLng(path.start, path.end, ease);
}

export function hailSeverity(building: Building, path: HailPath, center: LatLng): 0 | 1 | 2 | 3 {
  const dPath = distToSegmentM(building.centroid, path.start, path.end);
  const dNow = Math.hypot(
    (building.centroid.lat - center.lat) * 110540,
    (building.centroid.lon - center.lon) * 111320 * Math.cos((center.lat * Math.PI) / 180),
  );
  if (dPath > path.radiusM * 1.15) return 0;
  if (dNow > path.radiusM * 1.35 && dPath > path.radiusM * 0.55) return 0;
  if (dPath < path.radiusM * HAIL_CORE) return 3;
  if (dPath < path.radiusM * HAIL_SEVERE) return 2;
  return 1;
}

export function corridorPolygon(path: { start: LatLng; end: LatLng }, radiusM: number, steps = 20): LatLng[] {
  const midLat = (path.start.lat + path.end.lat) / 2;
  const north = (path.end.lat - path.start.lat) * 110540;
  const east = (path.end.lon - path.start.lon) * (111320 * Math.cos((midLat * Math.PI) / 180));
  const len = Math.hypot(north, east) || 1;
  const pn = (-east / len) * radiusM;
  const pe = (north / len) * radiusM;
  const left: LatLng[] = [];
  const right: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = lerpLatLng(path.start, path.end, i / steps);
    left.push(offsetLatLng(p, pe, pn));
    right.push(offsetLatLng(p, -pe, -pn));
  }
  const cap = (at: LatLng, outwardNorth: number, outwardEast: number): LatLng[] => {
    const pts: LatLng[] = [];
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      const a = t * Math.PI;
      const n = Math.cos(a) * pn + Math.sin(a) * outwardNorth;
      const e = Math.cos(a) * pe + Math.sin(a) * outwardEast;
      pts.push(offsetLatLng(at, e, n));
    }
    return pts;
  };
  const startOutN = (-north / len) * radiusM;
  const startOutE = (-east / len) * radiusM;
  const endOutN = (north / len) * radiusM;
  const endOutE = (east / len) * radiusM;
  return [...left, ...cap(path.end, endOutN, endOutE), ...right.reverse(), ...cap(path.start, startOutN, startOutE)];
}

export function toLatLngs(ring: LatLng[]): [number, number][] {
  return ring.map((p) => [p.lat, p.lon]);
}

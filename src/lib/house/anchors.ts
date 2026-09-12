import type { HouseSpec, PartId } from "./types";

export function partAnchor(spec: HouseSpec, part: PartId | null): { x: number; y: number; z: number; dist: number } {
  const w = spec.width;
  const d = spec.depth;
  const bodyH = spec.stories * spec.storyHeight + 0.36;
  switch (part) {
    case "roof":
      return { x: 0.35, y: bodyH + 1.05, z: 0.55, dist: 3.15 };
    case "windows":
      return { x: 0, y: 1.55, z: d / 2 + 0.15, dist: 2.55 };
    case "siding":
      return { x: w / 2 + 0.15, y: 1.35, z: 0.2, dist: 2.7 };
    case "porch":
      return { x: 0, y: 1.0, z: d / 2 + 1.0, dist: 2.6 };
    case "chimney":
      return { x: spec.gableStreetFacing ? w * 0.1 : w * 0.26, y: bodyH + 1.85, z: spec.gableStreetFacing ? -d * 0.22 : -d * 0.16, dist: 2.5 };
    case "garage":
      return { x: w / 2 + 1.45, y: 1.2, z: 0, dist: 3.0 };
    case "trees":
      return { x: -w * 0.85, y: 1.5, z: -d * 0.65, dist: 4.2 };
    case "fence":
      return { x: 0, y: 0.65, z: d * 0.85, dist: 3.6 };
    default:
      return { x: 0, y: 1.85, z: 0.15, dist: 11 };
  }
}

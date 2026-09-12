import { PRIORITY } from "./agent";
import type { DamageEvent, HouseSpec, PartId, RepairDecision } from "./types";

const UNIT: Record<PartId, { unit: string; hours: number }> = {
  roof: { unit: "squares", hours: 14 },
  chimney: { unit: "stack", hours: 10 },
  windows: { unit: "openings", hours: 6 },
  siding: { unit: "elevations", hours: 12 },
  porch: { unit: "ledger", hours: 8 },
  garage: { unit: "opening", hours: 9 },
  trees: { unit: "stems", hours: 5 },
  fence: { unit: "bays", hours: 4 },
};

export function squaresOf(spec: HouseSpec): number {
  if (spec.roofSqft && spec.roofSqft > 0) return Math.max(12, Math.round(spec.roofSqft / 100));
  return Math.max(12, Math.round(((spec.footprintSqft ?? spec.width * spec.depth * 10.764) || 1400) / 90));
}

export function lineCost(part: PartId, severity: 1 | 2 | 3, spec: HouseSpec): number {
  const sq = squaresOf(spec);
  const living = spec.footprintSqft ?? Math.round(spec.width * spec.depth * 10.764);
  const sev = severity;
  switch (part) {
    case "roof":
      return Math.round(sq * (265 + sev * 95));
    case "chimney":
      return Math.round(1800 + sev * 1100);
    case "windows":
      return Math.round(spec.windowCols * (290 + sev * 170));
    case "siding":
      return Math.round(living * (1.8 + sev * 1.1));
    case "porch":
      return Math.round(1400 + sev * 900);
    case "garage":
      return Math.round(2200 + sev * 800);
    case "trees":
      return Math.round(spec.treeCount * (180 + sev * 90));
    case "fence":
      return Math.round(640 + sev * 420);
  }
}

export function scaleDecisions(spec: HouseSpec, events: DamageEvent[], incoming: RepairDecision[]): RepairDecision[] {
  const sev = new Map<PartId, 1 | 2 | 3>();
  for (const e of events) {
    const prev = sev.get(e.part);
    if (!prev || e.severity >= prev) sev.set(e.part, e.severity);
  }
  return incoming.map((d) => {
    const s = sev.get(d.part) ?? 1;
    const cost = lineCost(d.part, s, spec);
    return {
      ...d,
      cost,
      hours: UNIT[d.part].hours + s * 3,
    };
  });
}

export function estimateTotal(decisions: RepairDecision[]): { spent: number; hours: number } {
  return {
    spent: decisions.reduce((n, d) => n + d.cost, 0),
    hours: decisions.reduce((n, d) => n + d.hours, 0),
  };
}

export function sortByPriority(decisions: RepairDecision[]): RepairDecision[] {
  return [...decisions].sort((a, b) => PRIORITY[b.part] - PRIORITY[a.part] || b.cost - a.cost);
}

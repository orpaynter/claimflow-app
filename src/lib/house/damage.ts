import { mulberry32 } from "./rng";
import type { DamageEvent, HouseSpec, PartId } from "./types";

const LABELS: Record<PartId, string[]> = {
  roof: [
    "Windward pitch flagged for review",
    "Ridge cap flagged — modeled granule loss",
    "South slope flagged after the cell",
  ],
  windows: [
    "Front sash flagged for review",
    "West glazing flagged — modeled strike",
    "Shutter line flagged with an opening",
  ],
  siding: [
    "Windward clapboards flagged",
    "Envelope flagged at the corner board",
    "Eave trim flagged for inspection",
  ],
  porch: [
    "Porch ledger flagged",
    "Column plumb flagged for review",
    "Deck boards flagged after the cell",
  ],
  chimney: [
    "Chimney crown flagged",
    "Flue alignment flagged for review",
    "Top course flagged as modeled concern",
  ],
  garage: [
    "Garage door flagged for review",
    "Lean-to track flagged",
    "Header line flagged after the cell",
  ],
  trees: [
    "Windward stems flagged",
    "Limb load flagged on the fence line",
    "Cedar line flagged mid-trunk",
  ],
  fence: [
    "Windward pickets flagged",
    "Drive bay flagged for review",
    "Posts flagged in wet soil",
  ],
};

const STORMS = [
  "Nor'easter",
  "The Gale",
  "Line squall",
  "Coastal storm",
  "Backdoor front",
  "White squall",
];

export function nameStorm(seed: number): string {
  const rng = mulberry32(seed ^ 0x51a11);
  const name = STORMS[Math.floor(rng() * STORMS.length)] as string;
  const n = 12 + Math.floor(rng() * 36);
  return `${name} ${n}`;
}

export function planStorm(
  spec: HouseSpec,
  cell?: { name?: string; event?: string; severity?: string },
): DamageEvent[] {
  const rng = mulberry32(spec.seed ^ 0x9e3779b9);
  const event = `${cell?.event ?? ""} ${cell?.name ?? ""}`.toLowerCase();
  const hail = /hail/.test(event);
  const wind = /wind|thunder|tornado|squall|gale/.test(event);
  const severe = cell?.severity === "severe" || /tornado/.test(event);
  const parts: PartId[] = ["roof"];
  if (hail || severe) parts.push("windows");
  parts.push("siding");
  if (spec.hasChimney) parts.splice(1, 0, "chimney");
  if (spec.hasPorch) parts.push("porch");
  if (spec.hasGarage && (hail || severe)) parts.push("garage");
  if (spec.treeCount > 0 && wind) parts.push("trees");
  if (spec.hasFence && wind) parts.push("fence");

  const events: DamageEvent[] = [];
  const start = 3.6;
  const span = 12.5;
  parts.forEach((part, i) => {
    const t = start + ((i + rng() * 0.7) / parts.length) * span;
    let severity: 1 | 2 | 3 = severe ? 3 : hail && part === "roof" ? 2 : 1;
    if (!severe && rng() < 0.18) severity = Math.min(3, severity + 1) as 1 | 2 | 3;
    const labels = LABELS[part];
    const label = labels[Math.floor(rng() * labels.length)] as string;
    events.push({
      id: `${part}-${i}`,
      part,
      severity,
      label: cell?.name ? `${label} · ${cell.name}` : label,
      t: Math.round(t * 10) / 10,
      kind: "modeled",
    });
  });
  events.sort((a, b) => a.t - b.t);
  return events;
}

export const STORM_DURATION = 18;

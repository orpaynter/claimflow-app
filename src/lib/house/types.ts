export const PARTS = [
  "roof",
  "windows",
  "siding",
  "porch",
  "chimney",
  "garage",
  "trees",
  "fence",
] as const;

export type PartId = (typeof PARTS)[number];

export type HouseStyle =
  | "cape"
  | "colonial"
  | "victorian"
  | "ranch"
  | "craftsman"
  | "farmhouse";

export interface HousePalette {
  body: string;
  trim: string;
  roof: string;
  shutters: string;
  door: string;
  foundation: string;
  glass: string;
}

export type OutlineSource = "osm" | "estimated" | "microsoft" | "usa";

export interface HouseSpec {
  seed: number;
  address: string;
  number: string;
  street: string;
  locality: string;
  style: HouseStyle;
  styleLabel: string;
  stories: 1 | 2;
  width: number;
  depth: number;
  storyHeight: number;
  roofPitch: number;
  gableStreetFacing: boolean;
  palette: HousePalette;
  hasPorch: boolean;
  porchWrap: boolean;
  hasGarage: boolean;
  hasChimney: boolean;
  hasTurret: boolean;
  dormers: number;
  windowCols: number;
  treeCount: number;
  hasFence: boolean;
  notes: string;
  lat?: number;
  lon?: number;
  footprintSqft?: number;
  roofSqft?: number;
  levels?: number;
  source?: OutlineSource;
  areaCode?: string;
  osmId?: string;
}

export interface DamageEvent {
  id: string;
  part: PartId;
  severity: 1 | 2 | 3;
  label: string;
  t: number;
  kind: "modeled";
}

export interface RepairDecision {
  id: string;
  part: PartId;
  action: string;
  rationale: string;
  cost: number;
  hours: number;
  priority: number;
  source: "steward" | "local";
}

export type Phase =
  | "orbit"
  | "track"
  | "select"
  | "survey"
  | "storm"
  | "measure"
  | "dispatch"
  | "planning"
  | "repairing"
  | "restored";

export type FindingsStatus = "idle" | "modeled" | "draft" | "approved" | "rejected";

export type WorkspaceTab =
  | "overview"
  | "exposure"
  | "imagery"
  | "twin"
  | "measure"
  | "evidence"
  | "estimate"
  | "insurance"
  | "logistics"
  | "package"
  | "log";

export interface AttachedEvidence {
  id: string;
  name: string;
  kind: "photo" | "note" | "request";
  bytes: number;
  hash: string;
  captured_at: number;
  note: string;
  dataUrl?: string;
}

export type TwinMode = "footprint" | "measured" | "evidence";

export const MAP_PHASES: Phase[] = ["orbit", "track", "select", "dispatch"];

export function isMapPhase(phase: Phase): boolean {
  return MAP_PHASES.includes(phase);
}

export const PART_WEIGHT: Record<PartId, number> = {
  roof: 18,
  windows: 12,
  siding: 10,
  porch: 8,
  chimney: 9,
  garage: 7,
  trees: 5,
  fence: 4,
};

export const PART_LABEL: Record<PartId, string> = {
  roof: "Roof",
  windows: "Glazing",
  siding: "Envelope",
  porch: "Porch",
  chimney: "Chimney",
  garage: "Garage",
  trees: "Trees",
  fence: "Fence",
};

export function emptyHealth(): Record<PartId, number> {
  return {
    roof: 1,
    windows: 1,
    siding: 1,
    porch: 1,
    chimney: 1,
    garage: 1,
    trees: 1,
    fence: 1,
  };
}

export function integrityOf(spec: HouseSpec, health: Record<PartId, number>): number {
  let w = 0;
  let acc = 0;
  (Object.keys(PART_WEIGHT) as PartId[]).forEach((part) => {
    if (part === "porch" && !spec.hasPorch) return;
    if (part === "chimney" && !spec.hasChimney) return;
    if (part === "garage" && !spec.hasGarage) return;
    if (part === "trees" && spec.treeCount <= 0) return;
    if (part === "fence" && !spec.hasFence) return;
    w += PART_WEIGHT[part];
    acc += PART_WEIGHT[part] * health[part];
  });
  return Math.round((acc / Math.max(1, w)) * 100);
}

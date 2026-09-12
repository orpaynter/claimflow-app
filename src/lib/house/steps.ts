import type { Phase } from "./types";

export const FLOW: { label: string; match: Phase[] }[] = [
  { label: "Map", match: ["orbit", "track"] },
  { label: "House", match: ["select"] },
  { label: "Storm", match: ["survey", "storm"] },
  { label: "Estimate", match: ["measure"] },
  { label: "Crews", match: ["dispatch", "planning", "repairing"] },
  { label: "Report", match: ["restored"] },
];

export function stepIndex(phase: Phase): number {
  const i = FLOW.findIndex((s) => s.match.includes(phase));
  return i < 0 ? 0 : i;
}

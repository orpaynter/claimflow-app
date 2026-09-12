export type ClaimStatus =
  | "not_assessed"
  | "exposure"
  | "evidence_needed"
  | "remote_review"
  | "field_collected"
  | "human_reviewed"
  | "approved_scope"
  | "carrier_review"
  | "materials"
  | "closed";

export const CLAIM_STATUS: { id: ClaimStatus; label: string; tone: string }[] = [
  { id: "not_assessed", label: "Not assessed", tone: "status-idle" },
  { id: "exposure", label: "Storm exposure identified", tone: "status-exposure" },
  { id: "evidence_needed", label: "Evidence needed", tone: "status-needed" },
  { id: "remote_review", label: "Remote evidence suggests review", tone: "status-remote" },
  { id: "field_collected", label: "Field evidence collected", tone: "status-field" },
  { id: "human_reviewed", label: "Human-reviewed finding", tone: "status-reviewed" },
  { id: "approved_scope", label: "Approved scope", tone: "status-approved" },
  { id: "carrier_review", label: "Submitted / carrier review", tone: "status-carrier" },
  { id: "materials", label: "Materials scheduled", tone: "status-ok" },
  { id: "closed", label: "Closed", tone: "status-closed" },
];

export function labelOf(id: ClaimStatus): string {
  return CLAIM_STATUS.find((s) => s.id === id)?.label ?? id;
}

export function claimStatusOf(opts: {
  hit: 0 | 1 | 2 | 3;
  fieldCount: number;
  findings: "idle" | "modeled" | "draft" | "approved" | "rejected";
  phase: string;
}): ClaimStatus {
  if (opts.phase === "restored") return "closed";
  if (opts.phase === "dispatch" || opts.phase === "planning" || opts.phase === "repairing") {
    return opts.findings === "approved" ? "materials" : "approved_scope";
  }
  if (opts.findings === "approved") return "approved_scope";
  if (opts.findings === "draft" || opts.findings === "rejected") return "human_reviewed";
  if (opts.fieldCount > 0) return "field_collected";
  if (opts.hit >= 3) return "remote_review";
  if (opts.hit === 2) return "evidence_needed";
  if (opts.hit === 1) return "exposure";
  return "not_assessed";
}

export type TwinMode = "footprint" | "measured" | "evidence";

export function twinLabel(mode: TwinMode, measured: boolean): string {
  if (mode === "measured" && measured) return "Measurement-derived roof geometry";
  if (mode === "evidence") return "Observed or reviewer-marked evidence";
  if (measured) return "Footprint model — operational location model";
  return "Illustrative model — not a verified representation of roof geometry.";
}

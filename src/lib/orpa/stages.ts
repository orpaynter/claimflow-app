import type { Phase } from "@/lib/house/types";

export type ArchCenter = "truth" | "authority" | "action" | "proof" | "learning";

export const CENTERS: { id: ArchCenter; label: string }[] = [
  { id: "truth", label: "Truth" },
  { id: "authority", label: "Authority" },
  { id: "action", label: "Governed action" },
  { id: "proof", label: "Proof" },
  { id: "learning", label: "Learning" },
];

export type OrpaCommand =
  | "command"
  | "review"
  | "approve"
  | "reject"
  | "override"
  | "stop"
  | "inspect"
  | "proof"
  | "reconcile";

export const COMMANDS: { id: OrpaCommand; label: string; hint: string }[] = [
  { id: "command", label: "Command", hint: "Set the next objective" },
  { id: "review", label: "Review", hint: "Inspect plans, workers, data" },
  { id: "approve", label: "Approve", hint: "Authorize the next action" },
  { id: "reject", label: "Reject", hint: "Block or deny this step" },
  { id: "override", label: "Override", hint: "Take control" },
  { id: "stop", label: "Stop", hint: "Halt execution immediately" },
  { id: "inspect", label: "Inspect", hint: "View the steward" },
  { id: "proof", label: "Proof", hint: "Open the DecisionPackage rail" },
  { id: "reconcile", label: "Reconcile", hint: "Expected versus actual" },
];

export function centerOf(phase: Phase): ArchCenter {
  if (phase === "orbit" || phase === "track" || phase === "select") return "truth";
  if (phase === "survey" || phase === "storm" || phase === "measure" || phase === "dispatch") {
    return "authority";
  }
  if (phase === "planning" || phase === "repairing") return "action";
  return "learning";
}

export function stageOf(phase: Phase): { n: number; name: string; detail: string } {
  switch (phase) {
    case "orbit":
      return { n: 1, name: "Storm Command", detail: "Type any address or pick a live cell. We never pick the house." };
    case "track":
      return { n: 2, name: "Signal bus", detail: "Geocode the typed address. Pull OSM, USA Structures, Microsoft footprints." };
    case "select":
      return { n: 6, name: "RTCI", detail: "Exposure scored on real footprints. Not a damage determination." };
    case "survey":
      return { n: 7, name: "Predictive intelligence", detail: "Lot raised. Replay starts on the client. Watching is not approval." };
    case "storm":
      return { n: 7, name: "Predictive intelligence", detail: "Client replay. Camera follows modeled concerns. Skip anytime." };
    case "measure":
      return { n: 11, name: "Verification arena", detail: "Lot scanned. Highlighted areas are modeled. Approve a draft Decision Package." };
    case "dispatch":
      return { n: 15, name: "Pre-actuation gateway", detail: "Default-deny. Issue authority before the steward moves." };
    case "planning":
      return { n: 8, name: "OPUS", detail: "The steward drafts. You still govern." };
    case "repairing":
      return { n: 16, name: "Execution edge", detail: "Bounded tools. Envelope first." };
    case "restored":
      return { n: 18, name: "Outcome loop", detail: "Proof sealed. Reconcile, then the next lot." };
  }
}

export function approveLabel(phase: Phase): string {
  switch (phase) {
    case "select":
      return "Approve lot";
    case "measure":
      return "Approve draft findings";
    case "dispatch":
      return "Issue authority";
    case "restored":
      return "Reconcile";
    default:
      return "Approve";
  }
}

export function canApprove(phase: Phase): boolean {
  return phase === "select" || phase === "measure" || phase === "dispatch";
}

export function canReject(phase: Phase): boolean {
  return phase !== "orbit";
}

export function canStop(phase: Phase): boolean {
  return phase === "storm" || phase === "planning" || phase === "repairing";
}

export function canOverride(phase: Phase): boolean {
  return phase === "select" || phase === "storm";
}

export function canInspect(phase: Phase): boolean {
  return phase === "planning" || phase === "repairing" || phase === "restored";
}

export function canProof(phase: Phase): boolean {
  return phase !== "orbit" && phase !== "track";
}

export function canReconcile(phase: Phase): boolean {
  return phase === "restored";
}

export function canCommand(phase: Phase): boolean {
  return phase !== "storm" && phase !== "planning" && phase !== "repairing";
}

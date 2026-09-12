import type { Phase } from "./types";

export interface Coach {
  step: number;
  of: number;
  here: string;
  next: string;
  action: string | null;
  actionKind: "skip" | "enter" | "approve" | "dispatch" | "stop" | "report" | "reset" | null;
}

export function coach(phase: Phase): Coach {
  switch (phase) {
    case "orbit":
      return {
        step: 1,
        of: 4,
        here: "Your roof",
        next: "Name, address, photos. Then we find the house.",
        action: null,
        actionKind: null,
      };
    case "track":
      return {
        step: 1,
        of: 4,
        here: "Finding the house",
        next: "Geocoding the address and pulling real building outlines.",
        action: null,
        actionKind: null,
      };
    case "select":
      return {
        step: 1,
        of: 4,
        here: "Impact zone",
        next: "Tap a footprint. Colors are exposure confidence, not proven damage.",
        action: "Open this house",
        actionKind: "enter",
      };
    case "survey":
      return {
        step: 2,
        of: 4,
        here: "3D digital twin",
        next: "Footprint model unless a measurement provider is on file. Watching is not approval.",
        action: null,
        actionKind: null,
      };
    case "storm":
      return {
        step: 2,
        of: 4,
        here: "Storm replay",
        next: "Watch the modeled damage, or skip straight to the estimate.",
        action: "Skip replay",
        actionKind: "skip",
      };
    case "measure":
      return {
        step: 3,
        of: 4,
        here: "Lock the package",
        next: "Read the draft. Your name freezes it. Nothing files itself.",
        action: "Lock package",
        actionKind: "approve",
      };
    case "dispatch":
      return {
        step: 4,
        of: 4,
        here: "Crews and yards",
        next: "Approve crews to run the order of work. Nothing orders itself.",
        action: "Approve crews",
        actionKind: "dispatch",
      };
    case "planning":
    case "repairing":
      return {
        step: 4,
        of: 4,
        here: "Repairs running",
        next: "The steward drafts. You can stop at any time.",
        action: "Stop",
        actionKind: "stop",
      };
    case "restored":
      return {
        step: 4,
        of: 4,
        here: "Package locked",
        next: "Your name is on it. Open the report, or start another roof.",
        action: "Open report",
        actionKind: "report",
      };
  }
}

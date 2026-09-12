import type { DamageEvent, HouseSpec, PartId, RepairDecision } from "./types";

export const PRIORITY: Record<PartId, number> = {
  roof: 10,
  chimney: 9,
  windows: 8,
  siding: 7,
  porch: 6,
  garage: 5,
  trees: 4,
  fence: 2,
};

const ACTIONS: Record<PartId, string> = {
  roof: "Close the windward pitch",
  chimney: "Rebuild the crown and reset the flue",
  windows: "Reglaze and rehang the sash",
  siding: "Relay clapboards and reseal the corner",
  porch: "Jack the porch and sister the ledger",
  garage: "True the opening and replace the door",
  trees: "Limb out and haul the windthrow",
  fence: "Reset posts and run a new bay",
};

const WHY: Record<PartId, string> = {
  roof: "Until the envelope is closed, every other repair is just drying in the rain.",
  chimney: "A leaning stack is a second storm waiting. Gravity does not wait for trim work.",
  windows: "Open glazing is how the interior takes on water and the wind keeps working the frame.",
  siding: "The corner board is the zipper. Close it before the cavity drinks another night of weather.",
  porch: "A kicked column transfers load into the main wall. Plumb it before the ledger tears.",
  garage: "A bowed door is a sail. Get the opening true so the next gust has nothing to grab.",
  trees: "Green wood on the roof is a second impact. Clear the lot before anyone climbs.",
  fence: "Cosmetic, but it keeps the lot from looking abandoned while the real work finishes.",
};

export function planLocal(
  spec: HouseSpec,
  events: DamageEvent[],
): { brief: string; decisions: RepairDecision[] } {
  const byPart = new Map<PartId, DamageEvent>();
  for (const e of events) {
    const prev = byPart.get(e.part);
    if (!prev || e.severity >= prev.severity) byPart.set(e.part, e);
  }
  const damaged = [...byPart.values()].sort(
    (a, b) => PRIORITY[b.part] - PRIORITY[a.part] || b.severity - a.severity,
  );

  const decisions: RepairDecision[] = damaged.map((e, i) => {
    const sev = e.severity;
    return {
      id: `d-${e.part}`,
      part: e.part,
      action: ACTIONS[e.part],
      rationale: WHY[e.part],
      cost: Math.round((800 + PRIORITY[e.part] * 280 + sev * 920) / 10) * 10,
      hours: Math.round(4 + PRIORITY[e.part] * 1.4 + sev * 3),
      priority: i + 1,
      source: "local",
    };
  });

  const brief = `${spec.styleLabel} at ${spec.number} ${spec.street}. ${damaged.length} systems opened. Envelope first, then the lot.`;
  return { brief, decisions };
}

export function finalizeDecisions(
  incoming: RepairDecision[],
  local: RepairDecision[],
): RepairDecision[] {
  const grok = new Map(incoming.map((d) => [d.part, d]));
  const merged = local.map((d) => grok.get(d.part) ?? d);
  merged.sort((a, b) => PRIORITY[b.part] - PRIORITY[a.part]);
  return merged.map((d, i) => ({ ...d, priority: i + 1, id: `d-${d.part}` }));
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

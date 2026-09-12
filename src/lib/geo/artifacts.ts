import type { Site } from "./types";
import type { DamageEvent, HouseSpec, RepairDecision } from "@/lib/house/types";
import type { AuthorityEnvelope, OutcomeRecord, ProofEvent } from "@/lib/orpa";
import { buildLinks } from "./links";

export function footprintGeoJSON(site: Site, spec: HouseSpec) {
  const b =
    site.buildings.find((x) => x.id === site.matchedId) ??
    site.buildings.find((x) => x.osmId && x.osmId === spec.osmId) ??
    site.buildings[0];
  const ring = b?.ring ?? [];
  const coords = ring.map((p) => [p.lon, p.lat]);
  if (coords.length > 0) {
    const first = coords[0]!;
    const last = coords[coords.length - 1]!;
    if (first[0] !== last[0] || first[1] !== last[1]) coords.push([...first]);
  }
  return {
    type: "Feature" as const,
    properties: {
      address: spec.address,
      osmId: spec.osmId || b?.osmId || "",
      footprintSqft: spec.footprintSqft ?? null,
      roofSqft: spec.roofSqft ?? null,
      source: spec.source ?? b?.source ?? "estimated",
      areaCode: spec.areaCode ?? site.zone.areaCode,
    },
    geometry:
      coords.length >= 4
        ? { type: "Polygon" as const, coordinates: [coords] }
        : {
            type: "Point" as const,
            coordinates: [spec.lon ?? site.place.lon, spec.lat ?? site.place.lat],
          },
  };
}

export function decisionPackage(input: {
  spec: HouseSpec;
  stormName: string;
  events: DamageEvent[];
  decisions: RepairDecision[];
  brief: string;
  site: Site | null;
  proof?: ProofEvent[];
  envelope?: AuthorityEnvelope | null;
  outcome?: OutcomeRecord | null;
}) {
  const { spec, stormName, events, decisions, brief, site, proof, envelope, outcome } = input;
  const building = site?.buildings.find((b) => b.id === site.matchedId) ?? null;
  return {
    kind: "galehouse.decision-package.v2",
    closedAt: new Date().toISOString(),
    steward: "Hale",
    doctrine: "AI drafts. You govern.",
    principle: "Evolution may increase competence. It may never increase sovereignty.",
    center: ["Truth", "Authority", "Governed action", "Proof", "Outcome learning"],
    stormName,
    brief,
    spec,
    events,
    decisions,
    insurance: site?.insurance ?? null,
    property: site?.property ?? null,
    place: site?.place ?? null,
    zone: site?.zone ?? null,
    footprint: site ? footprintGeoJSON(site, spec) : null,
    links: site ? buildLinks(site.place, building, site.zone) : [],
    spent: decisions.reduce((n, d) => n + d.cost, 0),
    hours: decisions.reduce((n, d) => n + d.hours, 0),
    proof: proof ?? [],
    envelope: envelope ?? null,
    outcome: outcome ?? null,
  };
}

export function slugAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "lot";
}

import { formatUsd } from "./agent";
import { buildLinks } from "@/lib/geo/links";
import type { Site } from "@/lib/geo/types";
import type { AuthorityEnvelope, OutcomeRecord, ProofEvent } from "@/lib/orpa";
import { PART_LABEL, type DamageEvent, type HouseSpec, type RepairDecision } from "./types";

export function formatReport(input: {
  spec: HouseSpec;
  stormName: string;
  events: DamageEvent[];
  decisions: RepairDecision[];
  brief: string;
  site?: Site | null;
  proof?: ProofEvent[];
  envelope?: AuthorityEnvelope | null;
  outcome?: OutcomeRecord | null;
  signedBy?: string;
}): string {
  const { spec, stormName, events, decisions, brief, site, proof, envelope, outcome, signedBy } = input;
  const spent = decisions.reduce((n, d) => n + d.cost, 0);
  const hours = decisions.reduce((n, d) => n + d.hours, 0);
  const loc = spec.locality ? `\n${spec.locality}` : "";
  const damage = events
    .map((e, i) => `${String(i + 1).padStart(2, "0")}  ${PART_LABEL[e.part]} — ${e.label}`)
    .join("\n");
  const work = decisions
    .map(
      (d) =>
        `${String(d.priority).padStart(2, "0")}  ${PART_LABEL[d.part]}\n    ${d.action}\n    ${d.rationale}\n    ${formatUsd(d.cost)} · ${d.hours}h`,
    )
    .join("\n\n");

  const ins = site?.insurance;
  const rec = site?.property;
  const building = site?.buildings.find((b) => b.id === site.matchedId) ?? site?.buildings[0];
  const crews = (site?.pois ?? []).filter((p) => p.kind === "contractor");
  const yards = (site?.pois ?? []).filter((p) => p.kind === "supplier");
  const desks = (site?.pois ?? []).filter((p) => p.kind === "insurance");
  const links = site ? buildLinks(site.place, building, site.zone) : [];

  const property = [
    spec.lat != null ? `Pin  ${spec.lat.toFixed(5)}, ${spec.lon?.toFixed(5)}` : "",
    spec.footprintSqft ? `Footprint  ${spec.footprintSqft.toLocaleString()} ft²` : "",
    spec.roofSqft ? `Roof  ${spec.roofSqft.toLocaleString()} ft²  (${ins?.roofSquares ?? "—"} squares)` : "",
    spec.source ? `Outline  ${spec.source === "osm" ? "OpenStreetMap" : spec.source === "usa" ? "USA Structures" : spec.source === "microsoft" ? "Microsoft Building Footprints" : "illustrative"}` : "",
    spec.osmId ? `OSM way  ${spec.osmId}` : "",
    spec.areaCode ? `Territory  ${spec.areaCode}` : "",
    building?.year ? `Year  ${building.year}` : rec?.yearBuilt ? `Year  ${rec.yearBuilt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const assessor = rec
    ? [
        `Source  ${rec.source === "attom" ? "ATTOM" : "USA Structures"}`,
        rec.apn ? `APN  ${rec.apn}` : "",
        rec.owner ? `Owner  ${rec.owner}` : "",
        rec.yearBuilt ? `Year built  ${rec.yearBuilt}` : "",
        rec.className ? `Class  ${rec.className}` : "",
        rec.assessed ? `Assessed  ${formatUsd(rec.assessed)}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const coverage = ins
    ? [
        `Form  ${ins.form}`,
        `Dwelling  ${formatUsd(ins.dwelling)}`,
        `Other structures  ${formatUsd(ins.otherStructures)}`,
        `Deductible  ${ins.deductiblePct}%  (${formatUsd(ins.deductible)})`,
        `Territory  ${ins.carrierTerritory}`,
        ins.note,
      ].join("\n")
    : "";

  const logistics = [
    ...crews.map(
      (c) =>
        `Crew  ${c.name}  ·  ${c.minutes} min  ·  ${c.areaCode}  ·  ${c.source}${c.url ? `\n    ${c.url}` : ""}`,
    ),
    ...yards.map(
      (y) =>
        `Yard  ${y.name}  ·  ${y.minutes} min  ·  ${(y.stock || []).slice(0, 3).join(", ")}  ·  ${y.source}${y.url ? `\n    ${y.url}` : ""}`,
    ),
    ...desks.map(
      (d) => `Desk  ${d.name}  ·  ${d.minutes} min  ·  ${d.source}${d.url ? `\n    ${d.url}` : ""}`,
    ),
  ].join("\n");

  const outbound = links.map((l) => `${l.label}\n    ${l.href}`).join("\n");

  const rail = (proof ?? [])
    .map(
      (e, i) =>
        `${String(i + 1).padStart(2, "0")}  ${e.stage}  ·  ${e.actor}\n    ${e.title}\n    ${e.detail}`,
    )
    .join("\n");

  const env = envelope
    ? `Envelope  ${envelope.id}  v${envelope.version}  ${envelope.status}\nScope  ${envelope.scope}`
    : "No envelope on file.";

  const learn = outcome
    ? [
        `Integrity after cell  ${outcome.actualIntegrity}%`,
        `Restored  ${outcome.restoredIntegrity}%`,
        `Committed  ${formatUsd(outcome.actualCost)}  ·  ${outcome.actualHours}h`,
        `Plan  ${outcome.planSource}`,
        outcome.attribution,
        `Next  ${outcome.nextObjective}`,
      ].join("\n")
    : "";

  return [
    "CLAIMFLOW  ·  DECISIONPACKAGE",
    "AI drafts. A named human locks. Exposure is not a damage determination.",
    `${spec.number} ${spec.street}${loc}`,
    `${spec.styleLabel}  ·  ${stormName}`,
    signedBy ? `Signed  ${signedBy}` : "Unsigned — package is a draft",
    "",
    brief,
    "",
    "AUTHORITY ENVELOPE",
    env,
    "",
    "PROPERTY",
    property || "Not measured.",
    "",
    "ASSESSOR",
    assessor || "ATTOM key not on file. Open the parcel link below.",
    "",
    "INSURANCE SKETCH",
    coverage || "Not filed.",
    "",
    "DAMAGE",
    damage || "None recorded.",
    "",
    "ORDER OF WORK",
    work || "None.",
    "",
    "CREWS & YARDS",
    logistics || "None in range.",
    "",
    "PROOF RAIL",
    rail || "None recorded.",
    "",
    "OUTCOME LOOP",
    learn || "Not reconciled.",
    "",
    "LINKS",
    outbound || "None.",
    "",
    `Committed  ${formatUsd(spent)}  ·  ${hours}h`,
    signedBy ? `Locked by  ${signedBy}` : "Not locked.",
    "OrPaynter, Inc.  ·  AI drafts. You govern.",
  ].join("\n");
}

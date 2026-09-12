import { formatReport } from "./report";
import { writeEntry, type FieldEntry, type SavedStatus } from "./book";
import type { DamageEvent, HouseSpec, RepairDecision } from "./types";
import type { Site } from "@/lib/geo/types";
import type { AuthorityEnvelope, OutcomeRecord, ProofEvent } from "@/lib/orpa";

export function snapshotLot(input: {
  spec: HouseSpec;
  stormName: string;
  events: DamageEvent[];
  decisions: RepairDecision[];
  brief: string;
  site: Site | null;
  proof?: ProofEvent[];
  envelope?: AuthorityEnvelope | null;
  outcome?: OutcomeRecord | null;
  integrity?: number;
  status: SavedStatus;
  signedBy?: string;
}): FieldEntry[] {
  const spent = input.decisions.reduce((n, d) => n + d.cost, 0);
  const hours = input.decisions.reduce((n, d) => n + d.hours, 0);
  const now = Date.now();
  return writeEntry({
    id: input.spec.address,
    address: input.spec.address,
    styleLabel: input.spec.styleLabel,
    number: input.spec.number,
    street: input.spec.street,
    locality: input.spec.locality,
    lat: input.spec.lat,
    lon: input.spec.lon,
    stormName: input.stormName,
    brief: input.brief,
    spent,
    hours,
    systems: input.decisions.length,
    closedAt: now,
    savedAt: now,
    integrity: input.integrity,
    attribution: input.outcome?.attribution ?? "",
    envelopeId: input.envelope?.id ?? "",
    status: input.status,
    report: formatReport(input),
  });
}

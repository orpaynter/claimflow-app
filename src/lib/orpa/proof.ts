import type { ArchCenter } from "./stages";

export interface ProofEvent {
  id: string;
  t: number;
  n: number;
  stage: string;
  center: ArchCenter;
  title: string;
  detail: string;
  source: string;
  actor: "human" | "system" | "steward";
}

export interface AuthorityEnvelope {
  id: string;
  version: number;
  issuedAt: number;
  scope: string;
  status: "pending" | "issued" | "used" | "revoked";
}

export interface OutcomeRecord {
  expectedIntegrity: number;
  actualIntegrity: number;
  restoredIntegrity: number;
  expectedCost: number;
  actualCost: number;
  expectedHours: number;
  actualHours: number;
  attribution: string;
  nextObjective: string;
  envelopeId: string;
  planSource: "steward" | "local";
}

let seq = 0;

export function makeProof(partial: Omit<ProofEvent, "id" | "t"> & { t?: number }): ProofEvent {
  seq += 1;
  return {
    id: `p-${seq}-${partial.n}`,
    t: partial.t ?? Date.now(),
    n: partial.n,
    stage: partial.stage,
    center: partial.center,
    title: partial.title,
    detail: partial.detail,
    source: partial.source,
    actor: partial.actor,
  };
}

export function issueEnvelope(scope: string, version = 1): AuthorityEnvelope {
  return {
    id: `env-${Date.now().toString(36)}`,
    version,
    issuedAt: Date.now(),
    scope,
    status: "issued",
  };
}

export function buildOutcome(input: {
  stormIntegrity: number;
  restoredIntegrity: number;
  cost: number;
  hours: number;
  source: "osm" | "estimated" | "microsoft" | "usa" | undefined;
  planSource: "steward" | "local";
  envelopeId: string;
  areaCode: string;
}): OutcomeRecord {
  const outline =
    input.source === "osm"
      ? "Outline from OpenStreetMap. Hail path is modeled over the real ring."
      : input.source === "usa"
        ? "Outline from USA Structures. Hail path is modeled over the real ring."
        : input.source === "microsoft"
          ? "Outline from Microsoft Building Footprints. Hail path is modeled over the real ring."
          : "Outline estimated. Hail path is modeled over the geocoded pin.";
  const steward =
    input.planSource === "steward"
      ? "Hale drafted the order of work. Authority stayed with the operator."
      : "Local envelope used. Hale did not leave the sandbox.";
  return {
    expectedIntegrity: 100,
    actualIntegrity: input.stormIntegrity,
    restoredIntegrity: input.restoredIntegrity,
    expectedCost: input.cost,
    actualCost: input.cost,
    expectedHours: input.hours,
    actualHours: input.hours,
    attribution: `${outline} ${steward}`,
    nextObjective: input.areaCode
      ? `Open the next lot in territory ${input.areaCode}.`
      : "Open the next lot.",
    envelopeId: input.envelopeId,
    planSource: input.planSource,
  };
}

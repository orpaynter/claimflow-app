import { hashString } from "@/lib/house/rng";
import { estimateTotal } from "@/lib/house/estimate";
import type { HouseSpec, DamageEvent, RepairDecision } from "@/lib/house/types";
import type { Site } from "@/lib/geo/types";
import type { OutcomeRecord } from "@/lib/orpa";
import { CONTRACTS, CONTRACT_BY_ID } from "./contracts";
import { scoreSignals } from "@/lib/trae/score";
import { signalsOf } from "@/lib/trae/signals";
import type {
  AccuracyRecord,
  AgentId,
  AgentRuntime,
  ApprovalGate,
  DecisionPackage,
  EvidenceLink,
  RiskFactors,
  SwarmEvent,
  SwarmState,
} from "./types";

const LEDGER_KEY = "claimflow.mas.ledger.v1";

export function contentHash(value: unknown): string {
  return hashString(JSON.stringify(value)).toString(16);
}

function loadLedger(): AccuracyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AccuracyRecord[];
    return Array.isArray(parsed) ? parsed.slice(-80) : [];
  } catch {
    return [];
  }
}

function saveLedger(rows: AccuracyRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(rows.slice(-80)));
  } catch {
    /* quota */
  }
}

export function emptySwarm(): SwarmState {
  const agents = {} as Record<AgentId, AgentRuntime>;
  for (const c of CONTRACTS) agents[c.id] = { status: "idle", last: c.role };
  return { killed: false, packages: [], log: [], ledger: loadLedger(), agents, activeId: null };
}

let seq = 0;
function stamp(agent: AgentId, kind: SwarmEvent["kind"], detail: string, extra?: unknown): SwarmEvent {
  seq += 1;
  return {
    id: `sw-${seq}`,
    t: Date.now(),
    agent,
    kind,
    detail,
    hash: contentHash({ agent, kind, detail, extra, seq }),
  };
}

function pushLog(swarm: SwarmState, event: SwarmEvent): SwarmState {
  return { ...swarm, log: [...swarm.log, event].slice(-80) };
}

function setAgent(swarm: SwarmState, id: AgentId, status: AgentRuntime["status"], last: string): SwarmState {
  return { ...swarm, agents: { ...swarm.agents, [id]: { status, last } } };
}

export function riskScore(f: RiskFactors): number {
  return Math.min(100, Math.round(f.financial * 0.35 + f.legal * 0.25 + f.safety * 0.2 + f.reputation * 0.12 + f.data * 0.08));
}

export function gateOf(score: number): ApprovalGate {
  if (score >= 85) return "board";
  if (score >= 70) return "dual";
  if (score >= 40) return "single";
  return "none";
}

function link(source: string, actor: EvidenceLink["actor"], note: string, payload: unknown): EvidenceLink {
  return { id: `ev-${contentHash({ source, note, payload }).slice(0, 10)}`, source, actor, t: Date.now(), hash: contentHash(payload), note };
}

export function evidencePass(swarm: SwarmState, site: Site): SwarmState {
  if (swarm.killed) return swarm;
  const osm = site.buildings.filter((b) => b.source === "osm").length;
  const usa = site.buildings.filter((b) => b.source === "usa").length;
  const ms = site.buildings.filter((b) => b.source === "microsoft").length;
  let next = swarm;
  next = setAgent(next, "intake-geocoder", "proposed", site.place.displayName);
  next = pushLog(next, stamp("intake-geocoder", "propose", `Place ${site.place.city}, ${site.place.stateCode}. Number ${site.place.number || "unstamped"}.`, site.place));
  next = setAgent(next, "storm-intel", "proposed", `${site.storms.length} cells · modeled hail`);
  next = pushLog(next, stamp("storm-intel", "propose", `Public cells ${site.storms.length}. Hail path is modeled.`, site.hail));
  next = setAgent(next, "footprint-surveyor", "proposed", `OSM ${osm} · USA ${usa} · MS ${ms}`);
  next = pushLog(next, stamp("footprint-surveyor", "propose", `Rings OSM ${osm}, USA ${usa}, Microsoft ${ms}. Estimated never sold as measured.`, { osm, usa, ms }));
  next = setAgent(next, "claimflow-orchestrator", "gathering", "Evidence fan-out. No side-effect.");
  next = pushLog(next, stamp("claimflow-orchestrator", "route", "Intake → storm → footprint. Reads only.", { osm, usa, ms }));
  return next;
}

export function estimatePass(
  swarm: SwarmState,
  spec: HouseSpec,
  events: DamageEvent[],
  decisions: RepairDecision[],
  site: Site | null,
): SwarmState {
  if (swarm.killed) return swarm;
  const totals = estimateTotal(decisions);
  const factors: RiskFactors = {
    financial: Math.min(100, Math.round(totals.spent / 400)),
    legal: events.length >= 3 ? 62 : 48,
    safety: 44,
    reputation: 50,
    data: spec.source === "estimated" ? 58 : 36,
  };
  const score = riskScore(factors);
  const gate = gateOf(Math.max(score, 40));
  const trae = scoreSignals(signalsOf(spec, site));
  const chain: EvidenceLink[] = [
    link("typed-address", "intake-geocoder", spec.address, spec.address),
    link(spec.source || "estimated", "footprint-surveyor", `${spec.source || "estimated"} outline`, {
      source: spec.source,
      sqft: spec.footprintSqft,
    }),
    link("modeled-scan", "inspector-estimator", `${events.length} modeled concerns`, events.map((e) => e.id)),
    link("policy", "policy-compliance", "Exposure is not a damage determination", { gaps: true }),
    link("trae", "policy-compliance", `TRAE ${trae.score} / ${trae.threshold} · ${trae.exceeds ? "review" : "clear"}`, trae),
  ];
  const pkg: DecisionPackage = {
    id: `dp-${Date.now().toString(36)}`,
    trigger: `Lot scan · ${spec.number} ${spec.street}`,
    objective: "Draft an evidence-linked estimate. Human must accept before logistics.",
    proposed_action: `Seal draft DecisionPackage for ${spec.number} ${spec.street}. ${decisions.length} line items. ${totals.spent} USD modeled.`,
    authority_scope: "operator · tenant local-preview · estimator may propose only",
    risk_score: Math.max(score, trae.score, 40),
    risk_factors: factors,
    policy_refs: [...CONTRACT_BY_ID["inspector-estimator"].policy_refs, "trae_fraud_gate_v1", "claimflow_human_approval_v1"],
    evidence_chain: chain,
    confidence: spec.source === "estimated" ? 0.38 : spec.source === "osm" ? 0.52 : 0.61,
    calibration: "Uncalibrated sandbox. Not a carrier accuracy claim.",
    approval_gate: gate,
    fallback: "Keep modeled. Do not dispatch. Operator may reject.",
    kill_switch: CONTRACT_BY_ID["claimflow-orchestrator"].kill_switch,
    audit_record: [{ actor: "inspector-estimator", t: Date.now(), state: "waiting_gate" }],
    cost_estimate: { dollars: totals.spent, hours: totals.hours, latency_ms: 0 },
    success_criteria: [
      "Human named on the package",
      "Line items map to modeled parts",
      "No filing, no payment",
    ],
    escalation_path: "Reject returns to measure. Stop kills the swarm.",
    status: "waiting_gate",
    emitter: "claimflow-orchestrator",
    trae: {
      score: trae.score,
      threshold: trae.threshold,
      exceeds: trae.exceeds,
      scorer_version: trae.scorer_version,
      factors: trae.factors.map((f) => ({ factor_id: f.factor_id, label: f.label, contribution: f.contribution })),
    },
  };
  pkg.package_hash = contentHash({ ...pkg, package_hash: undefined });
  let next = swarm;
  next = setAgent(next, "inspector-estimator", "waiting_gate", `${decisions.length} lines · $${totals.spent}`);
  next = setAgent(next, "policy-compliance", "proposed", site ? `Territory ${site.zone.areaCode}` : "Default-deny");
  next = setAgent(next, "claimflow-orchestrator", "waiting_gate", `Package ${pkg.id} · risk ${pkg.risk_score} · ${gate}`);
  next = pushLog(next, stamp("inspector-estimator", "propose", pkg.proposed_action, pkg.id));
  next = pushLog(next, stamp("policy-compliance", "propose", "Block filing. Evidence gaps remain.", chain.length));
  next = pushLog(next, stamp("claimflow-orchestrator", "route", `DecisionPackage ${pkg.id} waiting ${gate} gate.`, pkg.id));
  return { ...next, packages: [...next.packages, pkg].slice(-12), activeId: pkg.id };
}

export function approveActive(swarm: SwarmState, actor: string, ok: boolean): SwarmState {
  if (swarm.killed) return swarm;
  const pkg = swarm.packages.find((p) => p.id === swarm.activeId);
  if (!pkg || pkg.status !== "waiting_gate") return swarm;
  const status = ok ? "approved" : "rejected";
  const nextPkg: DecisionPackage = {
    ...pkg,
    status,
    audit_record: [...pkg.audit_record, { actor, t: Date.now(), state: status }],
  };
  let next = {
    ...swarm,
    packages: swarm.packages.map((p) => (p.id === pkg.id ? nextPkg : p)),
  };
  next = setAgent(next, "claimflow-orchestrator", ok ? "proposed" : "idle", ok ? "Gate passed" : "Gate denied");
  next = setAgent(next, "inspector-estimator", ok ? "proposed" : "idle", ok ? "Draft accepted as working copy" : "Draft rejected");
  next = pushLog(next, stamp("claimflow-orchestrator", "gate", `${status} by ${actor}. ${pkg.id}`, { ok, actor }));
  return next;
}

export function logisticsPass(swarm: SwarmState, site: Site): SwarmState {
  if (swarm.killed) return swarm;
  const pkg = swarm.packages.find((p) => p.id === swarm.activeId);
  if (!pkg || pkg.status !== "approved") return swarm;
  const crews = site.pois.filter((p) => p.kind === "contractor").length;
  const yards = site.pois.filter((p) => p.kind === "supplier").length;
  let next = setAgent(swarm, "logistics-scout", "proposed", `${crews} crews · ${yards} yards · no move`);
  next = pushLog(next, stamp("logistics-scout", "propose", `Propose only. ${crews} crews, ${yards} yards in ${site.zone.areaCode}.`, { crews, yards }));
  next = setAgent(next, "claimflow-orchestrator", "waiting_gate", "Authority still default-deny until Issue authority.");
  return next;
}

export function dispatchPass(swarm: SwarmState, actor: string): { ok: true; swarm: SwarmState } | { ok: false; reason: string; swarm: SwarmState } {
  if (swarm.killed) return { ok: false, reason: "Swarm killed. Side-effects frozen.", swarm };
  const pkg = swarm.packages.find((p) => p.id === swarm.activeId);
  if (!pkg) return { ok: false, reason: "No DecisionPackage. Orchestrator will not dispatch.", swarm };
  if (pkg.status !== "approved") return { ok: false, reason: "Package not approved. Default-deny.", swarm };
  const executed: DecisionPackage = {
    ...pkg,
    status: "executed",
    audit_record: [...pkg.audit_record, { actor, t: Date.now(), state: "executed" }],
  };
  let next = {
    ...swarm,
    packages: swarm.packages.map((p) => (p.id === pkg.id ? executed : p)),
  };
  next = setAgent(next, "claimflow-orchestrator", "proposed", `Envelope path open for ${pkg.id} only`);
  next = pushLog(next, stamp("claimflow-orchestrator", "gate", `Side-effect authorized after human gate. ${pkg.id}`, pkg.id));
  return { ok: true, swarm: next };
}

export function closePass(swarm: SwarmState, outcome: OutcomeRecord, spec: HouseSpec): SwarmState {
  const pkg = swarm.packages.find((p) => p.id === swarm.activeId);
  const predicted = {
    integrity: outcome.expectedIntegrity,
    cost: outcome.expectedCost,
    hours: outcome.expectedHours,
  };
  const observed = {
    integrity: outcome.restoredIntegrity,
    cost: outcome.actualCost,
    hours: outcome.actualHours,
  };
  const record: AccuracyRecord = {
    decision_package_id: pkg?.id ?? "none",
    agent_id: "learning-ledger",
    agent_version: CONTRACT_BY_ID["learning-ledger"].version,
    predicted,
    observed,
    match: Math.abs(predicted.integrity - observed.integrity) <= 5,
    cost_actual: observed.cost,
    latency_ms: 0,
    human_override: pkg?.audit_record.some((a) => a.actor !== "inspector-estimator") ?? false,
    provenance_hash: contentHash({ predicted, observed, spec: spec.address, pkg: pkg?.id }),
    recorded_at: new Date().toISOString(),
  };
  const ledger = [...swarm.ledger, record].slice(-80);
  saveLedger(ledger);
  let next: SwarmState = { ...swarm, ledger };
  next = setAgent(next, "learning-ledger", "proposed", record.match ? "Ledger match" : "Ledger miss — improvement gated");
  next = pushLog(next, stamp("learning-ledger", "ledger", `Accuracy ${record.match ? "match" : "miss"} · ${spec.number} ${spec.street}`, record.provenance_hash));
  next = pushLog(
    next,
    stamp(
      "learning-ledger",
      "improve",
      "Proposal: keep estimator calibration notes. Do not auto-deploy. Human gate required.",
      { gate: "human" },
    ),
  );
  next = setAgent(next, "claimflow-orchestrator", "idle", "Lot closed. Improvement waiting human.");
  return next;
}

export function killPass(swarm: SwarmState, reason: string): SwarmState {
  const agents = { ...swarm.agents };
  (Object.keys(agents) as AgentId[]).forEach((id) => {
    agents[id] = { status: "killed", last: reason };
  });
  const packages = swarm.packages.map((p) =>
    p.status === "executed"
      ? p
      : {
          ...p,
          status: "killed" as const,
          audit_record: [...p.audit_record, { actor: "human", t: Date.now(), state: "killed" as const }],
        },
  );
  const next: SwarmState = { ...swarm, killed: true, agents, packages, activeId: swarm.activeId };
  return pushLog(next, stamp("claimflow-orchestrator", "kill", reason, { killed: true }));
}

export function reviveSwarm(prev: SwarmState): SwarmState {
  const base = emptySwarm();
  return { ...base, ledger: prev.ledger };
}

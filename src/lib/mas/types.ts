export type AgentId =
  | "claimflow-orchestrator"
  | "intake-geocoder"
  | "storm-intel"
  | "footprint-surveyor"
  | "inspector-estimator"
  | "policy-compliance"
  | "logistics-scout"
  | "learning-ledger";

export type AgentStatus = "idle" | "gathering" | "proposed" | "waiting_gate" | "killed";

export type ApprovalGate = "none" | "single" | "dual" | "board";

export type PackageStatus = "draft" | "waiting_gate" | "approved" | "rejected" | "killed" | "executed";

export interface AgentContract {
  id: AgentId;
  name: string;
  role: string;
  version: string;
  objective: string;
  tools: string[];
  data_scope: { tables: string[]; write_allowed: boolean; tenant_required: true };
  authority_scope: {
    max_risk_score: number;
    allowed_actions: string[];
    forbidden_actions: string[];
    roles: string[];
  };
  policy_refs: string[];
  decision_package_template: string;
  success_criteria: string[];
  failure_modes: string[];
  escalation_path: string;
  kill_switch: string;
  recursive_learning: {
    telemetry_events: string[];
    improvement_gate: "human" | "dual" | "board";
  };
  provenance: {
    code_hash: string;
    model_versions: Record<string, string>;
    eval_set_id: string;
    certified_at: string;
    certified_by: string;
  };
}

export interface EvidenceLink {
  id: string;
  source: string;
  actor: AgentId | "human";
  t: number;
  hash: string;
  note: string;
}

export interface RiskFactors {
  financial: number;
  legal: number;
  safety: number;
  reputation: number;
  data: number;
}

export interface DecisionPackage {
  id: string;
  trigger: string;
  objective: string;
  proposed_action: string;
  authority_scope: string;
  risk_score: number;
  risk_factors: RiskFactors;
  policy_refs: string[];
  evidence_chain: EvidenceLink[];
  confidence: number;
  calibration: string;
  approval_gate: ApprovalGate;
  fallback: string;
  kill_switch: string;
  audit_record: { actor: string; t: number; state: PackageStatus }[];
  cost_estimate: { dollars: number; hours: number; latency_ms: number };
  success_criteria: string[];
  escalation_path: string;
  status: PackageStatus;
  emitter: AgentId;
  package_hash?: string;
  trae?: {
    score: number;
    threshold: number;
    exceeds: boolean;
    scorer_version: string;
    factors: { factor_id: string; label: string; contribution: number }[];
  };
}

export interface AccuracyRecord {
  decision_package_id: string;
  agent_id: AgentId;
  agent_version: string;
  predicted: { integrity: number; cost: number; hours: number };
  observed: { integrity: number; cost: number; hours: number };
  match: boolean;
  cost_actual: number;
  latency_ms: number;
  error_mode?: string;
  human_override?: boolean;
  provenance_hash: string;
  recorded_at: string;
}

export interface SwarmEvent {
  id: string;
  t: number;
  agent: AgentId;
  kind: "propose" | "route" | "gate" | "kill" | "ledger" | "improve";
  detail: string;
  hash: string;
}

export interface AgentRuntime {
  status: AgentStatus;
  last: string;
}

export interface SwarmState {
  killed: boolean;
  packages: DecisionPackage[];
  log: SwarmEvent[];
  ledger: AccuracyRecord[];
  agents: Record<AgentId, AgentRuntime>;
  activeId: string | null;
}

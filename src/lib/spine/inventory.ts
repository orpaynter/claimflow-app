export type PieceClass = "canonical" | "supporting" | "historical" | "session";

export interface Piece {
  id: string;
  name: string;
  repo: string;
  role: string;
  class: PieceClass;
  inSession: boolean;
  mapsTo: string;
}

/** From orpaynter/me — GitHub is the build trail. Four canonical repos. */
export const PIECES: Piece[] = [
  {
    id: "aia",
    name: "AIA",
    repo: "orpaynter/AIA",
    role: "Backend authority. Reflex / OPUS / NEXUS. 14 engines. Six-stage pipeline. DecisionPackage freeze v0.2.",
    class: "canonical",
    inSession: true,
    mapsTo: "Analysis, challenge, forecast, calibration, human gate",
  },
  {
    id: "claimflow",
    name: "ClaimFlow",
    repo: "orpaynter/claimflow",
    role: "Case state machine. Intake Foreman. TRAE fraud slice. Portable sealed DecisionPackage.",
    class: "canonical",
    inSession: true,
    mapsTo: "Lot walk, TRAE score, sealed package",
  },
  {
    id: "orpa",
    name: "ORPA",
    repo: "orpaynter/orpa",
    role: "Governed operator. Named human approve/reject. Fail-closed. Payments disabled.",
    class: "canonical",
    inSession: true,
    mapsTo: "Operator commands, kill, proof rail",
  },
  {
    id: "web",
    name: "orpaynter-web",
    repo: "orpaynter/orpaynter-web",
    role: "Public verification surface. Not the operator.",
    class: "canonical",
    inSession: false,
    mapsTo: "Marketing shell — out of this session",
  },
  {
    id: "trae",
    name: "TRAE",
    repo: "orpaynter/claimflow · trae/",
    role: "Deterministic fraud scorer. Licensing, court, registry. Threshold 40. No ML black box.",
    class: "session",
    inSession: true,
    mapsTo: "Risk stage on every package",
  },
  {
    id: "foremen",
    name: "Seven Foremen",
    repo: "orpaynter/agents",
    role: "Intake, Estimator, Scheduler, Compliance, Claims, Reconciliation, Customer Service.",
    class: "supporting",
    inSession: true,
    mapsTo: "MAS pipeline agents",
  },
  {
    id: "factory",
    name: "Agent factory",
    repo: "orpaynter/orpaynter-agent-factory",
    role: "Breed and mutate in sandbox. Cannot self-promote authority.",
    class: "supporting",
    inSession: false,
    mapsTo: "Learning ledger proposes; human still gates",
  },
  {
    id: "mcp",
    name: "MCP five-agent",
    repo: "orpaynter/orpaynter-mcp-server",
    role: "Lead identification and qualification. Orchestration gateway.",
    class: "supporting",
    inSession: false,
    mapsTo: "Intake sense — not wired here",
  },
  {
    id: "rail",
    name: "Claim rail",
    repo: "orpaynter/orpaynter-claim-rail",
    role: "15-minute claim MVP / Foreman UI.",
    class: "supporting",
    inSession: false,
    mapsTo: "Ancestor of this lot walk",
  },
  {
    id: "platform",
    name: "Platform (Manus)",
    repo: "orpaynter/orpaynter-platform",
    role: "Role portals, payments, fraud, project management. Built with Manus.",
    class: "historical",
    inSession: false,
    mapsTo: "Payments stay NO-GO. Fraud lives in TRAE.",
  },
];

export const AIA_STAGES = [
  { id: "intake", name: "Intake", agent: "intake-geocoder" },
  { id: "evidence", name: "Evidence", agent: "footprint-surveyor" },
  { id: "analysis", name: "Analysis", agent: "inspector-estimator" },
  { id: "challenge", name: "Challenge", agent: "policy-compliance" },
  { id: "risk", name: "Risk · TRAE", agent: "policy-compliance" },
  { id: "audit", name: "Audit / lock", agent: "claimflow-orchestrator" },
] as const;

export const AIA_ENGINES = [
  "regime_shift",
  "cross_correlation",
  "forecast",
  "calibration",
  "historical_analogue",
  "hypothesis",
  "truth",
  "self_correction",
  "deliberation",
  "narrative",
  "memory_graph",
  "contagion",
  "fragility",
  "intervention",
] as const;

export const FOREMEN = [
  { name: "Intake", agent: "intake-geocoder" },
  { name: "Claims", agent: "storm-intel" },
  { name: "Estimator", agent: "inspector-estimator" },
  { name: "Compliance", agent: "policy-compliance" },
  { name: "Scheduler", agent: "logistics-scout" },
  { name: "Reconciliation", agent: "learning-ledger" },
  { name: "Customer Service", agent: null },
] as const;

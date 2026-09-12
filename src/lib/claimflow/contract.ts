export const UNDO_KEYS = [
  "undo_class",
  "undo_target",
  "prior_state_anchor",
  "undo_authority",
  "undo_rpc",
  "undo_deadline",
  "undo_side_effects",
] as const;

export interface UndoBlock {
  undo_class: "ROLLBACK_STATE";
  undo_target: { case_id: string; run_id: string };
  prior_state_anchor: {
    case_status: string;
    run_status: string;
    evidence_manifest_sha256: string;
  };
  undo_authority: {
    principal: string;
    deny_proposing_agent_alone: true;
    signed_name: string;
  };
  undo_rpc: "claimflow_private.execute_release_v1";
  undo_deadline: "until_exported";
  undo_side_effects: {
    stripe_refund_authorized: false;
    wave: "0";
    submitted: false;
  };
}

export interface DecisionPackageV1 {
  contract: "decision_package_v1";
  package_version: 1;
  case_id: string;
  run_id: string;
  decision_id: string;
  tenant_id: null;
  property_address: string;
  evidence_manifest_sha256: string;
  recommendation: {
    action: string;
    modeled_only: true;
    items: { part: string; action: string; cost: number; hours: number }[];
    note: string;
  };
  confidence: number;
  citations: { source: string; note: string }[];
  conflicts: string[];
  limitations: string[];
  authority_scope: { human_gate: "required"; named_approver: string };
  human_gate: "required";
  undo_block: UndoBlock;
  signed_name: string;
}

export type WireStepId =
  | "create_case"
  | "attach_evidence"
  | "start_run"
  | "record_decision"
  | "record_approval"
  | "execute_release";

export interface WireStep {
  id: WireStepId;
  rpc: string;
  status: "sealed" | "blocked" | "skipped";
  detail: string;
}

export interface WireResult {
  submitted: false;
  reason: "no_session";
  signed_name: string;
  package_sha256: string;
  evidence_manifest_sha256: string;
  case_id: string;
  run_id: string;
  decision_id: string;
  package: DecisionPackageV1;
  steps: WireStep[];
  blockers: string[];
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.keys(o)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortValue(o[k]);
        return acc;
      }, {});
  }
  return v;
}

export function canonical(v: unknown): string {
  return JSON.stringify(sortValue(v));
}

export function validateUndo(block: UndoBlock | undefined): string[] {
  if (!block) return ["UNDO_BLOCK_MISSING"];
  const reasons: string[] = [];
  for (const key of UNDO_KEYS) {
    if (block[key] == null) reasons.push(`UNDO_BLOCK_MISSING_${key.toUpperCase()}`);
  }
  if (block.undo_class !== "ROLLBACK_STATE") reasons.push("UNDO_CLASS_INVALID");
  return reasons;
}

export function validatePackage(pkg: DecisionPackageV1, signed: string): string[] {
  const reasons: string[] = [];
  if (pkg.contract !== "decision_package_v1") reasons.push("CONTRACT_INVALID");
  if (pkg.human_gate !== "required") reasons.push("HUMAN_GATE_MISSING");
  if (!signed || signed.trim().length < 2) reasons.push("NAMED_APPROVER_MISSING");
  if (pkg.signed_name !== signed.trim()) reasons.push("SIGNED_NAME_MISMATCH");
  reasons.push(...validateUndo(pkg.undo_block));
  return reasons;
}

export async function sealRoof(input: {
  address: string;
  signedName: string;
  note: string;
  stormName: string;
  items: { part: string; action: string; cost: number; hours: number }[];
  citations: { source: string; note: string }[];
  evidence: { name: string; hash: string }[];
}): Promise<WireResult> {
  const signed = input.signedName.trim();
  const case_id = crypto.randomUUID();
  const run_id = crypto.randomUUID();
  const decision_id = crypto.randomUUID();
  const evidence_manifest_sha256 = await sha256Hex(canonical(input.evidence));
  const undo_block: UndoBlock = {
    undo_class: "ROLLBACK_STATE",
    undo_target: { case_id, run_id },
    prior_state_anchor: {
      case_status: "awaiting_review",
      run_status: "awaiting_review",
      evidence_manifest_sha256,
    },
    undo_authority: {
      principal: "named_operator",
      deny_proposing_agent_alone: true,
      signed_name: signed,
    },
    undo_rpc: "claimflow_private.execute_release_v1",
    undo_deadline: "until_exported",
    undo_side_effects: {
      stripe_refund_authorized: false,
      wave: "0",
      submitted: false,
    },
  };
  const pkg: DecisionPackageV1 = {
    contract: "decision_package_v1",
    package_version: 1,
    case_id,
    run_id,
    decision_id,
    tenant_id: null,
    property_address: input.address,
    evidence_manifest_sha256,
    recommendation: {
      action: "draft_scope",
      modeled_only: true,
      items: input.items,
      note: input.note || `${input.stormName} · modeled concerns, not a damage determination.`,
    },
    confidence: 0.42,
    citations: input.citations,
    conflicts: [],
    limitations: [
      "Satellite tiles are current basemap, not a dated hail-pass.",
      "Modeled flags are hypotheses. Field evidence is required.",
      "This preview has no Supabase session. Live RPCs were not called.",
    ],
    authority_scope: { human_gate: "required", named_approver: signed },
    human_gate: "required",
    undo_block,
    signed_name: signed,
  };
  const blockers = validatePackage(pkg, signed);
  const package_sha256 = await sha256Hex(canonical(pkg));
  const blocked =
    "No Supabase JWT in this preview. Privilege closure is live; the client journey is still UNPROVEN.";
  const steps: WireStep[] = [
    {
      id: "create_case",
      rpc: "claimflow_create_case_v1",
      status: "blocked",
      detail: `Local case ${case_id.slice(0, 8)} · ${input.address}. ${blocked}`,
    },
    {
      id: "attach_evidence",
      rpc: "claimflow_attach_evidence_v1",
      status: input.evidence.length ? "blocked" : "skipped",
      detail: input.evidence.length
        ? `${input.evidence.length} hash(es) on the ledger. ${blocked}`
        : "No field photos",
    },
    {
      id: "start_run",
      rpc: "claimflow_start_run_v1",
      status: "blocked",
      detail: `Run ${run_id.slice(0, 8)}. ${blocked}`,
    },
    {
      id: "record_decision",
      rpc: "claimflow_record_decision_v1",
      status: "blocked",
      detail: `Package ${package_sha256.slice(0, 12)}…. ${blocked}`,
    },
    {
      id: "record_approval",
      rpc: "claimflow_record_approval_v1",
      status: "blocked",
      detail: `Named ${signed}. Hash + expected_run bound. ${blocked}`,
    },
    {
      id: "execute_release",
      rpc: "claimflow_execute_release_v1",
      status: "skipped",
      detail: "Export stays gated. No authority envelope in this preview.",
    },
  ];

  return {
    submitted: false,
    reason: "no_session",
    signed_name: signed,
    package_sha256,
    evidence_manifest_sha256,
    case_id,
    run_id,
    decision_id,
    package: pkg,
    steps,
    blockers,
  };
}

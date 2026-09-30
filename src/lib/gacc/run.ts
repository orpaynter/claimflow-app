import { createServerFn } from "@tanstack/react-start";

export type GaccStageStatus = "observed" | "constructed" | "verified" | "allowed" | "executed" | "reconciled" | "learned";

export interface GaccStage {
  id: string;
  label: string;
  status: GaccStageStatus;
  evidence: string;
}

export interface GaccProductRun {
  ok: true;
  pass: boolean;
  classification: string;
  generatedAt: string;
  stages: GaccStage[];
  refs: {
    worldHash: string;
    capabilityId: string;
    capabilityHash: string;
    packageId: string;
    receiptId: string;
    verificationRef: string;
    learningHash: string;
  };
  limitations: string[];
}

export interface GaccProductFailure {
  ok: false;
  error: string;
}

export type GaccProductResult = GaccProductRun | GaccProductFailure;

type GaccInput = {
  operatorName: string;
  address: string;
  note: string;
  evidenceNames: string[];
};

type RawTrace = {
  classification: string;
  generated_at: string;
  pass: boolean;
  world: { source_hash: string };
  gap: { missing_fields: string[] };
  capability_construction: { capability_id: string; spec_hash: string };
  capability_validation: { passed: boolean; result_hash: string };
  aia_build_twin: { manifest?: { current_status?: string } };
  decision_package: { package_id: string; state: string };
  trae_enforcement: { authority_scope: string };
  execution: { receipt_id: string; output_hash: string };
  verification: { verification_ref: string; completion_criterion_met: boolean; audit_chain_valid: boolean };
  outcome_reconciliation: { matched: boolean; outcome_ref: string };
  learning: { learning_hash: string; outcome: string };
  limitations: string[];
};

function short(value: string): string {
  if (value.length <= 18) return value;
  return value.slice(0, 8) + "…" + value.slice(-8);
}

export const runGaccProduct = createServerFn({ method: "POST" })
  .validator((input: GaccInput) => input)
  .handler(async ({ data }): Promise<GaccProductResult> => {
    const base =
      process.env.AIA_GACC_BASE_URL ??
      "https://aia-git-feature-gacc-e2e-01-orpaynters-projects.vercel.app";

    const requestId = "claimflow-" + Date.now().toString(36);
    const payload = {
      objective_id: requestId,
      statement:
        "Normalize this ClaimFlow intake into the required governed workflow fields, construct only missing sandbox capability, and traverse the bounded GACC-E2E-01 proof path.",
      required_fields: [
        "operator_name",
        "property_address",
        "incident_note",
        "evidence_count",
        "loss_type",
      ],
      records: [
        {
          operator_name: data.operatorName,
          property_address: data.address,
          incident_note: data.note || null,
          evidence_count: data.evidenceNames.length,
          evidence_names: data.evidenceNames,
        },
      ],
      source_ref: "claimflow-intake:" + requestId,
      operator_name: data.operatorName,
    };

    try {
      const bypass = process.env.AIA_VERCEL_PROTECTION_BYPASS_SECRET;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (bypass) {
        headers["x-vercel-protection-bypass"] = bypass;
      }

      const res = await fetch(base.replace(/\/$/, "") + "/gacc/e2e-01/run", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: "AIA GACC run denied (" + res.status + "): " + text.slice(0, 240) };
      }
      const trace = (await res.json()) as RawTrace;
      const stages: GaccStage[] = [
        { id: "objective", label: "Objective", status: "observed", evidence: requestId },
        { id: "world", label: "World", status: "observed", evidence: short(trace.world.source_hash) },
        {
          id: "gap",
          label: "Gap",
          status: "observed",
          evidence: trace.gap.missing_fields.length ? trace.gap.missing_fields.join(", ") : "none",
        },
        {
          id: "capability",
          label: "Construct",
          status: "constructed",
          evidence: trace.capability_construction.capability_id,
        },
        {
          id: "validation",
          label: "Validate",
          status: trace.capability_validation.passed ? "verified" : "observed",
          evidence: short(trace.capability_validation.result_hash),
        },
        {
          id: "aia",
          label: "AIA / Twin",
          status: "verified",
          evidence: trace.aia_build_twin.manifest?.current_status ?? "verified",
        },
        {
          id: "decision",
          label: "DecisionPackage",
          status: trace.decision_package.state === "approved" ? "allowed" : "observed",
          evidence: trace.decision_package.package_id,
        },
        {
          id: "trae",
          label: "TRAE",
          status: "allowed",
          evidence: trace.trae_enforcement.authority_scope,
        },
        {
          id: "execution",
          label: "Execute",
          status: "executed",
          evidence: trace.execution.receipt_id,
        },
        {
          id: "verification",
          label: "Verify",
          status: trace.verification.completion_criterion_met && trace.verification.audit_chain_valid ? "verified" : "observed",
          evidence: short(trace.verification.verification_ref),
        },
        {
          id: "outcome",
          label: "Reconcile",
          status: trace.outcome_reconciliation.matched ? "reconciled" : "observed",
          evidence: trace.outcome_reconciliation.outcome_ref,
        },
        {
          id: "learning",
          label: "Learn",
          status: trace.learning.outcome === "verified_success" ? "learned" : "observed",
          evidence: short(trace.learning.learning_hash),
        },
      ];

      return {
        ok: true,
        pass: trace.pass,
        classification: trace.classification,
        generatedAt: trace.generated_at,
        stages,
        refs: {
          worldHash: trace.world.source_hash,
          capabilityId: trace.capability_construction.capability_id,
          capabilityHash: trace.capability_construction.spec_hash,
          packageId: trace.decision_package.package_id,
          receiptId: trace.execution.receipt_id,
          verificationRef: trace.verification.verification_ref,
          learningHash: trace.learning.learning_hash,
        },
        limitations: trace.limitations,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "AIA GACC run failed.",
      };
    }
  });

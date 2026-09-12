/** Port of orpaynter/claimflow `claimflow/trae/scoring.py` — deterministic, no ML. */

export type SignalType = "observed" | "inferred" | "hypothesis";
export type SignalCategory =
  | "licensing"
  | "court"
  | "business_registry"
  | "financial"
  | "regulatory"
  | "property"
  | "internal";

export interface TraeSignal {
  id: string;
  source: string;
  source_category: SignalCategory;
  signal_type: SignalType;
  confidence: number;
  title: string;
  detail: string;
  metadata: Record<string, string | number | boolean>;
}

export interface TraeFactor {
  factor_id: string;
  label: string;
  weight: number;
  contribution: number;
  signal_ids: string[];
  evidence_note: string;
}

export interface TraeRiskResult {
  score: number;
  threshold: number;
  exceeds: boolean;
  factors: TraeFactor[];
  signals_used: string[];
  scorer_version: "trae_v1_deterministic";
}

const FACTOR_WEIGHTS: Record<string, number> = {
  license_inactive_or_expired: 25,
  license_disciplinary: 30,
  bankruptcy_recent: 28,
  judgment_or_lien: 18,
  shell_or_new_entity: 15,
  ownership_churn: 12,
  multiple_unpaid_judgments: 20,
  hypothesis_only_penalty: -5,
  modeled_exposure_only: 8,
  estimated_footprint: 6,
};

function strength(signal: TraeSignal): number {
  if (signal.signal_type === "observed") return signal.confidence;
  if (signal.signal_type === "inferred") return signal.confidence * 0.75;
  return signal.confidence * 0.4;
}

export function scoreSignals(signals: TraeSignal[], threshold = 40): TraeRiskResult {
  if (signals.length === 0) {
    return { score: 0, threshold, exceeds: false, factors: [], signals_used: [], scorer_version: "trae_v1_deterministic" };
  }

  const buckets = new Map<string, { sig: TraeSignal; str: number }[]>();
  const add = (id: string, sig: TraeSignal, str: number) => {
    const list = buckets.get(id) ?? [];
    list.push({ sig, str });
    buckets.set(id, list);
  };

  for (const sig of signals) {
    const str = strength(sig);
    const m = sig.metadata;
    if (sig.source_category === "licensing") {
      if (["inactive", "expired", "revoked", "suspended"].includes(String(m.status ?? ""))) add("license_inactive_or_expired", sig, str);
      if (m.disciplinary_action || Number(m.complaints ?? 0) > 0) add("license_disciplinary", sig, str);
    }
    if (sig.source_category === "court") {
      if (m.filing_type === "bankruptcy" && Number(m.years_ago ?? 99) <= 3) add("bankruptcy_recent", sig, str);
      if (["judgment", "lien", "mechanics_lien"].includes(String(m.record_type ?? ""))) add("judgment_or_lien", sig, str);
      if (Number(m.unpaid_judgment_count ?? 0) >= 2) add("multiple_unpaid_judgments", sig, str);
    }
    if (sig.source_category === "business_registry") {
      if (Number(m.entity_age_days ?? 9999) < 180) add("shell_or_new_entity", sig, str);
      if (Number(m.ownership_changes_12m ?? 0) >= 2) add("ownership_churn", sig, str);
    }
    if (sig.source_category === "property" && m.modeled_only) add("modeled_exposure_only", sig, str);
    if (sig.source_category === "internal" && m.estimated_footprint) add("estimated_footprint", sig, str);
  }

  const factors: TraeFactor[] = [];
  let total = 0;
  const used = new Set<string>();

  for (const [factor_id, weight] of Object.entries(FACTOR_WEIGHTS)) {
    if (weight < 0) continue;
    const matches = buckets.get(factor_id);
    if (!matches?.length) continue;
    const maxStr = Math.max(...matches.map((m) => m.str));
    const contribution = Math.min(weight, weight * maxStr);
    total += contribution;
    const ids = matches.map((m) => m.sig.id);
    ids.forEach((id) => used.add(id));
    factors.push({
      factor_id,
      label: factor_id.replace(/_/g, " "),
      weight,
      contribution: Math.round(contribution * 100) / 100,
      signal_ids: ids,
      evidence_note: `${matches.length} matching signal(s), strength=${maxStr.toFixed(2)}`,
    });
  }

  const hasFact = signals.some((s) => s.signal_type === "observed" || s.signal_type === "inferred");
  if (!hasFact) {
    const penalty = FACTOR_WEIGHTS.hypothesis_only_penalty;
    total += penalty;
    factors.push({
      factor_id: "hypothesis_only_penalty",
      label: "Hypothesis only (no observed facts)",
      weight: penalty,
      contribution: penalty,
      signal_ids: signals.map((s) => s.id),
      evidence_note: "Score reduced because no observed/inferred signals present",
    });
    signals.forEach((s) => used.add(s.id));
  }

  const score = Math.max(0, Math.min(100, Math.round(total)));
  return {
    score,
    threshold,
    exceeds: score >= threshold,
    factors,
    signals_used: [...used],
    scorer_version: "trae_v1_deterministic",
  };
}

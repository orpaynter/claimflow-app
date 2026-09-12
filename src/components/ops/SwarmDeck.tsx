import { Square, Users, X } from "lucide-react";
import { useState } from "react";
import { CONTRACT_BY_ID } from "@/lib/mas";
import type { AgentId, AgentStatus, DecisionPackage } from "@/lib/mas/types";
import { useLot } from "@/lib/house/store";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/house/agent";

const PIPELINE: AgentId[] = [
  "intake-geocoder",
  "storm-intel",
  "footprint-surveyor",
  "inspector-estimator",
  "policy-compliance",
  "logistics-scout",
  "learning-ledger",
];

const SHORT: Record<AgentId, string> = {
  "claimflow-orchestrator": "Orch",
  "intake-geocoder": "Intake",
  "storm-intel": "Storm",
  "footprint-surveyor": "Foot",
  "inspector-estimator": "Est",
  "policy-compliance": "Policy",
  "logistics-scout": "Yards",
  "learning-ledger": "Ledger",
};

function statusTone(status: AgentStatus, killed: boolean): string {
  if (killed || status === "killed") return "text-danger";
  if (status === "waiting_gate" || status === "proposed" || status === "gathering") return "text-fg";
  return "text-subtle";
}

type Tab = "agents" | "package" | "log" | "ledger";

function PackageView({ pkg }: { pkg: DecisionPackage }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-mono text-xs text-fg">{pkg.id}</p>
      <p className="text-fg">{pkg.proposed_action}</p>
      <dl className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Status</dt>
          <dd className="font-mono uppercase">{pkg.status.replace("_", " ")}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Risk</dt>
          <dd className="font-mono tabular-nums">
            {pkg.risk_score} · {pkg.approval_gate} gate
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Confidence</dt>
          <dd className="font-mono tabular-nums">{Math.round(pkg.confidence * 100)}%</dd>
        </div>
        {pkg.trae ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">TRAE</dt>
            <dd className="font-mono tabular-nums">
              {pkg.trae.score} / {pkg.trae.threshold} · {pkg.trae.exceeds ? "review" : "clear"}
            </dd>
          </div>
        ) : null}
        {pkg.package_hash ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Seal</dt>
            <dd className="truncate font-mono text-[10px]">{pkg.package_hash}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Cost (modeled)</dt>
          <dd className="font-mono tabular-nums">
            {formatUsd(pkg.cost_estimate.dollars)} · {pkg.cost_estimate.hours}h
          </dd>
        </div>
      </dl>
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Risk factors</p>
      <ul className="space-y-1 font-mono text-xs tabular-nums">
        {(Object.entries(pkg.risk_factors) as [string, number][]).map(([k, v]) => (
          <li key={k} className="flex justify-between gap-3">
            <span className="text-subtle">{k}</span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Evidence chain</p>
      <ul className="space-y-2">
        {pkg.evidence_chain.map((e) => (
          <li key={e.id}>
            <p className="text-xs text-fg">{e.note}</p>
            <p className="font-mono text-[10px] text-subtle">
              {e.actor} · {e.source} · {e.hash.slice(0, 8)}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-subtle">{pkg.calibration}</p>
      <p className="text-xs text-muted">Fallback · {pkg.fallback}</p>
      <p className="text-xs text-muted">Kill · {pkg.kill_switch}</p>
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Audit</p>
      <ul className="space-y-1">
        {pkg.audit_record.map((a, i) => (
          <li key={i} className="font-mono text-[10px] text-subtle">
            {a.actor} · {a.state.replace("_", " ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SwarmRail() {
  const swarm = useLot((s) => s.swarm);
  const phase = useLot((s) => s.phase);
  const swarmOpen = useLot((s) => s.swarmOpen);
  const setSwarmOpen = useLot((s) => s.setSwarmOpen);
  const focusAgent = useLot((s) => s.focusAgent);
  const setFocusAgent = useLot((s) => s.setFocusAgent);
  if (phase === "orbit" || phase === "storm" || phase === "measure" || phase === "survey") return null;
  return (
    <div className="flex gap-1 overflow-x-auto px-2 pb-2 sm:px-3">
      <button
        type="button"
        className={cn(
          "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs",
          swarmOpen ? "bg-bg text-fg" : "text-muted hover:text-fg",
        )}
        onClick={() => setSwarmOpen(!swarmOpen)}
        aria-pressed={swarmOpen}
        aria-label="Explore multi-agent system"
      >
        <Users className="size-3.5" />
        MAS
      </button>
      {(["claimflow-orchestrator", ...PIPELINE] as AgentId[]).map((id) => {
        const rt = swarm.agents[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFocusAgent(id);
              setSwarmOpen(true);
            }}
            className={cn(
              "min-h-9 shrink-0 rounded-md px-2 font-mono text-[10px] tracking-wide uppercase",
              focusAgent === id && swarmOpen ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
            )}
          >
            {SHORT[id]}
            <span className={cn("ml-1", statusTone(rt.status, swarm.killed))}>
              {swarm.killed ? "×" : rt.status === "waiting_gate" ? "gate" : rt.status === "proposed" ? "•" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SwarmDeck() {
  const swarm = useLot((s) => s.swarm);
  const phase = useLot((s) => s.phase);
  const swarmOpen = useLot((s) => s.swarmOpen);
  const setSwarmOpen = useLot((s) => s.setSwarmOpen);
  const focusAgent = useLot((s) => s.focusAgent);
  const setFocusAgent = useLot((s) => s.setFocusAgent);
  const killSwarm = useLot((s) => s.killSwarm);
  const [tab, setTab] = useState<Tab>("agents");
  if (phase === "orbit" || !swarmOpen) return null;

  const pkg = swarm.packages.find((p) => p.id === swarm.activeId);
  const id = focusAgent ?? "claimflow-orchestrator";
  const contract = CONTRACT_BY_ID[id];
  const runtime = swarm.agents[id];

  return (
    <aside className="pointer-events-auto absolute top-36 right-3 bottom-24 left-3 z-40 flex max-w-lg flex-col overflow-hidden rounded-lg bg-surface/96 shadow-border backdrop-blur-sm sm:left-auto sm:right-5">
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted uppercase">Multi-agent system</p>
          <p className="font-display mt-1 text-lg text-fg">{swarm.killed ? "Swarm killed" : "Orchestrator governs"}</p>
          <p className="mt-1 text-xs leading-relaxed text-subtle">
            Sub-agents propose. Only a DecisionPackage plus a human gate may authorize a side-effect.
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="outline" className="min-h-11 px-3" onClick={() => killSwarm()} disabled={swarm.killed}>
            <Square className="size-4" />
            Kill
          </Button>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => setSwarmOpen(false)}
            aria-label="Close swarm"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto px-3 pb-2">
        {(["agents", "package", "log", "ledger"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "min-h-9 shrink-0 rounded-full px-3 font-mono text-[10px] tracking-wide uppercase",
              tab === t ? "bg-accent text-accent-fg" : "text-subtle hover:text-fg",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {tab === "agents" ? (
          <div>
            <ol className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setFocusAgent("claimflow-orchestrator")}
                  className={cn(
                    "flex w-full min-h-11 items-baseline justify-between gap-2 rounded-md px-2 py-2 text-left",
                    id === "claimflow-orchestrator" ? "bg-bg" : "hover:bg-bg/60",
                  )}
                >
                  <span className="text-sm text-fg">Orchestrator</span>
                  <span className={cn("font-mono text-[10px] uppercase", statusTone(swarm.agents["claimflow-orchestrator"].status, swarm.killed))}>
                    {swarm.agents["claimflow-orchestrator"].status.replace("_", " ")}
                  </span>
                </button>
              </li>
              {PIPELINE.map((aid, i) => (
                <li key={aid}>
                  <button
                    type="button"
                    onClick={() => setFocusAgent(aid)}
                    className={cn(
                      "flex w-full min-h-11 items-baseline justify-between gap-2 rounded-md px-2 py-2 text-left",
                      id === aid ? "bg-bg" : "hover:bg-bg/60",
                    )}
                  >
                    <span className="text-sm text-fg">
                      <span className="mr-2 font-mono text-[10px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                      {CONTRACT_BY_ID[aid].name}
                    </span>
                    <span className={cn("font-mono text-[10px] uppercase", statusTone(swarm.agents[aid].status, swarm.killed))}>
                      {swarm.agents[aid].status.replace("_", " ")}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs tracking-[0.16em] text-muted uppercase">
                {contract.role} · v{contract.version}
              </p>
              <p className="mt-1 text-sm text-fg">{contract.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{contract.objective}</p>
              <p className="mt-2 text-xs text-subtle">{runtime.last}</p>
              <p className="mt-3 text-xs tracking-[0.16em] text-muted uppercase">May</p>
              <p className="mt-1 text-xs text-fg">{contract.authority_scope.allowed_actions.join(" · ")}</p>
              <p className="mt-3 text-xs tracking-[0.16em] text-muted uppercase">Must not</p>
              <p className="mt-1 text-xs text-fg">{contract.authority_scope.forbidden_actions.join(" · ")}</p>
              <p className="mt-3 text-xs tracking-[0.16em] text-muted uppercase">Kill</p>
              <p className="mt-1 text-xs text-muted">{contract.kill_switch}</p>
              <p className="mt-3 font-mono text-[10px] text-subtle">
                hash {contract.provenance.code_hash} · eval {contract.provenance.eval_set_id}
              </p>
            </div>
          </div>
        ) : null}
        {tab === "package" ? (
          pkg ? (
            <PackageView pkg={pkg} />
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              No DecisionPackage yet. Address, storm, and footprint reads do not need one. The estimator emits a package when the lot is scanned.
            </p>
          )
        ) : null}
        {tab === "log" ? (
          <ol className="space-y-3">
            {[...swarm.log].reverse().map((e) => (
              <li key={e.id}>
                <p className="font-mono text-[10px] tracking-wide text-subtle uppercase">
                  {e.kind} · {SHORT[e.agent]} · {e.hash.slice(0, 8)}
                </p>
                <p className="mt-0.5 text-sm text-fg">{e.detail}</p>
              </li>
            ))}
            {swarm.log.length === 0 ? <p className="text-sm text-muted">Swarm is idle. Find a house.</p> : null}
          </ol>
        ) : null}
        {tab === "ledger" ? (
          <div>
            <p className="text-xs leading-relaxed text-subtle">
              Append-only. A miss may propose an improvement. Nothing deploys without a human gate.
            </p>
            <ul className="mt-3 space-y-3">
              {[...swarm.ledger].reverse().map((row) => (
                <li key={row.provenance_hash + row.recorded_at}>
                  <p className="text-sm text-fg">
                    {row.match ? "Match" : "Miss"} · {row.decision_package_id}
                  </p>
                  <p className="font-mono text-xs tabular-nums text-muted">
                    predicted {row.predicted.integrity}% / {formatUsd(row.predicted.cost)} · observed {row.observed.integrity}% / {formatUsd(row.observed.cost)}
                  </p>
                </li>
              ))}
            </ul>
            {swarm.ledger.length === 0 ? <p className="mt-3 text-sm text-muted">No closed lots on this operator yet.</p> : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

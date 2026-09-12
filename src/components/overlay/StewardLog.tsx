import { X } from "lucide-react";
import { formatUsd } from "@/lib/house/agent";
import { PART_LABEL } from "@/lib/house/types";
import { cn } from "@/lib/cn";
import { useLot } from "@/lib/house/store";

export function StewardLog() {
  const phase = useLot((s) => s.phase);
  const events = useLot((s) => s.events);
  const applied = useLot((s) => s.applied);
  const decisions = useLot((s) => s.decisions);
  const brief = useLot((s) => s.brief);
  const repairIndex = useLot((s) => s.repairIndex);
  const logOpen = useLot((s) => s.logOpen);
  const setLogOpen = useLot((s) => s.setLogOpen);
  const reportOpen = useLot((s) => s.reportOpen);
  const spec = useLot((s) => s.spec);

  if (!spec) return null;
  if (reportOpen) return null;
  if (phase === "orbit" || phase === "track" || phase === "select" || phase === "survey" || phase === "storm") {
    return null;
  }
  if (phase === "measure" || phase === "dispatch" || phase === "restored") return null;


  const seen = events.filter((e) => applied[e.id]);
  const spent = decisions
    .slice(0, Math.min(decisions.length, repairIndex + 1))
    .reduce((n, d) => n + d.cost, 0);
  const total = decisions.reduce((n, d) => n + d.cost, 0);
  const showDecisions = phase === "repairing";

  const body = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted uppercase">Steward · competence</p>
          <p className="mt-1 text-xs text-subtle">
            {phase === "planning"
              ? "Writing the order of work. Authority stays with you."
              : "Execution edge. Bounded tools."}
          </p>
        </div>
        <button
          type="button"
          className="rounded-md p-2 text-muted md:hidden"
          onClick={() => setLogOpen(false)}
          aria-label="Close log"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {phase === "planning" ? (
          <p className="shimmer-text text-sm text-muted">Walking the roof, then the openings.</p>
        ) : null}

        {brief && showDecisions ? (
          <p className="mb-4 text-sm leading-relaxed text-pretty text-fg">{brief}</p>
        ) : null}

        {!showDecisions && seen.length > 0 ? (
          <ol className="space-y-3">
            {seen.map((e, i) => (
              <li key={e.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <p className="font-mono text-xs tracking-wider text-subtle uppercase">
                  {String(i + 1).padStart(2, "0")} · {PART_LABEL[e.part]}
                </p>
                <p className="mt-1 text-sm text-fg">{e.label}</p>
              </li>
            ))}
          </ol>
        ) : null}

        {showDecisions && decisions.length > 0 ? (
          <ol className="space-y-3">
            {decisions.map((d, i) => {
              const active = i === repairIndex;
              const done = i < repairIndex;
              return (
                <li
                  key={d.id}
                  className={cn(
                    "rounded-md px-3 py-3",
                    active ? "bg-bg shadow-border" : "border-t border-border first:border-t-0",
                    done && !active && "opacity-55",
                  )}
                >
                  <p className="font-mono text-xs tracking-wider text-subtle uppercase">
                    {String(d.priority).padStart(2, "0")} · {PART_LABEL[d.part]}
                  </p>
                  <p className="mt-1 text-sm font-medium text-fg">{d.action}</p>
                  <p className="mt-1 text-sm leading-relaxed text-pretty text-muted">{d.rationale}</p>
                  <p className="mt-2 font-mono text-xs tabular-nums text-subtle">
                    {formatUsd(d.cost)} · {d.hours}h
                  </p>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
      {total > 0 && showDecisions ? (
        <div className="border-t border-border px-4 py-3">
          <p className="flex justify-between font-mono text-xs tabular-nums text-muted">
            <span>Committed</span>
            <span className="text-fg">
              {formatUsd(spent)}
              <span className="text-subtle"> / {formatUsd(total)}</span>
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <aside className="pointer-events-auto absolute top-36 right-5 bottom-5 z-20 hidden w-72 overflow-hidden rounded-lg bg-surface/90 shadow-border backdrop-blur-sm md:block">
        {body}
      </aside>
      {logOpen ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 md:hidden">
          <div className="max-h-[58dvh] overflow-hidden rounded-t-xl bg-surface shadow-border">
            {body}
          </div>
        </div>
      ) : null}
    </>
  );
}

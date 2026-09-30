import { CheckCircle2, ChevronDown, ChevronUp, CircleAlert, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useGaccRun } from "@/lib/gacc/store";

export function GaccRunRail() {
  const status = useGaccRun((s) => s.status);
  const run = useGaccRun((s) => s.run);
  const error = useGaccRun((s) => s.error);
  const clear = useGaccRun((s) => s.clear);
  const [open, setOpen] = useState(false);

  if (status === "idle") return null;

  const passed = status === "passed" && run?.pass;

  return (
    <aside className="pointer-events-auto absolute inset-x-3 top-[7.65rem] z-40 mx-auto max-w-2xl overflow-hidden rounded-lg bg-surface/96 shadow-border backdrop-blur-sm">
      <div className="flex min-h-12 items-center gap-3 px-3">
        {status === "running" ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-accent" />
        ) : passed ? (
          <CheckCircle2 className="size-4 shrink-0 text-accent" />
        ) : (
          <CircleAlert className="size-4 shrink-0 text-danger" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
            GACC execution
          </p>
          <p className="truncate text-sm text-fg">
            {status === "running"
              ? "Running bounded governed lifecycle…"
              : passed
                ? "Verified trace returned from AIA"
                : error || "GACC run did not pass."}
          </p>
        </div>
        {run ? (
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse GACC evidence" : "Expand GACC evidence"}
          >
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        ) : null}
        {status !== "running" ? (
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={clear}
            aria-label="Close GACC evidence"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {run ? (
        <div className="border-t border-border">
          <div className="flex gap-1 overflow-x-auto px-3 py-2">
            {run.stages.map((stage) => (
              <div
                key={stage.id}
                className={cn(
                  "shrink-0 rounded-full border px-2 py-1 font-mono text-[9px] tracking-wide uppercase",
                  stage.status === "observed"
                    ? "border-border text-muted"
                    : "border-accent/30 bg-accent/10 text-accent",
                )}
                title={stage.evidence}
              >
                {stage.label}
              </div>
            ))}
          </div>
          {open ? (
            <div className="max-h-64 overflow-y-auto border-t border-border px-3 py-3">
              <p className="text-[10px] tracking-[0.16em] text-muted uppercase">
                Server-returned lifecycle evidence
              </p>
              <ol className="mt-2 space-y-2">
                {run.stages.map((stage, index) => (
                  <li key={stage.id} className="grid grid-cols-[1.5rem_7rem_1fr] gap-2 text-xs">
                    <span className="font-mono text-subtle">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-fg">{stage.label}</span>
                    <span className="truncate font-mono text-subtle" title={stage.evidence}>
                      {stage.evidence}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted">
                <p>
                  <span className="text-fg">Classification:</span> {run.classification}
                </p>
                <p>
                  <span className="text-fg">Receipt:</span>{" "}
                  <span className="font-mono">{run.refs.receiptId}</span>
                </p>
                <p className="mt-2 text-subtle">
                  Sandbox proof only. This rail does not grant production, filing, payment,
                  dispatch, merge, or deployment authority.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

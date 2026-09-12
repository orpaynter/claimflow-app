import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLot } from "@/lib/house/store";

export function ProofRail() {
  const open = useLot((s) => s.proofOpen);
  const setProofOpen = useLot((s) => s.setProofOpen);
  const proof = useLot((s) => s.proof);
  const envelope = useLot((s) => s.envelope);
  const phase = useLot((s) => s.phase);

  if (!open || phase === "orbit") return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center p-3 sm:items-center sm:p-8">
      <button
        type="button"
        className="absolute inset-0 bg-bg/50"
        aria-label="Close proof rail"
        onClick={() => setProofOpen(false)}
      />
      <article className="relative flex max-h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-surface shadow-border">
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Proof rail</p>
            <h2 className="font-display mt-1 text-2xl leading-tight text-fg">DecisionPackage</h2>
            <p className="mt-1 text-xs text-muted">
              Immutable audit. Authority stays with you.
            </p>
            {envelope ? (
              <p className="mt-2 font-mono text-[10px] tracking-wide text-subtle uppercase">
                {envelope.id} · v{envelope.version} · {envelope.status}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:text-fg"
            onClick={() => setProofOpen(false)}
            aria-label="Close proof rail"
          >
            <X className="size-4" />
          </button>
        </header>
        <ol className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {proof.length === 0 ? (
            <li className="text-sm text-muted">No events yet.</li>
          ) : (
            proof.map((e, i) => (
              <li
                key={e.id}
                className={cn("border-t border-border py-3 first:border-t-0 first:pt-0")}
              >
                <p className="font-mono text-[10px] tracking-wider text-subtle uppercase">
                  {String(i + 1).padStart(2, "0")} · {e.stage} · {e.actor}
                </p>
                <p className="mt-1 text-sm font-medium text-fg">{e.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-pretty text-muted">{e.detail}</p>
                <p className="mt-1 font-mono text-[10px] text-subtle">{e.source}</p>
              </li>
            ))
          )}
        </ol>
      </article>
    </div>
  );
}

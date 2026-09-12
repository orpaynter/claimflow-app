import { Flag, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/house/agent";
import { forecastOf } from "@/lib/platform/forecast";
import { useLot } from "@/lib/house/store";

export function LearningPanel() {
  const phase = useLot((s) => s.phase);
  const outcome = useLot((s) => s.outcome);
  const swarm = useLot((s) => s.swarm);
  const site = useLot((s) => s.site);
  const wire = useLot((s) => s.wire);
  const setReportOpen = useLot((s) => s.setReportOpen);
  const resetLot = useLot((s) => s.resetLot);
  const reportOpen = useLot((s) => s.reportOpen);
  const proofOpen = useLot((s) => s.proofOpen);

  if (phase !== "restored" || !outcome || reportOpen || proofOpen) return null;
  const forecast = forecastOf(site);

  return (
    <aside className="sheet-in pointer-events-auto absolute inset-x-0 bottom-[4.75rem] z-20 mx-auto flex max-h-[52dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-xl bg-surface p-5 shadow-border">
      <div className="flex justify-center pt-0 pb-3">
        <span className="h-1 w-10 rounded-full bg-border" />
      </div>
      <p className="text-sm text-muted">ClaimFlow wire</p>
      <p className="font-display mt-1 text-xl tracking-tight text-fg">
        {wire ? `Sealed by ${wire.signed_name}` : "Package locked"}
      </p>
      {wire ? (
        <>
          <p className="mt-2 font-mono text-sm break-all text-fg">{wire.package_sha256}</p>
          <p className="mt-2 text-sm leading-relaxed text-fg">
            Privilege closure is live on The Platform. This preview has no Supabase session, so the RPCs did not run. Export was not called.
          </p>
          <ol className="mt-3 space-y-1.5">
            {wire.steps.map((step) => (
              <li key={step.id} className="text-sm">
                <p className="flex justify-between gap-2 text-sm font-semibold">
                  <span className="text-fg">{step.id.replace("_", " ")}</span>
                  <span className={step.status === "skipped" ? "text-muted" : "text-accent"}>{step.status}</span>
                </p>
                <p className="text-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <dl className="mt-3 space-y-2 text-base">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Integrity after cell</dt>
          <dd className="font-mono tabular-nums text-fg">{outcome.actualIntegrity}%</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Committed</dt>
          <dd className="font-mono tabular-nums text-fg">
            {formatUsd(outcome.actualCost)} · {outcome.actualHours}h
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-base leading-relaxed text-pretty text-fg">{outcome.attribution}</p>
      {forecast[0] ? (
        <p className="mt-2 text-sm text-muted">
          Next city signal · {forecast[0].label} {forecast[0].value}
        </p>
      ) : null}
      {swarm.ledger.length > 0 ? (
        <p className="mt-2 text-sm text-muted">
          Ledger {swarm.ledger.length}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2">
        <Button onClick={() => setReportOpen(true)}>
          <ScrollText className="size-4" />
          Open report
        </Button>
        <Button variant="outline" onClick={resetLot}>
          <Flag className="size-4" />
          Start another house
        </Button>
      </div>
    </aside>
  );
}

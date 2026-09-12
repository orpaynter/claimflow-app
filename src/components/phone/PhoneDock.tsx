import { Flag, Home, ScrollText, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unlockAudio } from "@/lib/audio";
import { coach } from "@/lib/house/coach";
import { useLot } from "@/lib/house/store";

export function PhoneDock() {
  const phase = useLot((s) => s.phase);
  const site = useLot((s) => s.site);
  const selectedId = useLot((s) => s.selectedId);
  const enterLot = useLot((s) => s.enterLot);
  const skipStorm = useLot((s) => s.skipStorm);
  const confirmMeasure = useLot((s) => s.confirmMeasure);
  const setReportOpen = useLot((s) => s.setReportOpen);
  const loading = useLot((s) => s.loading);
  const loadError = useLot((s) => s.loadError);
  const c = coach(phase);
  const selected = site?.buildings.find((b) => b.id === selectedId);
  const canEnter = Boolean(selected?.enterable);

  if (phase !== "storm" && phase !== "survey" && phase !== "track") return null;

  function run() {
    void unlockAudio();
    if (c.actionKind === "skip") skipStorm();
    else if (c.actionKind === "enter" && canEnter) enterLot();
    else if (c.actionKind === "approve") void confirmMeasure();
    else if (c.actionKind === "report") setReportOpen(true);
  }

  const disabled =
    loading ||
    (c.actionKind === "enter" && !canEnter) ||
    !c.action ||
    c.actionKind === "dispatch" ||
    c.actionKind === "stop";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-30 px-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-lg flex-col gap-2">
        {loadError ? <p className="rounded-md bg-surface px-3 py-2 text-base text-danger shadow-border">{loadError}</p> : null}
        {c.action && c.actionKind !== "dispatch" && c.actionKind !== "stop" ? (
          <Button className="w-full" onClick={run} disabled={disabled}>
            {c.actionKind === "skip" ? <SkipForward className="size-4" /> : null}
            {c.actionKind === "enter" ? <Home className="size-4" /> : null}
            {c.actionKind === "report" ? <ScrollText className="size-4" /> : null}
            {c.actionKind === "approve" ? <Flag className="size-4" /> : null}
            {c.action}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

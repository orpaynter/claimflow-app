import { CloudLightning, Flag, RotateCcw, Satellite, ScrollText, SkipForward } from "lucide-react";
import { StepRail } from "@/components/ops/StepRail";
import { Button } from "@/components/ui/button";
import { unlockAudio } from "@/lib/audio";
import { cn } from "@/lib/cn";
import { coach } from "@/lib/house/coach";
import { integrityOf } from "@/lib/house/types";
import { useLot } from "@/lib/house/store";

export function Hud() {
  const spec = useLot((s) => s.spec);
  const phase = useLot((s) => s.phase);
  const health = useLot((s) => s.health);
  const events = useLot((s) => s.events);
  const applied = useLot((s) => s.applied);
  const decisions = useLot((s) => s.decisions);
  const repairIndex = useLot((s) => s.repairIndex);
  const startStorm = useLot((s) => s.startStorm);
  const skipStorm = useLot((s) => s.skipStorm);
  const resetLot = useLot((s) => s.resetLot);
  const enterLot = useLot((s) => s.enterLot);
  const confirmMeasure = useLot((s) => s.confirmMeasure);
  const confirmDispatch = useLot((s) => s.confirmDispatch);
  const orpa = useLot((s) => s.orpa);
  const logOpen = useLot((s) => s.logOpen);
  const setLogOpen = useLot((s) => s.setLogOpen);
  const reportOpen = useLot((s) => s.reportOpen);
  const setReportOpen = useLot((s) => s.setReportOpen);
  const site = useLot((s) => s.site);
  const loading = useLot((s) => s.loading);
  const loadError = useLot((s) => s.loadError);
  const selectedId = useLot((s) => s.selectedId);

  if (phase === "orbit") return null;

  const hideCard = phase === "select" || phase === "measure" || phase === "dispatch";
  const integrity = spec ? integrityOf(spec, health) : 100;
  const seen = events.filter((e) => applied[e.id]);
  const lastHit = seen[seen.length - 1];
  const current = decisions[Math.max(0, repairIndex)];
  const logReady = phase === "planning" || phase === "repairing" || phase === "restored";
  const c = coach(phase);
  const selected = site?.buildings.find((b) => b.id === selectedId);
  const canEnter = Boolean(selected?.enterable);

  const title = spec
    ? `${spec.number} ${spec.street}`
    : site
      ? site.place.displayName
      : "ClaimFlow";
  const sub = spec?.locality || site?.place.city || "";

  function runAction() {
    void unlockAudio();
    if (c.actionKind === "skip") skipStorm();
    else if (c.actionKind === "enter" && canEnter) enterLot();
    else if (c.actionKind === "approve") void confirmMeasure();
    else if (c.actionKind === "dispatch") void confirmDispatch();
    else if (c.actionKind === "stop") orpa("stop");
    else if (c.actionKind === "report") setReportOpen(true);
  }

  return (
    <>
      {!hideCard ? (
        <div className="pointer-events-none absolute inset-x-0 top-[7.5rem] z-20 p-3 sm:p-5">
          <div className="pointer-events-auto max-w-sm rounded-lg bg-surface/90 px-4 py-3 shadow-border backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs tracking-[0.16em] text-muted uppercase">
                  {spec?.styleLabel || site?.zone.areaCode || "House"}
                </p>
                <p className="font-display mt-1 truncate text-lg leading-tight text-fg">{title}</p>
                {sub ? <p className="truncate text-xs text-muted">{sub}</p> : null}
              </div>
              <Satellite className="mt-1 size-4 shrink-0 text-subtle" />
            </div>
            {spec ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-bg">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-300 ease-out",
                      integrity > 70 ? "bg-ok" : integrity > 40 ? "bg-accent" : "bg-danger",
                    )}
                    style={{ width: `${integrity}%` }}
                  />
                </div>
                <span className="font-mono text-xs tabular-nums text-fg">{integrity}%</span>
              </div>
            ) : null}
            <p className="mt-2 text-sm leading-snug text-muted">{c.next}</p>
            {lastHit && phase === "storm" ? (
              <p className="mt-1 text-sm text-fg">{lastHit.label} · modeled</p>
            ) : null}
            {phase === "survey" || phase === "storm" ? (
              <p className="mt-2 text-xs leading-relaxed text-subtle">
                Footprint model. Watching the replay does not approve a finding.
              </p>
            ) : null}
            {phase === "repairing" && current ? (
              <p className="mt-1 text-sm text-fg">{current.action}</p>
            ) : null}
            {phase === "track" && loading ? (
              <p className="shimmer-text mt-1 text-sm">Finding the house. Pulling real outlines.</p>
            ) : null}
            {loadError ? <p className="mt-1 text-sm text-danger">{loadError}</p> : null}
            <div className="mt-3 hidden sm:block">
              <StepRail phase={phase} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
        <div className="pointer-events-auto flex flex-wrap items-end gap-2">
          {phase === "restored" && decisions.length === 0 ? (
            <Button
              onClick={() => {
                void unlockAudio();
                startStorm();
              }}
            >
              <CloudLightning className="size-4" />
              Watch replay
            </Button>
          ) : null}
          {c.action && !(phase === "select" || phase === "measure" || phase === "dispatch") ? (
            <Button onClick={runAction} disabled={c.actionKind === "enter" && !canEnter}>
              {c.actionKind === "skip" ? <SkipForward className="size-4" /> : null}
              {c.actionKind === "report" ? <ScrollText className="size-4" /> : null}
              {c.actionKind === "stop" ? <Flag className="size-4" /> : null}
              {c.action}
            </Button>
          ) : null}
          {phase === "survey" ||
          phase === "measure" ||
          phase === "dispatch" ||
          phase === "restored" ||
          phase === "select" ||
          phase === "track" ? (
            <Button variant="ghost" onClick={resetLot}>
              <RotateCcw className="size-4" />
              Start over
            </Button>
          ) : null}
          {logReady && !reportOpen ? (
            <Button variant="outline" className="md:hidden" onClick={() => setLogOpen(!logOpen)}>
              Inspect
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}

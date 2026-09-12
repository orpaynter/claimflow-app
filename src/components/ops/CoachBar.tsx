import { BookMarked, Building2, HelpCircle, Map, Wrench } from "lucide-react";
import {
  Ban,
  Check,
  FileCheck,
  Flag,
  Scale,
  Search,
  Square,
  Undo2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { SwarmRail } from "@/components/ops/SwarmDeck";
import { coach } from "@/lib/house/coach";
import { useLot } from "@/lib/house/store";
import {
  COMMANDS,
  approveLabel,
  canApprove,
  canCommand,
  canInspect,
  canOverride,
  canProof,
  canReconcile,
  canReject,
  canStop,
  type OrpaCommand,
} from "@/lib/orpa";
import type { Phase } from "@/lib/house/types";

const ICONS: Record<OrpaCommand, typeof Flag> = {
  command: Flag,
  review: Search,
  approve: Check,
  reject: Ban,
  override: Undo2,
  stop: Square,
  inspect: Users,
  proof: FileCheck,
  reconcile: Scale,
};

function enabled(cmd: OrpaCommand, phase: Phase): boolean {
  switch (cmd) {
    case "command":
      return canCommand(phase);
    case "review":
      return canProof(phase);
    case "approve":
      return canApprove(phase);
    case "reject":
      return canReject(phase);
    case "override":
      return canOverride(phase);
    case "stop":
      return canStop(phase);
    case "inspect":
      return canInspect(phase);
    case "proof":
      return canProof(phase);
    case "reconcile":
      return canReconcile(phase);
  }
}

export function CoachBar() {
  const phase = useLot((s) => s.phase);
  const orpa = useLot((s) => s.orpa);
  const opsOpen = useLot((s) => s.opsOpen);
  const setOpsOpen = useLot((s) => s.setOpsOpen);
  const setGuideOpen = useLot((s) => s.setGuideOpen);
  const setBookOpen = useLot((s) => s.setBookOpen);
  const book = useLot((s) => s.book);
  const site = useLot((s) => s.site);
  const viewMode = useLot((s) => s.viewMode);
  const setViewMode = useLot((s) => s.setViewMode);
  const swarm = useLot((s) => s.swarm);
  const c = coach(phase);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
      <div className="pointer-events-auto border-b border-border bg-surface/92 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4">
          <p className="shrink-0 font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
            {swarm.killed ? "MAS killed" : "ClaimFlow"}
          </p>
          <p className="min-w-0 flex-1 truncate text-xs text-fg">{c.here}</p>
          {site && (phase === "select" || phase === "dispatch") ? (
            <div className="flex shrink-0 rounded-md bg-bg p-0.5">
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded px-2.5 text-xs",
                  viewMode === "skyview" ? "bg-surface text-fg" : "text-muted hover:text-fg",
                )}
                onClick={() => setViewMode("skyview")}
                aria-pressed={viewMode === "skyview"}
              >
                <Building2 className="size-3.5" />
                Skyview
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded px-2.5 text-xs",
                  viewMode === "satellite" ? "bg-surface text-fg" : "text-muted hover:text-fg",
                )}
                onClick={() => setViewMode("satellite")}
                aria-pressed={viewMode === "satellite"}
              >
                <Map className="size-3.5" />
                Map
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => setGuideOpen(true)}
            aria-label="Field manual"
            title="How this works"
          >
            <HelpCircle className="size-4" />
          </button>
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => setBookOpen(true)}
            aria-label="Your houses"
            title="Your houses"
          >
            <BookMarked className="size-4" />
            {book.length > 0 ? (
              <span className="sr-only">{book.length} saved</span>
            ) : null}
          </button>
          {phase !== "orbit" ? (
            <button
              type="button"
              className={cn(
                "inline-flex size-11 shrink-0 items-center justify-center rounded-md",
                opsOpen ? "text-fg" : "text-muted hover:text-fg",
              )}
              onClick={() => setOpsOpen(!opsOpen)}
              aria-label="Operator commands"
              aria-pressed={opsOpen}
              title="Operator"
            >
              <Wrench className="size-4" />
            </button>
          ) : null}
        </div>
        {phase !== "orbit" ? (
          <p className="px-3 pb-2 text-xs leading-relaxed text-muted sm:px-4">{c.next}</p>
        ) : null}
        {opsOpen && phase !== "orbit" ? (
          <div className="flex gap-1 overflow-x-auto px-2 pb-2 sm:px-3">
            {COMMANDS.map((cmd) => {
              const Icon = ICONS[cmd.id];
              const on = enabled(cmd.id, phase);
              const label = cmd.id === "approve" ? approveLabel(phase) : cmd.label;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  disabled={!on}
                  title={cmd.hint}
                  aria-label={label}
                  onClick={() => orpa(cmd.id)}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs",
                    "transition-[opacity,color,background-color] duration-150 ease-out",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    on ? "text-fg hover:bg-bg" : "text-subtle",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        <SwarmRail />
      </div>
    </div>
  );
}

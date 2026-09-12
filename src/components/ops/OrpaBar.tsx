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
  stageOf,
  type OrpaCommand,
} from "@/lib/orpa";
import { useLot } from "@/lib/house/store";
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

export function OrpaBar() {
  const phase = useLot((s) => s.phase);
  const orpa = useLot((s) => s.orpa);
  const envelope = useLot((s) => s.envelope);
  if (phase === "orbit") return null;
  const stage = stageOf(phase);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
      <div className="pointer-events-auto border-b border-border bg-surface/92 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4">
          <p className="shrink-0 font-mono text-[10px] tracking-[0.18em] text-muted uppercase">ORPA</p>
          <p className="min-w-0 flex-1 truncate text-xs text-fg">
            <span className="font-mono text-subtle">{String(stage.n).padStart(2, "0")}</span>
            <span className="mx-1.5 text-subtle">·</span>
            {stage.name}
          </p>
          {envelope ? (
            <p className="hidden font-mono text-[10px] tracking-wide text-subtle uppercase sm:block">
              {envelope.id} · {envelope.status}
            </p>
          ) : null}
        </div>
        <div className="flex gap-1 overflow-x-auto px-2 pb-2 sm:px-3">
          {COMMANDS.map((c) => {
            const Icon = ICONS[c.id];
            const on = enabled(c.id, phase);
            const label = c.id === "approve" ? approveLabel(phase) : c.label;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!on}
                title={c.hint}
                aria-label={label}
                onClick={() => orpa(c.id)}
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
      </div>
    </div>
  );
}

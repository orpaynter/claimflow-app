import { PART_LABEL, type PartId } from "@/lib/house/types";
import { twinLabel } from "@/lib/claim/status";
import { useLot } from "@/lib/house/store";
import { cn } from "@/lib/cn";

export function InspectStrip() {
  const spec = useLot((s) => s.spec);
  const phase = useLot((s) => s.phase);
  const health = useLot((s) => s.health);
  const events = useLot((s) => s.events);
  const applied = useLot((s) => s.applied);
  const focusPart = useLot((s) => s.focusPart);
  const setFocusPart = useLot((s) => s.setFocusPart);
  const twinMode = useLot((s) => s.twinMode);
  const setTwinMode = useLot((s) => s.setTwinMode);
  if (!spec || (phase !== "storm" && phase !== "measure")) return null;

  const damaged = (Object.keys(health) as PartId[]).filter((p) => health[p] < 0.98);
  const parts = damaged.length > 0 ? damaged : (["roof", "windows", "siding"] as PartId[]);
  const ev = events.find((e) => e.part === focusPart && applied[e.id]);
  const w = spec.width;
  const d = spec.depth;
  const h = spec.stories * spec.storyHeight + 0.36;
  const measured = spec.source === "usa" || spec.source === "microsoft";

  return (
    <div className="pointer-events-auto absolute bottom-24 left-3 z-20 w-[min(100%-1.5rem,22rem)] rounded-lg bg-surface/92 px-3 py-3 shadow-border backdrop-blur-sm sm:left-5">
      <p className="text-xs tracking-[0.16em] text-muted uppercase">3D digital twin</p>
      <p className="mt-1 text-sm text-fg">
        {focusPart ? PART_LABEL[focusPart] : "Pick a system"}
        <span className="ml-2 font-mono text-xs tabular-nums text-muted">
          {focusPart ? `${Math.round(health[focusPart] * 100)}%` : `${w.toFixed(1)} × ${d.toFixed(1)} × ${h.toFixed(1)} m`}
        </span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-subtle">{twinLabel(twinMode, measured)}</p>
      <p className="mt-1 text-xs leading-relaxed text-subtle">
        {ev ? `${ev.label}. Modeled — not a damage determination.` : "Click a ring on the house. Camera dollies in."}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {(["footprint", "measured", "evidence"] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={m === "measured" && !measured}
            onClick={() => setTwinMode(m)}
            className={cn(
              "min-h-9 rounded-md px-2.5 font-mono text-[10px] tracking-wide uppercase",
              twinMode === m ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:text-fg",
              m === "measured" && !measured ? "opacity-40" : "",
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {parts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setFocusPart(p)}
            className={cn(
              "min-h-9 rounded-md px-2.5 font-mono text-[10px] tracking-wide uppercase",
              focusPart === p ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:text-fg",
            )}
          >
            {PART_LABEL[p]} {Math.round(health[p] * 100)}
          </button>
        ))}
      </div>
    </div>
  );
}

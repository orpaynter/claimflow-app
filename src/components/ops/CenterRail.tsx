import { cn } from "@/lib/cn";
import { CENTERS, centerOf, type ArchCenter } from "@/lib/orpa";
import type { Phase } from "@/lib/house/types";

const ORDER: ArchCenter[] = ["truth", "authority", "action", "proof", "learning"];

function reached(phase: Phase, id: ArchCenter): boolean {
  return ORDER.indexOf(centerOf(phase)) >= ORDER.indexOf(id);
}

export function CenterRail({ phase }: { phase: Phase }) {
  const current = centerOf(phase);
  return (
    <ol className="flex flex-wrap items-center gap-1">
      {CENTERS.map((c, i) => {
        const active = c.id === current;
        const done = reached(phase, c.id) && !active;
        return (
          <li key={c.id} className="flex items-center gap-1">
            {i > 0 ? <span className="text-subtle" aria-hidden>→</span> : null}
            <span
              className={cn(
                "rounded-full px-2 py-1 font-mono text-[10px] tracking-wide uppercase",
                active && "bg-accent text-accent-fg",
                done && "text-ok",
                !done && !active && "text-subtle",
              )}
            >
              {c.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

import { cn } from "@/lib/cn";
import { FLOW, stepIndex } from "@/lib/house/steps";
import type { Phase } from "@/lib/house/types";

export function StepRail({ phase }: { phase: Phase }) {
  const current = stepIndex(phase);
  return (
    <ol className="flex gap-1 overflow-x-auto">
      {FLOW.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={s.label}
            className={cn(
              "rounded-full px-2 py-1 font-mono text-[10px] tracking-wide uppercase",
              active && "bg-accent text-accent-fg",
              done && !active && "text-ok",
              !done && !active && "text-subtle",
            )}
          >
            {String(i + 1).padStart(2, "0")} {s.label}
          </li>
        );
      })}
    </ol>
  );
}

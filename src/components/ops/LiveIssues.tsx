import { useLot } from "@/lib/house/store";
import { cn } from "@/lib/cn";

export function LiveIssues() {
  const phase = useLot((s) => s.phase);
  const issues = useLot((s) => s.liveIssues);
  const satSource = useLot((s) => s.satSource);
  const spec = useLot((s) => s.spec);
  if (!spec || phase !== "storm") return null;

  return (
    <aside className="pointer-events-auto absolute top-36 left-3 z-20 hidden w-[min(100%-1.5rem,20rem)] rounded-lg bg-surface/92 p-3 shadow-border backdrop-blur-sm sm:block sm:left-5">
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Live on this pin</p>
      <p className="mt-1 text-xs leading-relaxed text-subtle">
        {satSource || "Satellite pending. NWS at this coordinate. Modeled flags are not determinations."}
      </p>
      {issues.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Waiting on the desk — alerts, station, lot scan.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {issues.slice(0, 8).map((i) => (
            <li key={i.id}>
              <p className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-fg">{i.title}</span>
                <span
                  className={cn(
                    "font-mono text-[10px] tracking-wide uppercase",
                    i.kind === "alert" ? "text-danger" : i.kind === "modeled" ? "text-accent" : "text-muted",
                  )}
                >
                  {i.kind}
                </span>
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-subtle">{i.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

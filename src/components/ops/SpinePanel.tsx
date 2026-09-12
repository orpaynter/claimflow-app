import { AIA_ENGINES, AIA_STAGES, FOREMEN, PIECES } from "@/lib/spine/inventory";
import { useLot } from "@/lib/house/store";
import { cn } from "@/lib/cn";

export function SpineBody() {
  const swarm = useLot((s) => s.swarm);
  const pkg = swarm.packages.find((p) => p.id === swarm.activeId) ?? swarm.packages[swarm.packages.length - 1];

  return (
    <div>
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Canonical spine</p>
      <p className="mt-1 text-xs leading-relaxed text-subtle">AIA · ClaimFlow · ORPA. Web is the public surface. TRAE scores this lot.</p>
      <ul className="mt-2 space-y-1">
        {PIECES.filter((p) => p.class === "canonical" || p.id === "trae").map((p) => (
          <li key={p.id} className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-fg">{p.name}</span>
            <span className="font-mono text-[10px] tracking-wide text-subtle uppercase">{p.inSession ? "in session" : "parked"}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs tracking-[0.16em] text-muted uppercase">AIA six stages</p>
      <ol className="mt-2 space-y-1">
        {AIA_STAGES.map((s, i) => {
          const agent = swarm.agents[s.agent];
          const live = agent && agent.status !== "idle";
          return (
            <li key={s.id} className={cn("flex items-center gap-2 font-mono text-xs", live ? "text-fg" : "text-subtle")}>
              <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {s.name}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs tracking-[0.16em] text-muted uppercase">Foremen</p>
      <ul className="mt-2 space-y-1">
        {FOREMEN.map((f) => (
          <li key={f.name} className="flex justify-between gap-2 text-xs">
            <span className="text-fg">{f.name}</span>
            <span className="font-mono text-subtle">{f.agent ? "mapped" : "parked"}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs tracking-[0.16em] text-muted uppercase">14 engines</p>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-subtle">{AIA_ENGINES.join(" · ")}</p>

      {pkg?.trae ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs tracking-[0.16em] text-muted uppercase">TRAE this package</p>
          <p className="mt-1 font-mono text-sm tabular-nums text-fg">
            {pkg.trae.score} / {pkg.trae.threshold} · {pkg.trae.exceeds ? "review" : "clear"}
          </p>
          {pkg.package_hash ? <p className="mt-1 truncate font-mono text-[10px] text-subtle">seal {pkg.package_hash}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

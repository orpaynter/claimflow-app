import { FLOW, stepIndex } from "@/lib/house/steps";
import { forecastOf } from "@/lib/platform/forecast";
import { SENSES, VERTICALS, laneById } from "@/lib/platform/verticals";
import { SpineBody } from "@/components/ops/SpinePanel";
import { useLot } from "@/lib/house/store";
import { cn } from "@/lib/cn";

export function IndustryBoard() {
  const site = useLot((s) => s.site);
  const phase = useLot((s) => s.phase);
  const selectedId = useLot((s) => s.selectedId);
  const swarm = useLot((s) => s.swarm);
  const verticalId = useLot((s) => s.verticalId);
  const setVertical = useLot((s) => s.setVertical);
  if (!site || (phase !== "select" && phase !== "dispatch")) return null;

  const selected = site.buildings.find((b) => b.id === selectedId);
  const crews = site.pois.filter((p) => p.kind === "contractor");
  const yards = site.pois.filter((p) => p.kind === "supplier");
  const desks = site.pois.filter((p) => p.kind === "insurance");
  const step = stepIndex(phase);
  const lane = laneById(verticalId);
  const forecast = forecastOf(site);
  const hitLots = site.buildings.filter((b) => b.enterable && b.hit >= 2).length;

  return (
    <aside className="pointer-events-auto absolute top-36 bottom-24 left-3 z-20 hidden w-[min(100%-1.5rem,18.5rem)] flex-col overflow-hidden rounded-lg bg-surface/92 shadow-border backdrop-blur-sm lg:flex">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">{site.place.city || "City"} · operating plane</p>
        <p className="font-display mt-1 text-lg text-fg">One rail. Every industry.</p>
        <p className="mt-1 text-xs leading-relaxed text-subtle">
          Contracting is the proof. The same gate runs the rest. Kill stops all of it.
        </p>
        <p className="mt-2 font-mono text-[10px] tracking-wide text-subtle uppercase">
          MAS {swarm.killed ? "killed" : "governs"} · {swarm.log.length} events · {hitLots} hard-hit lots
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <SpineBody />

        <p className="mt-5 text-xs tracking-[0.16em] text-muted uppercase">Senses</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {SENSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setVertical(s.id)}
              className={cn(
                "min-h-9 rounded-md px-2 font-mono text-[10px] tracking-wide uppercase",
                verticalId === s.id ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:text-fg",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs tracking-[0.16em] text-muted uppercase">Verticals</p>
        <ul className="mt-2 space-y-1">
          {VERTICALS.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setVertical(v.id)}
                className={cn(
                  "flex min-h-11 w-full items-baseline justify-between gap-2 rounded-md px-2 py-2 text-left",
                  verticalId === v.id ? "bg-bg" : "hover:bg-bg/60",
                )}
              >
                <span className="text-sm text-fg">{v.name}</span>
                <span className="font-mono text-[10px] tracking-wide text-subtle uppercase">{v.live ? "live" : "same gate"}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs tracking-[0.16em] text-muted uppercase">
            {lane.kind} · {lane.live ? "running here" : "synthetic event · real rail"}
          </p>
          <p className="mt-1 text-sm text-fg">{lane.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{lane.line}</p>
          <dl className="mt-3 space-y-1.5 text-xs">
            <div>
              <dt className="text-subtle">In</dt>
              <dd className="text-fg">{lane.input}</dd>
            </div>
            <div>
              <dt className="text-subtle">AI drafts</dt>
              <dd className="text-fg">{lane.drafts}</dd>
            </div>
            <div>
              <dt className="text-subtle">Gate</dt>
              <dd className="text-fg">{lane.gate}</dd>
            </div>
            <div>
              <dt className="text-subtle">Spine</dt>
              <dd className="font-mono text-muted">{lane.source}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-5 text-xs tracking-[0.16em] text-muted uppercase">This city</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li className="flex justify-between gap-2">
            <span className="text-fg">Clients · lots</span>
            <span className="font-mono text-xs tabular-nums text-muted">{site.buildings.filter((b) => b.enterable).length}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="text-fg">Supply · yards</span>
            <span className="font-mono text-xs tabular-nums text-muted">{yards.length}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="text-fg">Contracting · crews</span>
            <span className="font-mono text-xs tabular-nums text-muted">{crews.length}</span>
          </li>
          {desks[0] ? (
            <li className="flex justify-between gap-2">
              <span className="text-fg">Insurance</span>
              <span className="truncate font-mono text-xs text-muted">{desks[0].name}</span>
            </li>
          ) : null}
        </ul>

        <p className="mt-5 text-xs tracking-[0.16em] text-muted uppercase">Predicted next</p>
        <ul className="mt-2 space-y-2">
          {forecast.map((row) => (
            <li key={row.horizon + row.label}>
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-fg">{row.label}</span>
                <span className="font-mono text-xs tabular-nums text-muted">
                  {row.horizon} · {row.value}
                </span>
              </p>
              <p className="text-xs leading-relaxed text-subtle">{row.note}</p>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs tracking-[0.16em] text-muted uppercase">Vertical claim</p>
        <ol className="mt-2 space-y-1">
          {FLOW.filter((s) => s.label !== "Map").map((s, i) => {
            const n = i + 1;
            const active = stepIndex(phase) === FLOW.findIndex((f) => f.label === s.label);
            const done = step > FLOW.findIndex((f) => f.label === s.label);
            return (
              <li
                key={s.label}
                className={cn(
                  "flex items-center gap-2 font-mono text-xs tracking-wide",
                  active ? "text-fg" : done ? "text-muted" : "text-subtle",
                )}
              >
                <span className="tabular-nums">{String(n).padStart(2, "0")}</span>
                {s.label}
                {active ? <span className="text-subtle">now</span> : null}
              </li>
            );
          })}
        </ol>
        {selected ? (
          <p className="mt-4 text-sm leading-snug text-fg">
            {selected.houseNumber} {selected.street || site.place.street}
            <span className="mt-0.5 block text-xs text-subtle">Selected lot · open it to drop into the house.</span>
          </p>
        ) : (
          <p className="mt-4 text-xs text-subtle">Tap a residential block in the skyview.</p>
        )}
      </div>
    </aside>
  );
}

import { Home } from "lucide-react";
import { OutLinks } from "@/components/ops/OutLinks";
import { Button } from "@/components/ui/button";
import { HAIL_DURATION } from "@/lib/geo/hail";
import { buildLinks } from "@/lib/geo/links";
import { useLot } from "@/lib/house/store";

export function SelectPanel() {
  const site = useLot((s) => s.site);
  const selectedId = useLot((s) => s.selectedId);
  const pickBuilding = useLot((s) => s.pickBuilding);
  const enterLot = useLot((s) => s.enterLot);
  const hailT = useLot((s) => s.hailT);
  const stormName = useLot((s) => s.stormName);
  const resetLot = useLot((s) => s.resetLot);

  if (!site) return null;
  const walking = hailT < HAIL_DURATION;
  const raw = (site.buildings.filter((b) => b.hit > 0 && b.enterable).length > 0
    ? site.buildings.filter((b) => b.hit > 0 && b.enterable)
    : site.buildings.filter((b) => b.enterable));
  const seen = new Set<string>();
  const hit = raw
    .filter((b) => {
      const k = b.houseNumber ? `${b.houseNumber}|${b.street}` : b.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => {
      if (a.id === selectedId) return -1;
      if (b.id === selectedId) return 1;
      if (a.houseNumber === site.place.number) return -1;
      if (b.houseNumber === site.place.number) return 1;
      return (b.hit || 0) - (a.hit || 0);
    });
  const selected = site.buildings.find((b) => b.id === selectedId);
  const canWalk = Boolean(selected?.enterable);
  const links = buildLinks(site.place, selected, site.zone);

  return (
    <aside className="sheet-in pointer-events-auto absolute inset-x-0 bottom-[4.75rem] z-20 mx-auto flex max-h-[44dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl bg-surface shadow-border">
      <div className="flex justify-center pt-2">
        <span className="h-1 w-10 rounded-full bg-border" />
      </div>
      <div className="px-5 pt-3 pb-3">
        <p className="text-sm text-muted">{stormName || "Hail cell"}</p>
        <p className="font-display mt-1 text-xl tracking-tight text-fg">{site.place.city || site.place.displayName}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          {walking ? "Hail walking the block." : `${hit.length} lots in the swath.`} Color is exposure, not proven damage.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        <ul className="space-y-1">
          {hit.slice(0, 14).map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => pickBuilding(b.id)}
                  className="flex min-h-12 w-full items-baseline justify-between gap-2 rounded-md px-2 py-2 text-left hover:bg-bg"
                >
                  <span className="text-base text-fg">
                    {b.houseNumber || "—"} {b.street || site.place.street}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-muted">
                    {b.hit > 0 ? `E${b.hit}` : b.source === "osm" ? "OSM" : b.source === "usa" ? "USA" : b.source === "microsoft" ? "MS" : "est"}
                  </span>
                </button>
              </li>
            ))}
        </ul>
        <div className="mt-4 border-t border-border pt-3">
          <OutLinks links={links} groups={["lot"]} />
        </div>
      </div>
      <div className="space-y-2 border-t border-border p-3">
        <Button className="w-full" disabled={!canWalk} onClick={enterLot}>
          <Home className="size-4" />
          Open this house
        </Button>
        <Button variant="ghost" className="w-full" onClick={resetLot}>
          Start over
        </Button>
      </div>
    </aside>
  );
}

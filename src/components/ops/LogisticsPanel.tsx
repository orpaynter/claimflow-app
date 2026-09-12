import { ExternalLink, Wrench } from "lucide-react";
import { OutLinks } from "@/components/ops/OutLinks";
import { Button } from "@/components/ui/button";
import { buildLinks, mapsDir } from "@/lib/geo/links";
import type { Poi } from "@/lib/geo/types";
import { useLot } from "@/lib/house/store";

function sourceLabel(p: Poi): string {
  if (p.source === "google") return "Google Places";
  if (p.source === "osm") return p.kind === "supplier" ? "Mapped yard" : "Mapped";
  return "Estimated — none mapped nearby";
}

function PoiRow({ p }: { p: Poi }) {
  const href = p.url || mapsDir(p.lat, p.lon);
  return (
    <li className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <p className="flex items-center justify-between gap-2 text-sm text-fg">
          <span>{p.name}</span>
          <ExternalLink className="size-3.5 shrink-0 text-subtle opacity-70 group-hover:opacity-100" aria-hidden />
        </p>
        <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
          {p.minutes} min · {p.areaCode}
          {p.crew ? ` · ${p.crew}` : ""}
          {p.kind === "supplier" ? ` · ${(p.stock || []).slice(0, 3).join(" · ") || "Stock unknown"}` : ""}
        </p>
        {p.phone ? <p className="mt-0.5 text-xs text-muted">{p.phone}</p> : null}
        <p className="text-xs text-subtle">{sourceLabel(p)}</p>
      </a>
    </li>
  );
}

export function LogisticsPanel() {
  const site = useLot((s) => s.site);
  const confirmDispatch = useLot((s) => s.confirmDispatch);

  if (!site) return null;
  const crews = site.pois.filter((p) => p.kind === "contractor");
  const yards = site.pois.filter((p) => p.kind === "supplier");
  const desks = site.pois.filter((p) => p.kind === "insurance");
  const building = site.buildings.find((b) => b.id === site.matchedId);
  const links = buildLinks(site.place, building, site.zone);

  return (
    <aside className="pointer-events-auto absolute top-36 right-3 bottom-24 z-20 flex w-[min(100%-1.5rem,20rem)] flex-col overflow-hidden rounded-lg bg-surface/92 shadow-border backdrop-blur-sm sm:right-5">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Territory {site.zone.areaCode} · gateway</p>
        <p className="font-display mt-1 text-lg text-fg">Crews and yards</p>
        <p className="text-xs text-subtle">
          Default-deny. Same area number on the work order. Approve crews to move.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="mt-1 text-xs tracking-[0.16em] text-muted uppercase">Contractors</p>
        <ul className="mt-2 space-y-3">
          {crews.map((c) => (
            <PoiRow key={c.id} p={c} />
          ))}
        </ul>
        <p className="mt-5 text-xs tracking-[0.16em] text-muted uppercase">Suppliers</p>
        <ul className="mt-2 space-y-3">
          {yards.map((y) => (
            <PoiRow key={y.id} p={y} />
          ))}
        </ul>
        {desks.length > 0 ? (
          <>
            <p className="mt-5 text-xs tracking-[0.16em] text-muted uppercase">Insurance desks</p>
            <ul className="mt-2 space-y-3">
              {desks.map((d) => (
                <PoiRow key={d.id} p={d} />
              ))}
            </ul>
          </>
        ) : null}
        <div className="mt-5 border-t border-border pt-4">
          <OutLinks links={links} groups={["ops"]} />
        </div>
      </div>
      <div className="border-t border-border p-3">
        <Button
          className="w-full"
          onClick={() => {
            void confirmDispatch();
          }}
        >
          <Wrench className="size-4" />
          Approve crews
        </Button>
      </div>
    </aside>
  );
}

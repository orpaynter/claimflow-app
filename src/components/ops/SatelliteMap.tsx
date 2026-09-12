import { Fragment, useEffect, useMemo, useState } from "react";
import { divIcon } from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useLot } from "@/lib/house/store";
import type { Building, StormCell } from "@/lib/geo/types";
import { HAIL_CORE, HAIL_SEVERE, corridorPolygon, toLatLngs } from "@/lib/geo/hail";

const CONUS: [number, number] = [39.5, -98.35];

const FILL = {
  idle: { color: "#8b95a3", weight: 1.6, opacity: 0.9, fillColor: "#8b95a3", fillOpacity: 0.08 },
  hit1: { color: "#5b8fbf", weight: 2, opacity: 1, fillColor: "#5b8fbf", fillOpacity: 0.38 },
  hit2: { color: "#c4a35a", weight: 2.2, opacity: 1, fillColor: "#c4a35a", fillOpacity: 0.46 },
  hit3: { color: "#c56a32", weight: 2.5, opacity: 1, fillColor: "#c56a32", fillOpacity: 0.52 },
  selected: { color: "#e8edf2", weight: 3.2, opacity: 1, fillColor: "#e8edf2", fillOpacity: 0.12 },
  road: { color: "#8b95a3", weight: 1.4, opacity: 0.4 },
  roadNamed: { color: "#e8edf2", weight: 1.8, opacity: 0.65 },
  swath: { color: "#c56a32", weight: 1.1, opacity: 0.9, fillColor: "#c56a32", fillOpacity: 0.14 },
  wake: { color: "#c56a32", weight: 0, opacity: 0, fillColor: "#b85c4a", fillOpacity: 0.22 },
  fringe: { color: "#c4a35a", weight: 1.2, opacity: 0.85, fillColor: "#c4a35a", fillOpacity: 0.12 },
  severe: { color: "#c56a32", weight: 1.4, opacity: 0.95, fillColor: "#c56a32", fillOpacity: 0.22 },
  core: { color: "#e8edf2", weight: 2.2, opacity: 1, fillColor: "#e8edf2", fillOpacity: 0.28 },
  track: { color: "#e8edf2", weight: 1.6, opacity: 0.95, dashArray: "5 7" },
  stormOuter: { color: "#c56a32", weight: 1.8, opacity: 1, fillColor: "#c56a32", fillOpacity: 0.24 },
  stormMid: { color: "#c56a32", weight: 1.2, opacity: 0.9, fillColor: "#c56a32", fillOpacity: 0.36 },
  stormCore: { color: "#e8edf2", weight: 2, opacity: 1, fillColor: "#e8edf2", fillOpacity: 0.65 },
  watchOuter: { color: "#5b8fbf", weight: 1.5, opacity: 0.95, fillColor: "#5b8fbf", fillOpacity: 0.18 },
  watchCore: { color: "#5b8fbf", weight: 1.4, opacity: 0.9, fillColor: "#8b95a3", fillOpacity: 0.3 },
};

function styleFor(b: Building, selected: boolean) {
  if (selected) return FILL.selected;
  if (b.hit >= 3) return FILL.hit3;
  if (b.hit === 2) return FILL.hit2;
  if (b.hit === 1) return FILL.hit1;
  return FILL.idle;
}

function esc(s: string): string {
  return s.replace(/[<>]/g, "").slice(0, 48);
}

function streetIcon(name: string) {
  return divIcon({
    className: "street-div",
    html: `<span>${esc(name)}</span>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
}

function lotClass(b: Building, selected: boolean): string {
  if (selected) return "lot-chip sel";
  if (b.hit >= 3) return "lot-chip e3";
  if (b.hit === 2) return "lot-chip e2";
  if (b.hit === 1) return "lot-chip e1";
  return "lot-chip";
}

function FlyTo({ lat, lon, zoom }: { lat: number; lon: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], zoom, { duration: 1.35 });
  }, [map, lat, lon, zoom]);
  return null;
}

function Invalidate() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

function useMapZoom(): number {
  const map = useMap();
  const [z, setZ] = useState(map.getZoom());
  useEffect(() => {
    const on = () => setZ(map.getZoom());
    map.on("zoomend", on);
    return () => {
      map.off("zoomend", on);
    };
  }, [map]);
  return z;
}

function StormCells({
  storms,
  openStorm,
}: {
  storms: StormCell[];
  openStorm: (c: StormCell) => void;
}) {
  const z = useMapZoom();
  const labeled = z >= 6;
  return (
    <>
      {storms.map((c) => {
        const watch = c.severity === "watch";
        const r = c.radiusKm * 1000;
        return (
          <Fragment key={c.id}>
            <Circle
              center={[c.lat, c.lon]}
              radius={r}
              pathOptions={watch ? FILL.watchOuter : FILL.stormOuter}
              eventHandlers={{
                click: () => {
                  void openStorm(c);
                },
              }}
            >
              <Tooltip permanent={labeled} direction="center" className="storm-chip" opacity={1}>
                <span>
                  {c.name}
                  {c.severity === "severe" ? " · severe" : watch ? " · watch" : ""}
                </span>
              </Tooltip>
            </Circle>
            <Circle
              center={[c.lat, c.lon]}
              radius={r * 0.55}
              pathOptions={watch ? FILL.watchCore : FILL.stormMid}
              interactive={false}
            />
            <Circle
              center={[c.lat, c.lon]}
              radius={r * 0.2}
              pathOptions={{ ...(watch ? FILL.watchCore : FILL.stormCore), className: watch ? "" : "hail-core" }}
              interactive={false}
            />
          </Fragment>
        );
      })}
    </>
  );
}

function HailSwath({
  siteHail,
  hailCenter,
}: {
  siteHail: { start: { lat: number; lon: number }; end: { lat: number; lon: number }; radiusM: number };
  hailCenter: { lat: number; lon: number };
}) {
  const swath = useMemo(() => toLatLngs(corridorPolygon(siteHail, siteHail.radiusM)), [siteHail]);
  const wake = useMemo(
    () => toLatLngs(corridorPolygon({ start: siteHail.start, end: hailCenter }, siteHail.radiusM)),
    [siteHail, hailCenter],
  );
  const r = siteHail.radiusM;
  return (
    <>
      <Polygon positions={swath} pathOptions={FILL.swath} interactive={false} />
      <Polygon positions={wake} pathOptions={FILL.wake} interactive={false} />
      <Polyline
        positions={[
          [siteHail.start.lat, siteHail.start.lon],
          [siteHail.end.lat, siteHail.end.lon],
        ]}
        pathOptions={FILL.track}
        interactive={false}
      />
      <Circle center={[hailCenter.lat, hailCenter.lon]} radius={r} pathOptions={FILL.fringe} interactive={false} />
      <Circle
        center={[hailCenter.lat, hailCenter.lon]}
        radius={r * HAIL_SEVERE}
        pathOptions={FILL.severe}
        interactive={false}
      />
      <Circle
        center={[hailCenter.lat, hailCenter.lon]}
        radius={r * HAIL_CORE}
        pathOptions={{ ...FILL.core, className: "hail-core" }}
        interactive={false}
      />
      <CircleMarker
        center={[hailCenter.lat, hailCenter.lon]}
        radius={4}
        pathOptions={{ color: "#121410", weight: 1, fillColor: "#f7f4ec", fillOpacity: 1 }}
        interactive={false}
      />
    </>
  );
}

function MapKey({ mode }: { mode: "orbit" | "select" }) {
  return (
    <div className="pointer-events-none absolute bottom-8 left-3 z-[500] max-w-[14rem] rounded-lg bg-surface/88 px-3 py-2.5 shadow-border backdrop-blur-sm sm:bottom-10 sm:left-4">
      <p className="text-[10px] tracking-[0.16em] text-muted uppercase">
        {mode === "orbit" ? "Live cells" : "Hail swath"}
      </p>
      <ul className="mt-2 space-y-1.5 text-xs text-fg">
        {mode === "orbit" ? (
          <>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-fg" />
              Core
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-danger" />
              Warning
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-muted" />
              Watch
            </li>
          </>
        ) : (
          <>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-fg" />
              Core · remote review
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-accent" />
              Severe · evidence needed
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#5b8fbf]" />
              Fringe · exposure identified
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-[2px] border-2 border-fg" />
              Selected lot
            </li>
          </>
        )}
      </ul>
      <p className="mt-2 text-[11px] leading-snug text-subtle">
        {mode === "orbit" ? "Tap a cell to open its territory." : "Fill is exposure confidence, not a damage determination."}
      </p>
    </div>
  );
}

export default function SatelliteMap() {
  const phase = useLot((s) => s.phase);
  const site = useLot((s) => s.site);
  const storms = useLot((s) => s.storms);
  const selectedId = useLot((s) => s.selectedId);
  const hailCenter = useLot((s) => s.hailCenter);
  const pickBuilding = useLot((s) => s.pickBuilding);
  const openStorm = useLot((s) => s.openStorm);
  const spec = useLot((s) => s.spec);
  const region = useLot((s) => s.region);

  const selected = site?.buildings.find((b) => b.id === selectedId);
  const focus = selected?.centroid ?? (site ? site.place : region ? { lat: region.lat, lon: region.lon } : null);
  const zoom = phase === "select" ? 18 : phase === "dispatch" ? 13.4 : phase === "track" ? 12 : region ? region.zoom : 3;

  const hailOn = phase === "select" && Boolean(hailCenter);
  const roads = useMemo(() => site?.roads ?? [], [site]);
  const buildings = site?.buildings ?? [];
  const namedRoads = useMemo(
    () =>
      roads
        .filter((r) => r.name.trim().length > 2 && r.path.length >= 2)
        .slice(0, 12),
    [roads],
  );

  return (
    <div className="absolute inset-0 z-0 h-full w-full">
      <MapContainer
        center={focus ? [focus.lat, focus.lon] : CONUS}
        zoom={site ? zoom : region ? region.zoom : 3}
        className="absolute inset-0 h-full w-full bg-bg"
        zoomControl={false}
        attributionControl
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri — Esri, Maxar · OSM · USA Structures · Microsoft footprints"
          maxZoom={19}
        />
        <Invalidate />
        <ZoomControl position="bottomright" />
        {site && phase !== "orbit" && focus ? <FlyTo lat={focus.lat} lon={focus.lon} zoom={zoom} /> : null}
        {!site && region && phase === "orbit" ? <FlyTo lat={region.lat} lon={region.lon} zoom={region.zoom} /> : null}

        {phase === "orbit" ? <StormCells storms={storms} openStorm={openStorm} /> : null}

        {hailOn && hailCenter && site ? <HailSwath siteHail={site.hail} hailCenter={hailCenter} /> : null}

        {roads.map((r) => (
          <Polyline
            key={r.id}
            positions={r.path.map((p) => [p.lat, p.lon] as [number, number])}
            pathOptions={r.name ? FILL.roadNamed : FILL.road}
            interactive={false}
          >
            {r.name ? (
              <Tooltip sticky className="street-chip">
                {r.name}
              </Tooltip>
            ) : null}
          </Polyline>
        ))}

        {namedRoads.map((r) => {
          const mid = r.path[Math.floor(r.path.length / 2)];
          if (!mid) return null;
          return (
            <Marker
              key={`lbl-${r.id}`}
              position={[mid.lat, mid.lon]}
              icon={streetIcon(r.name)}
              interactive={false}
              keyboard={false}
            />
          );
        })}

        {buildings.map((b) => {
          const on = b.id === selectedId;
          const label = [b.houseNumber, b.street].filter(Boolean).join(" ");
          const showChip = on || Boolean(b.houseNumber && b.hit > 0);
          return (
            <Polygon
              key={b.id}
              positions={b.ring.map((p) => [p.lat, p.lon] as [number, number])}
              pathOptions={styleFor(b, on)}
              eventHandlers={{
                click: () => pickBuilding(b.id),
              }}
            >
              {showChip ? (
                <Tooltip permanent={on || b.hit > 0} direction="center" className={lotClass(b, on)} opacity={1}>
                  {label || "Selected lot"}
                  {b.hit > 0 ? ` · E${b.hit}` : ""}
                </Tooltip>
              ) : null}
            </Polygon>
          );
        })}

        {phase === "dispatch" && site
          ? site.pois.map((p) => (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lon]}
                radius={7}
                pathOptions={{
                  color: "#121410",
                  weight: 1,
                  fillColor: p.kind === "supplier" ? "#6a8f7a" : p.kind === "contractor" ? "#d7ddd4" : "#9a9588",
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip direction="top" className="lot-chip">
                  {p.name} · {p.minutes} min
                </Tooltip>
              </CircleMarker>
            ))
          : null}

        {spec?.lat != null && spec.lon != null && (phase === "measure" || phase === "dispatch") ? (
          <CircleMarker
            center={[spec.lat, spec.lon]}
            radius={6}
            pathOptions={{ color: "#121410", fillColor: "#f7f4ec", fillOpacity: 1, weight: 1.4 }}
          />
        ) : null}
      </MapContainer>
      {phase === "orbit" || phase === "select" ? (
        <MapKey mode={phase === "orbit" ? "orbit" : "select"} />
      ) : null}
    </div>
  );
}

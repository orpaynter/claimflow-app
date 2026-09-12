import type { Site } from "@/lib/geo/types";
import type { HouseSpec } from "@/lib/house/types";
import type { TraeSignal } from "./score";

/** Build TRAE signals from the live lot. Property/internal only — no invented licenses. */
export function signalsOf(spec: HouseSpec, site: Site | null): TraeSignal[] {
  const out: TraeSignal[] = [
    {
      id: "sig-address",
      source: "intake-geocoder",
      source_category: "property",
      signal_type: "observed",
      confidence: 0.9,
      title: "Typed address",
      detail: spec.address,
      metadata: {},
    },
    {
      id: "sig-outline",
      source: spec.source || "estimated",
      source_category: "internal",
      signal_type: spec.source && spec.source !== "estimated" ? "observed" : "hypothesis",
      confidence: spec.source === "usa" || spec.source === "microsoft" ? 0.72 : spec.source === "osm" ? 0.58 : 0.32,
      title: "Building outline",
      detail: `${spec.source || "estimated"} · ${spec.footprintSqft ?? "—"} ft²`,
      metadata: { estimated_footprint: spec.source === "estimated" },
    },
    {
      id: "sig-exposure",
      source: "storm-intel",
      source_category: "property",
      signal_type: "hypothesis",
      confidence: 0.45,
      title: "Modeled hail exposure",
      detail: "Exposure identified. Not a damage determination.",
      metadata: { modeled_only: true },
    },
  ];

  const crew = site?.pois.find((p) => p.kind === "contractor");
  if (crew) {
    out.push({
      id: "sig-crew",
      source: crew.source,
      source_category: "internal",
      signal_type: crew.source === "osm" ? "inferred" : "hypothesis",
      confidence: crew.source === "osm" ? 0.55 : 0.28,
      title: "Nearest crew",
      detail: `${crew.name} · ${crew.minutes} min`,
      metadata: {},
    });
  }

  return out;
}

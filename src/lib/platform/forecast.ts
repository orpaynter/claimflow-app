import type { Site } from "@/lib/geo/types";

export interface ForecastRow {
  horizon: "24h" | "72h";
  label: string;
  value: string;
  note: string;
}

export function forecastOf(site: Site | null): ForecastRow[] {
  if (!site) {
    return [
      { horizon: "24h", label: "City", value: "—", note: "Find a house to load the plane." },
    ];
  }
  const lots = site.buildings.filter((b) => b.enterable);
  const hit = lots.filter((b) => b.hit >= 2).length;
  const fringe = lots.filter((b) => b.hit === 1).length;
  const yards = site.pois.filter((p) => p.kind === "supplier").length;
  const crews = site.pois.filter((p) => p.kind === "contractor").length;
  const claims = Math.max(1, hit + Math.round(fringe * 0.35));
  const clinical = Math.max(0, Math.round(hit * 0.12));
  const grid = hit >= 4 ? "elevated" : hit >= 1 ? "watch" : "normal";
  return [
    {
      horizon: "24h",
      label: "Claims load",
      value: `${claims} files`,
      note: "Modeled from hail-hit lots. Not a carrier forecast.",
    },
    {
      horizon: "24h",
      label: "Crew / yard",
      value: `${crews} crews · ${yards} yards`,
      note: "Capacity on this plane. Dispatch still gated.",
    },
    {
      horizon: "72h",
      label: "Grid window",
      value: grid,
      note: "Weather-tied load. Operator approves any action.",
    },
    {
      horizon: "72h",
      label: "Clinical surge",
      value: clinical === 0 ? "none flagged" : `${clinical} auths`,
      note: "Same cell, different vertical. Physician gate.",
    },
  ];
}

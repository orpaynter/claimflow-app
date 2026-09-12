import { createServerFn } from "@tanstack/react-start";

export interface KeyedSource {
  env: string;
  label: string;
  present: boolean;
  where: "server" | "public";
  injected?: boolean;
}

export interface SourceBoard {
  live: { id: string; label: string }[];
  keys: KeyedSource[];
}

function has(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

export const sourceBoard = createServerFn({ method: "GET" }).handler(async (): Promise<SourceBoard> => {
  return {
    live: [
      { id: "osm", label: "OpenStreetMap footprints" },
      { id: "usa", label: "USA Structures (HIFLD)" },
      { id: "ms", label: "Microsoft Building Footprints" },
      { id: "nominatim", label: "Nominatim geocode" },
      { id: "census", label: "US Census geocoder" },
      { id: "esri-geo", label: "Esri World Geocode" },
      { id: "nws", label: "NWS warnings & forecast" },
      { id: "iem", label: "IEM local storm reports" },
      { id: "esri", label: "Esri / Maxar imagery" },
    ],
    keys: [
      {
        env: "XAI_API_KEY",
        label: "Grok steward (Hale)",
        present: has("XAI_API_KEY"),
        where: "server",
        injected: true,
      },
      {
        env: "ATTOM_API_KEY",
        label: "ATTOM property / assessor",
        present: has("ATTOM_API_KEY"),
        where: "server",
      },
      {
        env: "GOOGLE_MAPS_API_KEY",
        label: "Google Places crews & yards",
        present: has("GOOGLE_MAPS_API_KEY"),
        where: "server",
      },
      {
        env: "MAPBOX_ACCESS_TOKEN",
        label: "Mapbox satellite tiles",
        present: has("MAPBOX_ACCESS_TOKEN") || has("VITE_MAPBOX_TOKEN"),
        where: "public",
      },
    ],
  };
});

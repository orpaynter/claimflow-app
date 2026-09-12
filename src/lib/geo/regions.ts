export interface WorldRegion {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zoom: number;
  live: boolean;
  line: string;
}

/** Globe picks. Live = NWS / US footprints in this session. */
export const REGIONS: WorldRegion[] = [
  {
    id: "new-england",
    name: "New England",
    lat: 41.7,
    lon: -70.5,
    zoom: 8,
    live: true,
    line: "Cape and the South Shore. Live cells and footprints.",
  },
  {
    id: "conus",
    name: "United States",
    lat: 39.5,
    lon: -98.35,
    zoom: 4,
    live: true,
    line: "CONUS storm command. NWS alerts. Any U.S. address.",
  },
  {
    id: "texas",
    name: "Texas",
    lat: 31.2,
    lon: -99.2,
    zoom: 6,
    live: true,
    line: "Hail country. Live cells when the desk is posting.",
  },
  {
    id: "florida",
    name: "Florida",
    lat: 27.8,
    lon: -81.7,
    zoom: 7,
    live: true,
    line: "Convective season. Same rail as a Cape roof.",
  },
  {
    id: "midwest",
    name: "Midwest",
    lat: 41.2,
    lon: -89.4,
    zoom: 6,
    live: true,
    line: "Severe belt. Exposure first, finding second.",
  },
  {
    id: "europe",
    name: "Europe",
    lat: 48.5,
    lon: 10.0,
    zoom: 5,
    live: false,
    line: "Same gate. Weather feed in this session is U.S. NWS.",
  },
  {
    id: "pacific",
    name: "Pacific",
    lat: 21.3,
    lon: -157.8,
    zoom: 6,
    live: false,
    line: "Portable rail. Local senses plug in per enterprise.",
  },
];

export function regionById(id: string): WorldRegion {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[1]!;
}

export const WORLD_INDUSTRIES = [
  { id: "healthcare", name: "Hospitals" },
  { id: "insurance", name: "Insurance" },
  { id: "finance", name: "Finance" },
  { id: "justice", name: "Criminal justice" },
  { id: "legal", name: "Law firms" },
  { id: "education", name: "Schools" },
  { id: "houses", name: "Homes" },
  { id: "government", name: "Government" },
  { id: "grid", name: "Power grid" },
  { id: "contracting", name: "Contracting" },
] as const;

export function latLonToVec(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

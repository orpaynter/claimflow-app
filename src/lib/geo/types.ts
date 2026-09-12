export interface LatLng {
  lat: number;
  lon: number;
}

export interface Place {
  query: string;
  displayName: string;
  lat: number;
  lon: number;
  number: string;
  street: string;
  city: string;
  county: string;
  state: string;
  stateCode: string;
  postcode: string;
  country: string;
  osmId: string;
}

export type OutlineSource = "osm" | "estimated" | "microsoft" | "usa";

export interface Building {
  id: string;
  osmId: string;
  ring: LatLng[];
  centroid: LatLng;
  widthM: number;
  depthM: number;
  areaM2: number;
  levels: number;
  use: string;
  houseNumber: string;
  street: string;
  year: string;
  material: string;
  roofShape: string;
  hit: 0 | 1 | 2 | 3;
  source: OutlineSource;
  enterable: boolean;
}

export interface Road {
  id: string;
  path: LatLng[];
  name: string;
  kind: string;
}

export interface StormCell {
  id: string;
  name: string;
  event: string;
  headline: string;
  lat: number;
  lon: number;
  radiusKm: number;
  severity: "severe" | "moderate" | "watch";
  source: "nws" | "local" | "lsr";
  expires?: string;
}

export interface Poi {
  id: string;
  kind: "supplier" | "contractor" | "insurance";
  name: string;
  lat: number;
  lon: number;
  meters: number;
  minutes: number;
  source: "osm" | "estimated" | "google";
  stock: string[];
  crew: string;
  areaCode: string;
  url: string;
  phone: string;
}

export interface Zone {
  office: string;
  county: string;
  gridId: string;
  gridX: number;
  gridY: number;
  areaCode: string;
  forecast: string;
  tempF: number;
  windMph: number;
}

export interface PropertyRecord {
  apn: string;
  owner: string;
  yearBuilt: string;
  assessed: number;
  className: string;
  source: "attom" | "usa-structures";
  sqft?: number;
  heightM?: number;
}

export interface InsuranceSketch {
  form: string;
  dwelling: number;
  otherStructures: number;
  deductible: number;
  deductiblePct: number;
  carrierTerritory: string;
  roofSquares: number;
  note: string;
}

export interface HailPath {
  start: LatLng;
  end: LatLng;
  radiusM: number;
}

export interface Site {
  place: Place;
  buildings: Building[];
  roads: Road[];
  storms: StormCell[];
  pois: Poi[];
  zone: Zone;
  hail: HailPath;
  matchedId: string;
  insurance: InsuranceSketch;
  property: PropertyRecord | null;
}

export type ResolveOk = { ok: true; site: Site };
export type ResolveErr = { ok: false; error: string };
export type ResolveResult = ResolveOk | ResolveErr;

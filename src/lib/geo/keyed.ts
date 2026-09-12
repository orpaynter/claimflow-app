import { driveMinutes, haversineM } from "./project";
import type { Place, Poi, PropertyRecord, Zone } from "./types";

function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

interface GPlace {
  name?: string;
  place_id?: string;
  vicinity?: string;
  geometry?: { location?: { lat: number; lng: number } };
}

async function nearby(place: Place, keyword: string, kind: Poi["kind"], zone: Zone): Promise<Poi[]> {
  const key = env("GOOGLE_MAPS_API_KEY");
  if (!key) return [];
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${place.lat},${place.lon}&radius=14000&keyword=${encodeURIComponent(keyword)}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return [];
  const body = (await res.json()) as { results?: GPlace[] };
  const out: Poi[] = [];
  for (const r of body.results ?? []) {
    const lat = r.geometry?.location?.lat;
    const lng = r.geometry?.location?.lng;
    if (!lat || !lng || !r.name) continue;
    const meters = Math.round(haversineM(place, { lat, lon: lng }));
    out.push({
      id: `g-${r.place_id || r.name}`,
      kind,
      name: r.name,
      lat,
      lon: lng,
      meters,
      minutes: driveMinutes(meters),
      source: "google",
      stock: kind === "supplier" ? ["Call for stock"] : [],
      crew: kind === "contractor" ? "Mapped crew" : "",
      areaCode: zone.areaCode,
      url: r.place_id ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}` : `https://www.google.com/maps?q=${lat},${lng}`,
      phone: "",
    });
    if (out.length >= 4) break;
  }
  return out;
}

export async function googlePlaces(place: Place, zone: Zone): Promise<Poi[]> {
  if (!env("GOOGLE_MAPS_API_KEY")) return [];
  const [roof, lumber, ins] = await Promise.all([
    nearby(place, "roofing contractor", "contractor", zone),
    nearby(place, "lumber building supply", "supplier", zone),
    nearby(place, "insurance agency", "insurance", zone),
  ]);
  return [...roof, ...lumber, ...ins];
}

interface AttomBody {
  property?: {
    identifier?: { apn?: string };
    address?: { oneLine?: string };
    summary?: { yearbuilt?: number; propclass?: string };
    assessment?: { assessval?: number };
    owner?: { owner1?: { fullName?: string } };
  }[];
}

export async function attomProperty(place: Place): Promise<PropertyRecord | null> {
  const key = env("ATTOM_API_KEY");
  if (!key) return null;
  const addr = [place.number, place.street].filter(Boolean).join(" ");
  if (!addr) return null;
  const params = new URLSearchParams({
    address1: addr,
    address2: [place.city, place.stateCode || place.state, place.postcode].filter(Boolean).join(" "),
  });
  const res = await fetch(
    `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile?${params}`,
    {
      headers: { apikey: key, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as AttomBody;
  const p = body.property?.[0];
  if (!p) return null;
  return {
    apn: p.identifier?.apn || "",
    owner: p.owner?.owner1?.fullName || "",
    yearBuilt: p.summary?.yearbuilt ? String(p.summary.yearbuilt) : "",
    assessed: typeof p.assessment?.assessval === "number" ? p.assessment.assessval : 0,
    className: p.summary?.propclass || "",
    source: "attom",
  };
}

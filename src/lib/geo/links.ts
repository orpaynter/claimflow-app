import type { Building, Place, Zone } from "./types";

export interface OutLink {
  id: string;
  label: string;
  href: string;
  group: "lot" | "weather" | "records" | "ops";
}

function q(s: string): string {
  return encodeURIComponent(s);
}

export function lotQuery(place: Place): string {
  return [place.number, place.street, place.city, place.stateCode || place.state, place.postcode]
    .filter(Boolean)
    .join(" ");
}

export function buildLinks(place: Place, building?: Building | null, zone?: Zone | null): OutLink[] {
  const lat = building?.centroid.lat ?? place.lat;
  const lon = building?.centroid.lon ?? place.lon;
  const addr = lotQuery(place);
  const osmId = building?.osmId || place.osmId;
  const near = [place.city, place.stateCode || place.state].filter(Boolean).join(" ");

  const links: OutLink[] = [
    {
      id: "gmaps",
      label: "Google Maps",
      href: `https://www.google.com/maps?q=${lat},${lon}`,
      group: "lot",
    },
    {
      id: "street",
      label: "Street View",
      href: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`,
      group: "lot",
    },
    {
      id: "osm",
      label: osmId ? "OpenStreetMap way" : "OpenStreetMap pin",
      href: osmId
        ? `https://www.openstreetmap.org/way/${osmId}`
        : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=19/${lat}/${lon}`,
      group: "lot",
    },
    {
      id: "nws",
      label: "NWS forecast",
      href: `https://forecast.weather.gov/MapClick.php?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
      group: "weather",
    },
    {
      id: "alerts",
      label: "NWS alerts",
      href: `https://alerts.weather.gov/`,
      group: "weather",
    },
    {
      id: "fema",
      label: "FEMA flood map",
      href: `https://msc.fema.gov/portal/search?AddressQuery=${q(addr)}`,
      group: "records",
    },
    {
      id: "assessor",
      label: "Assessor / parcel",
      href: `https://www.google.com/search?q=${q(`${addr} assessor parcel property record`)}`,
      group: "records",
    },
    {
      id: "roofers",
      label: "Roofers nearby",
      href: `https://www.google.com/maps/search/${q(`roofing contractor near ${near || addr}`)}`,
      group: "ops",
    },
    {
      id: "lumber",
      label: "Lumber & supply",
      href: `https://www.google.com/maps/search/${q(`lumber building supply near ${near || addr}`)}`,
      group: "ops",
    },
  ];

  if (zone?.office) {
    links.splice(5, 0, {
      id: "office",
      label: `NWS ${zone.office}`,
      href: `https://www.weather.gov/${zone.office.toLowerCase()}/`,
      group: "weather",
    });
  }

  return links;
}

export function mapsDir(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

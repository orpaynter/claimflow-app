import { createServerFn } from "@tanstack/react-start";
import { offsetLatLng } from "./project";

const UA = "ClaimFlow/1.0 (OrPaynter, Inc.; Oliver@OrPaynter.com)";

export interface LiveIssue {
  id: string;
  kind: "alert" | "observation" | "modeled" | "photo";
  title: string;
  detail: string;
  at: number;
  source: string;
  severity: 1 | 2 | 3;
}

export const fetchLotSenses = createServerFn({ method: "POST" })
  .validator((d: { lat: number; lon: number }) => d)
  .handler(async ({ data }) => {
    const { lat, lon } = data;
    const [sat, live] = await Promise.all([fetchSat(lat, lon), fetchLive(lat, lon)]);
    return { sat, live };
  });

async function fetchSat(lat: number, lon: number): Promise<{ dataUrl: string; source: string } | null> {
  const sw = offsetLatLng({ lat, lon }, -42, -42);
  const ne = offsetLatLng({ lat, lon }, 42, 42);
  const bbox = `${sw.lon},${sw.lat},${ne.lon},${ne.lat}`;
  const url =
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${encodeURIComponent(bbox)}&bboxSR=4326&imageSR=3857&size=1024,1024&format=jpg&f=image`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 800) return null;
    return {
      dataUrl: `data:image/jpeg;base64,${buf.toString("base64")}`,
      source: "Esri World Imagery / Maxar — current tile, not a dated hail-pass",
    };
  } catch {
    return null;
  }
}

async function fetchLive(lat: number, lon: number): Promise<LiveIssue[]> {
  const issues: LiveIssue[] = [];
  const headers = { Accept: "application/geo+json,application/json", "User-Agent": UA };
  try {
    const alerts = (await (
      await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
        headers,
        signal: AbortSignal.timeout(6000),
      })
    ).json()) as {
      features?: { id?: string; properties?: { event?: string; headline?: string; severity?: string; sent?: string; description?: string } }[];
    };
    for (const f of alerts.features ?? []) {
      const p = f.properties ?? {};
      const sev = p.severity === "Extreme" || p.severity === "Severe" ? 3 : p.severity === "Moderate" ? 2 : 1;
      issues.push({
        id: String(f.id ?? p.headline ?? Math.random()),
        kind: "alert",
        title: p.event || "NWS alert",
        detail: (p.headline || p.description || "Active alert at this pin.").slice(0, 180),
        at: p.sent ? Date.parse(p.sent) : Date.now(),
        source: "NWS",
        severity: sev as 1 | 2 | 3,
      });
    }
  } catch {
    /* keep going */
  }
  try {
    const pt = (await (
      await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      })
    ).json()) as { properties?: { observationStations?: string } };
    const stations = pt.properties?.observationStations;
    if (stations) {
      const list = (await (
        await fetch(stations, { headers, signal: AbortSignal.timeout(5000) })
      ).json()) as { features?: { id?: string }[] };
      const sid = list.features?.[0]?.id;
      if (sid) {
        const obs = (await (
          await fetch(`${sid}/observations/latest`, { headers, signal: AbortSignal.timeout(5000) })
        ).json()) as {
          properties?: {
            timestamp?: string;
            textDescription?: string;
            temperature?: { value?: number | null };
            windGust?: { value?: number | null };
            precipitationLastHour?: { value?: number | null };
          };
        };
        const p = obs.properties ?? {};
        const t = p.temperature?.value;
        const gust = p.windGust?.value;
        const rain = p.precipitationLastHour?.value;
        const bits = [
          p.textDescription || "",
          t != null ? `${Math.round((t * 9) / 5 + 32)}°F` : "",
          gust != null ? `gust ${Math.round(gust * 2.237)} mph` : "",
          rain != null && rain > 0 ? `${rain.toFixed(1)} mm last hour` : "",
        ].filter(Boolean);
        if (bits.length) {
          issues.push({
            id: `obs-${sid}`,
            kind: "observation",
            title: "Station now",
            detail: bits.join(" · "),
            at: p.timestamp ? Date.parse(p.timestamp) : Date.now(),
            source: "NWS observation",
            severity: gust != null && gust > 18 ? 2 : 1,
          });
        }
      }
    }
  } catch {
    /* optional */
  }
  return issues.slice(0, 8);
}

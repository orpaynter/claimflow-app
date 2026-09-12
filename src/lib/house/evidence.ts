import type { AttachedEvidence, HouseSpec } from "./types";
import type { Site } from "@/lib/geo/types";

export interface EvidenceGap {
  id: string;
  label: string;
  detail: string;
  state: "missing" | "present" | "partial";
}

export function missingEvidence(spec: HouseSpec, site: Site | null, attachments: AttachedEvidence[] = []): EvidenceGap[] {
  const outline = spec.source === "estimated" ? "missing" : spec.source === "osm" ? "partial" : "present";
  const assessor = site?.property ? (site.property.source === "attom" ? "present" : "partial") : "missing";
  const photos = attachments.filter((a) => a.kind === "photo");
  const notes = attachments.filter((a) => a.kind === "note");
  const requests = attachments.filter((a) => a.kind === "request");
  return [
    {
      id: "outline",
      label: "Building outline",
      detail:
        spec.source === "usa"
          ? "USA Structures footprint on the pin."
          : spec.source === "microsoft"
            ? "Microsoft Building Footprints outline."
            : spec.source === "osm"
              ? "OpenStreetMap outline. Not a measured roof."
              : "No public outline. Massing is illustrative.",
      state: outline,
    },
    {
      id: "roof-model",
      label: "Measured roof geometry",
      detail: "No licensed measurement provider on this lot. Pitch and facets are inferred.",
      state: "missing",
    },
    {
      id: "post-imagery",
      label: "Dated post-event imagery",
      detail: "Esri/Maxar tiles are current basemap, not a dated hail-pass. Do not read strikes from them.",
      state: "partial",
    },
    {
      id: "field",
      label: "Field photos",
      detail:
        photos.length > 0
          ? `${photos.length} file(s) hashed on this device.`
          : requests.length > 0
            ? "Inspection requested. Nothing attached yet."
            : "No inspector, drone, or homeowner photos attached.",
      state: photos.length > 0 ? "present" : requests.length > 0 ? "partial" : "missing",
    },
    {
      id: "interior",
      label: "Interior leak evidence",
      detail: notes.length > 0 ? `${notes.length} field note(s).` : "No ceiling, attic, or wet-room photos on the ledger.",
      state: notes.length > 0 ? "partial" : "missing",
    },
    {
      id: "assessor",
      label: "Assessor / parcel facts",
      detail: assessor === "present" ? "ATTOM record on file." : assessor === "partial" ? "USA Structures occupancy and area." : "No licensed assessor feed for this pin.",
      state: assessor,
    },
    {
      id: "reviewer",
      label: "Named human finding",
      detail: "A reviewer must accept or reject modeled concerns before they become a damage finding.",
      state: "missing",
    },
  ];
}

export function sourceLabel(source: HouseSpec["source"]): string {
  if (source === "osm") return "OpenStreetMap outline";
  if (source === "usa") return "USA Structures footprint";
  if (source === "microsoft") return "Microsoft Building Footprints";
  return "Illustrative massing";
}

export function modelDisclaimer(source: HouseSpec["source"]): string {
  if (source === "estimated") {
    return "Illustrative model — not a verified representation of roof geometry.";
  }
  return "Footprint model — operational location. Not a verified roof measurement.";
}

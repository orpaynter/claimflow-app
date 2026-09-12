export type SavedStatus = "draft" | "approved" | "closed";

export interface FieldEntry {
  id: string;
  address: string;
  styleLabel: string;
  number: string;
  street: string;
  locality: string;
  lat?: number;
  lon?: number;
  stormName: string;
  brief: string;
  spent: number;
  hours: number;
  systems: number;
  closedAt: number;
  savedAt: number;
  integrity?: number;
  attribution?: string;
  envelopeId?: string;
  status: SavedStatus;
  report: string;
}

const KEY = "galehouse.fieldbook.v2";
const LEGACY = "galehouse.fieldbook.v1";
const MAX = 24;

function uid(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

function isEntry(v: unknown): v is FieldEntry {
  if (!v || typeof v != "object") return false;
  const e = v as Record<string, unknown>;
  return typeof e.address === "string" && typeof e.closedAt === "number";
}

function normalize(raw: FieldEntry): FieldEntry {
  const address = raw.address;
  return {
    id: raw.id || uid(address),
    address,
    styleLabel: raw.styleLabel || "",
    number: raw.number || "",
    street: raw.street || "",
    locality: raw.locality || "",
    lat: raw.lat,
    lon: raw.lon,
    stormName: raw.stormName || "",
    brief: raw.brief || "",
    spent: typeof raw.spent === "number" ? raw.spent : 0,
    hours: typeof raw.hours === "number" ? raw.hours : 0,
    systems: typeof raw.systems === "number" ? raw.systems : 0,
    closedAt: raw.closedAt,
    savedAt: raw.savedAt || raw.closedAt,
    integrity: raw.integrity,
    attribution: raw.attribution || "",
    envelopeId: raw.envelopeId || "",
    status: raw.status === "approved" || raw.status === "closed" || raw.status === "draft" ? raw.status : "closed",
    report: raw.report || "",
  };
}

function persist(next: FieldEntry[]): FieldEntry[] {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}

export function readBook(): FieldEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.filter(isEntry).map(normalize).slice(0, MAX);
    }
    const legacy = window.localStorage.getItem(LEGACY);
    if (!legacy) return [];
    const parsed = JSON.parse(legacy) as unknown;
    if (!Array.isArray(parsed)) return [];
    const migrated = parsed.filter(isEntry).map(normalize);
    persist(migrated);
    return migrated;
  } catch {
    return [];
  }
}

export function writeEntry(entry: FieldEntry): FieldEntry[] {
  const nextEntry = normalize({ ...entry, id: uid(entry.address), savedAt: Date.now() });
  const rest = readBook().filter((e) => e.id !== nextEntry.id);
  return persist([nextEntry, ...rest].slice(0, MAX));
}

export function removeEntry(id: string): FieldEntry[] {
  return persist(readBook().filter((e) => e.id !== id && e.address.toLowerCase() !== id.toLowerCase()));
}

export function findEntry(id: string): FieldEntry | undefined {
  const key = id.trim().toLowerCase();
  return readBook().find((e) => e.id === key || e.address.toLowerCase() === key);
}

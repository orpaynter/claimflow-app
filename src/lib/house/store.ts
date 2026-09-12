import { create } from "zustand";
import { hailCenterAt, hailSeverity, HAIL_DURATION } from "@/lib/geo/hail";
import { listStorms, resolveSite } from "@/lib/geo/lookup";
import { fetchLotSenses, type LiveIssue } from "@/lib/geo/senses";
import { hashString } from "./rng";
import type { Building, LatLng, Site, StormCell } from "@/lib/geo/types";
import { regionById, type WorldRegion } from "@/lib/geo/regions";
import {
  buildOutcome,
  canApprove,
  canCommand,
  canInspect,
  canOverride,
  canProof,
  canReconcile,
  canReject,
  canStop,
  issueEnvelope,
  makeProof,
  type AuthorityEnvelope,
  type OrpaCommand,
  type OutcomeRecord,
  type ProofEvent,
} from "@/lib/orpa";
import { finalizeDecisions, planLocal } from "./agent";
import { type FieldEntry, findEntry, readBook, removeEntry } from "./book";
import { planStorm, nameStorm, STORM_DURATION } from "./damage";
import { missingEvidence, type EvidenceGap } from "./evidence";
import { scaleDecisions } from "./estimate";
import { planRepairs } from "./plan";
import { buildSpecFromBuilding, normalizeAddress } from "./spec";
import { sealRoof, type WireResult } from "@/lib/claimflow/contract";
import { snapshotLot } from "./snapshot";
import { writeLotParam } from "./url";
import {
  approveActive,
  closePass,
  dispatchPass,
  emptySwarm,
  estimatePass,
  evidencePass,
  killPass,
  logisticsPass,
  reviveSwarm,
  type SwarmState,
} from "@/lib/mas";
import type { AgentId } from "@/lib/mas/types";
import {
  emptyHealth,
  integrityOf,
  type AttachedEvidence,
  type DamageEvent,
  type FindingsStatus,
  type HouseSpec,
  type PartId,
  type Phase,
  type RepairDecision,
  type TwinMode,
  type WorkspaceTab,
} from "./types";

interface AppState {
  address: string;
  spec: HouseSpec | null;
  phase: Phase;
  health: Record<PartId, number>;
  events: DamageEvent[];
  applied: Record<string, true>;
  decisions: RepairDecision[];
  brief: string;
  stormName: string;
  stormTime: number;
  weather: number;
  lightning: number;
  shake: number;
  repairIndex: number;
  repairClock: number;
  repairFrom: number;
  logOpen: boolean;
  reportOpen: boolean;
  proofOpen: boolean;
  book: FieldEntry[];
  site: Site | null;
  storms: StormCell[];
  selectedId: string;
  hailT: number;
  hailCenter: LatLng | null;
  loadError: string;
  loading: boolean;
  proof: ProofEvent[];
  envelope: AuthorityEnvelope | null;
  outcome: OutcomeRecord | null;
  stormIntegrity: number;
  planSource: "steward" | "local";
  focusPart: PartId | null;
  findingsStatus: FindingsStatus;
  checklist: EvidenceGap[];
  workspaceTab: WorkspaceTab;
  scanT: number;
  inspectHold: number;
  viewMode: "satellite" | "skyview";
  commandScale: "globe" | "region" | "city";
  region: WorldRegion | null;
  swarm: SwarmState;
  swarmOpen: boolean;
  focusAgent: AgentId | null;
  verticalId: string;
  attachments: AttachedEvidence[];
  twinMode: TwinMode;
  guideOpen: boolean;
  bookOpen: boolean;
  opsOpen: boolean;
  reading: FieldEntry | null;
  setAddress: (v: string) => void;
  searchAddress: (address: string) => Promise<void>;
  openStorm: (cell: StormCell) => Promise<void>;
  hydrateStorms: () => Promise<void>;
  pickBuilding: (id: string) => void;
  enterLot: () => void;
  startStorm: () => void;
  tickStorm: (dt: number) => void;
  tickHail: (dt: number) => void;
  skipStorm: () => void;
  confirmMeasure: () => Promise<void>;
  confirmDispatch: () => Promise<void>;
  tickRepair: (dt: number) => void;
  setLogOpen: (v: boolean) => void;
  setReportOpen: (v: boolean) => void;
  setProofOpen: (v: boolean) => void;
  hydrateBook: () => void;
  resetLot: () => void;
  orpa: (cmd: OrpaCommand) => void;
  setWorkspaceTab: (v: WorkspaceTab) => void;
  setFocusPart: (v: PartId | null) => void;
  tickScan: (dt: number) => void;
  setGuideOpen: (v: boolean) => void;
  setBookOpen: (v: boolean) => void;
  setOpsOpen: (v: boolean) => void;
  setReading: (v: FieldEntry | null) => void;
  saveNow: () => void;
  openSaved: (id: string) => void;
  readSaved: (id: string) => void;
  removeSaved: (id: string) => void;
  setViewMode: (v: "satellite" | "skyview") => void;
  pickRegion: (id: string) => void;
  killSwarm: () => void;
  setSwarmOpen: (v: boolean) => void;
  setFocusAgent: (v: AgentId | null) => void;
  setVertical: (v: string) => void;
  attachEvidence: (files: FileList | File[]) => void;
  requestEvidence: (label: string) => void;
  addEvidenceNote: (note: string) => void;
  setTwinMode: (v: TwinMode) => void;
  operatorName: string;
  claimNote: string;
  satUrl: string;
  satSource: string;
  liveIssues: LiveIssue[];
  setOperatorName: (v: string) => void;
  startRoof: (input: { name: string; address: string; note: string; files: File[] }) => void;
  lockPackage: () => void;
  hydrateSenses: () => Promise<void>;
  wire: WireResult | null;
}

const REPAIR_STEP = 1.8;

const idle = {
  health: emptyHealth(),
  events: [] as DamageEvent[],
  applied: {} as Record<string, true>,
  decisions: [] as RepairDecision[],
  brief: "",
  stormTime: 0,
  weather: 0,
  lightning: 0,
  shake: 0,
  repairIndex: -1,
  repairClock: 0,
  repairFrom: 0,
  logOpen: false,
  reportOpen: false,
  proofOpen: false,
  proof: [] as ProofEvent[],
  envelope: null as AuthorityEnvelope | null,
  outcome: null as OutcomeRecord | null,
  stormIntegrity: 100,
  planSource: "local" as const,
  focusPart: null as PartId | null,
  findingsStatus: "idle" as FindingsStatus,
  checklist: [] as EvidenceGap[],
  workspaceTab: "overview" as WorkspaceTab,
  scanT: 0,
  inspectHold: 0,
  swarm: emptySwarm(),
  swarmOpen: false,
  focusAgent: null as AgentId | null,
  verticalId: "contracting",
  attachments: [] as AttachedEvidence[],
  twinMode: "footprint" as TwinMode,
  commandScale: "city" as const,
  region: null as WorldRegion | null,
  operatorName: "",
  claimNote: "",
  satUrl: "",
  satSource: "",
  liveIssues: [] as LiveIssue[],
  wire: null as WireResult | null,
};

let searchGen = 0;
let stormKick: ReturnType<typeof setTimeout> | null = null;

function clearStormKick() {
  if (stormKick) {
    clearTimeout(stormKick);
    stormKick = null;
  }
}

function outlineWords(source: string | undefined): string {
  if (source === "osm") return "OpenStreetMap outline";
  if (source === "usa") return "USA Structures footprint";
  if (source === "microsoft") return "Microsoft Building Footprints";
  return "illustrative massing";
}

function pushProof(current: ProofEvent[], event: Omit<ProofEvent, "id" | "t">): ProofEvent[] {
  return [...current, makeProof(event)].slice(-48);
}

function openMeasure(
  set: (p: Partial<AppState>) => void,
  get: () => AppState,
  health: Record<PartId, number>,
  applied: Record<string, true>,
  title: string,
  detail: string,
) {
  const s = get();
  const spec = s.spec;
  if (!spec) return;
  const local = planLocal(spec, s.events);
  const decisions = scaleDecisions(spec, s.events, local.decisions);
  const stormIntegrity = integrityOf(spec, health);
  set({
    phase: "measure",
    stormTime: STORM_DURATION,
    weather: 0.04,
    lightning: 0,
    shake: 0,
    health,
    applied,
    logOpen: false,
    stormIntegrity,
    decisions,
    brief: local.brief,
    findingsStatus: "modeled",
    checklist: missingEvidence(spec, s.site, s.attachments),
    focusPart: null,
    workspaceTab: "estimate",
    scanT: 0,
    swarm: estimatePass(s.swarm, spec, s.events, decisions, s.site),
    proof: pushProof(s.proof, {
      n: 11,
      stage: "11. Verification arena",
      center: "authority",
      title,
      detail,
      source: "lot",
      actor: "system",
    }),
  });
  const book = snapshotLot({
    spec,
    stormName: s.stormName,
    events: s.events,
    decisions,
    brief: local.brief,
    site: s.site,
    proof: get().proof,
    envelope: s.envelope,
    integrity: stormIntegrity,
    status: "draft",
    signedBy: s.operatorName,
  });
  set({ book });
}

function closeLot(
  set: (p: Partial<AppState>) => void,
  get: () => AppState,
  extra: Partial<AppState> = {},
) {
  const s = get();
  const spec = s.spec;
  let book = s.book;
  const spent = s.decisions.reduce((n, d) => n + d.cost, 0);
  const hours = s.decisions.reduce((n, d) => n + d.hours, 0);
  const restored = spec ? integrityOf(spec, s.health) : 100;
  const outcome = spec
    ? buildOutcome({
        stormIntegrity: s.stormIntegrity,
        restoredIntegrity: restored,
        cost: spent,
        hours,
        source: spec.source,
        planSource: s.planSource,
        envelopeId: s.envelope?.id ?? "",
        areaCode: spec.areaCode ?? s.site?.zone.areaCode ?? "",
      })
    : null;
  if (spec && s.decisions.length > 0) {
    book = snapshotLot({
      spec,
      stormName: s.stormName,
      events: s.events,
      decisions: s.decisions,
      brief: s.brief,
      site: s.site,
      proof: s.proof,
      envelope: s.envelope,
      outcome,
      integrity: s.stormIntegrity,
      status: "closed",
      signedBy: s.operatorName,
    });
  }
  const proof = pushProof(s.proof, {
    n: 18,
    stage: "18. Outcome loop",
    center: "learning",
    title: "Lot closed",
    detail: outcome
      ? `Integrity ${outcome.actualIntegrity}% after the cell, restored to ${outcome.restoredIntegrity}%. ${outcome.nextObjective}`
      : "Lot closed.",
    source: "operator",
    actor: "human",
  });
  set({
    phase: "restored",
    weather: 0.06,
    shake: 0,
    book,
    outcome,
    proof,
    envelope: s.envelope ? { ...s.envelope, status: "used" } : null,
    swarm: spec && outcome ? closePass(s.swarm, outcome, spec) : s.swarm,
    ...extra,
  });
}

function applySite(site: Site, stormName: string, proof: ProofEvent[], swarm: SwarmState) {
  const osm = site.buildings.filter((b) => b.source === "osm").length;
  const usa = site.buildings.filter((b) => b.source === "usa").length;
  const ms = site.buildings.filter((b) => b.source === "microsoft").length;
  const next = pushProof(proof, {
    n: 3,
    stage: "3. Truth Core",
    center: "truth",
    title: "Footprints anchored",
    detail: `${site.place.displayName}. OSM ${osm} · USA Structures ${usa} · Microsoft ${ms} · territory ${site.zone.areaCode}. Exposure is not a damage determination.`,
    source: osm > 0 ? "OpenStreetMap" : usa > 0 ? "USA Structures" : ms > 0 ? "Microsoft" : "estimated",
    actor: "system",
  });
  return {
    site,
    selectedId: site.matchedId,
    phase: "select" as const,
    loading: false,
    loadError: "",
    hailT: 0,
    hailCenter: site.hail.start,
    stormName: stormName || site.storms[0]?.name || nameStorm(Date.now()),
    address: site.place.displayName,
    proof: next,
    swarm: evidencePass(swarm.killed ? reviveSwarm(swarm) : swarm, site),
  };
}

export const useLot = create<AppState>((set, get) => ({
  ...idle,
  address: "",
  spec: null,
  phase: "orbit",
  book: [],
  site: null,
  storms: [],
  selectedId: "",
  hailT: 0,
  hailCenter: null,
  loadError: "",
  loading: false,
  stormName: "",
  guideOpen: false,
  bookOpen: false,
  opsOpen: false,
  reading: null,
  viewMode: "satellite",
  swarm: emptySwarm(),
  swarmOpen: false,
  focusAgent: null,
  verticalId: "contracting",
  attachments: [],
  twinMode: "footprint",
  commandScale: "city",
  region: null,
  operatorName: "",
  claimNote: "",
  satUrl: "",
  satSource: "",
  liveIssues: [],
  wire: null,

  setAddress: (v) => set({ address: v }),
  setViewMode: (v) => set({ viewMode: v }),
  pickRegion: (id) => {
    const region = regionById(id);
    set({
      commandScale: "region",
      region,
      viewMode: "satellite",
      loadError: region.live ? "" : "Same rail. Weather in this session is U.S. NWS — this region is a hone-in, not a local feed.",
    });
  },
  setSwarmOpen: (v) => set({ swarmOpen: v }),
  setFocusAgent: (v) => set({ focusAgent: v }),
  setVertical: (v) => set({ verticalId: v }),
  setTwinMode: (v) => set({ twinMode: v }),
  setOperatorName: (v) => {
    const name = v.trim();
    try {
      if (name) localStorage.setItem("galehouse.operator", name);
    } catch {
      /* ignore */
    }
    set({ operatorName: name });
  },
  startRoof: ({ name, address, note, files }) => {
    const signed = name.trim();
    const at = address.trim();
    if (signed.length < 2) {
      set({ loadError: "Put your name on the package before we open the roof." });
      return;
    }
    if (at.length < 3) {
      set({ loadError: "Enter a street address." });
      return;
    }
    try {
      localStorage.setItem("galehouse.operator", signed);
    } catch {
      /* ignore */
    }
    set({ operatorName: signed, claimNote: note.trim(), loadError: "", commandScale: "city" });
    if (files.length) get().attachEvidence(files);
    if (note.trim()) get().addEvidenceNote(note.trim());
    void get().searchAddress(at);
  },
  lockPackage: () => {
    const s = get();
    if (!s.operatorName.trim()) {
      set({ loadError: "Put your name on the lock." });
      return;
    }
    if (s.phase === "measure") {
      get().confirmMeasure();
      return;
    }
    closeLot(set, get);
  },
  hydrateSenses: async () => {
    const spec = get().spec;
    const site = get().site;
    const lat = spec?.lat ?? site?.place.lat;
    const lon = spec?.lon ?? site?.place.lon;
    if (lat == null || lon == null) return;
    try {
      const res = await fetchLotSenses({ data: { lat, lon } });
      const modeled: LiveIssue[] = get()
        .events.filter((e) => get().applied[e.id] || get().phase === "measure")
        .map((e) => ({
          id: e.id,
          kind: "modeled" as const,
          title: e.label,
          detail: "Modeled on the twin from the cell. Not a damage determination.",
          at: Date.now(),
          source: "lot scan",
          severity: e.severity,
        }));
      const photos: LiveIssue[] = get()
        .attachments.filter((a) => a.kind === "photo")
        .map((a) => ({
          id: a.id,
          kind: "photo" as const,
          title: a.name,
          detail: a.note,
          at: a.captured_at,
          source: "field",
          severity: 2 as const,
        }));
      set({
        satUrl: res.sat?.dataUrl ?? get().satUrl,
        satSource: res.sat?.source ?? get().satSource,
        liveIssues: [...(res.live ?? []), ...photos, ...modeled].slice(0, 16),
      });
    } catch {
      /* keep last */
    }
  },
  attachEvidence: (files) => {
    const list = Array.from(files).slice(0, 8);
    if (list.length === 0) return;
    void Promise.all(
      list.map(
        (f) =>
          new Promise<AttachedEvidence>((resolve) => {
            const base: AttachedEvidence = {
              id: `ev-${Date.now().toString(36)}-${hashString(f.name + f.size).toString(16)}`,
              name: f.name,
              kind: "photo",
              bytes: f.size,
              hash: hashString(`${f.name}:${f.size}:${f.lastModified}`).toString(16),
              captured_at: Date.now(),
              note: "Attached on this device. Original stays local.",
            };
            if (!f.type.startsWith("image/")) {
              resolve(base);
              return;
            }
            const r = new FileReader();
            r.onload = () => resolve({ ...base, dataUrl: String(r.result || "") });
            r.onerror = () => resolve(base);
            r.readAsDataURL(f);
          }),
      ),
    ).then((extra) => {
      const s = get();
      const attachments = [...s.attachments, ...extra].slice(-24);
      set({
        attachments,
        checklist: s.spec ? missingEvidence(s.spec, s.site, attachments) : s.checklist,
      });
    });
  },
  requestEvidence: (label) => {
    const s = get();
    const item: AttachedEvidence = {
      id: `req-${Date.now().toString(36)}`,
      name: label,
      kind: "request",
      bytes: 0,
      hash: hashString(label + Date.now()).toString(16),
      captured_at: Date.now(),
      note: "Requested. Not collected.",
    };
    const attachments = [...s.attachments, item];
    set({
      attachments,
      checklist: s.spec ? missingEvidence(s.spec, s.site, attachments) : s.checklist,
    });
  },
  addEvidenceNote: (note) => {
    const text = note.trim();
    if (!text) return;
    const s = get();
    const item: AttachedEvidence = {
      id: `note-${Date.now().toString(36)}`,
      name: "Field note",
      kind: "note",
      bytes: text.length,
      hash: hashString(text).toString(16),
      captured_at: Date.now(),
      note: text,
    };
    const attachments = [...s.attachments, item];
    set({
      attachments,
      checklist: s.spec ? missingEvidence(s.spec, s.site, attachments) : s.checklist,
    });
  },
  killSwarm: () => {
    const s = get();
    set({
      swarm: killPass(s.swarm, "Operator Stop. Orchestrator freeze. Envelope revoke."),
      envelope: s.envelope ? { ...s.envelope, status: "revoked" } : null,
    });
  },

  hydrateStorms: async () => {
    try {
      const storms = await listStorms();
      set({ storms });
    } catch {
      set({ storms: [] });
    }
  },

  searchAddress: async (raw) => {
    const address = normalizeAddress(raw);
    if (address.length < 3) {
      set({ loadError: "Enter a street address." });
      return;
    }
    const gen = ++searchGen;
    const proof = [
      makeProof({
        n: 1,
        stage: "1. Real-world signal",
        center: "truth",
        title: "Address received",
        detail: address,
        source: "operator",
        actor: "human",
      }),
    ];
    set({
      ...idle,
      address,
      phase: "track",
      loading: true,
      loadError: "",
      site: null,
      spec: null,
      selectedId: "",
      hailT: 0,
      hailCenter: null,
      stormName: "",
      commandScale: "city",
      region: get().region,
      operatorName: get().operatorName,
      claimNote: get().claimNote,
      attachments: get().attachments,
      proof,
    });
    writeLotParam(address);
    const res = await resolveSite({ data: { query: address } });
    if (gen !== searchGen) return;
    if (!res.ok) {
      set({
        phase: "orbit",
        loading: false,
        loadError: res.error,
        proof: pushProof(get().proof, {
          n: 3,
          stage: "3. Truth Core",
          center: "truth",
          title: "Signal rejected",
          detail: res.error,
          source: "geocoder",
          actor: "system",
        }),
      });
      return;
    }
    set(applySite(res.site, nameStorm(Math.abs(res.site.place.lat * 10000) | 0), get().proof, get().swarm));
    void get().hydrateSenses();
  },

  openStorm: async (cell) => {
    const gen = ++searchGen;
    const proof = [
      makeProof({
        n: 1,
        stage: "1. Real-world signal",
        center: "truth",
        title: "Live cell selected",
        detail: cell.headline || cell.name,
        source: cell.source === "nws" ? "NWS" : cell.source === "lsr" ? "IEM LSR" : "local",
        actor: "human",
      }),
    ];
    set({
      ...idle,
      phase: "track",
      loading: true,
      loadError: "",
      spec: null,
      site: null,
      selectedId: "",
      hailT: 0,
      hailCenter: null,
      stormName: cell.name,
      proof,
      commandScale: "city",
    });
    const res = await resolveSite({
      data: { lat: cell.lat, lon: cell.lon, stormName: cell.name, query: cell.headline },
    });
    if (gen !== searchGen) return;
    if (!res.ok) {
      set({ phase: "orbit", loading: false, loadError: res.error });
      return;
    }
    writeLotParam(res.site.place.displayName);
    set(applySite(res.site, cell.name, get().proof, get().swarm));
  },

  pickBuilding: (id) => {
    const site = get().site;
    if (!site) return;
    const b = site.buildings.find((x) => x.id === id);
    if (!b) return;
    set({
      selectedId: id,
      proof: pushProof(get().proof, {
        n: 5,
        stage: "5. Nexus",
        center: "truth",
        title: "Lot fused",
        detail: `${b.houseNumber || "—"} ${b.street || site.place.street}. ${outlineWords(b.source)}. Exposure is not a damage finding.`,
        source: b.source,
        actor: "human",
      }),
    });
  },

  enterLot: () => {
    const { site, selectedId, stormName, proof } = get();
    if (!site) return;
    const building =
      site.buildings.find((b) => b.id === selectedId) ??
      site.buildings.find((b) => b.id === site.matchedId);
    if (!building) return;
    const spec = buildSpecFromBuilding(site.place, building, site.zone.areaCode);
    const envelope = issueEnvelope(`Walk lot ${spec.number} ${spec.street}`, 1);
    const keep = get();
    set({
      ...idle,
      spec,
      address: spec.address,
      phase: "survey",
      selectedId: building.id,
      stormName: stormName || nameStorm(spec.seed),
      events: planStorm(spec),
      weather: 0.05,
      envelope,
      findingsStatus: "idle",
      operatorName: keep.operatorName,
      claimNote: keep.claimNote,
      attachments: keep.attachments,
      satUrl: keep.satUrl,
      satSource: keep.satSource,
      liveIssues: keep.liveIssues,
      site: keep.site,
      proof: pushProof(proof, {
        n: 14,
        stage: "14. TRAE",
        center: "authority",
        title: "Lot raised",
        detail: `Envelope ${envelope.id} · ${spec.number} ${spec.street}. ${outlineWords(spec.source)}. Replay starts on the client — watching is not approval.`,
        source: "operator",
        actor: "human",
      }),
    });
    clearStormKick();
    void get().hydrateSenses();
    stormKick = setTimeout(() => {
      stormKick = null;
      if (get().phase === "survey") get().startStorm();
    }, 900);
  },

  startStorm: () => {
    const { spec, phase, stormName, proof, envelope } = get();
    if (!spec || (phase !== "survey" && phase !== "restored")) return;
    set({
      phase: "storm",
      stormTime: 0,
      applied: {},
      health: emptyHealth(),
      decisions: [],
      brief: "",
      stormName: stormName || nameStorm(spec.seed),
      repairIndex: -1,
      repairClock: 0,
      weather: 0.12,
      logOpen: false,
      reportOpen: false,
      proofOpen: false,
      outcome: null,
      envelope: envelope ? { ...envelope, status: "used" } : envelope,
      focusPart: null,
      findingsStatus: "idle",
      proof: pushProof(proof, {
        n: 7,
        stage: "7. Predictive intelligence",
        center: "authority",
        title: "Storm replay",
        detail: `${stormName || "Named cell"} on the client. Modeled concerns only — not a damage determination.`,
        source: "lot",
        actor: "system",
      }),
    });
  },

  tickHail: (dt) => {
    const s = get();
    const site = s.site;
    if (s.phase !== "select" || !site) return;
    if (s.hailT >= HAIL_DURATION) return;
    const t = Math.min(HAIL_DURATION, s.hailT + dt);
    const center = hailCenterAt(site.hail, t);
    const buildings: Building[] = site.buildings.map((b) => {
      const sev = hailSeverity(b, site.hail, center);
      const hit = Math.max(b.hit, sev) as Building["hit"];
      return hit === b.hit ? b : { ...b, hit };
    });
    const matched = buildings.find((b) => b.id === site.matchedId);
    if (matched && matched.hit === 0 && t > 2.4) {
      const i = buildings.findIndex((b) => b.id === matched.id);
      if (i >= 0) buildings[i] = { ...matched, hit: 2 };
    }
    const scored = s.hailT < HAIL_DURATION && t >= HAIL_DURATION;
    const hitCount = buildings.filter((b) => b.hit > 0 && b.enterable).length;
    set({
      hailT: t,
      hailCenter: center,
      site: { ...site, buildings },
      proof: scored
        ? pushProof(s.proof, {
            n: 6,
            stage: "6. RTCI",
            center: "truth",
            title: "Exposure scored",
            detail: `${hitCount} lots in the cell. Exposure score is not a damage determination. Pick a house to inspect.`,
            source: "hail model",
            actor: "system",
          })
        : s.proof,
    });
  },

  tickStorm: (dt) => {
    const s = get();
    if (s.phase !== "storm") {
      const lightning = Math.max(0, s.lightning - dt * 4);
      const shake = Math.max(0, s.shake - dt * 3);
      if (lightning !== s.lightning || shake !== s.shake) set({ lightning, shake });
      if (s.phase === "survey" || s.phase === "restored") {
        const weather = s.weather + (0.05 - s.weather) * Math.min(1, dt * 0.5);
        if (Math.abs(weather - s.weather) > 0.002) set({ weather });
      }
      return;
    }

    const t = s.stormTime + dt;
    let weather = s.weather;
    if (t < 2.4) weather = 0.12 + (t / 2.4) * 0.72;
    else if (t < STORM_DURATION - 2.8) weather = 0.84 + Math.sin(t * 1.1) * 0.06;
    else weather = Math.max(0.2, 0.84 - ((t - (STORM_DURATION - 2.8)) / 2.8) * 0.6);

    let lightning = Math.max(0, s.lightning - dt * 4);
    let shake = Math.max(0, s.shake - dt * 2.4);
    const health = { ...s.health };
    const applied = { ...s.applied };
    let struck = false;
    let focusPart = s.focusPart;

    for (const e of s.events) {
      if (e.t <= t && !applied[e.id]) {
        applied[e.id] = true;
        health[e.part] = Math.max(0, 1 - e.severity / 3);
        lightning = 1;
        shake = 0.4 + e.severity * 0.1;
        struck = true;
        focusPart = e.part;
      }
    }

    if (t >= STORM_DURATION) {
      openMeasure(
        set,
        get,
        health,
        applied,
        "Lot scanned",
        `Modeled concerns on the house. Integrity ${s.spec ? integrityOf(s.spec, health) : 0}%. Exposure is not a damage finding. Draft estimate is ready for a named reviewer.`,
      );
      return;
    }

    set({
      stormTime: t,
      weather,
      lightning: struck ? 1 : lightning,
      shake,
      focusPart,
      ...(struck ? { health, applied } : {}),
    });
  },

  skipStorm: () => {
    const s = get();
    if (s.phase !== "storm") return;
    const health = { ...emptyHealth() };
    const applied: Record<string, true> = {};
    for (const e of s.events) {
      applied[e.id] = true;
      health[e.part] = Math.max(0, 1 - e.severity / 3);
    }
    openMeasure(
      set,
      get,
      health,
      applied,
      "Replay skipped",
      `Operator skipped the client replay. Integrity ${s.spec ? integrityOf(s.spec, health) : 0}%. Modeled concerns remain unverified.`,
    );
  },

  confirmMeasure: async () => {
    const s = get();
    if (s.phase !== "measure") return;
    if (s.swarm.killed) {
      set({ loadError: "Swarm killed. Side-effects frozen." });
      return;
    }
    const signed = s.operatorName.trim();
    if (signed.length < 2) {
      set({ loadError: "Put your name on the lock before the package can freeze." });
      return;
    }
    if (!s.spec) return;
    const wire = await sealRoof({
      address: s.spec.address,
      signedName: signed,
      note: s.claimNote || s.brief,
      stormName: s.stormName,
      items: s.decisions.map((d) => ({
        part: d.part,
        action: d.action,
        cost: d.cost,
        hours: d.hours,
      })),
      citations: [
        { source: s.spec.source ?? "estimated", note: "Building outline on the pin." },
        { source: "nws", note: "Alerts and station at this coordinate." },
        ...s.attachments.slice(0, 6).map((a) => ({ source: "field", note: a.name })),
      ],
      evidence: s.attachments.map((a) => ({ name: a.name, hash: a.hash })),
    });
    if (wire.blockers.length) {
      set({ loadError: wire.blockers[0] ?? "Package failed the ClaimFlow gate." });
      return;
    }
    const checklist = s.checklist.map((g) =>
      g.id === "reviewer"
        ? { ...g, state: "present" as const, detail: `${signed} accepted the draft. Local seal ${wire.package_sha256.slice(0, 12)}.` }
        : g,
    );
    const swarm = s.site ? logisticsPass(approveActive(s.swarm, "operator", true), s.site) : approveActive(s.swarm, "operator", true);
    set({
      findingsStatus: "approved",
      checklist,
      swarm,
      wire,
      loadError: "",
      proof: pushProof(s.proof, {
        n: 12,
        stage: "12. Agent contract",
        center: "authority",
        title: "Named approval sealed",
        detail: `${signed} locked ${wire.package_sha256.slice(0, 16)}… Live RPCs blocked: no Supabase session. Export not called.`,
        source: "operator",
        actor: "human",
      }),
    });
    closeLot(set, get);
  },

  confirmDispatch: async () => {
    const { spec, events, phase, proof, swarm } = get();
    if (!spec || phase !== "dispatch") return;
    const gate = dispatchPass(swarm, "operator");
    if (!gate.ok) {
      set({ loadError: gate.reason });
      return;
    }
    const envelope = issueEnvelope(`Dispatch steward · ${spec.number} ${spec.street}`, 2);
    set({
      phase: "planning",
      logOpen: true,
      envelope,
      swarm: gate.swarm,
      loadError: "",
      proof: pushProof(proof, {
        n: 15,
        stage: "15. Pre-actuation gateway",
        center: "action",
        title: "Authority issued",
        detail: `Envelope ${envelope.id}. Default-deny lifted for this order of work only.`,
        source: "operator",
        actor: "human",
      }),
    });
    const local = planLocal(spec, events);
    try {
      const res = await planRepairs({ data: { spec, events } });
      const decisions = finalizeDecisions(res.decisions, local.decisions);
      const source = res.source === "steward" ? "steward" : "local";
      set({
        brief: res.brief || local.brief,
        decisions,
        phase: "repairing",
        repairIndex: 0,
        repairClock: 0,
        repairFrom: get().health[decisions[0]?.part ?? "roof"] ?? 0,
        planSource: source,
        proof: pushProof(get().proof, {
          n: 8,
          stage: "8. OPUS",
          center: "action",
          title: "Order of work drafted",
          detail:
            source === "steward"
              ? "Hale drafted. Execution is still bounded by the envelope."
              : "Local envelope. Hale stayed in the sandbox.",
          source,
          actor: "steward",
        }),
      });
    } catch {
      set({
        brief: local.brief,
        decisions: local.decisions,
        phase: "repairing",
        repairIndex: 0,
        repairClock: 0,
        repairFrom: get().health[local.decisions[0]?.part ?? "roof"] ?? 0,
        planSource: "local",
        proof: pushProof(get().proof, {
          n: 8,
          stage: "8. OPUS",
          center: "action",
          title: "Order of work drafted",
          detail: "Local envelope. Hale stayed in the sandbox.",
          source: "local",
          actor: "steward",
        }),
      });
    }
  },

  tickRepair: (dt) => {
    const s = get();
    if (s.phase !== "repairing") return;
    const decision = s.decisions[s.repairIndex];
    if (!decision) {
      closeLot(set, get);
      return;
    }
    const clock = s.repairClock + dt;
    const t = Math.min(1, clock / REPAIR_STEP);
    const health = { ...s.health };
    health[decision.part] = s.repairFrom + (1 - s.repairFrom) * t;
    if (t >= 1) {
      health[decision.part] = 1;
      const next = s.repairIndex + 1;
      if (next >= s.decisions.length) {
        closeLot(set, get, { repairIndex: next - 1, health });
      } else {
        const nxt = s.decisions[next];
        set({
          health,
          repairIndex: next,
          repairClock: 0,
          repairFrom: nxt ? health[nxt.part] : 1,
        });
      }
    } else {
      set({ health, repairClock: clock });
    }
  },

  setLogOpen: (v) => set({ logOpen: v, reportOpen: v ? false : get().reportOpen, proofOpen: v ? false : get().proofOpen }),
  setReportOpen: (v) => set({ reportOpen: v, logOpen: v ? false : get().logOpen, proofOpen: v ? false : get().proofOpen }),
  setProofOpen: (v) => set({ proofOpen: v, logOpen: v ? false : get().logOpen, reportOpen: v ? false : get().reportOpen }),
  hydrateBook: () => {
    let operatorName = "";
    try {
      operatorName = localStorage.getItem("galehouse.operator") ?? "";
    } catch {
      operatorName = "";
    }
    set({ book: readBook(), operatorName });
  },
  setGuideOpen: (v) => set({ guideOpen: v, bookOpen: v ? false : get().bookOpen }),
  setBookOpen: (v) => set({ bookOpen: v, guideOpen: v ? false : get().guideOpen }),
  setOpsOpen: (v) => set({ opsOpen: v }),
  setReading: (v) => set({ reading: v, bookOpen: false, reportOpen: false }),
  saveNow: () => {
    const s = get();
    if (!s.spec) return;
    const status = s.phase === "restored" ? "closed" : s.findingsStatus === "approved" ? "approved" : "draft";
    set({
      book: snapshotLot({
        spec: s.spec,
        stormName: s.stormName,
        events: s.events,
        decisions: s.decisions,
        brief: s.brief,
        site: s.site,
        proof: s.proof,
        envelope: s.envelope,
        outcome: s.outcome,
        integrity: s.stormIntegrity,
        status,
        signedBy: s.operatorName,
      }),
      bookOpen: true,
    });
  },
  openSaved: (id) => {
    const entry = findEntry(id);
    if (!entry) return;
    set({ bookOpen: false, reading: null, guideOpen: false });
    void get().searchAddress(entry.address);
  },
  readSaved: (id) => {
    const entry = findEntry(id);
    if (!entry) return;
    set({ reading: entry, bookOpen: false, guideOpen: false, reportOpen: false });
  },
  removeSaved: (id) => {
    const book = removeEntry(id);
    const reading = get().reading;
    set({ book, reading: reading && (reading.id === id || reading.address.toLowerCase() === id.toLowerCase()) ? null : reading });
  },

  setWorkspaceTab: (v) => set({ workspaceTab: v }),
  setFocusPart: (v) =>
    set({
      focusPart: v,
      inspectHold: 7,
      workspaceTab: get().phase === "measure" ? "exposure" : get().workspaceTab,
    }),

  tickScan: (dt) => {
    const s = get();
    if (s.phase !== "measure") return;
    if (s.inspectHold > 0) set({ inspectHold: Math.max(0, s.inspectHold - dt) });
  },

  resetLot: () => {
    searchGen += 1;
    clearStormKick();
    writeLotParam(null);
    set({
      ...idle,
      spec: null,
      site: null,
      phase: "orbit",
      loadError: "",
      loading: false,
      selectedId: "",
      hailT: 0,
      hailCenter: null,
      stormName: "",
      swarm: reviveSwarm(get().swarm),
      swarmOpen: false,
      focusAgent: null,
      operatorName: get().operatorName,
      commandScale: "city",
    });
  },

  orpa: (cmd) => {
    const s = get();
    switch (cmd) {
      case "command":
        if (canCommand(s.phase)) get().resetLot();
        return;
      case "review":
        if (canProof(s.phase)) set({ proofOpen: true, logOpen: false, reportOpen: false });
        return;
      case "approve":
        if (!canApprove(s.phase)) return;
        if (s.phase === "select") get().enterLot();
        else if (s.phase === "measure") get().confirmMeasure();
        else if (s.phase === "dispatch") void get().confirmDispatch();
        else if (s.phase === "restored") set({ reportOpen: true, proofOpen: false, logOpen: false });
        return;
      case "reject": {
        if (!canReject(s.phase)) return;
        const note = {
          n: 14,
          stage: "14. TRAE",
          center: "authority" as const,
          title: "Rejected",
          detail: "Human blocked this step. Authority envelope revoked.",
          source: "operator",
          actor: "human" as const,
        };
        if (s.phase === "select" || s.phase === "track") {
          get().resetLot();
          return;
        }
        if (s.phase === "survey") {
          clearStormKick();
          set({
            phase: "select",
            spec: null,
            envelope: s.envelope ? { ...s.envelope, status: "revoked" } : null,
            proof: pushProof(s.proof, note),
          });
          return;
        }
        if (s.phase === "storm") {
          get().skipStorm();
          return;
        }
        if (s.phase === "measure") {
          set({
            findingsStatus: "rejected",
            swarm: approveActive(s.swarm, "operator", false),
            proof: pushProof(s.proof, { ...note, detail: "Draft findings rejected. Modeled concerns stay unverified." }),
          });
          return;
        }
        if (s.phase === "dispatch") {
          set({ phase: "measure", proof: pushProof(s.proof, note) });
          return;
        }
        if (s.phase === "planning" || s.phase === "repairing") {
          set({
            phase: "dispatch",
            logOpen: false,
            envelope: s.envelope ? { ...s.envelope, status: "revoked" } : null,
            proof: pushProof(s.proof, { ...note, detail: "Dispatch revoked. Steward stands down." }),
          });
          return;
        }
        if (s.phase === "restored") get().resetLot();
        return;
      }
      case "override":
        if (!canOverride(s.phase)) return;
        if (s.phase === "storm") get().skipStorm();
        else if (s.phase === "select") {
          const site = s.site;
          if (!site) return;
          set({
            hailT: HAIL_DURATION,
            hailCenter: site.hail.end,
            proof: pushProof(s.proof, {
              n: 6,
              stage: "6. RTCI",
              center: "truth",
              title: "Hail walk overridden",
              detail: "Operator took control of the cell.",
              source: "operator",
              actor: "human",
            }),
          });
        }
        return;
      case "stop":
        if (!canStop(s.phase)) return;
        set({ swarm: killPass(s.swarm, "Operator Stop. Orchestrator freeze. Envelope revoke.") });
        if (s.phase === "storm") get().skipStorm();
        else if (s.phase === "planning" || s.phase === "repairing") {
          set({
            proof: pushProof(get().proof, {
              n: 16,
              stage: "16. Execution edge",
              center: "action",
              title: "Execution halted",
              detail: "Stop. Swarm killed. Remaining work stays on the order.",
              source: "operator",
              actor: "human",
            }),
          });
          closeLot(set, get);
        }
        return;
      case "inspect":
        if (canInspect(s.phase)) set({ logOpen: true, proofOpen: false, reportOpen: false });
        return;
      case "proof":
        if (canProof(s.phase)) set({ proofOpen: true, logOpen: false, reportOpen: false });
        return;
      case "reconcile":
        if (canReconcile(s.phase)) set({ reportOpen: true, proofOpen: false, logOpen: false });
        return;
    }
  },
}));

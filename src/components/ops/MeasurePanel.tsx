import { Bookmark, Download, Paperclip, Ruler } from "lucide-react";
import { useState } from "react";
import { OutLinks } from "@/components/ops/OutLinks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { CLAIM_STATUS, claimStatusOf, labelOf, twinLabel } from "@/lib/claim/status";
import { buildLinks } from "@/lib/geo/links";
import { saveLotArtifacts } from "@/lib/geo/save";
import { formatUsd } from "@/lib/house/agent";
import { squaresOf } from "@/lib/house/estimate";
import { modelDisclaimer, sourceLabel } from "@/lib/house/evidence";
import { PART_LABEL, type WorkspaceTab } from "@/lib/house/types";
import { useLot } from "@/lib/house/store";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "exposure", label: "Storm" },
  { id: "imagery", label: "Imagery" },
  { id: "twin", label: "3D" },
  { id: "measure", label: "Measure" },
  { id: "evidence", label: "Evidence" },
  { id: "estimate", label: "Scope" },
  { id: "insurance", label: "Claim" },
  { id: "logistics", label: "Logistics" },
  { id: "package", label: "Package" },
  { id: "log", label: "Log" },
];

export function MeasurePanel() {
  const spec = useLot((s) => s.spec);
  const site = useLot((s) => s.site);
  const selectedId = useLot((s) => s.selectedId);
  const confirmMeasure = useLot((s) => s.confirmMeasure);
  const operatorName = useLot((s) => s.operatorName);
  const setOperatorName = useLot((s) => s.setOperatorName);
  const loadError = useLot((s) => s.loadError);
  const events = useLot((s) => s.events);
  const stormName = useLot((s) => s.stormName);
  const decisions = useLot((s) => s.decisions);
  const brief = useLot((s) => s.brief);
  const proof = useLot((s) => s.proof);
  const envelope = useLot((s) => s.envelope);
  const checklist = useLot((s) => s.checklist);
  const findingsStatus = useLot((s) => s.findingsStatus);
  const tab = useLot((s) => s.workspaceTab);
  const setTab = useLot((s) => s.setWorkspaceTab);
  const stormIntegrity = useLot((s) => s.stormIntegrity);
  const focusPart = useLot((s) => s.focusPart);
  const setFocusPart = useLot((s) => s.setFocusPart);
  const saveNow = useLot((s) => s.saveNow);
  const swarm = useLot((s) => s.swarm);
  const attachments = useLot((s) => s.attachments);
  const attachEvidence = useLot((s) => s.attachEvidence);
  const requestEvidence = useLot((s) => s.requestEvidence);
  const addEvidenceNote = useLot((s) => s.addEvidenceNote);
  const twinMode = useLot((s) => s.twinMode);
  const setTwinMode = useLot((s) => s.setTwinMode);
  const phase = useLot((s) => s.phase);
  const [note, setNote] = useState("");

  if (!spec) return null;
  const building =
    site?.buildings.find((b) => b.id === selectedId) ?? site?.buildings.find((b) => b.id === site.matchedId);
  const ins = site?.insurance;
  const rec = site?.property;
  const sqft = spec.footprintSqft ?? (building ? Math.round(building.areaM2 * 10.764) : 0);
  const roof = spec.roofSqft ?? 0;
  const w = building ? building.widthM.toFixed(1) : spec.width.toFixed(1);
  const d = building ? building.depthM.toFixed(1) : spec.depth.toFixed(1);
  const links = site ? buildLinks(site.place, building, site.zone) : [];
  const spent = decisions.reduce((n, x) => n + x.cost, 0);
  const hours = decisions.reduce((n, x) => n + x.hours, 0);
  const sq = squaresOf(spec);
  const pkg = swarm.packages.find((p) => p.id === swarm.activeId);
  const measured = spec.source === "usa" || spec.source === "microsoft";
  const status = claimStatusOf({
    hit: (building?.hit ?? 0) as 0 | 1 | 2 | 3,
    fieldCount: attachments.filter((a) => a.kind === "photo").length,
    findings: findingsStatus,
    phase,
  });

  return (
    <aside className="pointer-events-auto absolute inset-x-0 bottom-[4.75rem] z-20 mx-auto flex max-h-[46dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl bg-surface shadow-border">
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold text-muted">Property command</p>
        <p className="font-display mt-1 text-xl text-fg">
          {spec.number} {spec.street}
        </p>
        <p className="text-sm text-muted">
          {sourceLabel(spec.source)}
          {spec.lat != null ? ` · ${spec.lat.toFixed(5)}, ${spec.lon?.toFixed(5)}` : ""}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-fg">{modelDisclaimer(spec.source)}</p>
        <p className={cn("mt-2 text-sm font-semibold", CLAIM_STATUS.find((s) => s.id === status)?.tone)}>
          {labelOf(status)}
        </p>
        {pkg ? (
          <p className="mt-2 font-mono text-sm text-muted">
            {pkg.id} · risk {pkg.risk_score} · {pkg.approval_gate} gate · {pkg.status.replace("_", " ")}
          </p>
        ) : null}
      </div>
      <div className="flex gap-1 overflow-x-auto px-3 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-3 py-2 text-sm font-medium",
              tab === t.id ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {tab === "overview" || tab === "measure" ? (
          <dl className="space-y-3 text-base">
            <div className="flex justify-between gap-3 border-t border-border pt-3">
              <dt className="text-muted">Footprint</dt>
              <dd className="font-mono tabular-nums text-fg">{sqft.toLocaleString()} ft²</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Plan</dt>
              <dd className="font-mono tabular-nums text-fg">
                {w} × {d} m
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Roof</dt>
              <dd className="font-mono tabular-nums text-fg">
                {roof.toLocaleString()} ft² · {sq} sq
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Stories</dt>
              <dd className="font-mono tabular-nums text-fg">{spec.levels ?? spec.stories}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Territory</dt>
              <dd className="font-mono text-fg">{spec.areaCode || "—"}</dd>
            </div>
            {rec?.heightM ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Height</dt>
                <dd className="font-mono tabular-nums text-fg">{rec.heightM.toFixed(1)} m</dd>
              </div>
            ) : null}
            {rec?.sqft ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">USA Structures</dt>
                <dd className="font-mono tabular-nums text-fg">{rec.sqft.toLocaleString()} ft²</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {tab === "overview" || tab === "exposure" ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Storm exposure</p>
            <p className="mt-2 text-sm text-fg">{stormName || "Local hail walk"}</p>
            <p className="mt-1 text-sm text-muted">
              Integrity after replay {stormIntegrity}% · {events.length} modeled concerns
            </p>
            <p className="mt-2 text-xs leading-relaxed text-subtle">
              Exposure score is not a damage determination. Flags are modeled hypotheses until a named
              reviewer accepts them.
            </p>
            <ul className="mt-3 space-y-1">
              {events.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setFocusPart(e.part)}
                    className={cn(
                      "flex min-h-11 w-full items-baseline justify-between gap-2 rounded-md px-1 py-1.5 text-left",
                      focusPart === e.part ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    <span className="text-sm">{e.label}</span>
                    <span className="font-mono text-[10px] tracking-wide uppercase">
                      {PART_LABEL[e.part]} · H{e.severity}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "estimate" || tab === "package" ? (
          <div className="mt-2 border-t border-border pt-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Draft Decision Package</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{brief}</p>
            <p className="mt-3 font-mono text-sm tabular-nums text-fg">
              {formatUsd(spent)} · {hours}h · {findingsStatus}
            </p>
            <ul className="mt-3 space-y-3">
              {decisions.map((d) => (
                <li key={d.id} className="border-t border-border pt-3">
                  <p className="text-sm text-fg">
                    {String(d.priority).padStart(2, "0")} {PART_LABEL[d.part]}
                  </p>
                  <p className="mt-1 text-sm text-muted">{d.action}</p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-subtle">
                    {formatUsd(d.cost)} · {d.hours}h · draft
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "evidence" || tab === "package" ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Evidence ledger</p>
            <ul className="mt-3 space-y-3">
              {checklist.map((g) => (
                <li key={g.id}>
                  <p className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-fg">{g.label}</span>
                    <span className={cn("font-mono text-[10px] tracking-wide uppercase", g.state === "present" ? "text-ok" : g.state === "partial" ? "text-muted" : "text-danger")}>
                      {g.state}
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-subtle">{g.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs tracking-[0.16em] text-muted uppercase">Attach or request</p>
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-bg px-3 text-sm text-muted hover:text-fg">
              <Paperclip className="size-4" />
              Attach photos
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) attachEvidence(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addEvidenceNote(note);
                setNote("");
              }}
            >
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Field note"
                className="h-11 min-w-0 flex-1 rounded-md bg-bg px-3 text-sm text-fg shadow-border placeholder:text-subtle"
              />
              <Button type="submit" variant="outline" className="shrink-0">
                Note
              </Button>
            </form>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => requestEvidence("Post-event roof photos")}>
              Request field capture
            </Button>
            {attachments.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {attachments.map((a) => (
                  <li key={a.id} className="text-xs">
                    <p className="text-fg">{a.name}</p>
                    <p className="font-mono text-[10px] text-subtle">
                      {a.kind} · {a.hash} · {new Date(a.captured_at).toISOString()}
                    </p>
                    <p className="text-subtle">{a.note}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {(tab === "overview" || tab === "insurance") && ins ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Insurance sketch</p>
            <p className="mt-2 text-sm text-fg">
              {ins.form} · dwelling {formatUsd(ins.dwelling)}
            </p>
            <p className="mt-1 text-sm text-muted">
              Deductible {ins.deductiblePct}% ({formatUsd(ins.deductible)}) · {ins.carrierTerritory}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-pretty text-subtle">{ins.note}</p>
            <p className="mt-2 text-xs text-subtle">Sketch only. Not a coverage determination or filing. No carrier system access.</p>
          </div>
        ) : tab === "insurance" ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Claim workspace</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Carrier, policy, and claim IDs are entered by an authorized person. This screen does not pull insurer systems, predict coverage, or file.
            </p>
          </div>
        ) : null}
        {tab === "overview" && rec ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">
              {rec.source === "attom" ? "Assessor · ATTOM" : "USA Structures"}
            </p>
            {rec.apn ? (
              <p className="mt-2 font-mono text-sm tabular-nums text-fg">{rec.source === "attom" ? "APN" : "BUILD"} {rec.apn}</p>
            ) : null}
            {rec.owner ? <p className="mt-1 text-sm text-fg">{rec.owner}</p> : null}
            <p className="mt-1 text-sm text-muted">
              {[rec.yearBuilt ? `Built ${rec.yearBuilt}` : "", rec.className, rec.assessed ? formatUsd(rec.assessed) : ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ) : null}
        {tab === "overview" && links.length > 0 ? (
          <div className="mt-5 border-t border-border pt-4">
            <OutLinks links={links} />
          </div>
        ) : null}

        {tab === "imagery" ? (
          <div className="mt-2 border-t border-border pt-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Imagery</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Basemap</dt>
                <dd className="text-fg">Esri World Imagery / Maxar</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Capture</dt>
                <dd className="text-fg">Current tile, not a hail-pass</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Pre-event</dt>
                <dd className="text-subtle">Not on file</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Post-event</dt>
                <dd className="text-subtle">Not on file</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-subtle">
              Ordinary satellite tiles cannot confirm hail strikes, bruising, or granule loss. Attach dated imagery or field photos.
            </p>
          </div>
        ) : null}

        {tab === "twin" ? (
          <div className="mt-2 border-t border-border pt-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">3D digital twin</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(["footprint", "measured", "evidence"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={m === "measured" && !measured}
                  onClick={() => setTwinMode(m)}
                  className={cn(
                    "min-h-9 rounded-md px-2.5 font-mono text-[10px] tracking-wide uppercase",
                    twinMode === m ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:text-fg",
                    m === "measured" && !measured ? "opacity-40" : "",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{twinLabel(twinMode, measured)}</p>
            <p className="mt-2 text-xs text-subtle">
              High-resolution roof model unavailable for this location. Use parcel footprint, imagery, field capture, or a supported measurement provider.
            </p>
          </div>
        ) : null}

        {tab === "logistics" ? (
          <div className="mt-2 border-t border-border pt-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Fulfillment plan</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Crews and yards on the map are recommendations. Dispatch needs the human gate. No autonomous order, contract, or supplier commitment.
            </p>
            {site ? (
              <ul className="mt-3 space-y-2 text-sm">
                {site.pois.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className="text-fg">{p.name}</span>
                    <span className="font-mono text-xs text-muted">{p.kind} · {p.minutes} min</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {tab === "log" ? (
          <div className="mt-2 border-t border-border pt-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Activity</p>
            <ul className="mt-3 space-y-2">
              {swarm.log.slice(-12).reverse().map((e) => (
                <li key={e.id} className="text-xs">
                  <p className="text-fg">{e.detail}</p>
                  <p className="font-mono text-[10px] text-subtle">
                    {e.agent} · {e.kind} · {e.hash}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="space-y-2 border-t border-border p-3">
        <Button variant="outline" className="w-full" onClick={() => saveNow()}>
          <Bookmark className="size-4" />
          Save to Your houses
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() =>
            saveLotArtifacts({ spec, stormName, events, decisions, brief, site, proof, envelope })
          }
        >
          <Download className="size-4" />
          Download files
        </Button>
        {loadError ? <p className="text-sm text-danger">{loadError}</p> : null}
        <label className="block text-sm font-semibold text-fg" htmlFor="lock-name">
          Sign as
        </label>
        <input
          id="lock-name"
          value={operatorName}
          onChange={(e) => setOperatorName(e.target.value)}
          className="h-12 w-full rounded-md bg-bg px-3 text-base text-fg shadow-border placeholder:text-muted"
          placeholder="Your name on the package"
        />
        <Button className="w-full" onClick={() => void confirmMeasure()} disabled={findingsStatus === "rejected"}>
          <Ruler className="size-4" />
          Lock package
        </Button>
      </div>
    </aside>
  );
}

import { useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { OutLinks } from "@/components/ops/OutLinks";
import { Button } from "@/components/ui/button";
import { buildLinks } from "@/lib/geo/links";
import { saveLotArtifacts } from "@/lib/geo/save";
import { formatUsd } from "@/lib/house/agent";
import { formatReport } from "@/lib/house/report";
import { PART_LABEL } from "@/lib/house/types";
import { useLot } from "@/lib/house/store";

export function Report() {
  const spec = useLot((s) => s.spec);
  const phase = useLot((s) => s.phase);
  const open = useLot((s) => s.reportOpen);
  const setReportOpen = useLot((s) => s.setReportOpen);
  const events = useLot((s) => s.events);
  const decisions = useLot((s) => s.decisions);
  const brief = useLot((s) => s.brief);
  const stormName = useLot((s) => s.stormName);
  const site = useLot((s) => s.site);
  const proof = useLot((s) => s.proof);
  const envelope = useLot((s) => s.envelope);
  const outcome = useLot((s) => s.outcome);
  const [copied, setCopied] = useState(false);

  if (!spec || !open || phase !== "restored") return null;

  const spent = decisions.reduce((n, d) => n + d.cost, 0);
  const hours = decisions.reduce((n, d) => n + d.hours, 0);
  const building = site?.buildings.find((b) => b.id === site.matchedId) ?? null;
  const links = site ? buildLinks(site.place, building, site.zone) : [];
  const pack = { spec, stormName, events, decisions, brief, site, proof, envelope, outcome };

  async function copy() {
    const text = formatReport(pack);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center p-3 sm:items-center sm:p-8">
      <button
        type="button"
        className="absolute inset-0 bg-bg/50"
        aria-label="Close report"
        onClick={() => setReportOpen(false)}
      />
      <article className="relative flex max-h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-surface shadow-border">
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <p className="text-xs tracking-[0.16em] text-muted uppercase">DecisionPackage</p>
            <h2 className="font-display mt-1 text-2xl leading-tight text-fg">
              {spec.number} {spec.street}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {spec.styleLabel}
              {stormName ? ` · ${stormName}` : ""}
            </p>
            {envelope ? (
              <p className="mt-2 font-mono text-[10px] tracking-wide text-subtle uppercase">
                {envelope.id} · {envelope.status}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:text-fg"
            onClick={() => setReportOpen(false)}
            aria-label="Close report"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {brief ? <p className="text-sm leading-relaxed text-pretty text-fg">{brief}</p> : null}
          {outcome ? (
            <section className="mt-5">
              <p className="text-xs tracking-[0.16em] text-subtle uppercase">Outcome loop</p>
              <p className="mt-2 font-mono text-sm tabular-nums text-fg">
                {outcome.actualIntegrity}% after cell · {outcome.restoredIntegrity}% restored
              </p>
              <p className="mt-2 text-sm leading-relaxed text-pretty text-muted">{outcome.attribution}</p>
              <p className="mt-2 text-sm text-fg">{outcome.nextObjective}</p>
            </section>
          ) : null}
          {events.length > 0 ? (
            <section className="mt-5">
              <p className="text-xs tracking-[0.16em] text-subtle uppercase">Damage</p>
              <ol className="mt-2 space-y-2">
                {events.map((e, i) => (
                  <li key={e.id} className="text-sm text-muted">
                    <span className="font-mono text-xs text-subtle">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-fg"> {PART_LABEL[e.part]}</span>
                    <span> — {e.label}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {decisions.length > 0 ? (
            <section className="mt-5">
              <p className="text-xs tracking-[0.16em] text-subtle uppercase">Order of work</p>
              <ol className="mt-2 space-y-3">
                {decisions.map((d) => (
                  <li key={d.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <p className="font-mono text-xs tracking-wider text-subtle uppercase">
                      {String(d.priority).padStart(2, "0")} · {PART_LABEL[d.part]}
                    </p>
                    <p className="mt-1 text-sm font-medium text-fg">{d.action}</p>
                    <p className="mt-1 text-sm leading-relaxed text-pretty text-muted">{d.rationale}</p>
                    <p className="mt-2 font-mono text-xs tabular-nums text-subtle">
                      {formatUsd(d.cost)} · {d.hours}h
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {proof.length > 0 ? (
            <section className="mt-5">
              <p className="text-xs tracking-[0.16em] text-subtle uppercase">Proof rail</p>
              <ol className="mt-2 space-y-2">
                {proof.map((e) => (
                  <li key={e.id} className="text-sm text-muted">
                    <span className="font-mono text-[10px] text-subtle">{e.stage}</span>
                    <span className="text-fg"> {e.title}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {site?.property ? (
            <section className="mt-5">
              <p className="text-xs tracking-[0.16em] text-subtle uppercase">Assessor · ATTOM</p>
              <p className="mt-2 text-sm text-fg">
                {[site.property.apn, site.property.owner].filter(Boolean).join(" · ") || "Record on file"}
              </p>
            </section>
          ) : null}
          {links.length > 0 ? (
            <section className="mt-5 border-t border-border pt-4">
              <OutLinks links={links} />
            </section>
          ) : null}
          <p className="mt-5 text-xs leading-relaxed text-subtle">
            Hale drafts. You govern. Evolution may increase competence. It may never increase
            sovereignty.
          </p>
        </div>
        <footer className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs tabular-nums text-muted">
            {formatUsd(spent)}
            <span className="text-subtle"> · {hours}h</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void copy()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy package"}
            </Button>
            <Button variant="outline" onClick={() => saveLotArtifacts(pack)}>
              <Download className="size-4" />
              Download package
            </Button>
          </div>
        </footer>
      </article>
    </div>
  );
}

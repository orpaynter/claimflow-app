import { useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/download";
import { slugAddress } from "@/lib/geo/artifacts";
import { useLot } from "@/lib/house/store";

export function SavedReport() {
  const reading = useLot((s) => s.reading);
  const setReading = useLot((s) => s.setReading);
  const openSaved = useLot((s) => s.openSaved);
  const [copied, setCopied] = useState(false);
  if (!reading?.report) return null;
  const entry = reading;
  const text = entry.report;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-8">
      <button
        type="button"
        className="absolute inset-0 bg-bg/50"
        aria-label="Close saved report"
        onClick={() => setReading(null)}
      />
      <article className="relative flex max-h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-surface shadow-border">
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Saved report</p>
            <h2 className="font-display mt-1 text-2xl leading-tight text-fg">
              {entry.number} {entry.street}
            </h2>
            <p className="mt-1 text-xs text-subtle">{entry.status} · stored on this device</p>
          </div>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => setReading(null)}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>
        <pre className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted">
          {text}
        </pre>
        <footer className="flex flex-wrap gap-2 border-t border-border p-3">
          <Button variant="outline" onClick={() => void copy()}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadText(`galehouse-${slugAddress(entry.address)}-report.txt`, reading.report)}
          >
            <Download className="size-4" />
            Download
          </Button>
          <Button onClick={() => openSaved(entry.id)}>Walk again</Button>
        </footer>
      </article>
    </div>
  );
}

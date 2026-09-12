import { Download, FileText, MapPin, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/download";
import { formatUsd } from "@/lib/house/agent";
import { slugAddress } from "@/lib/geo/artifacts";
import { useLot } from "@/lib/house/store";

function when(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function BookPanel() {
  const open = useLot((s) => s.bookOpen);
  const setBookOpen = useLot((s) => s.setBookOpen);
  const book = useLot((s) => s.book);
  const openSaved = useLot((s) => s.openSaved);
  const readSaved = useLot((s) => s.readSaved);
  const removeSaved = useLot((s) => s.removeSaved);
  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-8">
      <button
        type="button"
        className="absolute inset-0 bg-bg/50"
        aria-label="Close your houses"
        onClick={() => setBookOpen(false)}
      />
      <aside className="relative flex max-h-[82dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-border">
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <p className="text-sm font-semibold text-muted">Your houses</p>
            <h2 className="font-display mt-1 text-2xl leading-tight text-fg">Saved on this device</h2>
            <p className="mt-1 text-sm text-muted">Drafts and reports stay in this browser. Nothing is uploaded.</p>
          </div>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => setBookOpen(false)}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {book.length === 0 ? (
            <p className="border-t border-border pt-4 text-base leading-relaxed text-fg">
              No houses yet. Type an address, walk a storm, and the draft estimate is saved here automatically.
            </p>
          ) : (
            <ul className="space-y-4">
              {book.map((e) => (
                <li key={e.id} className="border-t border-border pt-4">
                  <p className="text-base font-medium text-fg">
                    {e.number} {e.street}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {e.locality || e.styleLabel}
                    {e.stormName ? ` · ${e.stormName}` : ""}
                    {typeof e.integrity === "number" ? ` · ${e.integrity}% after cell` : ""}
                  </p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-muted">
                    {e.status} · {formatUsd(e.spent)} · {e.hours}h · {when(e.savedAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => openSaved(e.id)}>
                      <MapPin className="size-4" />
                      Walk again
                    </Button>
                    {e.report ? (
                      <Button variant="outline" onClick={() => readSaved(e.id)}>
                        <FileText className="size-4" />
                        Open report
                      </Button>
                    ) : null}
                    {e.report ? (
                      <Button
                        variant="ghost"
                        onClick={() => downloadText(`galehouse-${slugAddress(e.address)}-report.txt`, e.report)}
                      >
                        <Download className="size-4" />
                        Download
                      </Button>
                    ) : null}
                    <Button variant="ghost" onClick={() => removeSaved(e.id)} aria-label={`Remove ${e.number} ${e.street}`}>
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

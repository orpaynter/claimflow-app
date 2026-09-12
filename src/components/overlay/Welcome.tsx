import { HelpCircle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CLAIM_STATUS } from "@/lib/claim/status";
import { cn } from "@/lib/cn";
import { useLot } from "@/lib/house/store";

export function Welcome() {
  const hydrateBook = useLot((s) => s.hydrateBook);
  const hydrateStorms = useLot((s) => s.hydrateStorms);
  const storms = useLot((s) => s.storms);
  const loadError = useLot((s) => s.loadError);
  const setGuideOpen = useLot((s) => s.setGuideOpen);
  const setBookOpen = useLot((s) => s.setBookOpen);
  const book = useLot((s) => s.book);

  useEffect(() => {
    hydrateBook();
    void hydrateStorms();
  }, [hydrateBook, hydrateStorms]);

  return (
    <div className="pointer-events-none absolute inset-x-3 top-28 z-20 flex justify-start sm:bottom-24 sm:top-auto">
      <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-surface/92 p-4 shadow-border backdrop-blur-sm">
        <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-muted uppercase">
          <span className="grid size-7 place-items-center rounded-sm bg-navy text-[11px] font-semibold tracking-tight text-fg">OP</span>
          OrPaynter
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight text-fg">Storm Command</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Satellite first. Any address. Storm exposure is not a damage determination. AI drafts. You govern.
        </p>
        <p className="mt-2 text-xs text-subtle">
          {loadError
            ? loadError
            : storms.length > 0
              ? `${storms.length} live cells. Type an address or tap a cell.`
              : "No live warnings. Type any U.S. street address."}
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
          {CLAIM_STATUS.slice(0, 8).map((s) => (
            <li key={s.id} className={cn("font-mono text-[10px] tracking-wide", s.tone)}>
              {s.label}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setGuideOpen(true)}>
            <HelpCircle className="size-4" />
            How this works
          </Button>
          <Button variant="ghost" onClick={() => setBookOpen(true)}>
            Your houses{book.length ? ` (${book.length})` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}

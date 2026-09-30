import { X } from "lucide-react";
import { GUIDE } from "@/lib/house/guide";
import { useLot } from "@/lib/house/store";

export function Guide() {
  const open = useLot((s) => s.guideOpen);
  const setGuideOpen = useLot((s) => s.setGuideOpen);
  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-8">
      <button
        type="button"
        className="absolute inset-0 bg-bg/50"
        aria-label="Close field manual"
        onClick={() => setGuideOpen(false)}
      />
      <article role="dialog" aria-modal="true" aria-labelledby="claimflow-guide-title" className="relative flex max-h-[82dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-border md:max-w-2xl lg:max-w-3xl">
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <p className="text-sm font-semibold text-muted">Field manual</p>
            <h2 id="claimflow-guide-title" className="font-display mt-1 text-2xl leading-tight text-fg">How ClaimFlow works</h2>
          </div>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => setGuideOpen(false)}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 md:px-7">
          {GUIDE.map((section) => (
            <section key={section.id} className="border-t border-border pt-4 pb-1">
              <h3 className="text-base font-semibold text-fg">{section.title}</h3>
              {section.body.map((p) => (
                <p key={p} className="mt-2 text-base leading-relaxed text-pretty text-fg">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

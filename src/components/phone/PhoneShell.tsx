import { BookMarked, FileCheck, HelpCircle, Home, Map, RotateCcw, Warehouse } from "lucide-react";
import { cn } from "@/lib/cn";
import { coach } from "@/lib/house/coach";
import { useLot } from "@/lib/house/store";
import type { Phase } from "@/lib/house/types";

function tabOf(phase: Phase): "roof" | "map" | "twin" | "pack" {
  if (phase === "orbit" || phase === "track") return "roof";
  if (phase === "select" || phase === "dispatch") return "map";
  if (phase === "restored") return "pack";
  return "twin";
}

export function PhoneShell() {
  const phase = useLot((s) => s.phase);
  const resetLot = useLot((s) => s.resetLot);
  const setGuideOpen = useLot((s) => s.setGuideOpen);
  const setBookOpen = useLot((s) => s.setBookOpen);
  const book = useLot((s) => s.book);
  const c = coach(phase);
  const tab = tabOf(phase);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30">
      <div className="pointer-events-auto border-b border-border bg-surface pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex min-h-14 items-center gap-2 px-3">
          <p className="grid size-9 shrink-0 place-items-center rounded-sm bg-navy text-xs font-semibold tracking-tight text-fg">
            OP
          </p>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-fg">{c.here}</p>
            <p className="truncate text-sm text-muted">
              {c.step}/{c.of} · {c.next}
            </p>
          </div>
          {phase !== "orbit" ? (
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
              onClick={resetLot}
              aria-label="Start over"
            >
              <RotateCcw className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => setBookOpen(true)}
            aria-label="Your houses"
          >
            <BookMarked className="size-4" />
            {book.length > 0 ? <span className="sr-only">{book.length} saved</span> : null}
          </button>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            onClick={() => setGuideOpen(true)}
            aria-label="How this works"
          >
            <HelpCircle className="size-4" />
          </button>
        </div>
      </div>
      <nav
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[max(0.4rem,env(safe-area-inset-bottom))]"
        aria-label="App"
      >
        <ul className="grid grid-cols-4">
          {(
            [
              { id: "roof" as const, label: "Roof", icon: Home },
              { id: "map" as const, label: "Map", icon: Map },
              { id: "twin" as const, label: "House", icon: Warehouse },
              { id: "pack" as const, label: "Lock", icon: FileCheck },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const on = tab === item.id;
            return (
              <li key={item.id}>
                <p
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 text-sm font-medium",
                    on ? "text-accent" : "text-muted",
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </p>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

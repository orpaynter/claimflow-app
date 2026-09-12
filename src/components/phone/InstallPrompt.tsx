import { SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "claimflow.install.dismissed";

export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const ios = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const isApp = media.matches || ios;
    setStandalone(isApp);
    if (isApp) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, []);

  if (standalone || !open) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-30 px-3">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 rounded-lg bg-navy px-3 py-2 shadow-border">
        <p className="min-w-0 flex-1 text-sm font-medium text-fg">Install ClaimFlow on this phone</p>
        <Button
          className="min-h-11 shrink-0 px-3"
          onClick={() => {
            window.location.assign("/?install=1");
          }}
        >
          <SquarePlus className="size-4" />
          Install
        </Button>
        <button
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:text-fg"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}

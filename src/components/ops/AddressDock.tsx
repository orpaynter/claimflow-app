import { MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { unlockAudio } from "@/lib/audio";
import { cn } from "@/lib/cn";
import { useLot } from "@/lib/house/store";

export function AddressDock() {
  const phase = useLot((s) => s.phase);
  const address = useLot((s) => s.address);
  const setAddress = useLot((s) => s.setAddress);
  const searchAddress = useLot((s) => s.searchAddress);
  const loading = useLot((s) => s.loading);
  const [local, setLocal] = useState("");
  if (phase === "orbit") return null;
  const value = local || address;

  return (
    <form
      className="pointer-events-auto absolute top-[3.35rem] left-3 z-40 flex w-[min(calc(100%-1.5rem),22rem)] gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void unlockAudio();
        const next = value.trim();
        if (next.length < 3) return;
        setLocal("");
        void searchAddress(next);
      }}
    >
      <label className="sr-only" htmlFor="dock-address">
        Any street address
      </label>
      <div className="relative min-w-0 flex-1">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
        <input
          id="dock-address"
          value={value}
          onChange={(e) => {
            setLocal(e.target.value);
            setAddress(e.target.value);
          }}
          placeholder="Any U.S. street address"
          autoComplete="street-address"
          className={cn(
            "h-11 w-full rounded-md bg-surface/92 px-3 pl-10 text-sm text-fg shadow-border backdrop-blur-sm",
            "placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          )}
        />
      </div>
      <Button type="submit" variant="outline" disabled={loading} className="shrink-0">
        {loading ? "Finding" : "Go"}
      </Button>
    </form>
  );
}

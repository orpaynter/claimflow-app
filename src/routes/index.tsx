import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookPanel } from "@/components/ops/BookPanel";
import { Guide } from "@/components/ops/Guide";
import { LearningPanel } from "@/components/ops/LearningPanel";
import { MeasurePanel } from "@/components/ops/MeasurePanel";
import { OpsLoop } from "@/components/ops/OpsLoop";
import { SavedReport } from "@/components/ops/SavedReport";
import { SelectPanel } from "@/components/ops/SelectPanel";
import { Report } from "@/components/overlay/Report";
import { RoofIntake } from "@/components/overlay/RoofIntake";
import { PhoneDock } from "@/components/phone/PhoneDock";
import { PhoneShell } from "@/components/phone/PhoneShell";
import { isMapPhase } from "@/lib/house/types";
import { useLot } from "@/lib/house/store";
import { readLotParam } from "@/lib/house/url";

const LazyMap = lazy(() => import("@/components/ops/SatelliteMap"));
const World = lazy(() => import("@/components/scene/World").then((m) => ({ default: m.World })));

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const phase = useLot((s) => s.phase);
  const spec = useLot((s) => s.spec);
  const searchAddress = useLot((s) => s.searchAddress);
  const hydrateStorms = useLot((s) => s.hydrateStorms);
  const hydrateBook = useLot((s) => s.hydrateBook);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    hydrateBook();
    void hydrateStorms();
    const at = readLotParam();
    if (at.length >= 3 && useLot.getState().phase === "orbit") {
      void searchAddress(at);
    }
  }, [searchAddress, hydrateStorms, hydrateBook]);

  const showMap = isMapPhase(phase);
  const showWorld = Boolean(spec) && !showMap;

  return (
    <main className="relative h-dvh overflow-hidden bg-bg text-fg">
      <OpsLoop />
      {ready && showMap ? (
        <Suspense fallback={<div className="absolute inset-0 bg-bg" />}>
          <LazyMap />
        </Suspense>
      ) : null}
      {showWorld ? (
        <Suspense fallback={<div className="absolute inset-0 bg-bg" />}>
          <World />
        </Suspense>
      ) : null}
      {!showMap && !showWorld ? <div className="absolute inset-0 bg-bg" /> : null}
      <div className="pointer-events-none absolute inset-0 z-10">
        <PhoneShell />
        {phase === "orbit" ? <RoofIntake /> : null}
        {phase === "track" ? <TrackBanner /> : null}
        {phase === "select" ? <SelectPanel /> : null}
        {phase === "measure" ? <MeasurePanel /> : null}
        {phase === "restored" ? <LearningPanel /> : null}
        <PhoneDock />
        <Report />
        <Guide />
        <BookPanel />
        <SavedReport />
      </div>
    </main>
  );
}

function TrackBanner() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[5.5rem] z-20 flex justify-center px-4">
      <p className="shimmer-text rounded-full bg-surface/90 px-4 py-2 text-sm shadow-border">
        Finding that address.
      </p>
    </div>
  );
}

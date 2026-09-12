import { useEffect } from "react";
import { useLot } from "@/lib/house/store";

export function OpsLoop() {
  const phase = useLot((s) => s.phase);
  const tickHail = useLot((s) => s.tickHail);
  const hydrateSenses = useLot((s) => s.hydrateSenses);

  useEffect(() => {
    if (phase !== "select") return;
    let id = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tickHail(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [phase, tickHail]);

  useEffect(() => {
    if (phase !== "storm" && phase !== "measure" && phase !== "survey") return;
    void hydrateSenses();
    const t = window.setInterval(() => void hydrateSenses(), 45000);
    return () => window.clearInterval(t);
  }, [phase, hydrateSenses]);

  return null;
}

import { create } from "zustand";
import { runGaccProduct, type GaccProductRun } from "./run";

interface GaccRunState {
  status: "idle" | "running" | "passed" | "failed";
  run: GaccProductRun | null;
  error: string;
  start: (input: {
    operatorName: string;
    address: string;
    note: string;
    evidenceNames: string[];
  }) => Promise<void>;
  clear: () => void;
}

export const useGaccRun = create<GaccRunState>((set) => ({
  status: "idle",
  run: null,
  error: "",
  start: async (input) => {
    set({ status: "running", run: null, error: "" });
    const result = await runGaccProduct({ data: input });
    if (!result.ok) {
      set({ status: "failed", run: null, error: result.error });
      return;
    }
    set({
      status: result.pass ? "passed" : "failed",
      run: result,
      error: result.pass ? "" : "GACC trace completed without PASS.",
    });
  },
  clear: () => set({ status: "idle", run: null, error: "" }),
}));

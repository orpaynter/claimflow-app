import { downloadJson, downloadText } from "@/lib/download";
import { formatReport } from "@/lib/house/report";
import type { DamageEvent, HouseSpec, RepairDecision } from "@/lib/house/types";
import type { AuthorityEnvelope, OutcomeRecord, ProofEvent } from "@/lib/orpa";
import { decisionPackage, footprintGeoJSON, slugAddress } from "./artifacts";
import type { Site } from "./types";

export interface LotPackageInput {
  spec: HouseSpec;
  stormName: string;
  events: DamageEvent[];
  decisions: RepairDecision[];
  brief: string;
  site: Site | null;
  proof?: ProofEvent[];
  envelope?: AuthorityEnvelope | null;
  outcome?: OutcomeRecord | null;
}

export function saveLotArtifacts(input: LotPackageInput): void {
  const slug = slugAddress(input.spec.address);
  downloadText(`galehouse-${slug}-report.txt`, formatReport(input));
  window.setTimeout(() => {
    downloadJson(`galehouse-${slug}-package.json`, decisionPackage(input));
  }, 80);
  if (input.site) {
    const site = input.site;
    window.setTimeout(() => {
      downloadJson(
        `galehouse-${slug}-footprint.geojson`,
        footprintGeoJSON(site, input.spec),
      );
    }, 160);
  }
}

export function saveFieldReport(input: LotPackageInput): void {
  downloadText(`galehouse-${slugAddress(input.spec.address)}-report.txt`, formatReport(input));
}

export function saveFootprint(input: LotPackageInput): void {
  if (!input.site) return;
  downloadJson(
    `galehouse-${slugAddress(input.spec.address)}-footprint.geojson`,
    footprintGeoJSON(input.site, input.spec),
  );
}

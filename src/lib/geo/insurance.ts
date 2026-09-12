import type { Building, InsuranceSketch, Place, Zone } from "./types";

const HAIL_BELT = new Set(["TX", "OK", "KS", "NE", "CO", "MO", "AR", "IL", "IN", "IA"]);

function dwellingRate(stateCode: string): number {
  if (["CA", "NY", "MA", "NJ", "HI"].includes(stateCode)) return 290;
  if (["CT", "WA", "OR", "MD", "VA", "DC"].includes(stateCode)) return 250;
  if (["FL", "TX", "AZ", "NV"].includes(stateCode)) return 195;
  return 220;
}

export function sketchInsurance(place: Place, building: Building, zone: Zone): InsuranceSketch {
  const sqft = Math.max(700, Math.round(building.areaM2 * 10.764));
  const levels = Math.max(1, building.levels);
  const living = Math.round(sqft * Math.min(2, levels) * 0.92);
  const rate = dwellingRate(place.stateCode);
  const dwelling = Math.round((living * rate) / 1000) * 1000;
  const otherStructures = Math.round(dwelling * 0.1);
  const hail = HAIL_BELT.has(place.stateCode);
  const deductiblePct = hail ? 2 : 1;
  const deductible = Math.round((dwelling * deductiblePct) / 100 / 100) * 100;
  const roofSqft = Math.round(sqft / Math.cos(0.42));
  const roofSquares = Math.max(12, Math.round(roofSqft / 100));
  return {
    form: "HO-3",
    dwelling,
    otherStructures,
    deductible,
    deductiblePct,
    carrierTerritory: zone.areaCode,
    roofSquares,
    note: hail
      ? "Hail-belt territory. Percentage deductible is typical. Confirm the roof endorsement before you bid."
      : "Standard dwelling form. Roof ACV vs replacement is the argument — get it in writing.",
  };
}

export function roofAreaSqft(areaM2: number, pitch = 0.42): number {
  return Math.round(areaM2 * 10.764 / Math.cos(pitch));
}

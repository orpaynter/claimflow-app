export type LaneKind = "sense" | "vertical";

export interface Lane {
  id: string;
  kind: LaneKind;
  name: string;
  line: string;
  input: string;
  drafts: string;
  gate: string;
  cash: string;
  source: string;
  live: boolean;
}

/** Sensors that feed every vertical. Same city, same storm. */
export const SENSES: Lane[] = [
  {
    id: "satellite",
    kind: "sense",
    name: "Satellite",
    line: "Esri imagery plus public footprints. The city is real.",
    input: "World Imagery, OSM / USA Structures / Microsoft outlines",
    drafts: "Lot geometry, roof squares, neighborhood hit map",
    gate: "Reads. No package.",
    cash: "—",
    source: "orpaynter/claimflow · geo lookup",
    live: true,
  },
  {
    id: "weather",
    kind: "sense",
    name: "Weather",
    line: "Public cells and hail reports, modeled path labeled.",
    input: "NWS alerts, IEM local storm reports",
    drafts: "Exposure rings, arrival, severity",
    gate: "Reads. No package.",
    cash: "—",
    source: "orpaynter/claimflow · storm-intel",
    live: true,
  },
  {
    id: "drone",
    kind: "sense",
    name: "Drone",
    line: "Close inspection of the selected roof after the cell.",
    input: "Modeled roof scan on the extruded footprint",
    drafts: "Hail scars, slope callouts, missing-evidence list",
    gate: "Inspector proposes. Human accepts findings.",
    cash: "—",
    source: "Galehouse 3D inspector",
    live: true,
  },
  {
    id: "iot",
    kind: "sense",
    name: "IoT",
    line: "Meters, SCADA, and site sensors as evidence links — not silent actuators.",
    input: "Modeled site telemetry on hit lots",
    drafts: "Anomaly flags with hashes",
    gate: "No grid or clinical action without a package.",
    cash: "—",
    source: "AIA engines · DecisionPackage evidence chain",
    live: true,
  },
];

/**
 * Same five questions in every industry.
 * Contracting is the live proof in this session. Other lanes run the same gate
 * on the same storm — synthetic events, real control plane.
 */
export const VERTICALS: Lane[] = [
  {
    id: "contracting",
    kind: "vertical",
    name: "Contracting",
    line: "AI drafts the claim. You approve every dollar.",
    input: "Photos, two estimates, weather, lot geometry",
    drafts: "Scope, line items, DecisionPackage",
    gate: "Named contractor / operator",
    cash: "Carrier packet after lock — not in this session",
    source: "orpaynter/claimflow",
    live: true,
  },
  {
    id: "houses",
    kind: "vertical",
    name: "Houses",
    line: "Any typed U.S. address. Never a house we picked.",
    input: "Geocode, footprint, 3D twin",
    drafts: "Modeled damage, dimensions, estimate",
    gate: "Exposure is not a determination",
    cash: "Draft $ only",
    source: "Galehouse · ClaimFlow Storm Command",
    live: true,
  },
  {
    id: "fraud",
    kind: "vertical",
    name: "Fraud",
    line: "TRAE scores the file. A human still decides.",
    input: "Claim file, licensing, court, business registry",
    drafts: "Risk factors, dissent, missing evidence",
    gate: "Below the bar — a person must decide",
    cash: "Hold, do not pay",
    source: "orpaynter/claimflow · TRAE",
    live: true,
  },
  {
    id: "supply",
    kind: "vertical",
    name: "Supply chain",
    line: "Yards and crews on the same plane as the damage.",
    input: "OSM yards, stock, minutes, area code",
    drafts: "Route, ETA, material list",
    gate: "Dispatch only after the package locks",
    cash: "Purchase order is a proposal",
    source: "logistics-scout",
    live: true,
  },
  {
    id: "healthcare",
    kind: "vertical",
    name: "Healthcare",
    line: "AI flags the finding. Physician approves the order.",
    input: "Labs, imaging, notes — here: surge from the same cell",
    drafts: "Prior-auth request, protocol",
    gate: "Attending physician",
    cash: "Payer auth after lock",
    source: "AIA → TRAE → ORPA · HIPAA-scoped pack",
    live: false,
  },
  {
    id: "finance",
    kind: "vertical",
    name: "Finance",
    line: "AI recommends the trade. Advisor approves the order.",
    input: "Accounts, feeds, suitability — here: reserve vs. loss from the cell",
    drafts: "Rebalance, SAR draft, reserve",
    gate: "Advisor / compliance",
    cash: "Order executes only after lock",
    source: "AIA · SEC 17a-4 shaped pack",
    live: false,
  },
  {
    id: "government",
    kind: "vertical",
    name: "Government",
    line: "AI scores the bid. Officer approves the award.",
    input: "Bid pack, vendor history — here: emergency procurement after the cell",
    drafts: "Ranking, red flags, justification",
    gate: "Contracting officer",
    cash: "Award → obligation after lock",
    source: "AIA · FAR-shaped pack",
    live: false,
  },
  {
    id: "grid",
    kind: "vertical",
    name: "Power grid",
    line: "AI drafts the window. Operator approves the action.",
    input: "SCADA, outage tickets, weather",
    drafts: "Load, crew window, safety override",
    gate: "Grid operator. Safety-critical kill.",
    cash: "Outage vs. maintenance cost",
    source: "AIA · NERC-shaped pack",
    live: false,
  },
  {
    id: "legal",
    kind: "vertical",
    name: "Law firms",
    line: "AI reviews the contract. Attorney approves the send.",
    input: "Matter files, notices, privilege",
    drafts: "Risk clause, filing draft",
    gate: "Named attorney. Privilege stays intact.",
    cash: "Matter hours after lock",
    source: "AIA · privilege pack",
    live: false,
  },
  {
    id: "justice",
    kind: "vertical",
    name: "Criminal justice",
    line: "AI drafts the packet. A human still charges.",
    input: "Case file, evidence hashes",
    drafts: "Discovery index, dissent",
    gate: "Prosecutor / judge of record",
    cash: "—",
    source: "AIA → TRAE · append-only",
    live: false,
  },
  {
    id: "education",
    kind: "vertical",
    name: "Schools",
    line: "AI flags the record. A named official acts.",
    input: "Student record, incident, policy",
    drafts: "Action, notice",
    gate: "Administrator. FERPA-shaped pack.",
    cash: "—",
    source: "AIA · same gate",
    live: false,
  },
];

export const LANES: Lane[] = [...SENSES, ...VERTICALS];

export function laneById(id: string): Lane {
  return LANES.find((l) => l.id === id) ?? VERTICALS[0]!;
}

export interface GuideSection {
  id: string;
  title: string;
  body: string[];
}

export const GUIDE: GuideSection[] = [
  {
    id: "path",
    title: "The path",
    body: [
      "ClaimFlow is one roof: put your name and address in, see the lot, lock a Decision Package. AI drafts. You govern.",
      "The map is the territory of that house — satellite, footprints, a 3D twin. It is not a globe of every industry.",
      "Nothing files, orders, or pays. Your name on the lock is the product.",
    ],
  },
  {
    id: "use",
    title: "How to use it",
    body: [
      "1. Intake — Your name, the street, photos if you have them.",
      "2. Territory — We geocode the pin and raise the real outline. Open this house.",
      "3. Twin — Watch a modeled replay, or skip it. Watching is not approval.",
      "4. Lock — Read the draft. Your name freezes the Decision Package on this device.",
    ],
  },
  {
    id: "words",
    title: "What the words mean",
    body: [
      "Exposure is not a damage determination. A hail cell crossing a pin does not prove the roof was hit.",
      "Footprint model means we extruded a public outline. It is not a licensed roof measurement.",
      "Modeled concern is a hypothesis the replay placed on a slope, sash, or stack. A named human must accept it.",
      "Draft Decision Package is an estimate you can reject. It is not a carrier filing and not a work order.",
      "Your houses is a library on this browser. It is not an account in the cloud.",
    ],
  },
  {
    id: "scale",
    title: "How this scales",
    body: [
      "Roofing is not the product. Roofing is the proof. Every industry that lets AI act hits the same five questions: what happened, why, who authorized it, can I prove it, can I stop it.",
      "Senses (satellite, weather, drone, IoT) feed the city plane. Verticals (contracting, houses, fraud, supply, healthcare, finance, government, grid) share one MAS swarm, one DecisionPackage, one kill switch, one learning ledger.",
      "Contracting, houses, fraud, supply, and the senses run live in this session. Healthcare, finance, government, and the grid use the same gate on synthetic events from this storm — labeled. Nothing files, pays, or actuates without a named human.",
      "After a lot closes, predicted versus observed writes the ledger. The next storm is cheaper to forecast. Evolution may increase competence. It may never increase sovereignty.",
    ],
  },
  {
    id: "save",
    title: "Saving and revisiting",
    body: [
      "Every draft estimate and closed report is written to Your houses on this device (this browser’s storage).",
      "Open Your houses from the book icon. Revisit a house to walk it again, or open the saved report without replaying.",
      "Download writes a text report, a JSON package, and a GeoJSON footprint you can keep elsewhere.",
      "Clearing this browser’s site data deletes the library. There is no cloud sync and no sign-in.",
    ],
  },
  {
    id: "extend",
    title: "How to extend it",
    body: [
      "Live with no key: OpenStreetMap outlines, USA Structures, Microsoft Building Footprints, Nominatim geocode, NWS alerts, IEM storm reports, Esri/Maxar tiles.",
      "Waiting on keys: ATTOM assessor facts, Google Places crews and yards, Grok steward (Hale) for the order of work.",
      "To add a measurement or imagery provider, write an adapter that returns geometry plus source, captured-at, and confidence. Never silently substitute a generated house.",
      "Every consequential step should append a proof event (who, what, source, time). AI may draft. A named human approves. Exposure must not promote itself to a finding.",
      "Operator commands (Command, Review, Approve, Reject, Override, Stop, Inspect, Proof, Reconcile) stay behind Operator. They are the oversight rail, not the everyday path.",
    ],
  },
];

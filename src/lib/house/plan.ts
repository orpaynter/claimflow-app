import { createServerFn } from "@tanstack/react-start";
import { finalizeDecisions, planLocal } from "./agent";
import type { DamageEvent, HouseSpec, RepairDecision } from "./types";
import { PARTS } from "./types";

type PlanInput = { spec: HouseSpec; events: DamageEvent[] };
type PlanResult = {
  ok: true;
  brief: string;
  decisions: RepairDecision[];
  source: "steward" | "local";
};

function isPart(v: unknown): v is RepairDecision["part"] {
  return typeof v === "string" && (PARTS as readonly string[]).includes(v);
}

function parseGrok(text: string, fallback: PlanResult): PlanResult {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return fallback;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as {
      brief?: unknown;
      decisions?: unknown;
    };
    const brief =
      typeof raw.brief === "string" && raw.brief.trim()
        ? raw.brief.trim()
        : fallback.brief;
    if (!Array.isArray(raw.decisions)) return { ...fallback, brief };
    const seen = new Set<string>();
    const parsed: RepairDecision[] = [];
    for (const row of raw.decisions) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (!isPart(r.part) || seen.has(r.part)) continue;
      seen.add(r.part);
      parsed.push({
        id: `d-${r.part}`,
        part: r.part,
        action: typeof r.action === "string" ? r.action : "Repair",
        rationale: typeof r.rationale === "string" ? r.rationale : "",
        cost: typeof r.cost === "number" ? Math.round(r.cost) : 0,
        hours: typeof r.hours === "number" ? Math.round(r.hours) : 0,
        priority: parsed.length + 1,
        source: "steward",
      });
    }
    if (parsed.length === 0) return { ...fallback, brief };
    return {
      ok: true,
      brief,
      decisions: finalizeDecisions(parsed, fallback.decisions),
      source: "steward",
    };
  } catch {
    return fallback;
  }
}

export const planRepairs = createServerFn({ method: "POST" })
  .validator((input: PlanInput) => input)
  .handler(async ({ data }): Promise<PlanResult> => {
    const local = planLocal(data.spec, data.events);
    const fallback: PlanResult = {
      ok: true,
      brief: local.brief,
      decisions: local.decisions,
      source: "local",
    };

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return fallback;

    const damageList = data.events
      .map((e) => `- ${e.part} severity ${e.severity}: ${e.label}`)
      .join("\n");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 700,
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You are Hale, a New England building steward. Field notebook voice: concrete, dry. JSON only.",
            },
            {
              role: "user",
              content: `Storm damage plan.

Address: ${data.spec.address}
Style: ${data.spec.styleLabel}
Lot: ${data.spec.notes}
Lot: ${data.spec.notes}

Damage:
${damageList}

JSON:
{"brief":"two site-specific sentences","decisions":[{"part":"roof","action":"4-8 word imperative","rationale":"one sentence why now","cost":1200,"hours":6}]}

Only damaged parts. Order: roof and chimney, then openings, then lot. Never lead with trees if the roof is open. USD, realistic. No markdown.`,
            },
          ],
        }),
      });
      if (!res.ok) return fallback;
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = body.choices?.[0]?.message?.content ?? "";
      return parseGrok(text, fallback);
    } catch {
      return fallback;
    } finally {
      clearTimeout(timer);
    }
  });

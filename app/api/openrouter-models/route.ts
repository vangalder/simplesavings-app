import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ORModel = {
  id: string;
  name: string;
  created?: number;
  pricing?: { prompt?: string; completion?: string };
};

export type DynamicModel = {
  id: string;
  name: string;
  tier: "latest" | "penultimate" | "value";
  pricePerMTok: number;
};

// OpenRouter uses x-ai/ (with hyphen) for xAI/Grok models
const PROVIDER_PREFIXES = ["openai/", "anthropic/", "google/", "x-ai/"] as const;

// Static baseline used when OpenRouter is unreachable
const FALLBACK: DynamicModel[] = [
  { id: "anthropic/claude-opus-4.7",      name: "Claude Opus 4.7",     tier: "latest",      pricePerMTok: 18.0  },
  { id: "anthropic/claude-haiku-4.5",     name: "Claude Haiku 4.5",    tier: "value",       pricePerMTok: 1.0   },
  { id: "openai/gpt-4o",                  name: "GPT-4o",               tier: "latest",      pricePerMTok: 12.5  },
  { id: "openai/gpt-4o-mini",             name: "GPT-4o mini",          tier: "value",       pricePerMTok: 0.75  },
  { id: "google/gemini-2.5-pro",          name: "Gemini 2.5 Pro",       tier: "latest",      pricePerMTok: 11.25 },
  { id: "google/gemini-2.5-flash",        name: "Gemini 2.5 Flash",     tier: "value",       pricePerMTok: 0.375 },
  { id: "x-ai/grok-4.3",                  name: "Grok 4.3",             tier: "latest",      pricePerMTok: 2.5   },
  { id: "x-ai/grok-4.20",                 name: "Grok 4.20",            tier: "penultimate", pricePerMTok: 2.5   },
];

function stripProviderPrefix(name: string): string {
  const idx = name.indexOf(": ");
  return idx !== -1 ? name.slice(idx + 2) : name;
}

function combinedPricePer1MTok(m: ORModel): number {
  if (!m.pricing) return Infinity;
  const p = parseFloat(m.pricing.prompt ?? "0");
  const c = parseFloat(m.pricing.completion ?? "0");
  if (isNaN(p) || isNaN(c)) return Infinity;
  return (p + c) * 1_000_000;
}

const MAX_PER_TIER = 3;

function bucketModels(raw: ORModel[]): DynamicModel[] {
  const filtered = raw.filter(
    (m) =>
      PROVIDER_PREFIXES.some((p) => m.id.startsWith(p)) &&
      !m.id.endsWith(":free") &&
      combinedPricePer1MTok(m) > 0
  );

  const placed = new Set<string>();
  const result: DynamicModel[] = [];

  const SIX_MO_S = 6 * 30 * 24 * 3_600;
  const EIGHTEEN_MO_S = 18 * 30 * 24 * 3_600;

  // Per-provider latest + penultimate, capped at MAX_PER_TIER each
  for (const prefix of PROVIDER_PREFIXES) {
    const group = filtered
      .filter((m) => m.id.startsWith(prefix))
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

    if (group.length === 0) continue;
    const newestTs = group[0].created ?? 0;

    let latestCount = 0;
    let penultimateCount = 0;

    for (const m of group) {
      if (placed.has(m.id)) continue;
      const age = newestTs - (m.created ?? 0);

      if (age <= SIX_MO_S && latestCount < MAX_PER_TIER) {
        result.push({ id: m.id, name: stripProviderPrefix(m.name), tier: "latest", pricePerMTok: combinedPricePer1MTok(m) });
        placed.add(m.id);
        latestCount++;
      } else if (age > SIX_MO_S && age <= EIGHTEEN_MO_S && penultimateCount < MAX_PER_TIER) {
        result.push({ id: m.id, name: stripProviderPrefix(m.name), tier: "penultimate", pricePerMTok: combinedPricePer1MTok(m) });
        placed.add(m.id);
        penultimateCount++;
      }
    }
  }

  // Value tier: cheapest models overall (overlap with generational tiers is intentional —
  // cheap-but-new models like gpt-4o-mini deserve a value label too)
  const valueCandidates = filtered
    .sort((a, b) => combinedPricePer1MTok(a) - combinedPricePer1MTok(b))
    .slice(0, 6);

  for (const m of valueCandidates) {
    if (!result.find((r) => r.id === m.id && r.tier === "value")) {
      result.push({ id: m.id, name: stripProviderPrefix(m.name), tier: "value", pricePerMTok: combinedPricePer1MTok(m) });
    }
  }

  return result;
}

export async function GET() {
  try {
    const headers: Record<string, string> = {
      "HTTP-Referer": "https://simplesavings.app",
      "X-Title": "Simple Savings",
    };
    if (process.env.OPENROUTER_API_KEY) {
      headers["Authorization"] = `Bearer ${process.env.OPENROUTER_API_KEY}`;
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) throw new Error(`OpenRouter responded ${res.status}`);

    const json = (await res.json()) as { data?: ORModel[] };
    const models = bucketModels(json.data ?? []);

    return NextResponse.json({ models, source: "live", fetchedAt: Date.now() });
  } catch (err) {
    console.error("[openrouter-models]", String(err));
    return NextResponse.json({ models: FALLBACK, source: "fallback", fetchedAt: Date.now() });
  }
}

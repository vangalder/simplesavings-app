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
const PROVIDER_PREFIXES = ["openai/", "anthropic/", "google/", "x-ai/", "deepseek/"] as const;

const STATIC_FALLBACK: DynamicModel[] = [
  { id: "anthropic/claude-opus-4.7",           name: "Claude Opus 4.7",             tier: "latest",      pricePerMTok: 30.0  },
  { id: "anthropic/claude-sonnet-4.6",         name: "Claude Sonnet 4.6",           tier: "latest",      pricePerMTok: 18.0  },
  { id: "anthropic/claude-haiku-4.5",          name: "Claude Haiku 4.5",            tier: "penultimate", pricePerMTok: 6.0   },
  { id: "anthropic/claude-3-haiku",            name: "Claude 3 Haiku",              tier: "value",       pricePerMTok: 1.5   },
  { id: "openai/gpt-4o",                       name: "GPT-4o",                      tier: "latest",      pricePerMTok: 12.5  },
  { id: "openai/gpt-4o-mini",                  name: "GPT-4o mini",                 tier: "penultimate", pricePerMTok: 0.75  },
  { id: "openai/gpt-3.5-turbo",                name: "GPT-3.5 Turbo",               tier: "value",       pricePerMTok: 2.0   },
  { id: "google/gemini-2.5-pro",               name: "Gemini 2.5 Pro",              tier: "latest",      pricePerMTok: 11.25 },
  { id: "google/gemini-2.5-flash",             name: "Gemini 2.5 Flash",            tier: "latest",      pricePerMTok: 0.375 },
  { id: "google/gemini-2.5-flash-lite",        name: "Gemini 2.5 Flash Lite",       tier: "penultimate", pricePerMTok: 0.5   },
  { id: "x-ai/grok-4.3",                       name: "Grok 4.3",                    tier: "latest",      pricePerMTok: 3.75  },
  { id: "x-ai/grok-4.20",                      name: "Grok 4.20",                   tier: "penultimate", pricePerMTok: 2.5   },
  { id: "deepseek/deepseek-r1-0528",           name: "DeepSeek R1",                 tier: "latest",      pricePerMTok: 2.74  },
  { id: "deepseek/deepseek-chat",              name: "DeepSeek V3 Chat",            tier: "latest",      pricePerMTok: 0.42  },
  { id: "deepseek/deepseek-v4-flash",          name: "DeepSeek V4 Flash",           tier: "value",       pricePerMTok: 0.50  },
];

function stripProviderPrefix(name: string): string {
  const idx = name.indexOf(": ");
  return idx !== -1 ? name.slice(idx + 2) : name;
}

// Filter routing aliases, utility/safety models, and multimodal/image models
// not suited for text-only conversational AI use cases.
// Checks both the raw model id and the human-readable name.
function isAliasOrUtility(id: string, name: string): boolean {
  // Routing aliases
  if (id.endsWith("-latest")) return true;
  if (id.includes("chat-latest")) return true;
  // OpenAI OSS safety/utility models
  if (id.includes("gpt-oss")) return true;
  if (id.includes("safeguard")) return true;
  // Multimodal / image-generation models — check both id and name (case-insensitive)
  const combined = `${id} ${name}`.toLowerCase();
  if (combined.includes("-image"))          return true;
  if (combined.includes("-vision"))         return true;
  if (combined.includes("dall-e"))          return true;
  if (combined.includes("stable-diffusion")) return true;
  if (combined.includes("flux"))            return true;
  if (combined.includes("midjourney"))      return true;
  // Explicit name-based checks for display names that don't encode type in the id
  if (name.includes("Image"))              return true;
  if (name.includes("Vision"))             return true;
  return false;
}

function combinedPricePer1MTok(m: ORModel): number {
  if (!m.pricing) return Infinity;
  const p = parseFloat(m.pricing.prompt ?? "0");
  const c = parseFloat(m.pricing.completion ?? "0");
  if (isNaN(p) || isNaN(c)) return Infinity;
  return (p + c) * 1_000_000;
}

const LATEST_CAP = 5;
const PENULT_CAP = 4;
const VALUE_CAP  = 2;  // cheapest per provider not in latest/penultimate

function bucketModels(raw: ORModel[]): DynamicModel[] {
  const filtered = raw.filter(
    (m) =>
      PROVIDER_PREFIXES.some((p) => m.id.startsWith(p)) &&
      !m.id.endsWith(":free") &&
      !isAliasOrUtility(m.id, m.name) &&
      combinedPricePer1MTok(m) > 0
  );

  const placed = new Set<string>();
  const result: DynamicModel[] = [];

  const SIX_MO_S     = 6  * 30 * 24 * 3_600;
  const EIGHTEEN_MO_S = 18 * 30 * 24 * 3_600;

  // Per-provider: latest then penultimate, capped separately
  for (const prefix of PROVIDER_PREFIXES) {
    const group = filtered
      .filter((m) => m.id.startsWith(prefix))
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

    if (group.length === 0) continue;
    const newestTs = group[0].created ?? 0;

    let latestCount = 0;
    let penultCount = 0;

    for (const m of group) {
      if (placed.has(m.id)) continue;
      const age = newestTs - (m.created ?? 0);

      if (age <= SIX_MO_S && latestCount < LATEST_CAP) {
        result.push({ id: m.id, name: stripProviderPrefix(m.name), tier: "latest",      pricePerMTok: combinedPricePer1MTok(m) });
        placed.add(m.id);
        latestCount++;
      } else if (age > SIX_MO_S && age <= EIGHTEEN_MO_S && penultCount < PENULT_CAP) {
        result.push({ id: m.id, name: stripProviderPrefix(m.name), tier: "penultimate", pricePerMTok: combinedPricePer1MTok(m) });
        placed.add(m.id);
        penultCount++;
      }
    }
  }

  // Value tier: cheapest unplaced models per provider
  for (const prefix of PROVIDER_PREFIXES) {
    const unplaced = filtered
      .filter((m) => m.id.startsWith(prefix) && !placed.has(m.id))
      .sort((a, b) => combinedPricePer1MTok(a) - combinedPricePer1MTok(b))
      .slice(0, VALUE_CAP);

    for (const m of unplaced) {
      result.push({ id: m.id, name: stripProviderPrefix(m.name), tier: "value", pricePerMTok: combinedPricePer1MTok(m) });
      placed.add(m.id);
    }
  }

  return result;
}

export async function GET() {
  try {
    const headers: Record<string, string> = {
      "HTTP-Referer": "https://simplesavings.app",
      "X-Title":      "Simple Savings",
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
    return NextResponse.json({ models: STATIC_FALLBACK, source: "fallback", fetchedAt: Date.now() });
  }
}

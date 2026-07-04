import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const LOCALE_LANGUAGE: Record<string, string> = {
  "en":    "English",
  "es-ES": "Spanish (Spain)",
  "es-MX": "Spanish (Mexico)",
  "it":    "Italian",
  "pt-BR": "Portuguese (Brazil)",
  "pt-PT": "Portuguese (Portugal)",
  "fr-FR": "French",
};

function fmtExact(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtRound(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function buildPrompt(
  style: "simple" | "expanded",
  params: {
    startingAmount: number;
    monthlyContribution: number;
    timeframeYears: number;
    interestRate: number;
    totalValue: number;
    interestEarned: number;
    goalAmount?: number;
    currency: string;
    locale: string;
  }
): string {
  const { startingAmount, monthlyContribution, timeframeYears, interestRate, totalValue, interestEarned, goalAmount, currency, locale } = params;
  const language = LOCALE_LANGUAGE[locale] ?? "English";
  const isWithdrawal = monthlyContribution < 0;
  const hasContribution = monthlyContribution !== 0;

  const lines = [
    `- Starting amount: ${fmtExact(startingAmount, currency)}`,
    hasContribution
      ? `- Monthly ${isWithdrawal ? "withdrawal" : "contribution"}: ${fmtExact(Math.abs(monthlyContribution), currency)}`
      : `- No monthly contributions`,
    `- Annual return rate: ${interestRate}%`,
    `- Timeframe: ${timeframeYears.toFixed(1)} year${timeframeYears !== 1 ? "s" : ""}`,
    `- Projected total: ${fmtExact(totalValue, currency)}`,
    `- Growth earned: ${fmtExact(interestEarned, currency)}`,
    ...(goalAmount ? [`- Savings goal: ${fmtRound(goalAmount, currency)}`, `- Gap to goal: ${fmtExact(Math.max(0, goalAmount - totalValue), currency)}`] : []),
  ].join("\n");

  if (style === "simple") {
    return `You MUST write entirely in ${language}. Every word must be in ${language}.

Write exactly 1 sentence someone could text to a family member. Follow this pattern closely but adapt it naturally to the numbers:

"If you put away $1,000 for 1 year at a 9% interest rate without adding another dime, it'll grow to $1,093.81—which means you make an extra $93.81 just from your money sitting there!"

Rules:
- Use exact dollar amounts with cents (e.g. $1,093.81 not $1,094)
- If there are monthly contributions, work them in naturally
- No financial jargon
- End the sentence with " (https://simplesavings.app)" — no period before it, just append it
- Output only the sentence — no quotes around it, no intro

Plan:
${lines}`;
  }

  return `You MUST write entirely in ${language}. Every word must be in ${language}.

Write 2–3 casual, first-person sentences someone could text to explain their savings plan. Be specific with the exact numbers. Include: starting amount, monthly contributions if any, timeframe, return rate, final total, growth earned, and goal progress if there's a goal. Follow this style:

"I'm starting with $1,193,857.83 and putting in $2,000 every month for about 8.4 months at a 25% annual return, and it's gonna grow to $1,425,179.93—that's an extra $215,322.10 just from the returns! I'm getting closer to my $1,500,000 goal, though I'm still about $74,820 short of the full target."

Rules:
- Use exact dollar amounts with cents where appropriate
- First person ("I'm", "my")
- Conversational, not formal
- End the last sentence with " (https://simplesavings.app)" — no period before it, just append it
- Output only the narrative — no quotes around it, no intro

Plan:
${lines}`;
}

// This route is intentionally public (the share narrative is generated for
// signed-out users too) and calls a paid LLM, so it's defended by the durable
// Convex rate limiter (per-IP + global daily spend cap) and a payload size cap
// below. See convex/rateLimit.ts and SECURITY.md.
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // Durable per-IP rate limit + global daily spend cap (this route calls a paid
  // LLM). Fail-open on a Convex error so a blip doesn't break sharing.
  try {
    const rl = await convex.mutation(api.rateLimit.checkPublicLlm, { ip, endpoint: "narrative" });
    if (!rl.ok) {
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  } catch {
    /* fail open on limiter error */
  }

  // Bound the input an anonymous caller can submit before we parse it.
  const rawText = await req.text();
  if (rawText.length > 4_000) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: {
    startingAmount: number;
    monthlyContribution: number;
    timeframeYears: number;
    interestRate: number;
    totalValue: number;
    interestEarned: number;
    goalAmount?: number;
    currency?: string;
    locale?: string;
    style?: "simple" | "expanded";
  };

  try {
    body = JSON.parse(rawText);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { currency = "USD", locale = "en", style = "simple", ...nums } = body;
  const prompt = buildPrompt(style, { ...nums, currency, locale });

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0];
    const raw = text.type === "text" ? text.text.trim() : "";
    // Strip any promo tag the LLM may have appended (with or without https://) and re-append the canonical form
    const stripped = raw.replace(/\s*\(https?:\/\/simplesavings\.app\)\s*$/, "").replace(/\s*\(simplesavings\.app\)\s*$/, "").trimEnd();
    const narrative = `${stripped} (https://simplesavings.app)`;
    return Response.json({
      narrative,
      usage: {
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
        model: "claude-haiku-4-5-20251001",
        provider: "anthropic",
      },
    });
  } catch (err) {
    console.error("[narrative]", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}

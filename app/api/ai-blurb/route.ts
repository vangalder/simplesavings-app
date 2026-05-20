import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const xaiClient = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: "https://api.x.ai/v1" });
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Simple in-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, RATE_WINDOW_MS * 2);

// Config cache — refresh every 30s so admin changes take effect quickly
let configCache: { provider: string; modelId: string; fetchedAt: number } | null = null;
const CONFIG_TTL_MS = 30_000;
const DEFAULT_PROVIDER = "anthropic";
const DEFAULT_MODEL = "claude-haiku-4-5";

async function resolveModel(): Promise<{ provider: string; modelId: string }> {
  const now = Date.now();
  if (configCache && now - configCache.fetchedAt < CONFIG_TTL_MS) return configCache;
  try {
    const raw = await convex.query(api.appConfig.getConfig, { key: "defaultBlurbModel" });
    if (raw && typeof raw === "string" && raw.includes(":")) {
      const [provider, modelId] = raw.split(":", 2);
      configCache = { provider, modelId, fetchedAt: now };
      return configCache;
    }
  } catch {
    // fall through to default
  }
  return { provider: DEFAULT_PROVIDER, modelId: DEFAULT_MODEL };
}

// Per-model pricing in $/1M tokens (approximate)
const RATES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5":     { in: 0.25,  out: 1.25 },
  "claude-sonnet-4-6":    { in: 3.0,   out: 15.0 },
  "claude-opus-4-7":      { in: 15.0,  out: 75.0 },
  "gpt-4o-mini":          { in: 0.15,  out: 0.6  },
  "gpt-4o":               { in: 2.5,   out: 10.0 },
  "grok-3-mini":          { in: 0.3,   out: 0.5  },
  "grok-3":               { in: 3.0,   out: 15.0 },
  "gemini-1.5-flash":     { in: 0.075, out: 0.3  },
  "gemini-1.5-pro":       { in: 1.25,  out: 5.0  },
};

function calcCost(modelId: string, tokensIn: number, tokensOut: number): number {
  const rate = RATES[modelId] ?? { in: 1.0, out: 3.0 };
  return Math.ceil(((tokensIn * rate.in + tokensOut * rate.out) / 1_000_000) * 100);
}

type LLMResult = { text: string; tokensIn: number; tokensOut: number };

async function callLLM(
  provider: string,
  modelId: string,
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
): Promise<LLMResult> {
  if (provider === "anthropic") {
    const msg = await anthropic.messages.create({
      model: modelId,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });
    return {
      text: msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "",
      tokensIn: msg.usage.input_tokens,
      tokensOut: msg.usage.output_tokens,
    };
  }

  // OpenAI-compatible providers (openai, xai)
  const client = provider === "xai" ? xaiClient : openaiClient;
  const resp = await client.chat.completions.create({
    model: modelId,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });
  return {
    text: resp.choices[0]?.message?.content?.trim() ?? "",
    tokensIn: resp.usage?.prompt_tokens ?? 0,
    tokensOut: resp.usage?.completion_tokens ?? 0,
  };
}

function formatCurrency(value: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString()}`;
  }
}

const LOCALE_NAMES: Record<string, string> = {
  "en":    "English",
  "es-MX": "Mexican Spanish",
  "es-ES": "Spanish (Spain)",
  "it":    "Italian",
  "pt-PT": "Portuguese (Portugal)",
  "pt-BR": "Brazilian Portuguese",
};

const SYSTEM_PROMPT = `You are a financial copywriter for simplesavings.app. You receive pre-calculated facts — treat every number and label as ground truth. Write exactly FOUR outputs separated by newlines with "---" between each:

1. BODY (sentences 1+2): MIRROR then FRICTION. Mirror validates what the numbers reveal; Friction introduces a concrete blindspot using the specific numbers.
2. QUESTION: Output the OPEN QUESTION exactly as given.
3. PITCH: One sentence that frames what deeper AI analysis would unlock for THIS specific scenario — make it concrete and compelling. No generic copy.

Output format (use exact "---" separators on their own lines):
[Mirror sentence. Friction sentence.]
---
[Question sentence?]
---
[Pitch sentence.]

Rules:
- NEVER recalculate, NEVER contradict GROWING/DEPLETING or SAFE/UNSUSTAINABLE labels.
- Never use the acronym "FIRE" — use "financial freedom target", "work-optional", or "fully self-sustaining" instead.
- Be specific: use the actual numbers, not vague language.
- Forbidden: generic praise, em-dashes, starting with "At this rate", moralizing.
- Body max 45 words. Pitch max 20 words.`;

const TRANSLATION_PROMPT = `You are a precise translator. Output only the translated text — no quotes, no explanation. Preserve all numbers, punctuation, and every "---" separator line exactly as-is.`;

function parseBlurbParts(raw: string): { blurb: string; question: string; pitch: string } {
  const parts = raw.split(/\n---\n/);
  return {
    blurb:    parts[0]?.trim() ?? raw,
    question: parts[1]?.trim() ?? "",
    pitch:    parts[2]?.trim() ?? "",
  };
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { provider, modelId } = await resolveModel();

  // Translation mode: { text: string, targetLocale: string }
  if (typeof body.text === "string" && typeof body.targetLocale === "string") {
    const langName = LOCALE_NAMES[body.targetLocale] ?? body.targetLocale;
    try {
      const result = await callLLM(
        provider, modelId,
        TRANSLATION_PROMPT,
        `Translate the following text to ${langName}:\n\n${body.text}`,
        150,
      );
      const { blurb, question, pitch } = parseBlurbParts(result.text || String(body.text));
      return NextResponse.json({
        blurb, question, pitch,
        meta: { provider, model: modelId, tokensIn: result.tokensIn, tokensOut: result.tokensOut, costCents: calcCost(modelId, result.tokensIn, result.tokensOut) },
      });
    } catch {
      return NextResponse.json({ blurb: String(body.text), question: "", pitch: "" });
    }
  }

  // Generation mode: { startingAmount, monthlyContribution, ... }
  const {
    startingAmount,
    monthlyContribution,
    timeframeYears,
    interestRate,
    totalValue,
    interestEarned,
    currency = "USD",
    goalAmount = null,
  } = body as {
    startingAmount: number;
    monthlyContribution: number;
    timeframeYears: number;
    interestRate: number;
    totalValue: number;
    interestEarned: number;
    currency?: string;
    goalAmount?: number | null;
  };

  const hasGoal = typeof goalAmount === "number" && goalAmount > 0;

  // ── Pre-compute all derived facts ──────────────────────────────────────────
  const isWithdrawal = monthlyContribution < 0;
  const contributionAbs = Math.abs(monthlyContribution);
  const annualFlow = contributionAbs * 12;
  const annualGrowth = startingAmount * (interestRate / 100);
  const monthlyInterest = annualGrowth / 12;
  const netAnnualChange = isWithdrawal ? annualGrowth - annualFlow : annualGrowth + annualFlow;
  const portfolioDirection = netAnnualChange >= 0 ? "GROWING" : "DEPLETING";

  // Withdrawal facts
  const withdrawalRate = isWithdrawal && startingAmount > 0
    ? (annualFlow / startingAmount) * 100 : null;
  const withdrawalMultiple = withdrawalRate !== null
    ? (withdrawalRate / 4).toFixed(2) : null;
  const sustainabilityStatus = withdrawalRate !== null
    ? (withdrawalRate <= 4 ? "SAFE — below 4% rule" : "UNSUSTAINABLE — above 4% rule") : null;
  const safeAnnualWithdrawal = startingAmount * 0.04;
  const depletionYears = isWithdrawal && netAnnualChange < 0
    ? (startingAmount / Math.abs(netAnnualChange)).toFixed(1) : null;

  // Accumulation facts
  const interestShare = totalValue > 0 ? ((interestEarned / totalValue) * 100).toFixed(1) : null;
  const totalContributions = contributionAbs * 12 * timeframeYears + startingAmount;
  const contributionLeverage = totalContributions > 0
    ? (totalValue / totalContributions).toFixed(2) : null;
  const doublingYears = interestRate > 0 ? (72 / interestRate).toFixed(1) : null;

  // Goal facts — only computed when user has explicitly set a goal
  const goalProgress = hasGoal && goalAmount! > 0
    ? ((startingAmount / goalAmount!) * 100).toFixed(1) : null;
  const yearsToGoal = hasGoal && !isWithdrawal
    ? (() => {
        if (startingAmount >= goalAmount!) return "already reached";
        const monthlyRate = interestRate / 100 / 12;
        let balance = startingAmount;
        for (let m = 1; m <= 200 * 12; m++) {
          balance = balance * (1 + monthlyRate) + contributionAbs;
          if (balance >= goalAmount!) return (m / 12).toFixed(1);
        }
        return null;
      })()
    : null;

  // Rate context vs. historical benchmarks
  const spNominal = 10.0;
  const spReal = 7.0;
  const vsSpNominal = (interestRate - spNominal).toFixed(1);
  const inflationErosion = timeframeYears > 0
    ? (totalValue / Math.pow(1.028, timeframeYears)).toFixed(0) : null;

  // ── Select the single most interesting insight hook ─────────────────────
  let leadWith: string;
  let questionHook: string;

  if (isWithdrawal) {
    if (withdrawalRate && withdrawalRate > 4) {
      leadWith = `Withdrawal rate is ${withdrawalRate.toFixed(1)}% — ${withdrawalMultiple}× the sustainable 4% threshold. Portfolio depletes in ${depletionYears ?? "?"} years at this pace.`;
      questionHook = `Want to model the exact monthly income that would make this portfolio last indefinitely?`;
    } else if (withdrawalRate && withdrawalRate > 3) {
      leadWith = `Withdrawal rate is ${withdrawalRate.toFixed(1)}% — dangerously close to the 4% sustainability boundary. A 1–2% drop in returns could tip this into depletion.`;
      questionHook = `What happens to this plan if markets deliver 4% instead of ${interestRate}% for the first decade?`;
    } else {
      leadWith = `Withdrawal rate is only ${withdrawalRate?.toFixed(1)}% — well inside the sustainable 4% threshold. The portfolio generates ${formatCurrency(monthlyInterest, currency)}/month in interest alone.`;
      questionHook = `Have you stress-tested this against a prolonged stretch of below-average returns?`;
    }
  } else if (hasGoal && yearsToGoal === "already reached") {
    leadWith = `Starting balance already exceeds the ${formatCurrency(goalAmount!, currency)} goal — the portfolio is funded.`;
    questionHook = `What's the next milestone worth planning toward from here?`;
  } else if (hasGoal && goalProgress && parseFloat(goalProgress) >= 80) {
    leadWith = `Already ${goalProgress}% of the way to the ${formatCurrency(goalAmount!, currency)} goal — on track to reach it in ${yearsToGoal} years.`;
    questionHook = `Do you know exactly how a single lump-sum addition today would shift that arrival date?`;
  } else if (hasGoal && yearsToGoal) {
    leadWith = `At this pace, the ${formatCurrency(goalAmount!, currency)} goal arrives in ${yearsToGoal} years — ${parseFloat(yearsToGoal) > timeframeYears ? `${(parseFloat(yearsToGoal) - timeframeYears).toFixed(1)} years past the current timeframe` : "within the current timeframe"}.`;
    questionHook = `Want to model what it takes to hit that goal ${Math.ceil(parseFloat(yearsToGoal) * 0.2)} years sooner?`;
  } else if (interestShare && parseFloat(interestShare) > 75) {
    leadWith = `${interestShare}% of the final balance is pure compound interest — contributions are almost noise at this rate.`;
    questionHook = `What would a 10% annual increase in contributions do to this timeline?`;
  } else if (doublingYears && parseFloat(doublingYears) < 8) {
    leadWith = `Money doubles every ${doublingYears} years at ${interestRate}%, compounding to ${formatCurrency(totalValue, currency)} over ${timeframeYears} years.`;
    questionHook = `Have you modeled what sequence-of-returns risk looks like once you start withdrawing?`;
  } else if (interestRate > 12) {
    leadWith = `${interestRate}% return is ${vsSpNominal}% above the S&P 500 average — if that assumption holds, the result is extraordinary.`;
    questionHook = `What's your plan if returns come in at half that rate?`;
  } else if (inflationErosion && timeframeYears >= 15) {
    leadWith = `Inflation at 2.8%/year erodes ${formatCurrency(totalValue, currency)} to a real purchasing power of ${formatCurrency(parseFloat(inflationErosion), currency)} — a gap worth planning for.`;
    questionHook = `Have you mapped out what this balance actually buys in today's dollars?`;
  } else {
    leadWith = `${formatCurrency(monthlyInterest, currency)}/month in interest alone after ${timeframeYears} years — contributions are only ${interestShare ? (100 - parseFloat(interestShare)).toFixed(1) : "?"}% of the final balance.`;
    questionHook = `Have you considered what this looks like if you increase contributions alongside your income?`;
  }

  const noGoalConstraint = !hasGoal
    ? `\nCONSTRAINT: The user has NOT set a savings goal. Do NOT reference any specific target amount, savings goal, or "freedom" number. Focus strictly on accumulation velocity, compound growth, and inflation context.`
    : `\nUSER GOAL: ${formatCurrency(goalAmount!, currency)} | Progress: ${goalProgress ?? "n/a"}% | Years to reach it: ${yearsToGoal ?? "n/a"}`;

  const userMessage = `PRE-CALCULATED FACTS — ground truth, do not alter:
- Starting balance: ${formatCurrency(startingAmount, currency)}
- Monthly ${isWithdrawal ? "withdrawal" : "contribution"}: ${formatCurrency(contributionAbs, currency)}
- Annual ${isWithdrawal ? "withdrawal" : "contribution"}: ${formatCurrency(annualFlow, currency)}
- Annual growth at ${interestRate}% (vs S&P nominal ${spNominal}%, real ${spReal}%): ${formatCurrency(annualGrowth, currency)}
- Monthly interest generated: ${formatCurrency(monthlyInterest, currency)}
- Net annual change: ${netAnnualChange >= 0 ? "+" : ""}${formatCurrency(netAnnualChange, currency)} — portfolio is ${portfolioDirection}
- Timeframe: ${timeframeYears} years
- Projected total: ${formatCurrency(totalValue, currency)} | Interest earned: ${formatCurrency(interestEarned, currency)}
${interestShare ? `- Interest as share of total: ${interestShare}%` : ""}
${contributionLeverage ? `- Contribution leverage: every $1 in becomes $${contributionLeverage} out` : ""}
${withdrawalRate !== null ? `- Annual withdrawal rate: ${withdrawalRate.toFixed(1)}% — ${sustainabilityStatus}` : ""}
${withdrawalMultiple ? `- Withdrawal is ${withdrawalMultiple}× the 4% safe rate` : ""}
${withdrawalRate !== null ? `- Safe 4% annual withdrawal: ${formatCurrency(safeAnnualWithdrawal, currency)}` : ""}
${depletionYears ? `- Portfolio depletes in: ${depletionYears} years` : ""}
${doublingYears ? `- Rule of 72: doubles every ${doublingYears} years` : ""}
${inflationErosion ? `- Inflation-adjusted real value (2.8% CPI): ${formatCurrency(parseFloat(inflationErosion), currency)}` : ""}
${noGoalConstraint}

LEAD WITH: ${leadWith}
OPEN QUESTION: ${questionHook}

Write THREE sentences: Mirror, Friction, Question.`;

  try {
    const result = await callLLM(provider, modelId, SYSTEM_PROMPT, userMessage, 180);
    const { blurb, question, pitch } = parseBlurbParts(result.text);

    return NextResponse.json({
      blurb, question, pitch,
      meta: { provider, model: modelId, tokensIn: result.tokensIn, tokensOut: result.tokensOut, costCents: calcCost(modelId, result.tokensIn, result.tokensOut) },
    });
  } catch (err) {
    console.error("[ai-blurb] LLM error:", err);
    return NextResponse.json({ blurb: "", question: "", pitch: "" });
  }
}

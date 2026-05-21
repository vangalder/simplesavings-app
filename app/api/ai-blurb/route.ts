import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const xaiClient = new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: "https://api.x.ai/v1" });
const openrouterClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://simplesavings.app",
    "X-Title": "Simple Savings",
  },
});
// Google Gemini via OpenAI-compatible endpoint
const googleClient = new OpenAI({
  apiKey: process.env.GOOGLE_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});
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
const CONFIG_TTL_MS = 5_000;
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
  "gemini-1.5-flash":              { in: 0.075, out: 0.3  },
  "gemini-1.5-pro":                { in: 1.25,  out: 5.0  },
  "gemini-2.5-flash":              { in: 0.15,  out: 0.6  },
  "gemini-2.5-pro":                { in: 1.25,  out: 10.0 },
  // OpenRouter — Meta / Llama
  "meta-llama/llama-3.3-70b-instruct":         { in: 0.12,  out: 0.30 },
  "meta-llama/llama-3.1-8b-instruct":           { in: 0.02,  out: 0.04 },
  "meta-llama/llama-3.1-405b-instruct":         { in: 2.70,  out: 2.70 },
  "meta-llama/llama-4-maverick":                { in: 0.18,  out: 0.60 },
  "meta-llama/llama-4-scout":                   { in: 0.11,  out: 0.34 },
  // OpenRouter — DeepSeek
  "deepseek/deepseek-chat":                     { in: 0.14,  out: 0.28 },
  "deepseek/deepseek-r1":                       { in: 0.55,  out: 2.19 },
  "deepseek/deepseek-r1-0528":                  { in: 0.55,  out: 2.19 },
  "deepseek/deepseek-v4-flash":                 { in: 0.10,  out: 0.40 },
  "deepseek/deepseek-r1-distill-llama-70b":     { in: 0.23,  out: 0.69 },
  "deepseek/deepseek-r1-distill-qwen-32b":      { in: 0.12,  out: 0.18 },
  "deepseek/deepseek-chat-v3-5":                { in: 0.27,  out: 1.10 },
  // OpenRouter — Mistral
  "mistralai/mistral-large":                    { in: 2.00,  out: 6.00 },
  "mistralai/mistral-small-3.2-24b-instruct":   { in: 0.10,  out: 0.30 },
  "mistralai/mistral-nemo":                     { in: 0.035, out: 0.08 },
  // OpenRouter — Google Gemma
  "google/gemma-2-27b-it":                      { in: 0.10,  out: 0.20 },
  "google/gemma-3-27b-it":                      { in: 0.10,  out: 0.20 },
  "google/gemma-3-12b-it":                      { in: 0.04,  out: 0.08 },
  // OpenRouter — Qwen
  "qwen/qwen3-235b-a22b":                       { in: 0.13,  out: 0.60 },
  "qwen/qwen3-30b-a3b":                         { in: 0.10,  out: 0.30 },
  "qwen/qwq-32b":                               { in: 0.12,  out: 0.18 },
  // OpenRouter — Microsoft
  "microsoft/phi-4":                            { in: 0.07,  out: 0.14 },
};

function calcCost(modelId: string, tokensIn: number, tokensOut: number): number {
  const rate = RATES[modelId] ?? { in: 1.0, out: 3.0 };
  return (tokensIn * rate.in + tokensOut * rate.out) / 1_000_000;
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

  // OpenAI-compatible providers (openai, xai, openrouter, google)
  const client = provider === "xai" ? xaiClient
    : provider === "openrouter" ? openrouterClient
    : provider === "google" ? googleClient
    : openaiClient;
  const resp = await client.chat.completions.create({
    model: modelId,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });
  // Strip <think>...</think> reasoning blocks (DeepSeek R1, QwQ, etc.)
  const raw = resp.choices[0]?.message?.content ?? "";
  const text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  return {
    text,
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

const SYSTEM_PROMPT = `You are a financial co-pilot for simplesavings.app. You receive pre-calculated facts about a user's savings or drawdown plan. Write THREE outputs separated by "---" on its own line:

1. BODY: Exactly ONE sentence. Surface ONE concrete insight — either a non-obvious consequence or a blindspot. Reference the user's specific situation, not generic advice.
2. QUESTION: Output the OPEN QUESTION exactly as given — do not rephrase it.
3. PITCH: One sentence that begins to answer the OPEN QUESTION for this specific scenario.

## Gold-standard example (match this tone and length exactly)
A 20% market dip would instantly erase your annual growth and trigger a major trajectory swing.
---
Have you simulated how a temporary downturn impacts your freedom timeline?
---
I can walk you through exactly what a correction year does to this curve, month by month.

## Output format — exactly three blocks, one line of "---" between each. No labels, no bullets, no extra lines.

## BRUTAL LENGTH LIMITS
- Body: 1 sentence, MAX 25 words. Hard stop.
- Pitch: 1 sentence, MAX 18 words.
- Total word count across all three blocks: under 45 words.
- If you go over, rewrite until you're under. No exceptions.

## STYLE RULES
- No multi-step arithmetic strings. No "A minus B equals C, so D changes by E." State only the final impact.
- At most ONE raw number in the body. Choose the most surprising one.
- Do NOT repeat numbers the user can already see on screen (total value, starting balance, monthly contribution, rate). Reference by implication.
- Tone: dry, direct. Not warm, not enthusiastic, not academic.
- Never open with: "At this rate", "Money doubles", a raw number, or a percentage.

## ACCEPT INPUTS AS FACTS
- Do not question whether the interest rate is realistic.
- Do not ask "What asset produces this return?" or "Is X% achievable?"
- The user's numbers are the baseline. Work from them, not against them.

## TIMEFRAME RULES
- Under 2 years: no inflation, retirement rules, or multi-decade projections. Focus on immediate momentum and short-term runway only.
- 2–5 years: no retirement/lifecycle framing.
- 5+ years: full range allowed.

## WITHDRAWAL OVERRIDE — HIGHEST PRIORITY
- If facts say "is_net_growth_positive: TRUE": FORBIDDEN to call strategy "unsustainable" or claim depletion. Portfolio is growing. Say so.
- If final value exceeds starting balance: body MUST reflect growth. No depletion warnings.

## OTHER
- Never use "FIRE" — use "work-optional" or "financial freedom".
- NEVER recalculate or contradict the GROWING/DEPLETING or SAFE/UNSUSTAINABLE labels in the facts.`;

const TRANSLATION_PROMPT = `You are a precise translator. Output only the translated text — no quotes, no explanation. Preserve all numbers, punctuation, and every "---" separator line exactly as-is.`;

function stripBrackets(s: string): string {
  return s.replace(/^\[|\]$/g, "").trim();
}

function parseBlurbParts(raw: string): { blurb: string; question: string; pitch: string } {
  // Try newline-wrapped first (preferred), then space-wrapped (some models omit newlines)
  let parts = raw.split("\n---\n");
  if (parts.length < 2) parts = raw.split(/\s+---\s+/);
  return {
    blurb:    stripBrackets(parts[0]?.trim() ?? raw),
    question: stripBrackets(parts[1]?.trim() ?? ""),
    pitch:    stripBrackets(parts[2]?.trim() ?? ""),
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
      const t0 = Date.now();
      const result = await callLLM(
        provider, modelId,
        TRANSLATION_PROMPT,
        `Translate the following text to ${langName}:\n\n${body.text}`,
        150,
      );
      const latencyMs = Date.now() - t0;
      const costUsd = calcCost(modelId, result.tokensIn, result.tokensOut);
      const { blurb, question, pitch } = parseBlurbParts(result.text || String(body.text));
      convex.mutation(api.blurbLogs.logBlurbCall, {
        provider, model: modelId, tokensIn: result.tokensIn, tokensOut: result.tokensOut,
        latencyMs, costUsd, isTranslation: true,
        locale: typeof body.targetLocale === "string" ? body.targetLocale : undefined,
      }).catch(() => {});
      return NextResponse.json({
        blurb, question, pitch,
        meta: { provider, model: modelId, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs, costUsd },
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
  const isNetGrowthPositive = netAnnualChange >= 0;
  const sustainabilityStatus = withdrawalRate !== null
    ? (isNetGrowthPositive
        ? "SELF-SUSTAINING — interest covers the withdrawal; portfolio is growing"
        : withdrawalRate <= 4 ? "SAFE — below 4% rule"
        : "UNSUSTAINABLE — above 4% rule")
    : null;
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

  // ── Deterministic variant picker — same inputs → same hook, different inputs → variety ──
  // Hash is seeded from the actual numbers so output is stable for a given scenario
  const hookSeed = Math.abs(Math.round(totalValue + startingAmount * 3 + interestRate * 100 + timeframeYears * 7));
  function pick<T>(arr: T[]): T { return arr[hookSeed % arr.length]; }

  // ── Select the single most interesting insight hook ─────────────────────
  let leadWith: string;
  let questionHook: string;

  if (isWithdrawal) {
    if (isNetGrowthPositive) {
      // Interest covers the withdrawal — portfolio is actually growing
      const monthlySurplus = monthlyInterest - contributionAbs;
      leadWith = pick([
        `The ${formatCurrency(monthlyInterest, currency)}/month in interest outpaces the ${formatCurrency(contributionAbs, currency)}/month withdrawal — the portfolio is growing, not shrinking.`,
        `Interest covers the full withdrawal and then some: ${formatCurrency(monthlySurplus, currency)}/month surplus is quietly compounding on top.`,
        `Despite taking ${formatCurrency(contributionAbs, currency)}/month out, the portfolio ends higher than it started — interest is doing the heavy lifting.`,
      ]);
      questionHook = pick([
        `Have you stress-tested what happens to this surplus if returns drop 2% for a sustained period?`,
        `Do you know the minimum return rate that keeps this drawdown self-sustaining indefinitely?`,
        `What does this plan look like if inflation erodes your real purchasing power over this timeframe?`,
      ]);
    } else if (withdrawalRate && withdrawalRate > 4) {
      leadWith = pick([
        `Withdrawal rate is ${withdrawalRate.toFixed(1)}% — ${withdrawalMultiple}× the sustainable 4% threshold. Portfolio depletes in ${depletionYears ?? "?"} years at this pace.`,
        `At ${withdrawalRate.toFixed(1)}% annual withdrawals, the portfolio runs out in ${depletionYears ?? "?"} years — the 4% rule exists precisely because of scenarios like this one.`,
        `${formatCurrency(contributionAbs, currency)}/month out against ${formatCurrency(monthlyInterest, currency)}/month generated: the gap is ${formatCurrency(annualFlow - annualGrowth, currency)}/year, accelerating the depletion clock.`,
      ]);
      questionHook = pick([
        `Want to model the exact monthly income that would make this portfolio last indefinitely?`,
        `What part-time income or one-time adjustment would flip this from depleting to self-sustaining?`,
        `Have you stress-tested what happens if returns drop 2% right at the start of this drawdown?`,
      ]);
    } else if (withdrawalRate && withdrawalRate > 3) {
      leadWith = pick([
        `Withdrawal rate is ${withdrawalRate.toFixed(1)}% — dangerously close to the 4% sustainability boundary.`,
        `At ${withdrawalRate.toFixed(1)}%, a single bad-return decade could push this plan past the depletion threshold.`,
        `${formatCurrency(monthlyInterest, currency)}/month in interest barely covers the ${formatCurrency(contributionAbs, currency)}/month withdrawal at this rate.`,
      ]);
      questionHook = pick([
        `What happens to this plan if markets deliver 4% instead of ${interestRate}% for the first decade?`,
        `Have you modeled how a 5-year sequence-of-poor-returns affects the long-term depletion timeline?`,
        `What's the minimum return rate that keeps this portfolio intact for the full ${timeframeYears}-year timeframe?`,
      ]);
    } else {
      leadWith = pick([
        `Withdrawal rate is only ${withdrawalRate?.toFixed(1)}% — well inside the sustainable 4% threshold. The portfolio generates ${formatCurrency(monthlyInterest, currency)}/month in interest alone.`,
        `At ${withdrawalRate?.toFixed(1)}%, this portfolio is producing ${formatCurrency(monthlyInterest - contributionAbs, currency)}/month more in interest than it's withdrawing.`,
        `${formatCurrency(monthlyInterest, currency)}/month in interest, ${formatCurrency(contributionAbs, currency)}/month withdrawn — the surplus is quietly compounding.`,
      ]);
      questionHook = pick([
        `Have you stress-tested this against a prolonged stretch of below-average returns?`,
        `Do you know the maximum withdrawal rate that keeps this portfolio intact indefinitely?`,
        `What does this plan look like if inflation runs at 4% instead of 2.8% for the next decade?`,
      ]);
    }
  } else if (hasGoal && yearsToGoal === "already reached") {
    leadWith = `Starting balance already exceeds the ${formatCurrency(goalAmount!, currency)} goal — the portfolio is fully funded right now.`;
    questionHook = `What's the next milestone worth targeting from here?`;
  } else if (hasGoal && goalProgress && parseFloat(goalProgress) >= 80) {
    leadWith = pick([
      `Already ${goalProgress}% of the way to the ${formatCurrency(goalAmount!, currency)} goal — on track to reach it in ${yearsToGoal} years.`,
      `${goalProgress}% funded toward ${formatCurrency(goalAmount!, currency)}, with ${yearsToGoal} years left to close the gap at this pace.`,
    ]);
    questionHook = pick([
      `Do you know exactly how a single lump-sum addition today would shift that arrival date?`,
      `What's the gap in dollars between today's balance and the goal, and what's the fastest way to close it?`,
    ]);
  } else if (hasGoal && yearsToGoal) {
    const overUnder = parseFloat(yearsToGoal) > timeframeYears
      ? `${(parseFloat(yearsToGoal) - timeframeYears).toFixed(1)} years past the current timeframe`
      : `within the current timeframe`;
    leadWith = pick([
      `At this pace, the ${formatCurrency(goalAmount!, currency)} goal arrives in ${yearsToGoal} years — ${overUnder}.`,
      `${formatCurrency(goalAmount!, currency)} goal: ${yearsToGoal} years away at current pace, ${overUnder}.`,
    ]);
    questionHook = pick([
      `Want to model what it takes to hit that goal ${Math.ceil(parseFloat(yearsToGoal) * 0.2)} years sooner?`,
      `What monthly contribution increase closes the gap between current pace and your goal timeline?`,
      `Have you mapped the exact year-by-year balance curve from now to the goal date?`,
    ]);
  } else if (interestShare && parseFloat(interestShare) > 75) {
    leadWith = pick([
      `${interestShare}% of the final ${formatCurrency(totalValue, currency)} is pure compound interest — contributions are almost background noise.`,
      `Contributions total ${formatCurrency(totalContributions, currency)}; the rest — ${formatCurrency(interestEarned, currency)} — is interest the market added for free.`,
      `Every $1 put in becomes $${contributionLeverage} out: at ${interestRate}%, the rate is doing ${interestShare}% of the work over ${timeframeYears} years.`,
    ]);
    questionHook = pick([
      `What would a 10% annual increase in contributions do to this timeline?`,
      `Have you looked at what the real purchasing power of ${formatCurrency(totalValue, currency)} is after ${timeframeYears} years of 2.8% inflation?`,
      `Do you know the exact year compound interest overtakes cumulative contributions in this plan?`,
    ]);
  } else if (interestRate > 12) {
    leadWith = pick([
      `${interestRate}% return is ${vsSpNominal}% above the S&P 500 average — if that assumption holds for ${timeframeYears} years, the result is extraordinary.`,
      `At ${interestRate}%, this plan outpaces the S&P 500 average by ${vsSpNominal}% annually — that gap compounds dramatically over ${timeframeYears} years.`,
      `${vsSpNominal}% above long-run S&P averages: the ${formatCurrency(totalValue, currency)} projection is built on an assumption that needs to be verified.`,
    ]);
    questionHook = pick([
      `What's your plan if returns come in at half that rate?`,
      `Have you modeled what ${formatCurrency(totalValue, currency)} becomes if the actual return is 7% instead of ${interestRate}%?`,
      `What's the asset class or strategy producing ${interestRate}% consistently, and how does it behave in a downturn?`,
    ]);
  } else if (doublingYears && parseFloat(doublingYears) < timeframeYears && timeframeYears >= 5) {
    // Only use Rule of 72 hook when timeframe is long enough for it to be meaningful
    const doublesCount = Math.floor(timeframeYears / parseFloat(doublingYears));
    leadWith = pick([
      `At ${interestRate}%, the balance doubles every ${doublingYears} years — that's ${doublesCount > 1 ? `${doublesCount} full doublings` : "one full doubling"} inside this ${timeframeYears}-year window.`,
      `Rule of 72: ${interestRate}% means a doubling every ${doublingYears} years. The last doubling in this plan adds more than all prior contributions combined.`,
      `Every ${doublingYears} years at ${interestRate}%, the entire balance reinvents itself — starting early captures doublings that late starters can never recover.`,
    ]);
    questionHook = pick([
      `Have you modeled what sequence-of-returns risk does to this doubling schedule once you start withdrawing?`,
      `What does the doubling clock look like if returns average 7% instead of ${interestRate}% for the first decade?`,
      `Do you know which specific year in this plan generates more interest than your entire contribution history?`,
    ]);
  } else if (inflationErosion && timeframeYears >= 15) {
    leadWith = pick([
      `Inflation at 2.8%/year erodes ${formatCurrency(totalValue, currency)} to a real purchasing power of ${formatCurrency(parseFloat(inflationErosion), currency)} — a ${formatCurrency(totalValue - parseFloat(inflationErosion), currency)} gap worth planning for.`,
      `${formatCurrency(totalValue, currency)} in ${timeframeYears} years buys what ${formatCurrency(parseFloat(inflationErosion), currency)} buys today — inflation is the silent fee on every dollar saved.`,
      `Real value after ${timeframeYears} years of 2.8% inflation: ${formatCurrency(parseFloat(inflationErosion), currency)}. The nominal number looks impressive; the real number is what matters.`,
    ]);
    questionHook = pick([
      `Have you mapped out what this balance actually buys in today's dollars?`,
      `What rate of return would you need to fully offset 2.8% inflation over this timeframe?`,
      `Have you stress-tested this plan against 4% inflation instead of 2.8%?`,
    ]);
  } else {
    leadWith = pick([
      `${formatCurrency(monthlyInterest, currency)}/month in interest — the starting balance is pulling more weight than the monthly deposits over this window.`,
      `Every $1 deposited monthly in this plan returns roughly $${contributionLeverage ?? "?"} out — the rate is doing most of the work.`,
      `${formatCurrency(annualGrowth, currency)} in annual interest from the starting balance alone — the principal is the engine, not the monthly adds.`,
    ]);
    questionHook = pick([
      `What does this plan look like if you step up monthly contributions by 10% each year?`,
      `What does front-loading contributions in the first 3 years do to the final balance versus spreading them evenly?`,
      `Do you know what a single extra lump-sum deposit today is worth by the end of the ${timeframeYears > 1 ? Math.round(timeframeYears) + "-year" : "planned"} window?`,
    ]);
  }

  const noGoalConstraint = !hasGoal
    ? `\nCONSTRAINT: The user has NOT set a savings goal. Do NOT reference any specific target amount, savings goal, or "freedom" number. Focus strictly on accumulation velocity, compound growth, and inflation context.`
    : `\nUSER GOAL: ${formatCurrency(goalAmount!, currency)} | Progress: ${goalProgress ?? "n/a"}% | Years to reach it: ${yearsToGoal ?? "n/a"}`;

  const timeframeConstraint = timeframeYears < 2
    ? `\nSHORT TIMEFRAME (${timeframeYears.toFixed(1)} years): FORBIDDEN — inflation, CPI, purchasing power, retirement rules, long-term projections. Focus ONLY on: interest velocity over this window, cash momentum, how the starting balance is working right now.`
    : timeframeYears < 5
    ? `\nMEDIUM TIMEFRAME (${timeframeYears.toFixed(1)} years): Avoid retirement/lifecycle framing. Stick to near-term milestones and momentum.`
    : "";

  const userMessage = `PRE-CALCULATED FACTS — ground truth, do not alter:
- Starting balance: ${formatCurrency(startingAmount, currency)}
- Monthly ${isWithdrawal ? "withdrawal" : "contribution"}: ${formatCurrency(contributionAbs, currency)}
- Annual ${isWithdrawal ? "withdrawal" : "contribution"}: ${formatCurrency(annualFlow, currency)}
- Annual growth at ${interestRate}% (vs S&P nominal ${spNominal}%, real ${spReal}%): ${formatCurrency(annualGrowth, currency)}
- Monthly interest generated: ${formatCurrency(monthlyInterest, currency)}
- Net annual change: ${netAnnualChange >= 0 ? "+" : ""}${formatCurrency(netAnnualChange, currency)} — portfolio is ${portfolioDirection}
- is_net_growth_positive: ${isNetGrowthPositive ? "TRUE" : "FALSE"}
- Final value vs starting balance: ${totalValue >= startingAmount ? `GROWING — ${formatCurrency(totalValue, currency)} > ${formatCurrency(startingAmount, currency)}` : `DECLINING — ${formatCurrency(totalValue, currency)} < ${formatCurrency(startingAmount, currency)}`}
- Timeframe: ${timeframeYears} years
- Projected total: ${formatCurrency(totalValue, currency)} | Interest earned: ${formatCurrency(interestEarned, currency)}
${interestShare ? `- Interest as share of total: ${interestShare}%` : ""}
${contributionLeverage ? `- Contribution leverage: every $1 in becomes $${contributionLeverage} out` : ""}
${withdrawalRate !== null ? `- Annual withdrawal rate: ${withdrawalRate.toFixed(1)}% — ${sustainabilityStatus}` : ""}
${withdrawalMultiple ? `- Withdrawal is ${withdrawalMultiple}× the 4% safe rate` : ""}
${withdrawalRate !== null ? `- Safe 4% annual withdrawal: ${formatCurrency(safeAnnualWithdrawal, currency)}` : ""}
${depletionYears ? `- Portfolio depletes in: ${depletionYears} years` : ""}
${doublingYears ? `- Rule of 72: doubles every ${doublingYears} years` : ""}
${inflationErosion && timeframeYears >= 5 ? `- Inflation-adjusted real value (2.8% CPI): ${formatCurrency(parseFloat(inflationErosion), currency)}` : ""}
${noGoalConstraint}${timeframeConstraint}

LEAD WITH: ${leadWith}
OPEN QUESTION: ${questionHook}

Write the three blocks separated by --- as described above. Output the OPEN QUESTION exactly as written — do not rephrase it.`;

  try {
    const t0 = Date.now();
    const result = await callLLM(provider, modelId, SYSTEM_PROMPT, userMessage, 180);
    const latencyMs = Date.now() - t0;
    const costUsd = calcCost(modelId, result.tokensIn, result.tokensOut);
    const { blurb, question, pitch } = parseBlurbParts(result.text);
    convex.mutation(api.blurbLogs.logBlurbCall, {
      provider, model: modelId, tokensIn: result.tokensIn, tokensOut: result.tokensOut,
      latencyMs, costUsd, isTranslation: false,
    }).catch(() => {});
    return NextResponse.json({
      blurb, question, pitch,
      meta: { provider, model: modelId, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs, costUsd },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[ai-blurb] LLM error:", errMsg);
    return NextResponse.json({
      blurb: "", question: "", pitch: "",
      error: errMsg,
      meta: { provider, model: modelId, tokensIn: 0, tokensOut: 0, latencyMs: 0, costUsd: 0 },
    });
  }
}

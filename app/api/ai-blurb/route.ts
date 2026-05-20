import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

const SYSTEM_PROMPT = `You are a concise financial insight engine. You will be given pre-calculated financial facts — treat them as ground truth. Your only job is to write ONE punchy sentence that communicates the most important insight.

Rules:
- NEVER recalculate or second-guess the provided facts. They are correct.
- NEVER contradict the DIRECTION labels (GROWING / DEPLETING, SAFE / UNSUSTAINABLE).
- Surface what's surprising or non-obvious — rule of 72, FIRE threshold breach, depletion timeline, inflation context, a milestone year.
- Reference specific numbers from the facts.
- No generic encouragement ("great job saving!" is forbidden).
- No em-dashes. Max 30 words.
- Do NOT start with "At this rate" — vary the opening.`;

const MODEL = "claude-haiku-4-5";
const INPUT_RATE = 0.25;  // $0.25/1M input tokens
const OUTPUT_RATE = 1.25; // $1.25/1M output tokens

function calcCost(tokensIn: number, tokensOut: number) {
  return Math.ceil(((tokensIn * INPUT_RATE + tokensOut * OUTPUT_RATE) / 1_000_000) * 100);
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

  // Translation mode: { text: string, targetLocale: string }
  if (typeof body.text === "string" && typeof body.targetLocale === "string") {
    const langName = LOCALE_NAMES[body.targetLocale] ?? body.targetLocale;
    try {
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 120,
        messages: [{
          role: "user",
          content: `Translate the following text to ${langName}. Output only the translated text — no quotes, no explanation, preserve all numbers and punctuation exactly.\n\n${body.text}`,
        }],
      });
      const blurb = message.content[0]?.type === "text" ? message.content[0].text.trim() : body.text;
      const tokensIn = message.usage.input_tokens;
      const tokensOut = message.usage.output_tokens;
      return NextResponse.json({
        blurb,
        meta: { provider: "anthropic", model: MODEL, tokensIn, tokensOut, costCents: calcCost(tokensIn, tokensOut) },
      });
    } catch {
      return NextResponse.json({ blurb: body.text }); // fallback: show English
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
  } = body as {
    startingAmount: number;
    monthlyContribution: number;
    timeframeYears: number;
    interestRate: number;
    totalValue: number;
    interestEarned: number;
    currency?: string;
  };

  const isWithdrawal = monthlyContribution < 0;
  const contributionAbs = Math.abs(monthlyContribution);
  const annualFlow = contributionAbs * 12;
  const annualGrowth = startingAmount * (interestRate / 100);
  const netAnnualChange = isWithdrawal ? annualGrowth - annualFlow : annualGrowth + annualFlow;
  const portfolioDirection = netAnnualChange >= 0 ? "GROWING" : "DEPLETING";

  // Withdrawal-mode FIRE facts
  const withdrawalRate = isWithdrawal && startingAmount > 0
    ? (annualFlow / startingAmount) * 100
    : null;
  const fireStatus = withdrawalRate !== null
    ? (withdrawalRate <= 4 ? "SAFE (below 4% rule)" : "UNSUSTAINABLE (above 4% rule)")
    : null;
  const safeAnnualWithdrawal = startingAmount * 0.04;

  // Accumulation facts
  const doublingYears = interestRate > 0 ? 72 / interestRate : null;
  const yearsToFireTarget = !isWithdrawal && netAnnualChange > 0
    ? Math.log(25 * annualFlow / Math.max(startingAmount, 1)) / Math.log(1 + interestRate / 100)
    : null;

  // Depletion timeline (independent of timeframeYears input)
  const depletionYears = isWithdrawal && netAnnualChange < 0
    ? (startingAmount / Math.abs(netAnnualChange)).toFixed(1)
    : null;

  const userMessage = `PRE-CALCULATED FACTS — do not recalculate, do not contradict:
- Starting balance: ${formatCurrency(startingAmount, currency)}
- Monthly ${isWithdrawal ? "withdrawal" : "contribution"}: ${formatCurrency(contributionAbs, currency)}
- Annual ${isWithdrawal ? "withdrawal" : "contribution"}: ${formatCurrency(annualFlow, currency)}
- Annual portfolio growth at ${interestRate}%: ${formatCurrency(annualGrowth, currency)}
- Net annual change: ${netAnnualChange >= 0 ? "+" : ""}${formatCurrency(netAnnualChange, currency)} — portfolio is ${portfolioDirection}
- Timeframe: ${timeframeYears} years | Projected total: ${formatCurrency(totalValue, currency)} | Interest earned: ${formatCurrency(interestEarned, currency)}
${withdrawalRate !== null ? `- Annual withdrawal rate: ${withdrawalRate.toFixed(1)}% — ${fireStatus}` : ""}
${withdrawalRate !== null ? `- Safe 4% withdrawal would be: ${formatCurrency(safeAnnualWithdrawal, currency)}/year` : ""}
${depletionYears ? `- At this rate, portfolio depletes in: ${depletionYears} years` : ""}
${doublingYears ? `- Rule of 72: balance doubles every ${doublingYears.toFixed(1)} years` : ""}
${yearsToFireTarget && yearsToFireTarget > 0 ? `- Estimated years to 25× annual contribution (FIRE): ${yearsToFireTarget.toFixed(1)}` : ""}

Write one insight sentence using these facts.`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 80,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const blurb = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const tokensIn = message.usage.input_tokens;
    const tokensOut = message.usage.output_tokens;

    return NextResponse.json({
      blurb,
      meta: { provider: "anthropic", model: MODEL, tokensIn, tokensOut, costCents: calcCost(tokensIn, tokensOut) },
    });
  } catch (err) {
    console.error("[ai-blurb] LLM error:", err);
    return NextResponse.json({ blurb: "" });
  }
}

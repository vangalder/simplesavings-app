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

// Prune stale entries periodically to avoid memory leak
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

const SYSTEM_PROMPT = `You are a concise financial insight engine. Given savings calculator inputs, produce exactly ONE sentence of genuine financial insight.

Rules:
- Never generic ("great job saving!" is forbidden)
- Surface something non-obvious: rule of 72, FIRE threshold, inflation context, a milestone year, tax-advantaged opportunity, or compound growth milestone
- Reference the specific numbers given
- Use plain language — no jargon unless universally understood (like "4% rule")
- No em-dashes. Max 25 words.
- Do NOT start with "At this rate" — vary the opening`;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: {
    startingAmount: number;
    monthlyContribution: number;
    timeframeYears: number;
    interestRate: number;
    totalValue: number;
    interestEarned: number;
    currency?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    startingAmount,
    monthlyContribution,
    timeframeYears,
    interestRate,
    totalValue,
    interestEarned,
    currency = "USD",
  } = body;

  const isWithdrawal = monthlyContribution < 0;
  const action = isWithdrawal ? "withdrawing" : "contributing";
  const contributionAbs = Math.abs(monthlyContribution);
  const totalPrincipal = startingAmount + contributionAbs * 12 * timeframeYears;

  const userMessage = `Calculator inputs:
- Starting amount: ${formatCurrency(startingAmount, currency)}
- Monthly ${action}: ${formatCurrency(contributionAbs, currency)}
- Timeframe: ${timeframeYears} years
- Annual interest rate: ${interestRate}%
- Projected total value: ${formatCurrency(totalValue, currency)}
- Interest earned: ${formatCurrency(interestEarned, currency)}
- Total ${isWithdrawal ? "withdrawn" : "principal contributed"}: ${formatCurrency(totalPrincipal, currency)}

Give one insight sentence about these specific numbers.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 80,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const blurb =
      message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    return NextResponse.json({ blurb });
  } catch (err) {
    console.error("[ai-blurb] LLM error:", err);
    return NextResponse.json({ blurb: "" }); // fail silently to the user
  }
}

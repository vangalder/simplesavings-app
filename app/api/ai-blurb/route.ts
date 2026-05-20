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

const SYSTEM_PROMPT = `You are a financial copywriter for simplesavings.app. You receive pre-calculated facts — treat every number and label as ground truth. Write exactly THREE sentences:

1. MIRROR: Use the LEAD WITH fact as your angle. Make the user feel seen — validate what their numbers reveal.
2. FRICTION: Introduce one concrete financial blindspot or risk this scenario creates. Use the specific numbers provided.
3. QUESTION: Output the OPEN QUESTION exactly as given — do not rephrase it, do not add punctuation changes.

Output format: sentences 1 and 2 joined normally, then the literal string " ||| ", then sentence 3. Example: "Mirror sentence. Friction sentence. ||| Question sentence?"

Rules:
- NEVER recalculate, NEVER contradict GROWING/DEPLETING or SAFE/UNSUSTAINABLE labels.
- Never use the acronym "FIRE" — use "financial freedom target", "work-optional", or "fully self-sustaining" instead.
- Be specific: use the actual numbers, not vague language.
- Forbidden: generic praise, em-dashes, starting with "At this rate", moralizing.
- Max 65 words total across all three sentences.`;

const MODEL = "claude-haiku-4-5";
const INPUT_RATE = 0.25;  // $0.25/1M input tokens
const OUTPUT_RATE = 1.25; // $1.25/1M output tokens

function calcCost(tokensIn: number, tokensOut: number) {
  return Math.ceil(((tokensIn * INPUT_RATE + tokensOut * OUTPUT_RATE) / 1_000_000) * 100);
}

function splitBlurb(raw: string): [string, string] {
  const sep = " ||| ";
  const idx = raw.indexOf(sep);
  if (idx !== -1) return [raw.slice(0, idx).trim(), raw.slice(idx + sep.length).trim()];
  return [raw, ""];
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
      const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : String(body.text);
      const [blurb, question] = splitBlurb(raw);
      const tokensIn = message.usage.input_tokens;
      const tokensOut = message.usage.output_tokens;
      return NextResponse.json({
        blurb, question,
        meta: { provider: "anthropic", model: MODEL, tokensIn, tokensOut, costCents: calcCost(tokensIn, tokensOut) },
      });
    } catch {
      return NextResponse.json({ blurb: String(body.text), question: "" }); // fallback: show English
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
  const breakEvenRate = isWithdrawal && startingAmount > 0
    ? (annualFlow / startingAmount * 100).toFixed(2) : null;
  const fireStatus = withdrawalRate !== null
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
  const fireNumber = isWithdrawal ? null : annualFlow * 25;
  const fireProgress = fireNumber && fireNumber > 0
    ? ((startingAmount / fireNumber) * 100).toFixed(1) : null;
  const yearsToFire = !isWithdrawal && annualFlow > 0 && interestRate > 0
    ? (() => {
        const target = annualFlow * 25;
        if (startingAmount >= target) return "already reached";
        const y = Math.log(target / Math.max(startingAmount, 1)) / Math.log(1 + interestRate / 100);
        return y > 0 && y < 200 ? y.toFixed(1) : null;
      })()
    : null;

  // Rate context vs. historical benchmarks
  const spNominal = 10.0;
  const spReal = 7.0;
  const vsSpNominal = (interestRate - spNominal).toFixed(1);
  const inflationErosion = timeframeYears > 0
    ? (totalValue / Math.pow(1.028, timeframeYears)).toFixed(0) : null; // real value at 2.8% CPI

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
  } else if (interestShare && parseFloat(interestShare) > 75) {
    leadWith = `${interestShare}% of the final balance is pure compound interest — contributions are almost noise at this rate.`;
    questionHook = `What would a 10% annual increase in contributions do to this timeline?`;
  } else if (doublingYears && parseFloat(doublingYears) < 8) {
    leadWith = `Money doubles every ${doublingYears} years at ${interestRate}%, compounding to ${formatCurrency(totalValue, currency)} over ${timeframeYears} years.`;
    questionHook = `Have you modeled what sequence-of-returns risk looks like once you start withdrawing?`;
  } else if (fireProgress && parseFloat(fireProgress) >= 80) {
    leadWith = `Already ${fireProgress}% of the way to a ${formatCurrency(fireNumber!, currency)} fully self-sustaining portfolio — roughly ${yearsToFire} years out at this pace.`;
    questionHook = `Do you know the exact year your portfolio crosses into work-optional territory?`;
  } else if (fireProgress && parseFloat(fireProgress) < 20 && timeframeYears >= 10) {
    leadWith = `Financial freedom target is ${formatCurrency(fireNumber!, currency)} (25× annual contribution) — currently at ${fireProgress}% with ${yearsToFire} years to go.`;
    questionHook = `What does a modest increase in monthly contributions do to the year you become work-optional?`;
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
${withdrawalRate !== null ? `- Annual withdrawal rate: ${withdrawalRate.toFixed(1)}% — ${fireStatus}` : ""}
${withdrawalMultiple ? `- Withdrawal is ${withdrawalMultiple}× the 4% safe rate` : ""}
${withdrawalRate !== null ? `- Safe 4% annual withdrawal: ${formatCurrency(safeAnnualWithdrawal, currency)}` : ""}
${depletionYears ? `- Portfolio depletes in: ${depletionYears} years` : ""}
${doublingYears ? `- Rule of 72: doubles every ${doublingYears} years` : ""}
${fireNumber ? `- FIRE number (25× annual contribution): ${formatCurrency(fireNumber, currency)}` : ""}
${fireProgress ? `- FIRE progress: ${fireProgress}% — ${yearsToFire} years to target` : ""}
${inflationErosion ? `- Inflation-adjusted real value (2.8% CPI): ${formatCurrency(parseFloat(inflationErosion), currency)}` : ""}

LEAD WITH: ${leadWith}
OPEN QUESTION: ${questionHook}

Write THREE sentences: Mirror, Friction, Question.`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const [blurb, question] = splitBlurb(raw);
    const tokensIn = message.usage.input_tokens;
    const tokensOut = message.usage.output_tokens;

    return NextResponse.json({
      blurb, question,
      meta: { provider: "anthropic", model: MODEL, tokensIn, tokensOut, costCents: calcCost(tokensIn, tokensOut) },
    });
  } catch (err) {
    console.error("[ai-blurb] LLM error:", err);
    return NextResponse.json({ blurb: "" });
  }
}

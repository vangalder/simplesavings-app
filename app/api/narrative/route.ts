import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fmt(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export async function POST(req: NextRequest) {
  let body: {
    startingAmount: number;
    monthlyContribution: number;
    timeframeYears: number;
    interestRate: number;
    totalValue: number;
    interestEarned: number;
    goalAmount?: number;
    currency?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    startingAmount,
    monthlyContribution,
    timeframeYears,
    interestRate,
    totalValue,
    interestEarned,
    goalAmount,
    currency = "USD",
  } = body;

  const isWithdrawal = monthlyContribution < 0;

  const prompt = `Write 1–2 short, friendly sentences someone could text to a family member or friend to explain this savings plan. Use the exact numbers — don't round them. No financial jargon. Keep it conversational and human — something like "If you put away $1,000 for 1 year at a 9% interest rate without adding another dime, it'll grow to $1,093.81—which means you make an extra $93.81 just from your money sitting there!"

Plan:
- Starting amount: ${fmt(startingAmount, currency)} (exact: ${startingAmount})
- Monthly ${isWithdrawal ? "withdrawal" : "contribution"}: ${fmt(Math.abs(monthlyContribution), currency)} (exact: ${Math.abs(monthlyContribution)})
- Annual return rate: ${interestRate}%
- Timeframe: ${timeframeYears.toFixed(1)} year${timeframeYears !== 1 ? "s" : ""}
- Projected total: ${fmt(totalValue, currency)} (exact: ${totalValue.toFixed(2)})
- Growth earned: ${fmt(interestEarned, currency)} (exact: ${interestEarned.toFixed(2)})${goalAmount ? `\n- Savings goal: ${fmt(goalAmount, currency)}` : ""}

Output only the narrative — no intro, no explanation, no surrounding quotes.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0];
    const narrative = text.type === "text" ? text.text.trim() : "";
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

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const COST_TABLE: Record<string, [number, number]> = {
  "claude-sonnet-4-6":                  [3.0,   15.0],
  "claude-opus-4-7":                    [15.0,  75.0],
  "claude-haiku-4-5-20251001":          [0.25,  1.25],
  "gpt-4o":                             [2.5,   10.0],
  "gpt-4o-mini":                        [0.15,  0.60],
  "o3-mini":                            [1.1,   4.4],
  "gemini-2.5-pro":                     [1.25,  10.0],
  "gemini-2.5-flash":                   [0.075, 0.30],
  "meta-llama/llama-3.3-70b-instruct":  [0.12,  0.30],
  "deepseek/deepseek-chat":             [0.14,  0.28],
  "deepseek/deepseek-v4-flash":         [0.10,  0.40],
  "deepseek/deepseek-r1-0528":          [0.55,  2.19],
  "mistralai/mistral-small-3.2-24b-instruct": [0.10, 0.30],
  "google/gemma-3-12b-it":              [0.04,  0.08],
  "grok-3":                             [3.0,   15.0],
  "grok-3-mini":                        [0.3,   0.5],
};

function calcCostCents(model: string, inputTok: number, outputTok: number): number {
  const [inRate, outRate] = COST_TABLE[model] ?? [2.0, 8.0];
  return ((inputTok * inRate + outputTok * outRate) / 1_000_000) * 100;
}

type ConversationMessage = { role: string; content: string };

type InsightsRequest = {
  scenarioId?: string;
  clerkId?: string;
  provider: string;
  model: string;
  message: string;
  conversationHistory: ConversationMessage[];
  blurbContext?: { body: string; question: string; pitch: string };
  startingAmount: number;
  monthlyContribution: number;
  timeframeYears: number;
  interestRate: number;
  totalValue: number;
  interestEarned: number;
  goalAmount?: number;
  currency?: string;
};

function fmt(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(n);
}

function buildSystemPrompt(body: InsightsRequest): string {
  const isWithdrawal = body.monthlyContribution < 0;
  const currency = body.currency ?? "USD";
  const annualGrowth = body.startingAmount * (body.interestRate / 100);
  const monthlyInterest = annualGrowth / 12;
  const netAnnualChange = isWithdrawal
    ? annualGrowth - Math.abs(body.monthlyContribution) * 12
    : annualGrowth + body.monthlyContribution * 12;
  const isNetPositive = netAnnualChange >= 0;

  return `You are a sharp, warm financial co-pilot for simplesavings.app. Your job is to help users deeply understand their savings or drawdown plan and make better decisions — not to give generic advice.

## Their Plan (pre-calculated facts — treat as ground truth)
- Starting balance: ${fmt(body.startingAmount, currency)}
- Monthly ${isWithdrawal ? "withdrawal" : "contribution"}: ${fmt(Math.abs(body.monthlyContribution), currency)}
- Annual return rate: ${body.interestRate}%
- Monthly interest generated: ${fmt(monthlyInterest, currency)}
- Net annual change: ${netAnnualChange >= 0 ? "+" : ""}${fmt(netAnnualChange, currency)} — portfolio is ${isNetPositive ? "GROWING" : "DEPLETING"}
- Timeframe: ${body.timeframeYears.toFixed(1)} years
- Projected total: ${fmt(body.totalValue, currency)}
- Interest earned: ${fmt(body.interestEarned, currency)}
${body.goalAmount ? `- Savings goal: ${fmt(body.goalAmount, currency)}` : ""}
${body.blurbContext?.body ? `\n## What sparked this conversation\nBlurb shown: "${body.blurbContext.body}"\nOpening question: "${body.blurbContext.question}"` : ""}

## How to respond
- Reference their specific numbers — don't give generic savings advice
- Be direct and calm. 2-3 short paragraphs max unless they ask for detail
- FIRE concepts you know: 4% rule, sequence of returns, SWR, inflation erosion, Roth ladder
- Withdrawal plans: focus on sustainability, sequence risk, the gap between interest and withdrawals
- Don't moralize. They're adults making their own decisions
- Never use the acronym "FIRE" — say "work-optional" or "financial freedom" instead

## Tone — strictly enforced
- No greetings, filler openers, or enthusiasm markers. Never start with "Hey", "Great", "Sure", "Absolutely", "I'd love to", "Happy to", or any equivalent
- Don't perform eagerness. Just answer
- Dry and precise beats warm and wordy
- If restating the user's question, do it in one plain sentence — then move on

## Calculator updates
When the user asks you to change a value ("what if my rate was 7%?") or when you want to illustrate something by adjusting a number, include a calculator update at the VERY END of your response on its own line:

<calc_update>{"field": "startingAmount|monthlyContribution|interestRate|timeframeYears", "value": NUMBER, "reason": "brief reason shown to user"}</calc_update>

Rules:
- Only ONE update per response
- field must be exactly one of: startingAmount, monthlyContribution, interestRate, timeframeYears
- value is always a number (monthlyContribution is negative for withdrawals)
- Always explain the change in your text BEFORE the tag
- Do NOT include the tag unless actually changing something`;
}

function sseChunk(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function parseCalcUpdate(text: string): { field: string; value: number; reason: string } | null {
  const match = text.match(/<calc_update>([\s\S]*?)<\/calc_update>/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.field && typeof parsed.value === "number") return parsed;
  } catch { /* ignore */ }
  return null;
}

function stripCalcUpdate(text: string): string {
  return text.replace(/<calc_update>[\s\S]*?<\/calc_update>/g, "").trim();
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  let body: InsightsRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  // Access check
  const clerkId = userId ?? body.clerkId ?? "";
  const [creditBalance, chatBudgetRaw] = await Promise.all([
    clerkId ? convex.query(api.users.getAiCreditBalance, { clerkId }).catch(() => null) : null,
    convex.query(api.appConfig.getConfig, { key: "chatFreeTokenBudget" }).catch(() => "0"),
  ]);

  const isPro = creditBalance?.isPro;
  const hasCredits = (creditBalance?.granted ?? 0) > (creditBalance?.used ?? 0);
  const tokenBudget = parseInt(chatBudgetRaw ?? "0", 10);
  const isPaidAccess = isPro || hasCredits;

  if (!isPaidAccess && tokenBudget === 0) {
    return new Response(JSON.stringify({ error: "upgrade_required" }), { status: 402 });
  }

  // Handle opener sentinel — generate a context-aware first message
  let userMessage = body.message;
  if (body.message === "__OPENER__") {
    const q = body.blurbContext?.question;
    userMessage = q
      ? `Ask me this as an opening question, reframed conversationally and warmly in 1-2 sentences: "${q}". Do not use <calc_update>.`
      : "Open the conversation with a specific, warm question about my savings plan. 1-2 sentences. No <calc_update>.";
  }

  const { provider, model, conversationHistory } = body;
  const systemPrompt = buildSystemPrompt(body);

  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const onDelta = (chunk: string) => {
          fullText += chunk;
          controller.enqueue(sseChunk({ type: "delta", content: chunk }));
        };

        let inputTokens = 0;
        let outputTokens = 0;

        if (provider === "anthropic") {
          ({ inputTokens, outputTokens } = await streamAnthropic(model, systemPrompt, conversationHistory, userMessage, onDelta));
        } else if (provider === "google") {
          ({ inputTokens, outputTokens } = await streamGoogle(model, systemPrompt, conversationHistory, userMessage, onDelta));
        } else {
          // openai, openrouter, xai all use OpenAI-compatible client
          const overrides =
            provider === "openrouter" ? { baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY, headers: { "HTTP-Referer": "https://simplesavings.app", "X-Title": "Simple Savings" } }
            : provider === "xai" ? { baseURL: "https://api.x.ai/v1", apiKey: process.env.XAI_API_KEY }
            : provider === "google-compat" ? { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", apiKey: process.env.GOOGLE_API_KEY }
            : undefined;
          ({ inputTokens, outputTokens } = await streamOpenAI(model, systemPrompt, conversationHistory, userMessage, onDelta, overrides));
        }

        const calcUpdate = parseCalcUpdate(fullText);
        const cleanText = stripCalcUpdate(fullText);
        const costCents = calcCostCents(model, inputTokens, outputTokens);

        controller.enqueue(sseChunk({
          type: "done",
          cleanText,
          calcUpdate,
          usage: { inputTokens, outputTokens, costCents },
        }));
      } catch (err) {
        console.error("[insights]", provider, model, err);
        controller.enqueue(sseChunk({ type: "error", message: "LLM request failed" }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function streamAnthropic(
  model: string, systemPrompt: string, history: ConversationMessage[], message: string,
  onDelta: (chunk: string) => void
): Promise<{ inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey });

  const messages = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  let inputTokens = 0, outputTokens = 0;
  const stream = client.messages.stream({ model, max_tokens: 1024, system: systemPrompt, messages });

  for await (const chunk of stream) {
    if (chunk.type === "message_start") inputTokens = chunk.message.usage.input_tokens;
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") onDelta(chunk.delta.text);
    if (chunk.type === "message_delta") outputTokens = chunk.usage.output_tokens;
  }
  return { inputTokens, outputTokens };
}

async function streamOpenAI(
  model: string, systemPrompt: string, history: ConversationMessage[], message: string,
  onDelta: (chunk: string) => void,
  overrides?: { baseURL?: string; apiKey?: string; headers?: Record<string, string> }
): Promise<{ inputTokens: number; outputTokens: number }> {
  const apiKey = overrides?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("API key not set");
  const client = new OpenAI({ apiKey, baseURL: overrides?.baseURL, defaultHeaders: overrides?.headers });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  let inputTokens = 0, outputTokens = 0;
  const stream = await client.chat.completions.create({ model, messages, stream: true, stream_options: { include_usage: true }, max_tokens: 1024 });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) onDelta(delta);
    if (chunk.usage) { inputTokens = chunk.usage.prompt_tokens; outputTokens = chunk.usage.completion_tokens; }
  }
  return { inputTokens, outputTokens };
}

async function streamGoogle(
  model: string, systemPrompt: string, history: ConversationMessage[], message: string,
  onDelta: (chunk: string) => void
): Promise<{ inputTokens: number; outputTokens: number }> {
  // Use OpenAI-compatible Google endpoint
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
  return streamOpenAI(model, systemPrompt, history, message, onDelta, {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey,
  });
}

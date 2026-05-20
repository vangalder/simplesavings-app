"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import ProviderPicker, { PROVIDERS } from "@/components/ProviderPicker";
import { useIsAdmin } from "@/hooks/useIsAdmin";

type ConvexMessage = {
  _id: string;
  role: string;
  content: string;
  provider: string;
  model: string;
  createdAt: number;
};

type ScenarioAiConfig = {
  startingAmount: number;
  monthlyContribution: number;
  timeframeYears: number;
  interestRate: number;
  totalValue: number;
  interestEarned: number;
  currency?: string;
  aiProvider?: string;
  aiModel?: string;
};

type Props = {
  scenarioId: Id<"scenarios">;
  clerkId: string;
  scenarioData?: ScenarioAiConfig;
};

type UsageMeta = { provider: string; model: string; tokensIn: number; tokensOut: number; costCents: number };
type LocalMessage = { role: "user" | "assistant"; content: string; streaming?: boolean; meta?: UsageMeta };

export default function InsightsPanel({ scenarioId, clerkId, scenarioData }: Props) {
  const { isSignedIn } = useUser();
  const isAdmin = useIsAdmin();

  // Provider/model — prefer scenario-level config, then default
  const [provider, setProvider] = useState(
    scenarioData?.aiProvider ?? PROVIDERS[0].id
  );
  const [model, setModel] = useState(
    scenarioData?.aiModel ?? PROVIDERS[0].models[0].id
  );

  // Intent capture
  const [intentSubmitted, setIntentSubmitted] = useState(false);
  const [intentGoal, setIntentGoal] = useState("");
  const [intentAge, setIntentAge] = useState("");
  const [intentContext, setIntentContext] = useState("early_retirement");

  // Chat state
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [persistError, setPersistError] = useState<{ userMsg: string; assistantMsg: string; costCents: number } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convex queries & mutations
  const messages = useQuery(api.messages.getMessagesByScenario, { scenarioId, clerkId }) as ConvexMessage[] | undefined;
  const creditBalance = useQuery(api.users.getAiCreditBalance, { clerkId });
  const addMessage = useMutation(api.messages.addMessage);
  const incrementAiUsage = useMutation(api.users.incrementAiUsage);
  const updateScenarioAiConfig = useMutation(api.scenarios.updateScenarioAiConfig);
  const upsertProviderConfig = useMutation(api.providerConfigs.upsertProviderConfig);

  // Sync local messages with Convex on load
  useEffect(() => {
    if (messages && localMessages.length === 0) {
      setLocalMessages(messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const canAccess = creditBalance
    ? creditBalance.isPro || creditBalance.granted > creditBalance.used
    : false;

  const handleProviderChange = useCallback(
    async (newProvider: string, newModel: string) => {
      setProvider(newProvider);
      setModel(newModel);
      // Persist to scenario and user default
      try {
        await updateScenarioAiConfig({ scenarioId, clerkId, aiProvider: newProvider, aiModel: newModel });
        await upsertProviderConfig({ clerkId, provider: newProvider, model: newModel, isDefault: true });
      } catch {
        // non-fatal
      }
    },
    [scenarioId, clerkId, updateScenarioAiConfig, upsertProviderConfig]
  );

  const persistMessages = useCallback(
    async (userMsg: string, assistantMsg: string, cost: number) => {
      setPersistError(null);
      try {
        await addMessage({ scenarioId, clerkId, role: "user", content: userMsg, provider, model, tokensUsed: 0 });
        await addMessage({ scenarioId, clerkId, role: "assistant", content: assistantMsg, provider, model, tokensUsed: 0 });
        if (!creditBalance?.isPro) {
          await incrementAiUsage({ clerkId, costInCents: cost });
        }
      } catch (err) {
        console.error("[insights] persist failed", err);
        setPersistError({ userMsg, assistantMsg, costCents: cost });
      }
    },
    [scenarioId, clerkId, provider, model, creditBalance, addMessage, incrementAiUsage]
  );

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isStreaming) return;

      const userMsg = messageText.trim();
      setInput("");
      setLocalMessages((prev) => [...prev, { role: "user", content: userMsg }]);
      setLocalMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
      setIsStreaming(true);
      setPersistError(null);

      const history = localMessages.map((m) => ({ role: m.role, content: m.content }));
      let assistantContent = "";
      let finalCostCents = 0;
      let finalTokensIn = 0;
      let finalTokensOut = 0;

      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            model,
            message: userMsg,
            intentGoal,
            intentAge: intentAge || undefined,
            intentContext,
            conversationHistory: history,
            startingAmount: scenarioData?.startingAmount ?? 0,
            monthlyContribution: scenarioData?.monthlyContribution ?? 0,
            timeframeYears: scenarioData?.timeframeYears ?? 0,
            interestRate: scenarioData?.interestRate ?? 0,
            totalValue: scenarioData?.totalValue ?? 0,
            interestEarned: scenarioData?.interestEarned ?? 0,
            currency: scenarioData?.currency ?? "USD",
          }),
        });

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === "delta") {
                assistantContent += parsed.content;
                setLocalMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent, streaming: true };
                  return updated;
                });
              } else if (parsed.type === "done") {
                finalCostCents = parsed.usage?.costCents ?? 0;
                finalTokensIn = parsed.usage?.inputTokens ?? 0;
                finalTokensOut = parsed.usage?.outputTokens ?? 0;
              } else if (parsed.type === "error") {
                throw new Error(parsed.message);
              }
            } catch {
              // skip malformed SSE line
            }
          }
        }
      } catch (err) {
        console.error("[insights] stream error", err);
        setLocalMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      // Finalize streaming message
      const finalMeta: UsageMeta = { provider, model, tokensIn: finalTokensIn, tokensOut: finalTokensOut, costCents: finalCostCents };
      setLocalMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: assistantContent, meta: finalMeta };
        return updated;
      });
      setIsStreaming(false);

      // Persist to Convex
      await persistMessages(userMsg, assistantContent, finalCostCents);
      inputRef.current?.focus();
    },
    [isStreaming, localMessages, provider, model, intentGoal, intentAge, intentContext, scenarioData, persistMessages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Intent form
  if (!intentSubmitted) {
    return (
      <div className="flex flex-col bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
          <h3 className="text-sm font-semibold text-neutral-700">AI Insights ✦</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Tell us a bit about your situation to get personalized advice.</p>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              What are you trying to figure out? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={intentGoal}
              onChange={(e) => setIntentGoal(e.target.value)}
              placeholder="e.g. I want to retire at 52 and need to know if this plan gets me there..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-base resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Your age (optional)</label>
              <input
                type="number"
                value={intentAge}
                onChange={(e) => setIntentAge(e.target.value)}
                placeholder="35"
                min={18}
                max={100}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Planning context</label>
              <select
                value={intentContext}
                onChange={(e) => setIntentContext(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-base bg-white"
              >
                <option value="early_retirement">Early retirement / FIRE</option>
                <option value="general_savings">General savings goal</option>
                <option value="drawdown">Retirement drawdown</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Gate check before showing Start button */}
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <button className="w-full py-2.5 px-4 rounded-xl bg-primary-base text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                Sign in to unlock AI Insights
              </button>
            </SignInButton>
          ) : creditBalance === undefined ? (
            <div className="h-10 bg-neutral-100 rounded-xl animate-pulse" />
          ) : !canAccess ? (
            <div className="space-y-2">
              <button
                onClick={() => handleCheckout("one_time")}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-accent-orange-base to-accent-base text-neutral-900 font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Try Pro sample — $4.99
              </button>
              <button
                onClick={() => handleCheckout("subscription")}
                className="w-full py-2 px-4 rounded-xl border border-neutral-200 text-neutral-600 text-sm hover:bg-neutral-50 transition-colors"
              >
                Go Pro — $9.99/month
              </button>
            </div>
          ) : (
            <button
              disabled={!intentGoal.trim()}
              onClick={() => setIntentSubmitted(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-primary-base text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start conversation →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[480px] bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-700 shrink-0">AI Insights ✦</h3>
          <span className="text-xs text-neutral-400 truncate italic">{intentGoal}</span>
        </div>
        <ProviderPicker
          provider={provider}
          model={model}
          onChange={handleProviderChange}
          disabled={isStreaming}
        />
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {localMessages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500">Ask your first question about this plan.</p>
          </div>
        )}

        {localMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary-base text-white rounded-br-sm"
                  : "bg-neutral-100 text-neutral-800 rounded-bl-sm"
              } ${msg.streaming && !msg.content ? "animate-pulse" : ""}`}
            >
              {msg.content || (msg.streaming ? "▋" : "")}
            </div>
            {isAdmin && msg.role === "assistant" && msg.meta && !msg.streaming && (
              <p className="text-[10px] text-neutral-300 font-mono tabular-nums mt-0.5 px-1">
                {msg.meta.provider} · {msg.meta.model} · {msg.meta.tokensIn}↑ {msg.meta.tokensOut}↓ · ${(msg.meta.costCents / 100).toFixed(4)}
              </p>
            )}
          </div>
        ))}

        {persistError && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-600 flex items-center gap-2">
              <span>Message not saved.</span>
              <button
                onClick={() => persistMessages(persistError.userMsg, persistError.assistantMsg, persistError.costCents)}
                className="font-semibold underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Credit indicator */}
      {creditBalance && !creditBalance.isPro && (
        <div className="px-4 py-1.5 border-t border-neutral-100 bg-neutral-50">
          <CreditBar granted={creditBalance.granted} used={creditBalance.used} />
        </div>
      )}

      {/* Input */}
      <div className="border-t border-neutral-100 px-4 py-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your savings plan…"
            disabled={isStreaming}
            className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-base disabled:opacity-60"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2 bg-primary-base text-white text-sm font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          >
            {isStreaming ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreditBar({ granted, used }: { granted: number; used: number }) {
  const pct = granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;
  const remaining = Math.max(0, granted - used);
  const remainingDollars = (remaining / 100).toFixed(2);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct > 80 ? "bg-red-400" : "bg-primary-base"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-neutral-400 shrink-0">${remainingDollars} remaining</span>
    </div>
  );
}

async function handleCheckout(type: "one_time" | "subscription") {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  } catch {
    // noop
  }
}

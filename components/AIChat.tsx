"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CalculatorState } from "@/lib/defaultValues";
import { useIsAdmin } from "@/hooks/useIsAdmin";

type CalcUpdate = { field: string; value: number; reason: string };

type Usage = { inputTokens: number; outputTokens: number; costCents: number };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  calcUpdates?: CalcUpdate[];
  usage?: Usage | null;
  streaming?: boolean;
  provider?: string;
  model?: string;
};

type Props = {
  scenarioId: Id<"scenarios">;
  clerkId: string;
  blurbContext: { body: string; question: string; pitch: string };
  calculatorState: CalculatorState;
  results: { totalValue: number; interestEarned: number; principalPaid: number };
  currency: string;
  locale: string;
  isPaid: boolean;
  freeTokenBudget: number;
  creditBalance?: { granted: number; used: number; isPro?: boolean } | null;
  onUpsellNeeded: () => void;
  onCalculatorUpdate: (field: string, value: number) => void;
};

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part);
}

type ConvexMessage = {
  _id: Id<"messages">;
  role: string;
  content: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costCents?: number;
};

export default function AIChat({
  scenarioId,
  clerkId,
  blurbContext,
  calculatorState,
  results,
  currency,
  locale,
  isPaid,
  freeTokenBudget,
  creditBalance,
  onUpsellNeeded,
  onCalculatorUpdate,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showUpsellChip, setShowUpsellChip] = useState(false);
  const [openerStarted, setOpenerStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Frozen at mount — the blurb that seeded this conversation never changes even if inputs update
  const frozenBlurbRef = useRef(blurbContext);

  const savedMessages = useQuery(
    api.messages.getMessagesByScenario,
    clerkId ? { scenarioId, clerkId } : "skip"
  ) as ConvexMessage[] | undefined;

  const addMessage = useMutation(api.messages.addMessage);
  const incrementFreeTokens = useMutation(api.scenarios.incrementFreeTokens);
  const incrementAiUsage = useMutation(api.users.incrementAiUsage);

  // Read the conversation model config saved by AdminPanel as "provider:model"
  const defaultConvoModel = useQuery(api.appConfig.getConfig, { key: "defaultConversationModel" });
  const [provider, model] = (() => {
    if (defaultConvoModel?.includes(":")) return defaultConvoModel.split(":", 2);
    return ["anthropic", "claude-haiku-4-5-20251001"];
  })();
  const clearMessages = useMutation(api.messages.clearMessages);
  const isAdmin = useIsAdmin();

  // Load persisted messages once on mount
  useEffect(() => {
    if (savedMessages === undefined) return;
    if (messages.length > 0) return; // already seeded
    if (savedMessages.length > 0) {
      setMessages(
        savedMessages.map((m) => ({
          id: m._id,
          role: m.role as "user" | "assistant",
          content: m.content,
          provider: m.provider,
          model: m.model,
          usage: (m.inputTokens != null || m.outputTokens != null)
            ? { inputTokens: m.inputTokens ?? 0, outputTokens: m.outputTokens ?? 0, costCents: m.costCents ?? 0 }
            : undefined,
        }))
      );
    }
  }, [savedMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    // block:'nearest' scrolls the minimum needed — prevents the aggressive viewport
    // snap caused by the default block:'start' which jumps bottomRef to the top of screen.
    // Works for both the bounded lg: scroll container (desktop) and body scroll (mobile).
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  useEffect(() => {
    if (isStreaming) {
      // During streaming every token fires this effect. Use instant scroll so the
      // viewport tracks the live text without stuttering smooth-scroll queuing.
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
    } else {
      scrollToBottom();
    }
  }, [messages, isStreaming, scrollToBottom]);

  const sendMessage = useCallback(
    async (messageText: string, isOpener = false) => {
      if (isStreaming) return;

      const userMessage: Message | null = isOpener
        ? null
        : { id: crypto.randomUUID(), role: "user", content: messageText };

      if (userMessage) {
        setMessages((prev) => [...prev, userMessage]);
      }

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
      setIsStreaming(true);
      setInput("");

      const history = messages
        .filter((m) => !m.streaming)
        .map((m) => ({ role: m.role, content: m.content }));

      const body = {
        scenarioId,
        clerkId,
        provider,
        model,
        message: messageText,
        conversationHistory: history,
        blurbContext: frozenBlurbRef.current,
        startingAmount: calculatorState.startingAmount,
        monthlyContribution: calculatorState.monthlyContribution,
        timeframeYears: calculatorState.timeframeYears,
        interestRate: calculatorState.interestRate,
        totalValue: results.totalValue,
        interestEarned: results.interestEarned,
        goalAmount: undefined as number | undefined,
        currency,
        locale,
      };

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 402 || errData.error === "upgrade_required") {
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
            setShowUpsellChip(true);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        let fullText = "";
        let calcUpdates: CalcUpdate[] = [];
        let inputTokens = 0;
        let outputTokens = 0;
        let costCents = 0;

        const reader = res.body!.getReader();
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
              const evt = JSON.parse(line.slice(6));
              if (evt.type === "delta") {
                fullText += evt.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullText } : m
                  )
                );
              } else if (evt.type === "done") {
                fullText = evt.cleanText ?? fullText;
                calcUpdates = evt.calcUpdates ?? [];
                inputTokens = evt.usage?.inputTokens ?? 0;
                outputTokens = evt.usage?.outputTokens ?? 0;
                costCents = evt.usage?.costCents ?? 0;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullText, streaming: false, calcUpdates,
                          usage: { inputTokens, outputTokens, costCents },
                          provider, model }
                      : m
                  )
                );
              } else if (evt.type === "error") {
                throw new Error(evt.message ?? "Stream error");
              }
            } catch {
              // malformed SSE line, skip
            }
          }
        }

        // Apply calculator updates
        for (const u of calcUpdates) {
          if (u.field && typeof u.value === "number") onCalculatorUpdate(u.field, u.value);
        }

        // Persist messages
        if (!isOpener && clerkId) {
          await addMessage({
            scenarioId,
            clerkId,
            role: "user",
            content: messageText,
            provider,
            model,
          }).catch(() => {});
        }
        if (clerkId && fullText) {
          await addMessage({
            scenarioId,
            clerkId,
            role: "assistant",
            content: fullText,
            provider,
            model,
            tokensUsed: inputTokens + outputTokens,
            inputTokens,
            outputTokens,
            costCents,
          }).catch(() => {});
        }

        // Track token usage against credit balance / free budget
        if (isPaid && costCents > 0 && clerkId) {
          await incrementAiUsage({ clerkId, costInCents: costCents }).catch(() => {});
        } else if (!isPaid && outputTokens > 0) {
          await incrementFreeTokens({ scenarioId, tokens: outputTokens }).catch(() => {});
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Something went wrong. Please try again.", streaming: false }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [
      isStreaming, messages, scenarioId, clerkId, provider, model, locale,
      calculatorState, results, currency, isPaid,
      addMessage, incrementFreeTokens, onCalculatorUpdate,
    ]
  );

  // Generate opener if no history — wait for both queries to resolve so the
  // opener uses the admin-configured model, not the fallback default.
  useEffect(() => {
    if (savedMessages === undefined) return;
    if (defaultConvoModel === undefined) return;
    if (openerStarted) return;
    if (savedMessages.length > 0) return;
    setOpenerStarted(true);
    sendMessage("__OPENER__", true);
  }, [savedMessages, defaultConvoModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="mt-2 rounded-2xl border border-neutral-100 bg-white">
      {/* Message thread: no max-h on mobile (page body = single scroll container).
          Desktop only gets the bounded 480px region. */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-2 lg:max-h-[480px] lg:overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary-base text-white rounded-br-sm"
                  : "bg-neutral-50 text-neutral-800 rounded-bl-sm"
              }`}
            >
              {msg.streaming && !msg.content ? (
                <span className="inline-flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ) : (
                <span className="whitespace-pre-wrap">{renderBold(msg.content)}</span>
              )}
              {msg.calcUpdates && msg.calcUpdates.length > 0 && (
                <div className="mt-2 pt-2 border-t border-neutral-200/60 flex flex-col gap-1">
                  {msg.calcUpdates.map((u, i) => (
                    <div key={i} className="text-xs text-neutral-500 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-primary-base">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                      <span>Calculator updated: {u.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {isAdmin && msg.role === "assistant" && msg.usage && !msg.streaming && (
              <p className="text-[10px] text-neutral-500 font-mono tabular-nums mt-0.5 px-1">
                {msg.provider} · {msg.model} · {msg.usage.inputTokens}↑ {msg.usage.outputTokens}↓ · ${(msg.usage.costCents / 100).toFixed(6)}
                {creditBalance && creditBalance.granted > 0 && (() => {
                  const used = creditBalance.used;
                  const granted = creditBalance.granted;
                  const remaining = Math.max(0, granted - used);
                  const pct = Math.min(100, Math.round((used / granted) * 100));
                  return (
                    <span className="text-amber-500">
                      {" "}· ${(used / 100).toFixed(4)} used ({pct}%) · ${(remaining / 100).toFixed(4)} left of ${(granted / 100).toFixed(2)}
                    </span>
                  );
                })()}
                {creditBalance && creditBalance.granted === 0 && creditBalance.isPro && (
                  <span className="text-amber-500"> · Pro plan (unlimited)</span>
                )}
              </p>
            )}
          </div>
        ))}

        {showUpsellChip && (
          <div className="flex justify-center">
            <button
              onClick={onUpsellNeeded}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-accent-orange-base to-accent-base text-neutral-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>✦</span>
              <span>You&apos;ve used your free chat — unlock unlimited →</span>
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Admin: clear conversation */}
      {isAdmin && messages.length > 0 && !isStreaming && (
        <div className="flex justify-end px-3 pb-1">
          <button
            onClick={async () => {
              if (!clerkId) return;
              await clearMessages({ scenarioId, clerkId }).catch(() => {});
              setMessages([]);
              setOpenerStarted(false);
            }}
            className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors font-mono"
          >
            clear conversation ↺
          </button>
        </div>
      )}

      {/* Input row — sticky on mobile so it pins above the virtual keyboard AND
          the fixed bottom nav bar. The style tag adjusts the bottom offset to
          clear the nav bar (3.75rem + safe-area). lg:static restores normal
          flow on desktop where there is no nav bar. */}
      <style>{`
        @media (max-width: 1023px) {
          form.aichat-input-form { bottom: calc(4rem + env(safe-area-inset-bottom, 0px)); }
        }
      `}</style>
      <form
        onSubmit={handleSubmit}
        className="aichat-input-form flex items-end gap-2 px-3 py-3 border-t border-neutral-100 sticky bottom-0 bg-white z-10 lg:static lg:z-auto"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your plan…"
          rows={1}
          disabled={isStreaming || showUpsellChip}
          className="flex-1 resize-none rounded-xl border-2 border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-base/50 focus:border-primary-base placeholder:text-slate-400 disabled:opacity-50 leading-5 max-h-28 overflow-y-auto text-slate-800"
          style={{ minHeight: "36px", fontSize: "16px" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming || showUpsellChip}
          className="shrink-0 w-10 h-10 rounded-xl bg-accent-orange-base text-white flex items-center justify-center hover:brightness-110 transition-all shadow-md disabled:opacity-30 disabled:shadow-none"
          aria-label="Send"
        >
          {isStreaming ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="animate-spin opacity-90">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity=".3"/>
              <path d="M20 12h2A10 10 0 0 0 12 2v2a8 8 0 0 1 8 8z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

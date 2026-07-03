"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
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
  onOpenCalculator?: (field?: string) => void;
  focusSignal?: number;
};

function renderInline(text: string): React.ReactNode {
  // Split on **bold** markers first, then apply app-name styling within plain segments
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  return boldParts.map((part, i) => {
    if (i % 2 === 1) return <strong key={i} className="font-semibold">{part}</strong>;
    // Within plain text, highlight "simplesavings.app"
    const appParts = part.split(/(simplesavings\.app)/g);
    if (appParts.length === 1) return part;
    return appParts.map((seg, j) =>
      seg === "simplesavings.app"
        ? <strong key={`${i}-${j}`} style={{ color: '#F58634' }}>{seg}</strong>
        : seg
    );
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // H2
    if (line.startsWith("## ")) {
      nodes.push(<p key={i} className="font-bold text-sm text-neutral-900 mt-4 mb-1 first:mt-0">{renderInline(line.slice(3))}</p>);
    // H3
    } else if (line.startsWith("### ")) {
      nodes.push(<p key={i} className="font-semibold text-sm text-neutral-700 mt-3 mb-1">{renderInline(line.slice(4))}</p>);
    // Bullet: -, *, ✓, or other leading emoji bullet
    } else if (/^[-*] /.test(line) || /^[✓•▸→🔹🔸💡📌🎯💰📊🧮🌍💾🔗🤖💬🗂️] /.test(line)) {
      const isCheckmark = line.startsWith("✓ ");
      const isDash = /^[-*] /.test(line);
      const content = isDash ? line.slice(2) : isCheckmark ? line.slice(2) : line;
      nodes.push(
        <div key={i} className="flex gap-2 items-baseline text-sm py-0.5">
          {isCheckmark
            ? <span className="shrink-0 font-bold leading-snug" style={{ color: '#16a34a' }}>✓</span>
            : isDash
            ? <span className="shrink-0 text-primary-base font-bold leading-snug">•</span>
            : null}
          <span className="leading-snug">{renderInline(content)}</span>
        </div>
      );
    // Example callout
    } else if (line.startsWith("💡 Example:") || line.startsWith("💡 Example :")) {
      nodes.push(
        <div key={i} className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 my-1 text-xs text-amber-900 leading-relaxed">
          {renderInline(line)}
        </div>
      );
    // Blank line → spacer
    } else if (line.trim() === "") {
      nodes.push(<div key={i} className="h-2" />);
    // Normal paragraph line
    } else {
      nodes.push(<p key={i} className="text-sm leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }
  return <div className="flex flex-col gap-1">{nodes}</div>;
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
  onOpenCalculator,
  focusSignal,
}: Props) {
  const tChat = useTranslations("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showUpsellChip, setShowUpsellChip] = useState(false);
  const [openerStarted, setOpenerStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevStreamingRef = useRef(false);
  // Frozen at mount — the blurb that seeded this conversation never changes even if inputs update
  const frozenBlurbRef = useRef(blurbContext);

  const { isAuthenticated: isConvexAuthed } = useConvexAuth();
  const savedMessages = useQuery(
    api.messages.getMessagesByScenario,
    isConvexAuthed ? { scenarioId } : "skip"
  ) as ConvexMessage[] | undefined;

  const addMessage = useMutation(api.messages.addMessage);

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

  // Focus the message input when the parent opens the chat (e.g. the blurb CTA),
  // so the user can start typing immediately. Skip the initial mount (signal 0/undefined).
  useEffect(() => {
    if (focusSignal) {
      // Wait a frame so the tab switch / scroll settles before focusing.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [focusSignal]);

  // Focus input when AI finishes responding (streaming true → false only, not on mount)
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      inputRef.current?.focus();
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

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

        // Persist messages (usage/cost + free-budget metering are recorded
        // server-side by the insights route — the client cannot skip it).
        if (!isOpener && clerkId) {
          await addMessage({
            scenarioId,
            role: "user",
            content: messageText,
            provider,
            model,
          }).catch(() => {});
        }
        if (clerkId && fullText) {
          await addMessage({
            scenarioId,
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
      addMessage, onCalculatorUpdate,
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
                msg.role === "assistant"
                  ? renderMarkdown(msg.content)
                  : <span className="whitespace-pre-wrap">{renderInline(msg.content)}</span>
              )}
              {msg.calcUpdates && msg.calcUpdates.length > 0 && (
                <div className="mt-2 pt-2 border-t border-neutral-200/60 flex flex-col gap-1">
                  {msg.calcUpdates.map((u, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onOpenCalculator?.(u.field)}
                      title={tChat("viewInCalculator")}
                      className="group inline-flex items-center gap-1.5 self-start rounded-full border border-primary-base/30 bg-primary-base/10 px-3 py-1.5 text-xs font-semibold text-primary-base hover:bg-primary-base/20 hover:border-primary-base/50 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                      <span>{tChat("calculatorUpdated")}: {u.reason}</span>
                      <span aria-hidden className="opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
                    </button>
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
              <span>{tChat("freeChatUsed")} →</span>
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
              await clearMessages({ scenarioId }).catch(() => {});
              setMessages([]);
              setOpenerStarted(false);
            }}
            className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors font-mono"
          >
            {tChat("clearConversation")} ↺
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
          placeholder={tChat("inputPlaceholder")}
          rows={1}
          disabled={isStreaming || showUpsellChip}
          className="flex-1 resize-none rounded-xl border-2 border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-base/50 focus:border-primary-base placeholder:text-slate-400 disabled:opacity-50 leading-5 max-h-28 overflow-y-auto text-slate-800"
          style={{ minHeight: "36px", fontSize: "16px" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming || showUpsellChip}
          className="shrink-0 w-10 h-10 rounded-xl bg-accent-orange-base text-white flex items-center justify-center hover:brightness-110 transition-all shadow-md disabled:opacity-30 disabled:shadow-none"
          aria-label={tChat("send")}
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

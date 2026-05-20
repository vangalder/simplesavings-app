"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import ProviderPicker, { PROVIDERS } from "@/components/ProviderPicker";

type Message = {
  _id: string;
  role: string;
  content: string;
  provider: string;
  model: string;
  createdAt: number;
};

type Props = {
  scenarioId: Id<"scenarios">;
  clerkId: string;
};

export default function InsightsPanel({ scenarioId, clerkId }: Props) {
  const [provider, setProvider] = useState(PROVIDERS[0].id);
  const [model, setModel] = useState(PROVIDERS[0].models[0].id);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(api.messages.getMessagesByScenario, {
    scenarioId,
    clerkId,
  }) as Message[] | undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleProviderChange = (newProvider: string, newModel: string) => {
    setProvider(newProvider);
    setModel(newModel);
  };

  return (
    <div className="flex flex-col h-full min-h-[400px] bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50">
        <h3 className="text-sm font-semibold text-neutral-700">AI Insights ✨</h3>
        <ProviderPicker
          provider={provider}
          model={model}
          onChange={handleProviderChange}
          disabled
        />
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages === undefined && (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <div className="w-4 h-4 border-2 border-neutral-300 border-t-primary-base rounded-full animate-spin" />
            Loading…
          </div>
        )}

        {messages?.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500">No messages yet.</p>
            <p className="text-xs text-neutral-400 mt-1">
              Ask a question about your savings plan to get started.
            </p>
          </div>
        )}

        {messages?.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-primary-base text-white rounded-br-sm"
                  : "bg-neutral-100 text-neutral-800 rounded-bl-sm"
              }`}
            >
              {msg.content}
              <div className="text-[10px] opacity-50 mt-1 text-right">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-neutral-100 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your savings plan…"
            disabled
            className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-neutral-50 text-neutral-400 placeholder:text-neutral-300 focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            disabled
            title="Insights coming soon"
            className="px-4 py-2 bg-primary-base text-white text-sm font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-neutral-400 mt-1.5 text-center">
          AI Insights is coming soon — conversation history is already being stored.
        </p>
      </div>
    </div>
  );
}

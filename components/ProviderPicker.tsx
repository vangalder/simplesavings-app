"use client";

import { useState } from "react";

export type Provider = {
  id: string;
  label: string;
  models: { id: string; label: string }[];
};

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    models: [
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-opus-4-7", label: "Claude Opus 4.7" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "o3-mini", label: "o3-mini" },
    ],
  },
  {
    id: "google",
    label: "Gemini",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    models: [
      // Balanced — primary recommended option
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
      // DeepSeek — max efficiency, near-zero cost
      { id: "deepseek/deepseek-chat", label: "DeepSeek V3" },
      { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
      { id: "deepseek/deepseek-r1-0528", label: "DeepSeek R1 (May)" },
      // Google Gemma — creative, punchy, low latency
      { id: "google/gemma-2-27b-it", label: "Gemma 2 27B" },
      { id: "google/gemma-3-12b-it", label: "Gemma 3 12B" },
      // Llama — high-speed fallback
      { id: "meta-llama/llama-3.1-8b-instruct", label: "Llama 3.1 8B" },
      { id: "meta-llama/llama-3.1-405b-instruct", label: "Llama 3.1 405B" },
      { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
      { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout" },
      // Mistral — fast, compact
      { id: "mistralai/mistral-small-3.2-24b-instruct", label: "Mistral Small 3.2" },
      { id: "mistralai/mistral-nemo", label: "Mistral Nemo" },
      // Qwen
      { id: "qwen/qwen3-235b-a22b", label: "Qwen3 235B" },
      { id: "qwen/qwen3-30b-a3b", label: "Qwen3 30B" },
      // Microsoft
      { id: "microsoft/phi-4", label: "Phi-4" },
    ],
  },
  {
    id: "xai",
    label: "Grok",
    models: [
      { id: "grok-3", label: "Grok 3" },
      { id: "grok-3-mini", label: "Grok 3 mini" },
    ],
  },
];

type Props = {
  provider: string;
  model: string;
  onChange: (provider: string, model: string) => void;
  disabled?: boolean;
};

export default function ProviderPicker({ provider, model, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  const currentProvider = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];
  const currentModel = currentProvider.models.find((m) => m.id === model) ?? currentProvider.models[0];

  const handleProviderChange = (providerId: string) => {
    const p = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0];
    onChange(p.id, p.models[0].id);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <select
        value={provider}
        onChange={(e) => handleProviderChange(e.target.value)}
        disabled={disabled}
        className="text-xs border border-neutral-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-base disabled:opacity-50"
      >
        {PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        value={model}
        onChange={(e) => onChange(provider, e.target.value)}
        disabled={disabled}
        className="text-xs border border-neutral-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-base disabled:opacity-50"
      >
        {currentProvider.models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}

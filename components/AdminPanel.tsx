"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import ProviderPicker, { PROVIDERS } from "@/components/ProviderPicker";

// Default scenario used for arena testing
const ARENA_SCENARIO = {
  startingAmount: 10000,
  monthlyContribution: 500,
  timeframeYears: 20,
  interestRate: 7,
  totalValue: 272000,
  interestEarned: 152000,
  currency: "USD",
};

type ArenaResult = { content: string; streaming: boolean; done: boolean };

export default function AdminPanel() {
  const stats = useQuery(api.users.getAdminStats, {});
  const blurbModel = useQuery(api.appConfig.getConfig, { key: "defaultBlurbModel" });
  const convoModel = useQuery(api.appConfig.getConfig, { key: "defaultConversationModel" });
  const setConfig = useMutation(api.appConfig.setConfig);

  // Model config state
  const [blurbProvider, setBlurbProvider] = useState("anthropic");
  const [blurbModelId, setBlurbModelId] = useState("claude-haiku-4-5-20251001");
  const [convoProvider, setConvoProvider] = useState("anthropic");
  const [convoModelId, setConvoModelId] = useState("claude-sonnet-4-6");
  const [configSaved, setConfigSaved] = useState(false);

  // Sync dropdowns from Convex when config loads
  useEffect(() => {
    if (blurbModel && typeof blurbModel === "string" && blurbModel.includes(":")) {
      const [p, m] = blurbModel.split(":", 2);
      setBlurbProvider(p);
      setBlurbModelId(m);
    }
  }, [blurbModel]);

  useEffect(() => {
    if (convoModel && typeof convoModel === "string" && convoModel.includes(":")) {
      const [p, m] = convoModel.split(":", 2);
      setConvoProvider(p);
      setConvoModelId(m);
    }
  }, [convoModel]);

  // Arena state
  const [arenaProvider1, setArenaProvider1] = useState("anthropic");
  const [arenaModel1, setArenaModel1] = useState("claude-sonnet-4-6");
  const [arenaProvider2, setArenaProvider2] = useState("google");
  const [arenaModel2, setArenaModel2] = useState("gemini-2.5-flash");
  const [arenaPrompt, setArenaPrompt] = useState("");
  const [arenaRunning, setArenaRunning] = useState(false);
  const [result1, setResult1] = useState<ArenaResult>({ content: "", streaming: false, done: false });
  const [result2, setResult2] = useState<ArenaResult>({ content: "", streaming: false, done: false });

  const handleSaveConfig = async () => {
    await setConfig({ key: "defaultBlurbModel", value: `${blurbProvider}:${blurbModelId}` });
    await setConfig({ key: "defaultConversationModel", value: `${convoProvider}:${convoModelId}` });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const streamArena = useCallback(
    async (
      provider: string,
      model: string,
      setter: React.Dispatch<React.SetStateAction<ArenaResult>>
    ) => {
      setter({ content: "", streaming: true, done: false });
      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            model,
            message: arenaPrompt,
            intentGoal: arenaPrompt,
            intentContext: "general_savings",
            conversationHistory: [],
            ...ARENA_SCENARIO,
          }),
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

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
                accumulated += parsed.content;
                setter({ content: accumulated, streaming: true, done: false });
              }
            } catch {
              // skip malformed
            }
          }
        }
        setter({ content: accumulated, streaming: false, done: true });
      } catch (err) {
        setter({ content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`, streaming: false, done: true });
      }
    },
    [arenaPrompt]
  );

  const handleRunArena = async () => {
    if (!arenaPrompt.trim() || arenaRunning) return;
    setArenaRunning(true);
    setResult1({ content: "", streaming: false, done: false });
    setResult2({ content: "", streaming: false, done: false });
    await Promise.all([
      streamArena(arenaProvider1, arenaModel1, setResult1),
      streamArena(arenaProvider2, arenaModel2, setResult2),
    ]);
    setArenaRunning(false);
  };

  const modelLabel = (provider: string, modelId: string) => {
    const p = PROVIDERS.find((p) => p.id === provider);
    const m = p?.models.find((m) => m.id === modelId);
    return m ? `${p?.label} / ${m.label}` : modelId;
  };

  return (
    <div className="space-y-6 mt-2">
      <h2 className="text-xl font-display font-semibold text-neutral-800">Admin</h2>

      {/* Usage Stats */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Usage Stats</h3>
        {stats === undefined ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total users" value={stats.totalUsers} />
            <Stat label="Pro subscribers" value={stats.proSubscribers} />
            <Stat label="One-time purchases" value={stats.oneTimePurchases} />
            <Stat label="AI responses" value={stats.totalAiMessages} />
          </div>
        )}
        {stats && (
          <p className="text-xs text-neutral-400 mt-3">
            Total AI spend: ${(stats.totalAiCostCents / 100).toFixed(2)}
          </p>
        )}
      </div>

      {/* Model Configuration */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-1">Model Configuration</h3>
        <p className="text-xs text-neutral-400 mb-4">
          Current saved — Blurb: <span className="font-mono">{blurbModel ?? "not set"}</span> · Conversation: <span className="font-mono">{convoModel ?? "not set"}</span>
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Default blurb model (free, high-volume)</label>
            <ProviderPicker
              provider={blurbProvider}
              model={blurbModelId}
              onChange={(p, m) => { setBlurbProvider(p); setBlurbModelId(m); }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Default conversation model (paid)</label>
            <ProviderPicker
              provider={convoProvider}
              model={convoModelId}
              onChange={(p, m) => { setConvoProvider(p); setConvoModelId(m); }}
            />
          </div>
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-primary-base text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            {configSaved ? "Saved ✓" : "Save defaults"}
          </button>
        </div>
      </div>

      {/* Arena Testing */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-1">Arena Testing</h3>
        <p className="text-xs text-neutral-400 mb-4">
          Side-by-side model comparison using a fixed test scenario ($10k / $500mo / 20yr / 7%).
        </p>

        <div className="flex gap-4 mb-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Model A</label>
            <ProviderPicker
              provider={arenaProvider1}
              model={arenaModel1}
              onChange={(p, m) => { setArenaProvider1(p); setArenaModel1(m); }}
              disabled={arenaRunning}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Model B</label>
            <ProviderPicker
              provider={arenaProvider2}
              model={arenaModel2}
              onChange={(p, m) => { setArenaProvider2(p); setArenaModel2(m); }}
              disabled={arenaRunning}
            />
          </div>
        </div>

        <textarea
          value={arenaPrompt}
          onChange={(e) => setArenaPrompt(e.target.value)}
          placeholder="Ask a question about the test scenario…"
          rows={2}
          disabled={arenaRunning}
          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-base resize-none mb-3 disabled:opacity-60"
        />

        <button
          onClick={handleRunArena}
          disabled={!arenaPrompt.trim() || arenaRunning}
          className="px-4 py-2 bg-primary-base text-white text-sm font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mb-4"
        >
          {arenaRunning ? "Running…" : "Run arena"}
        </button>

        {(result1.content || result2.content || result1.streaming || result2.streaming) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ArenaPane label={modelLabel(arenaProvider1, arenaModel1)} result={result1} />
            <ArenaPane label={modelLabel(arenaProvider2, arenaModel2)} result={result2} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-neutral-50 rounded-xl p-3">
      <p className="text-2xl font-bold text-neutral-900">{value.toLocaleString()}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}

function ArenaPane({ label, result }: { label: string; result: ArenaResult }) {
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2">
        <span className="text-xs font-medium text-neutral-600 truncate">{label}</span>
        {result.streaming && (
          <span className="text-[10px] text-primary-base animate-pulse shrink-0">streaming…</span>
        )}
        {result.done && (
          <span className="text-[10px] text-green-500 shrink-0">done</span>
        )}
      </div>
      <div className="p-3 text-sm text-neutral-800 whitespace-pre-wrap min-h-[80px]">
        {result.content || (result.streaming ? "▋" : <span className="text-neutral-300">—</span>)}
      </div>
    </div>
  );
}

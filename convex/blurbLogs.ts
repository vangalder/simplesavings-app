import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

// Public insert-only telemetry: the ai-blurb route serves anonymous marketing
// visitors through an unauthenticated server client, so this stays open. It
// only appends rows and exposes no data.
export const logBlurbCall = mutation({
  args: {
    provider: v.string(),
    model: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    latencyMs: v.number(),
    costUsd: v.number(),
    isTranslation: v.boolean(),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("blurb_logs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

type ModelStats = {
  provider: string;
  model: string;
  callCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  avgCostUsd: number;
  totalCostUsd: number;
  avgTokensIn: number;
  avgTokensOut: number;
  translationCount: number;
};

export const getModelStats = query({
  args: {},
  handler: async (ctx): Promise<ModelStats[]> => {
    await requireAdmin(ctx);
    const logs = await ctx.db.query("blurb_logs").order("desc").take(5000);

    const byKey = new Map<string, {
      provider: string; model: string;
      latencies: number[]; costs: number[];
      tokensIn: number[]; tokensOut: number[];
      translationCount: number;
    }>();

    for (const log of logs) {
      const key = `${log.provider}:${log.model}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          provider: log.provider, model: log.model,
          latencies: [], costs: [], tokensIn: [], tokensOut: [],
          translationCount: 0,
        });
      }
      const entry = byKey.get(key)!;
      entry.latencies.push(log.latencyMs);
      entry.costs.push(log.costUsd);
      entry.tokensIn.push(log.tokensIn);
      entry.tokensOut.push(log.tokensOut);
      if (log.isTranslation) entry.translationCount++;
    }

    return Array.from(byKey.values()).map((e) => {
      const sorted = [...e.latencies].sort((a, b) => a - b);
      const p95idx = Math.floor(sorted.length * 0.95);
      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      return {
        provider: e.provider,
        model: e.model,
        callCount: e.latencies.length,
        avgLatencyMs: Math.round(avg(e.latencies)),
        p95LatencyMs: sorted[p95idx] ?? 0,
        avgCostUsd: avg(e.costs),
        totalCostUsd: e.costs.reduce((a, b) => a + b, 0),
        avgTokensIn: Math.round(avg(e.tokensIn)),
        avgTokensOut: Math.round(avg(e.tokensOut)),
        translationCount: e.translationCount,
      };
    }).sort((a, b) => b.callCount - a.callCount);
  },
});

export const getRecentLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.query("blurb_logs").order("desc").take(args.limit ?? 100);
  },
});

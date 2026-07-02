import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireScenarioOwner } from "./lib/auth";

export const getMessagesByScenario = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    await requireScenarioOwner(ctx, args.scenarioId);
    return await ctx.db
      .query("messages")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .order("asc")
      .collect();
  },
});

export const addMessage = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    role: v.string(),
    content: v.string(),
    provider: v.string(),
    model: v.string(),
    tokensUsed: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireScenarioOwner(ctx, args.scenarioId);
    return await ctx.db.insert("messages", {
      ...args,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const clearMessages = mutation({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    await requireScenarioOwner(ctx, args.scenarioId);
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .collect();
    await Promise.all(msgs.map((m) => ctx.db.delete(m._id)));
  },
});

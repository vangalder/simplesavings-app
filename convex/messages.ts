import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMessagesByScenario = query({
  args: { scenarioId: v.id("scenarios"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return [];

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
    clerkId: v.string(),
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const { clerkId, ...data } = args;
    return await ctx.db.insert("messages", {
      ...data,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const clearMessages = mutation({
  args: { scenarioId: v.id("scenarios"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .collect();

    await Promise.all(msgs.map((m) => ctx.db.delete(m._id)));
  },
});

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull, requireScenarioOwner } from "./lib/auth";

export const getScenariosByUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    return await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getScenarioById = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario || scenario.userId !== user._id) return null;
    return scenario;
  },
});

export const saveScenario = mutation({
  args: {
    name: v.string(),
    startingAmount: v.number(),
    monthlyContribution: v.number(),
    timeframeYears: v.number(),
    interestRate: v.number(),
    totalValue: v.number(),
    principalPaid: v.number(),
    interestEarned: v.number(),
    type: v.optional(v.string()),
    description: v.optional(v.string()),
    goals: v.optional(v.string()),
    goalAmount: v.optional(v.number()),
    chartType: v.optional(v.string()),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Free users: overwrite the single existing scenario rather than creating a second
    if (!user.isPro && existing.length >= 1) {
      const toReplace = existing[0];
      await ctx.db.patch(toReplace._id, {
        ...args,
        type: args.type ?? "simple_savings",
        updatedAt: now,
      });
      return toReplace._id;
    }

    return await ctx.db.insert("scenarios", {
      userId: user._id,
      ...args,
      type: args.type ?? "simple_savings",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateScenario = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    goals: v.optional(v.string()),
    goalAmount: v.optional(v.number()),
    chartType: v.optional(v.string()),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireScenarioOwner(ctx, args.scenarioId);
    const { scenarioId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined)
    );
    await ctx.db.patch(scenarioId, { ...updates, updatedAt: Date.now() });
  },
});

export const updateScenarioAiConfig = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    aiProvider: v.optional(v.string()),
    aiModel: v.optional(v.string()),
    aiSystemPromptOverride: v.optional(v.string()),
    aiPersonaName: v.optional(v.string()),
    aiPersonaVoice: v.optional(v.string()),
    aiPersonaStyle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireScenarioOwner(ctx, args.scenarioId);
    const { scenarioId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined)
    );
    await ctx.db.patch(scenarioId, { ...updates, updatedAt: Date.now() });
  },
});

export const autosaveScenario = mutation({
  args: {
    startingAmount: v.number(),
    monthlyContribution: v.number(),
    timeframeYears: v.number(),
    interestRate: v.number(),
    totalValue: v.number(),
    principalPaid: v.number(),
    interestEarned: v.number(),
    goalAmount: v.optional(v.number()),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("scenarios", {
      userId: user._id,
      name: "My Plan",
      ...args,
      type: "simple_savings",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getDefaultScenario = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
  },
});

export const updateBlurbCache = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    blurbEn: v.string(),
    blurbQuestionEn: v.string(),
    blurbPitchEn: v.string(),
    blurbInputsHash: v.string(),
  },
  handler: async (ctx, args) => {
    await requireScenarioOwner(ctx, args.scenarioId);
    const { scenarioId, ...fields } = args;
    await ctx.db.patch(scenarioId, { ...fields, updatedAt: Date.now() });
  },
});

export const deleteScenario = mutation({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    await requireScenarioOwner(ctx, args.scenarioId);

    // Cascade delete messages
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .collect();
    await Promise.all(msgs.map((m) => ctx.db.delete(m._id)));

    await ctx.db.delete(args.scenarioId);
  },
});

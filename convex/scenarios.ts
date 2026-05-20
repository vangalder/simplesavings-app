import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getScenariosByUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getScenarioById = query({
  args: { scenarioId: v.id("scenarios"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario || scenario.userId !== user._id) return null;

    return scenario;
  },
});

export const saveScenario = mutation({
  args: {
    clerkId: v.string(),
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const now = Date.now();
    const { clerkId, ...scenarioData } = args;

    const existing = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Free users: overwrite the single existing scenario rather than creating a second
    if (!user.isPro && existing.length >= 1) {
      const toReplace = existing[0];
      await ctx.db.patch(toReplace._id, {
        ...scenarioData,
        type: scenarioData.type ?? "simple_savings",
        updatedAt: now,
      });
      return toReplace._id;
    }

    return await ctx.db.insert("scenarios", {
      userId: user._id,
      ...scenarioData,
      type: scenarioData.type ?? "simple_savings",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateScenario = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    clerkId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    goals: v.optional(v.string()),
    goalAmount: v.optional(v.number()),
    chartType: v.optional(v.string()),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario || scenario.userId !== user._id) {
      throw new Error("Scenario not found or unauthorized");
    }

    const { scenarioId, clerkId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(scenarioId, { ...updates, updatedAt: Date.now() });
  },
});

export const updateScenarioAiConfig = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    clerkId: v.string(),
    aiProvider: v.optional(v.string()),
    aiModel: v.optional(v.string()),
    aiSystemPromptOverride: v.optional(v.string()),
    aiPersonaName: v.optional(v.string()),
    aiPersonaVoice: v.optional(v.string()),
    aiPersonaStyle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");

    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario || scenario.userId !== user._id) {
      throw new Error("Scenario not found or unauthorized");
    }

    const { scenarioId, clerkId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(scenarioId, { ...updates, updatedAt: Date.now() });
  },
});

export const autosaveScenario = mutation({
  args: {
    clerkId: v.string(),
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");

    const now = Date.now();
    const { clerkId, ...data } = args;
    const existing = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...data, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("scenarios", {
      userId: user._id,
      name: "My Plan",
      ...data,
      type: "simple_savings",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getDefaultScenario = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
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
    const { scenarioId, ...fields } = args;
    await ctx.db.patch(scenarioId, { ...fields, updatedAt: Date.now() });
  },
});

export const incrementFreeTokens = mutation({
  args: { scenarioId: v.id("scenarios"), tokens: v.number() },
  handler: async (ctx, args) => {
    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario) return;
    await ctx.db.patch(args.scenarioId, {
      chatTokensUsedFree: (scenario.chatTokensUsedFree ?? 0) + args.tokens,
      updatedAt: Date.now(),
    });
  },
});

export const deleteScenario = mutation({
  args: { scenarioId: v.id("scenarios"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario || scenario.userId !== user._id) {
      throw new Error("Scenario not found or unauthorized");
    }

    // Cascade delete messages
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .collect();
    await Promise.all(msgs.map((m) => ctx.db.delete(m._id)));

    await ctx.db.delete(args.scenarioId);
  },
});

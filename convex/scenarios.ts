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
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const now = Date.now();
    const { clerkId, name, ...scenarioData } = args;

    const existing = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Free users: overwrite the single existing scenario rather than creating a second
    if (!user.isPro && existing.length >= 1) {
      const toReplace = existing[0];
      await ctx.db.patch(toReplace._id, {
        name,
        ...scenarioData,
        updatedAt: now,
      });
      return toReplace._id;
    }

    return await ctx.db.insert("scenarios", {
      userId: user._id,
      name,
      ...scenarioData,
      createdAt: now,
      updatedAt: now,
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

    await ctx.db.delete(args.scenarioId);
  },
});

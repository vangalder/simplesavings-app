import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMyUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        isPro: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const setUserPro = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { isPro: true, updatedAt: Date.now() });
  },
});

export const unsetUserPro = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { isPro: false, updatedAt: Date.now() });
  },
});

export const getAiCreditBalance = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return null;
    return {
      granted: user.aiCreditsGranted ?? 0,
      used: user.aiCreditsUsed ?? 0,
      isPro: user.isPro,
    };
  },
});

export const incrementAiUsage = mutation({
  args: { clerkId: v.string(), costInCents: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      aiCreditsUsed: (user.aiCreditsUsed ?? 0) + args.costInCents,
      updatedAt: Date.now(),
    });
  },
});

export const grantAiCredits = mutation({
  args: { clerkId: v.string(), creditsInCents: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      aiCreditsGranted: (user.aiCreditsGranted ?? 0) + args.creditsInCents,
      updatedAt: Date.now(),
    });
  },
});

// Resets the test account to a fresh Pro Sample state: zeros out usage and
// sets granted to the standard $4.99 sample amount. Only called from the
// admin panel when test mode is toggled to "sample".
export const seedTestCredits = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      aiCreditsGranted: 499,
      aiCreditsUsed: 0,
      isPro: false,
      updatedAt: Date.now(),
    });
  },
});

export const getClerkIdByStripeCustomer = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("stripeCustomerId"), args.stripeCustomerId))
      .first();
    return user?.clerkId ?? null;
  },
});

export const getTokenStats = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return null;
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(100_000);
    const tokensUsed = msgs.reduce((sum, m) => sum + (m.inputTokens ?? 0) + (m.outputTokens ?? 0), 0);
    return { tokensUsed };
  },
});

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const allMessages = await ctx.db.query("messages").collect();
    const allPurchases = await ctx.db.query("purchases").collect();
    const allScenarios = await ctx.db.query("scenarios").collect();
    const blurbLogs = await ctx.db.query("blurb_logs").collect();

    const proCount = allUsers.filter((u) => u.isPro).length;
    const freeUsers = allUsers.filter((u) => !u.isPro);
    const totalAiCostCents = allUsers.reduce((sum, u) => sum + (u.aiCreditsUsed ?? 0), 0);
    const completedPurchases = allPurchases.filter((p) => p.status === "complete").length;
    const assistantMessages = allMessages.filter((m) => m.role === "assistant").length;
    const totalBlurbs = blurbLogs.length;
    const totalBlurbCostUsd = blurbLogs.reduce((sum, l) => sum + l.costUsd, 0);

    // Average cloud saves per free user
    const freeUserIds = new Set(freeUsers.map((u) => u._id));
    const freeScenarios = allScenarios.filter((s) => freeUserIds.has(s.userId));
    const avgSavesPerFreeUser = freeUsers.length > 0
      ? freeScenarios.length / freeUsers.length
      : 0;

    return {
      totalUsers: allUsers.length,
      proSubscribers: proCount,
      oneTimePurchases: completedPurchases,
      totalAiMessages: assistantMessages,
      totalAiCostCents,
      totalBlurbs,
      totalBlurbCostUsd,
      avgSavesPerFreeUser: Math.round(avgSavesPerFreeUser * 10) / 10,
    };
  },
});

export const updateUserPreferences = mutation({
  args: {
    clerkId: v.string(),
    locale: v.optional(v.string()),
    currency: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const { clerkId, ...updates } = args;
    const patch = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(user._id, { ...patch, updatedAt: Date.now() });
  },
});

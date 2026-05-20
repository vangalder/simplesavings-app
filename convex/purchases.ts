import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const completeTasteTestPurchase = mutation({
  args: {
    clerkId: v.string(),
    stripePaymentIntentId: v.string(),
    scenarioId: v.optional(v.id("scenarios")),
    creditsGranted: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");

    // Idempotency — skip if this payment intent was already processed
    const existing = await ctx.db
      .query("purchases")
      .withIndex("by_payment_intent", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
      )
      .first();
    if (existing?.status === "complete") return existing._id;

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "complete",
        scenarioId: args.scenarioId,
        creditsGranted: args.creditsGranted,
      });
    } else {
      await ctx.db.insert("purchases", {
        userId: user._id,
        stripePaymentIntentId: args.stripePaymentIntentId,
        status: "complete",
        scenarioId: args.scenarioId,
        creditsGranted: args.creditsGranted,
        createdAt: now,
      });
    }

    // Grant credits
    await ctx.db.patch(user._id, {
      aiCreditsGranted: (user.aiCreditsGranted ?? 0) + args.creditsGranted,
      updatedAt: now,
    });
  },
});

export const getMyPurchases = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    return await ctx.db
      .query("purchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

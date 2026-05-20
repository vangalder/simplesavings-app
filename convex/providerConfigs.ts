import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getProviderConfig = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("provider_configs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
  },
});

export const getAllProviderConfigs = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("provider_configs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const upsertProviderConfig = mutation({
  args: {
    clerkId: v.string(),
    provider: v.string(),
    model: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("provider_configs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("provider"), args.provider))
      .first();

    if (args.isDefault) {
      // Unset any current default
      const currentDefault = await ctx.db
        .query("provider_configs")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("isDefault"), true))
        .first();
      if (currentDefault && currentDefault._id !== existing?._id) {
        await ctx.db.patch(currentDefault._id, { isDefault: false });
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        model: args.model,
        isDefault: args.isDefault,
      });
      return existing._id;
    }

    return await ctx.db.insert("provider_configs", {
      userId: user._id,
      provider: args.provider,
      model: args.model,
      isDefault: args.isDefault,
      createdAt: Date.now(),
    });
  },
});

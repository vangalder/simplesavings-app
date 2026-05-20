import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("app_config")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return entry?.value ?? null;
  },
});

export const setConfig = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("app_config")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("app_config", {
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
      });
    }
  },
});

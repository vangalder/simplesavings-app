import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const recordShare = mutation({
  args: {
    sharedBy: v.string(),
    sharedWith: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("shares", {
      sharedBy: args.sharedBy,
      sharedWith: args.sharedWith,
      url: args.url,
      createdAt: Date.now(),
    });
  },
});

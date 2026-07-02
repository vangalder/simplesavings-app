import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

// Public read: config holds non-secret display values (prices, free budget)
// that must be readable by logged-out visitors on the landing/pricing surface.
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

async function writeConfig(ctx: MutationCtx, key: string, value: string) {
  const existing = await ctx.db
    .query("app_config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("app_config", { key, value, updatedAt: Date.now() });
  }
}

// Admin-only write via the app UI (identity + email allowlist enforced).
export const setConfig = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await writeConfig(ctx, args.key, args.value);
  },
});

// Internal write for CLI ops (`npx convex run appConfig:setConfigInternal ...`).
// The CLI has no user identity, so requireAdmin would reject it; internal
// functions are not exposed to the public API.
export const setConfigInternal = internalMutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    await writeConfig(ctx, args.key, args.value);
  },
});

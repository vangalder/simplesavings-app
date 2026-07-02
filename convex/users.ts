import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull, getIdentity, requireAdmin } from "./lib/auth";

// ---------------------------------------------------------------------------
// Public, self-scoped reads (identity derived server-side from ctx.auth)
// ---------------------------------------------------------------------------

export const getMyUser = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserOrNull(ctx);
  },
});

export const getAiCreditBalance = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return {
      granted: user.aiCreditsGranted ?? 0,
      used: user.aiCreditsUsed ?? 0,
      isPro: user.isPro,
    };
  },
});

// Combined access snapshot used by the insights route to gate + meter chat.
export const getMyAccess = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return {
      isPro: user.isPro,
      granted: user.aiCreditsGranted ?? 0,
      used: user.aiCreditsUsed ?? 0,
      freeChatTokensUsed: user.freeChatTokensUsed ?? 0,
    };
  },
});

export const getTokenStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(100_000);
    const tokensUsed = msgs.reduce(
      (sum, m) => sum + (m.inputTokens ?? 0) + (m.outputTokens ?? 0),
      0
    );
    return { tokensUsed };
  },
});

// ---------------------------------------------------------------------------
// Public, self-scoped writes
// ---------------------------------------------------------------------------

// Ensures a user row exists for the authenticated caller (used by the checkout
// route before creating a Stripe customer). Derives everything from the token.
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await getIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: identity.email ?? existing.email,
        name: identity.name ?? existing.name,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email,
      name: identity.name,
      isPro: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateUserPreferences = mutation({
  args: {
    locale: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const patch = Object.fromEntries(
      Object.entries(args).filter(([, value]) => value !== undefined)
    );
    await ctx.db.patch(user._id, { ...patch, updatedAt: Date.now() });
  },
});

// Records AI chat cost/usage after a streamed response. Self-only: a malicious
// client can at worst inflate its own usage, so no admin gate is needed. The
// insights route is the real caller (the client cannot skip it).
export const recordChatUsage = mutation({
  args: {
    costCents: v.number(),
    freeTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch(user._id, {
      aiCreditsUsed: (user.aiCreditsUsed ?? 0) + args.costCents,
      freeChatTokensUsed: (user.freeChatTokensUsed ?? 0) + args.freeTokens,
      updatedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Admin-only (identity + email allowlist enforced server-side)
// ---------------------------------------------------------------------------

// Resets the caller's own account to a fresh Pro Sample state. Admin-only; used
// from the admin panel to test the paid UX without touching Stripe.
export const seedTestCredits = mutation({
  args: { creditsInCents: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(admin._id, {
      aiCreditsGranted: args.creditsInCents ?? 100,
      aiCreditsUsed: 0,
      freeChatTokensUsed: 0,
      isPro: false,
      updatedAt: Date.now(),
    });
  },
});

// Admin test-mode bypass, enforced in Convex (not just in the checkout route).
export const applyAdminTestGrant = mutation({
  args: { grantType: v.union(v.literal("subscription"), v.literal("one_time")), creditsInCents: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.grantType === "subscription") {
      await ctx.db.patch(admin._id, { isPro: true, updatedAt: Date.now() });
    } else {
      await ctx.db.patch(admin._id, {
        aiCreditsGranted: (admin.aiCreditsGranted ?? 0) + (args.creditsInCents ?? 150),
        updatedAt: Date.now(),
      });
    }
  },
});

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
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

// ---------------------------------------------------------------------------
// Internal (machine-to-machine; called only from webhooks / trusted server)
// ---------------------------------------------------------------------------

export const upsertFromClerk = internalMutation({
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
    }
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      isPro: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setUserPro = internalMutation({
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

export const unsetUserPro = internalMutation({
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

export const grantAiCredits = internalMutation({
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

export const setStripeCustomer = internalMutation({
  args: { clerkId: v.string(), stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now(),
    });
  },
});

export const getClerkIdByStripeCustomer = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .first();
    return user?.clerkId ?? null;
  },
});

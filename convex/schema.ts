import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    isPro: v.boolean(),
    stripeCustomerId: v.optional(v.string()),
    locale: v.optional(v.string()),
    currency: v.optional(v.string()),
    // Phase 3: AI credit tracking (in cents, e.g. 199 = $1.99)
    aiCreditsGranted: v.optional(v.number()),
    aiCreditsUsed: v.optional(v.number()),
    // Free-tier metering: cumulative in+out tokens spent on the free AI taste
    freeChatTokensUsed: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  scenarios: defineTable({
    userId: v.id("users"),
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
    // Phase 3: Per-scenario AI config (active this phase)
    aiProvider: v.optional(v.string()),
    aiModel: v.optional(v.string()),
    // Avatar scaffolding (voice/style/persona ship later, schema here now)
    aiSystemPromptOverride: v.optional(v.string()),
    aiPersonaName: v.optional(v.string()),
    aiPersonaVoice: v.optional(v.string()),
    aiPersonaStyle: v.optional(v.string()),
    // Cached blurb (English source of truth) — skip LLM call when inputs unchanged
    blurbEn: v.optional(v.string()),
    blurbQuestionEn: v.optional(v.string()),
    blurbPitchEn: v.optional(v.string()),
    blurbInputsHash: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    scenarioId: v.id("scenarios"),
    userId: v.id("users"),
    role: v.string(),
    content: v.string(),
    provider: v.string(),
    model: v.string(),
    tokensUsed: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costCents: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_scenario", ["scenarioId"])
    .index("by_user", ["userId"]),

  provider_configs: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    model: v.string(),
    isDefault: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  purchases: defineTable({
    userId: v.id("users"),
    stripePaymentIntentId: v.string(),
    status: v.union(v.literal("pending"), v.literal("complete"), v.literal("refunded")),
    // Phase 3: link one-time purchase to a scenario + credit amount
    scenarioId: v.optional(v.id("scenarios")),
    creditsGranted: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_payment_intent", ["stripePaymentIntentId"]),

  // Phase 3: runtime app configuration (admin-settable)
  app_config: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  shares: defineTable({
    sharedBy: v.string(),
    sharedWith: v.string(),
    url: v.string(),
    createdAt: v.number(),
  })
    .index("by_shared_by", ["sharedBy"])
    .index("by_shared_with", ["sharedWith"]),

  // Performance telemetry for AI blurb calls
  blurb_logs: defineTable({
    provider: v.string(),
    model: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    latencyMs: v.number(),
    costUsd: v.number(),
    isTranslation: v.boolean(),
    locale: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_provider_model", ["provider", "model"])
    .index("by_created_at", ["createdAt"]),
});

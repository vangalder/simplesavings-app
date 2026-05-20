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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

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
    // Phase 2 additions
    type: v.optional(v.string()),
    description: v.optional(v.string()),
    goals: v.optional(v.string()),
    goalAmount: v.optional(v.number()),
    chartType: v.optional(v.string()),
    targetDate: v.optional(v.number()),
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
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_payment_intent", ["stripePaymentIntentId"]),

  shares: defineTable({
    sharedBy: v.string(),
    sharedWith: v.string(),
    url: v.string(),
    createdAt: v.number(),
  })
    .index("by_shared_by", ["sharedBy"])
    .index("by_shared_with", ["sharedWith"]),
});

// Convex schema will be active when Convex is initialized
// Run: npx convex dev
// This will generate the _generated files and enable the schema

// import { defineSchema, defineTable } from "convex/server";
// import { v } from "convex/values";

// export default defineSchema({
//   // Users table - stores user profile information
//   users: defineTable({
//     clerkId: v.string(),
//     email: v.optional(v.string()),
//     name: v.optional(v.string()),
//     createdAt: v.number(),
//     updatedAt: v.number(),
//   })
//     .index("by_clerk_id", ["clerkId"]),

//   // Scenarios table - stores saved calculator scenarios
//   scenarios: defineTable({
//     userId: v.id("users"),
//     startingAmount: v.number(),
//     monthlyContribution: v.number(),
//     timeframeYears: v.number(),
//     interestRate: v.number(),
//     totalValue: v.number(),
//     principalPaid: v.number(),
//     interestEarned: v.number(),
//     createdAt: v.number(),
//     updatedAt: v.number(),
//   })
//     .index("by_user", ["userId"]),
// });

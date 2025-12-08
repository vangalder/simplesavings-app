// Convex functions will be generated when Convex is initialized
// Run: npx convex dev
// This will generate the _generated files and enable these functions

// import { query, mutation } from "./_generated/server";
// import { v } from "convex/values";

// Query to get user by Clerk ID
// export const getUserByClerkId = query({
//   args: { clerkId: v.string() },
//   handler: async (ctx, args) => {
//     return await ctx.db
//       .query("users")
//       .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
//       .first();
//   },
// });

// Mutation to create or update user
// export const upsertUser = mutation({
//   args: {
//     clerkId: v.string(),
//     email: v.optional(v.string()),
//     name: v.optional(v.string()),
//   },
//   handler: async (ctx, args) => {
//     const existing = await ctx.db
//       .query("users")
//       .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
//       .first();

//     const now = Date.now();

//     if (existing) {
//       return await ctx.db.patch(existing._id, {
//         email: args.email,
//         name: args.name,
//         updatedAt: now,
//       });
//     } else {
//       return await ctx.db.insert("users", {
//         clerkId: args.clerkId,
//         email: args.email,
//         name: args.name,
//         createdAt: now,
//         updatedAt: now,
//       });
//     }
//   },
// });

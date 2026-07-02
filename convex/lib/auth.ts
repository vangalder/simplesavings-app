import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type AnyCtx = QueryCtx | MutationCtx;

// We key users on `clerkId`, which equals the Clerk user id and the JWT
// `subject` claim. The Clerk webhook (convex/http.ts) also upserts by that same
// id, so `subject` is the correct join key here even though the Convex
// guidelines generally prefer `tokenIdentifier` — there is a single issuer and
// the existing `users` rows are keyed by clerkId.

export async function getIdentityOrNull(ctx: AnyCtx) {
  return await ctx.auth.getUserIdentity();
}

export async function getIdentity(ctx: AnyCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

export async function getCurrentUserOrNull(ctx: AnyCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

export async function getCurrentUser(ctx: AnyCtx): Promise<Doc<"users">> {
  const identity = await getIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) throw new Error("User not found");
  return user;
}

export async function requireAdmin(ctx: AnyCtx): Promise<Doc<"users">> {
  const identity = await getIdentity(ctx);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || identity.email !== adminEmail) {
    throw new Error("Forbidden: admin only");
  }
  return await getCurrentUser(ctx);
}

// Resolves a scenario the current user owns, or throws.
export async function requireScenarioOwner(
  ctx: AnyCtx,
  scenarioId: Id<"scenarios">
): Promise<{ user: Doc<"users">; scenario: Doc<"scenarios"> }> {
  const user = await getCurrentUser(ctx);
  const scenario = await ctx.db.get(scenarioId);
  if (!scenario || scenario.userId !== user._id) {
    throw new Error("Scenario not found or unauthorized");
  }
  return { user, scenario };
}

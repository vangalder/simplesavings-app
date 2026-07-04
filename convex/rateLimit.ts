import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Abuse / cost defense for the PUBLIC LLM routes (ai-blurb, narrative).
//
// Why this lives in Convex: Vercel serverless in-memory limiters don't share
// state across instances, so they leak badly under load. Convex is shared,
// durable state — a bot hammering these counters hits Convex (cheap), not the
// paid LLM. This mutation is intentionally public (no auth): it only reads and
// increments tiny counters.
//
// Two layers:
//   1. Per-IP fixed window  — throttles any single source.
//   2. Global daily cap     — the hard ceiling on total public LLM calls per UTC
//      day, regardless of how traffic is distributed (rotating IPs, etc.). This
//      is the "my bill cannot exceed roughly $X/day" guarantee. Tunable at
//      runtime via app_config key `publicLlmDailyCap` (no deploy needed).

const PER_IP_LIMIT = 20; // requests per IP per window
const PER_IP_WINDOW_MS = 60_000; // 1 minute
const DAY_MS = 86_400_000;
const DEFAULT_GLOBAL_DAILY_CAP = 6000; // public LLM calls/day across all IPs

export const checkPublicLlm = mutation({
  args: { ip: v.string(), endpoint: v.string() },
  returns: v.object({ ok: v.boolean(), reason: v.optional(v.string()) }),
  handler: async (ctx, { ip, endpoint }) => {
    const now = Date.now();

    // 1) Per-IP fixed window — deny early, without touching the global counter,
    //    so a rate-limited attacker can't burn the global budget for real users.
    const ipBucket = `ip:${ip}:${endpoint}`;
    const ipRow = await ctx.db
      .query("rate_limits")
      .withIndex("by_bucket", (q) => q.eq("bucket", ipBucket))
      .unique();
    if (!ipRow || now - ipRow.windowStart > PER_IP_WINDOW_MS) {
      if (ipRow) await ctx.db.patch(ipRow._id, { count: 1, windowStart: now });
      else await ctx.db.insert("rate_limits", { bucket: ipBucket, count: 1, windowStart: now });
    } else if (ipRow.count >= PER_IP_LIMIT) {
      return { ok: false, reason: "ip_rate" };
    } else {
      await ctx.db.patch(ipRow._id, { count: ipRow.count + 1 });
    }

    // 2) Global daily circuit breaker — the catastrophe backstop.
    const capCfg = await ctx.db
      .query("app_config")
      .withIndex("by_key", (q) => q.eq("key", "publicLlmDailyCap"))
      .unique();
    const cap = capCfg ? parseInt(capCfg.value, 10) || DEFAULT_GLOBAL_DAILY_CAP : DEFAULT_GLOBAL_DAILY_CAP;
    const gBucket = "global:llm:day";
    const gRow = await ctx.db
      .query("rate_limits")
      .withIndex("by_bucket", (q) => q.eq("bucket", gBucket))
      .unique();
    if (!gRow || now - gRow.windowStart > DAY_MS) {
      if (gRow) await ctx.db.patch(gRow._id, { count: 1, windowStart: now });
      else await ctx.db.insert("rate_limits", { bucket: gBucket, count: 1, windowStart: now });
      return { ok: true };
    }
    if (gRow.count >= cap) return { ok: false, reason: "global_cap" };
    await ctx.db.patch(gRow._id, { count: gRow.count + 1 });
    return { ok: true };
  },
});

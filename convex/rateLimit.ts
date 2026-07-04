import { mutation, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
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
    const prev = gRow.count;
    const next = prev + 1;
    await ctx.db.patch(gRow._id, { count: next });
    // Alert once, immediately, the moment the day's count crosses 50/80/100% of the
    // cap — so a spike in public LLM traffic reaches you in real time, not on the bill.
    for (const t of [Math.floor(cap * 0.5), Math.floor(cap * 0.8), cap]) {
      if (prev < t && next >= t) {
        await ctx.scheduler.runAfter(0, internal.rateLimit.sendAbuseAlert, {
          count: next,
          cap,
          threshold: t,
          endpoint,
        });
      }
    }
    return { ok: true };
  },
});

// Best-effort abuse alert. Reads a Slack/Discord (or any) incoming-webhook URL from
// app_config key `alertWebhookUrl`; no-ops if unset, so it ships dormant and is
// activated by setting that one config value — no deploy needed. The JSON body
// carries both `text` (Slack) and `content` (Discord) so either works.
export const sendAbuseAlert = internalAction({
  args: {
    count: v.number(),
    cap: v.number(),
    threshold: v.number(),
    endpoint: v.string(),
  },
  handler: async (ctx, { count, cap, threshold, endpoint }) => {
    const pct = Math.round((threshold / cap) * 100);
    const msg =
      `⚠️ simplesavings.app — public LLM traffic hit ${pct}% of today's cap ` +
      `(${count}/${cap} calls; latest: /${endpoint}). If this isn't organic, ` +
      `lower publicLlmDailyCap or investigate.`;

    // Channel 1 — incoming webhook (Slack/Discord/Google Chat). No-op if unset.
    const url = await ctx.runQuery(api.appConfig.getConfig, { key: "alertWebhookUrl" });
    if (url) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: msg, content: msg }),
        });
      } catch {
        /* best-effort */
      }
    }

    // Channel 2 — email via Resend. No-op until RESEND_API_KEY is set (Convex env).
    // Sends to `alertEmail` (config) or ADMIN_EMAIL; from `alertEmailFrom` (config)
    // or Resend's shared onboarding sender, which can email the account owner without
    // domain verification. Once simplesavings.app is verified in Resend, set
    // alertEmailFrom to e.g. alerts@simplesavings.app.
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const to = (await ctx.runQuery(api.appConfig.getConfig, { key: "alertEmail" })) ?? process.env.ADMIN_EMAIL;
      const from = (await ctx.runQuery(api.appConfig.getConfig, { key: "alertEmailFrom" })) ?? "onboarding@resend.dev";
      if (to) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from,
              to,
              subject: `⚠️ simplesavings.app — LLM traffic at ${pct}% of daily cap`,
              text: msg,
            }),
          });
        } catch {
          /* best-effort */
        }
      }
    }
  },
});

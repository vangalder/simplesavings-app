import { mutation, query } from "./_generated/server";
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

export const getShareAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const shares = await ctx.db.query("shares").order("desc").collect();
    const users = await ctx.db.query("users").collect();

    const knownEmails = new Set(users.map((u) => u.email).filter(Boolean) as string[]);

    // Shares per sender
    const bySender = new Map<string, number>();
    for (const s of shares) {
      bySender.set(s.sharedBy, (bySender.get(s.sharedBy) ?? 0) + 1);
    }

    const repeatSharers = [...bySender.entries()].filter(([, count]) => count > 1).length;

    // Recipients who later became known users (email in users table)
    const recipientEmails = new Set(shares.map((s) => s.sharedWith).filter((e) => e.includes("@")));
    const convertedFromShare = [...recipientEmails].filter((e) => knownEmails.has(e)).length;

    // Shares grouped by day for sparkline (last 30 days)
    const now = Date.now();
    const dayMs = 86_400_000;
    const dayBuckets: number[] = Array(30).fill(0);
    for (const s of shares) {
      const daysAgo = Math.floor((now - s.createdAt) / dayMs);
      if (daysAgo >= 0 && daysAgo < 30) dayBuckets[29 - daysAgo]++;
    }

    // Recent share log (last 100)
    const recentShares = shares.slice(0, 100).map((s) => ({
      sharedBy: s.sharedBy,
      sharedWith: s.sharedWith,
      createdAt: s.createdAt,
      recipientIsUser: knownEmails.has(s.sharedWith),
    }));

    // Top sharers (sorted by count desc)
    const topSharers = [...bySender.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([email, count]) => ({ email, count }));

    return {
      totalShares: shares.length,
      uniqueSenders: bySender.size,
      repeatSharers,
      convertedFromShare,
      dayBuckets,
      recentShares,
      topSharers,
    };
  },
});

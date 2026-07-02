import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { Webhook } from "svix";
import Stripe from "stripe";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();

    let event: { type: string; data: Record<string, unknown> };
    try {
      const wh = new Webhook(webhookSecret);
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof event;
    } catch {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    if (event.type === "user.created" || event.type === "user.updated") {
      const clerkId = event.data.id as string;
      const emailAddresses = event.data.email_addresses as Array<{ email_address: string }>;
      const firstName = event.data.first_name as string | undefined;
      const lastName = event.data.last_name as string | undefined;

      const email = emailAddresses?.[0]?.email_address;
      const name = [firstName, lastName].filter(Boolean).join(" ") || undefined;

      await ctx.runMutation(internal.users.upsertFromClerk, { clerkId, email, name });
    }

    return new Response(null, { status: 200 });
  }),
});

// Stripe webhook. Runs in the Convex V8 runtime, so it uses the fetch-based
// HTTP client and the SubtleCrypto async signature verification (no "use node").
// All paid-state writes go through internal mutations — unreachable publicly.
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeKey || !webhookSecret) {
      return new Response("Stripe not configured", { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-02-24.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const sig = request.headers.get("stripe-signature");
    if (!sig) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const rawBody = await request.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        sig,
        webhookSecret,
        undefined,
        Stripe.createSubtleCryptoProvider()
      );
    } catch (err) {
      console.error("[stripe webhook] signature verification failed", err);
      return new Response("Invalid signature", { status: 400 });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const clerkId = session.metadata?.clerkId;
          const checkoutType = session.metadata?.type;
          if (!clerkId) break;

          // Record the Stripe customer mapping for future subscription events.
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id;
          if (customerId) {
            await ctx.runMutation(internal.users.setStripeCustomer, {
              clerkId,
              stripeCustomerId: customerId,
            });
          }

          if (checkoutType === "one_time") {
            const creditsRaw = await ctx.runQuery(api.appConfig.getConfig, {
              key: "proSampleCreditLimitCents",
            });
            const creditsGranted = Math.max(1, parseInt(creditsRaw ?? "150", 10) || 150);
            const paymentIntentId =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? session.id;
            const scenarioId = session.metadata?.scenarioId as Id<"scenarios"> | undefined;
            await ctx.runMutation(internal.purchases.completeTasteTestPurchase, {
              clerkId,
              stripePaymentIntentId: paymentIntentId,
              scenarioId,
              creditsGranted,
            });
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const isActive = sub.status === "active" || sub.status === "trialing";
          const clerkId = await ctx.runQuery(internal.users.getClerkIdByStripeCustomer, {
            stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          });
          if (clerkId) {
            if (isActive) {
              await ctx.runMutation(internal.users.setUserPro, { clerkId });
            } else if (sub.status !== "past_due") {
              // Don't revoke on cancel_at_period_end (stays active) or past_due.
              await ctx.runMutation(internal.users.unsetUserPro, { clerkId });
            }
          }
          break;
        }

        case "customer.subscription.paused": {
          const sub = event.data.object as Stripe.Subscription;
          const clerkId = await ctx.runQuery(internal.users.getClerkIdByStripeCustomer, {
            stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          });
          if (clerkId) await ctx.runMutation(internal.users.unsetUserPro, { clerkId });
          break;
        }

        case "customer.subscription.resumed": {
          const sub = event.data.object as Stripe.Subscription;
          const clerkId = await ctx.runQuery(internal.users.getClerkIdByStripeCustomer, {
            stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          });
          if (clerkId) await ctx.runMutation(internal.users.setUserPro, { clerkId });
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const clerkId = await ctx.runQuery(internal.users.getClerkIdByStripeCustomer, {
            stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          });
          if (clerkId) await ctx.runMutation(internal.users.unsetUserPro, { clerkId });
          break;
        }
      }
    } catch (err) {
      console.error("[stripe webhook] error processing", event.type, err);
      return new Response("Internal error", { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;

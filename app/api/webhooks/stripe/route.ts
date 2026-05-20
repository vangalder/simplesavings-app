import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

function getClients() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!stripeKey || !webhookSecret || !convexUrl) {
    return null;
  }
  return {
    stripe: new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" }),
    webhookSecret,
    convex: new ConvexHttpClient(convexUrl),
  };
}

export async function POST(request: NextRequest) {
  const clients = getClients();
  if (!clients) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }
  const { stripe, webhookSecret, convex } = clients;

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Raw body required for signature verification
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkId = session.metadata?.clerkId;
        const checkoutType = session.metadata?.type;
        if (!clerkId) break;

        if (checkoutType === "one_time") {
          // $4.99 taste-test: grant $1.99 of AI credits (199 cents)
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? session.id;
          const scenarioId = session.metadata?.scenarioId as Id<"scenarios"> | undefined;
          await convex.mutation(api.purchases.completeTasteTestPurchase, {
            clerkId,
            stripePaymentIntentId: paymentIntentId,
            scenarioId,
            creditsGranted: 199,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const isActive = sub.status === "active" || sub.status === "trialing";
        const clerkId = await convex.query(api.users.getClerkIdByStripeCustomer, {
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        });
        if (clerkId) {
          if (isActive) {
            await convex.mutation(api.users.setUserPro, { clerkId });
          } else if (sub.status !== "active" && sub.status !== "trialing" && sub.status !== "past_due") {
            // Don't revoke mid-period — only on actual non-active states (not cancel_at_period_end which stays active)
            await convex.mutation(api.users.unsetUserPro, { clerkId });
          }
        }
        break;
      }

      case "customer.subscription.paused": {
        // Payment collection paused — revoke Pro immediately
        const sub = event.data.object as Stripe.Subscription;
        const clerkId = await convex.query(api.users.getClerkIdByStripeCustomer, {
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        });
        if (clerkId) {
          await convex.mutation(api.users.unsetUserPro, { clerkId });
        }
        break;
      }

      case "customer.subscription.resumed": {
        // Subscription active again after pause — restore Pro
        const sub = event.data.object as Stripe.Subscription;
        const clerkId = await convex.query(api.users.getClerkIdByStripeCustomer, {
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        });
        if (clerkId) {
          await convex.mutation(api.users.setUserPro, { clerkId });
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Fires at end of billing period — correct time to revoke Pro
        const sub = event.data.object as Stripe.Subscription;
        const clerkId = await convex.query(api.users.getClerkIdByStripeCustomer, {
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        });
        if (clerkId) {
          await convex.mutation(api.users.unsetUserPro, { clerkId });
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe webhook] error processing", event.type, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

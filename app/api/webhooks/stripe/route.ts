import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Stripe sends events as JSON with a Stripe-Signature header.
// Verify with stripe.webhooks.constructEvent() once stripe SDK is added.
// For now: basic structural validation + event routing.

type StripeEvent = {
  type: string;
  data: {
    object: {
      id: string;
      customer: string;
      status?: string;
      metadata?: Record<string, string>;
    };
  };
};

async function getClerkIdByCustomer(
  client: ConvexHttpClient,
  stripeCustomerId: string
): Promise<string | null> {
  return await client.query(api.users.getClerkIdByStripeCustomer, {
    stripeCustomerId,
  });
}

export async function POST(request: NextRequest) {
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeWebhookSecret) {
    return NextResponse.json({ error: "Stripe webhook secret not configured" }, { status: 500 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "Convex not configured" }, { status: 500 });
  }

  // TODO: verify signature with stripe.webhooks.constructEvent() after adding stripe SDK
  let event: StripeEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const client = new ConvexHttpClient(convexUrl);
  const { type, data } = event;
  const obj = data.object;

  try {
    if (
      type === "customer.subscription.created" ||
      type === "customer.subscription.updated"
    ) {
      const isActive = obj.status === "active" || obj.status === "trialing";
      const clerkId = await getClerkIdByCustomer(client, obj.customer);
      if (clerkId) {
        if (isActive) {
          await client.mutation(api.users.setUserPro, { clerkId });
        } else {
          await client.mutation(api.users.unsetUserPro, { clerkId });
        }
      }
    }

    if (type === "customer.subscription.deleted") {
      const clerkId = await getClerkIdByCustomer(client, obj.customer);
      if (clerkId) {
        await client.mutation(api.users.unsetUserPro, { clerkId });
      }
    }
  } catch (err) {
    console.error("[stripe webhook] error processing event", type, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

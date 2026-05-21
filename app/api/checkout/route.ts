import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

function getConvex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");
  return new ConvexHttpClient(url);
}

// POST body: { type: "subscription" | "one_time", scenarioId?: string }
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type: "subscription" | "one_time"; scenarioId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, scenarioId } = body;
  if (type !== "subscription" && type !== "one_time") {
    return NextResponse.json({ error: "Invalid checkout type" }, { status: 400 });
  }

  const convex = getConvex();
  const origin = req.headers.get("origin") ?? "https://simplesavings.app";

  // Check payment test mode — admin bypass, skips Stripe entirely
  // Values: "off" | "sample" (force sample credits) | "pro" (force Pro) | "true" (legacy: respects checkout type)
  const [testMode, creditLimitRaw] = await Promise.all([
    convex.query(api.appConfig.getConfig, { key: "paymentTestMode" }),
    convex.query(api.appConfig.getConfig, { key: "proSampleCreditLimitCents" }),
  ]);
  const creditLimitCents = Math.max(1, parseInt(creditLimitRaw ?? "100", 10) || 100);
  const grantType = testMode === "pro" ? "subscription" : testMode === "sample" ? "one_time" : testMode === "true" ? type : null;
  if (grantType) {
    const clerkUser = await currentUser();
    await convex.mutation(api.users.upsertUser, {
      clerkId: userId,
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? undefined,
      name: clerkUser?.fullName ?? clerkUser?.firstName ?? undefined,
    });
    if (grantType === "subscription") {
      await convex.mutation(api.users.setUserPro, { clerkId: userId });
    } else {
      await convex.mutation(api.users.grantAiCredits, { clerkId: userId, creditsInCents: creditLimitCents });
    }
    return NextResponse.json({ url: `${origin}/?testPaid=1` });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not yet configured" }, { status: 503 });
  }

  const priceId =
    type === "subscription"
      ? process.env.STRIPE_PRO_PRICE_ID
      : process.env.STRIPE_PRO_SAMPLE_PRICE_ID;

  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price ID not configured" },
      { status: 503 }
    );
  }

  try {
    const stripe = getStripe();
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress;

    // Look up or create Stripe customer
    let stripeCustomerId: string | undefined;
    const convexUser = await convex.query(api.users.getMyUser, { clerkId: userId });
    stripeCustomerId = convexUser?.stripeCustomerId ?? undefined;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { clerkId: userId },
      });
      stripeCustomerId = customer.id;
      await convex.mutation(api.users.updateUserPreferences, {
        clerkId: userId,
        stripeCustomerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: type === "subscription" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}${type === "subscription" ? "/profile?upgraded=1" : `/profile?sample=1${scenarioId ? `&sid=${scenarioId}` : ""}`}`,
      cancel_url: `${origin}/`,
      metadata: {
        clerkId: userId,
        type,
        ...(scenarioId ? { scenarioId } : {}),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}

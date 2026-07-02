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

// POST body: { type: "subscription" | "one_time", scenarioId?: string }
export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
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

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "Convex not configured" }, { status: 503 });
  }
  const convex = new ConvexHttpClient(convexUrl);
  const token = await getToken({ template: "convex" });
  if (token) convex.setAuth(token);

  const origin = req.headers.get("origin") ?? "https://simplesavings.app";

  // Ensure a Convex user row exists for this authenticated caller.
  await convex.mutation(api.users.ensureUser, {});

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = !!adminEmail && email === adminEmail;

  // Admin-only test-mode bypass: grants paid state without touching Stripe.
  // Values: "off" | "sample" (force sample credits) | "pro" (force Pro) |
  // "true" (legacy: respects checkout type). The grant itself is enforced in
  // Convex (applyAdminTestGrant → requireAdmin), so a non-admin cannot use it.
  if (isAdmin) {
    const [testMode, creditLimitRaw] = await Promise.all([
      convex.query(api.appConfig.getConfig, { key: "paymentTestMode" }),
      convex.query(api.appConfig.getConfig, { key: "proSampleCreditLimitCents" }),
    ]);
    const creditLimitCents = Math.max(1, parseInt(creditLimitRaw ?? "150", 10) || 150);
    const grantType =
      testMode === "pro" ? "subscription"
      : testMode === "sample" ? "one_time"
      : testMode === "true" ? type
      : null;
    if (grantType) {
      await convex.mutation(api.users.applyAdminTestGrant, {
        grantType,
        creditsInCents: creditLimitCents,
      });
      return NextResponse.json({ url: `${origin}/?testPaid=1` });
    }
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

    // Reuse an existing Stripe customer if we have one on file.
    const convexUser = await convex.query(api.users.getMyUser, {});
    let stripeCustomerId = convexUser?.stripeCustomerId ?? undefined;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { clerkId: userId },
      });
      stripeCustomerId = customer.id;
      // The Stripe webhook persists this mapping on checkout.session.completed.
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

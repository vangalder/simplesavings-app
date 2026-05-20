import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// POST — creates a Stripe Checkout session for the Pro subscription.
// Requires: STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID env vars (set after pricing session).
// Returns: { url: string } — redirect the client to this Checkout URL.
export async function POST(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRO_PRICE_ID;

  if (!stripeKey || !priceId) {
    return NextResponse.json(
      { error: "Stripe not yet configured — pricing session pending" },
      { status: 503 }
    );
  }

  // TODO: initialize Stripe SDK, look up or create stripeCustomerId for userId,
  //       create Checkout session with priceId, return { url }.
  return NextResponse.json(
    { error: "Checkout not yet implemented" },
    { status: 501 }
  );
}

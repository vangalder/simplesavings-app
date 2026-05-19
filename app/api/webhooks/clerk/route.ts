import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
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
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl && (event.type === "user.created" || event.type === "user.updated")) {
    const client = new ConvexHttpClient(convexUrl);

    const clerkId = event.data.id as string;
    const emailAddresses = event.data.email_addresses as Array<{ email_address: string }>;
    const firstName = event.data.first_name as string | undefined;
    const lastName = event.data.last_name as string | undefined;

    const email = emailAddresses?.[0]?.email_address;
    const name = [firstName, lastName].filter(Boolean).join(" ") || undefined;

    await client.mutation(api.users.upsertUser, { clerkId, email, name });
  }

  return NextResponse.json({ ok: true });
}

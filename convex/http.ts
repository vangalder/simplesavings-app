import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Webhook } from "svix";

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

      await ctx.runMutation(api.users.upsertUser, { clerkId, email, name });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;

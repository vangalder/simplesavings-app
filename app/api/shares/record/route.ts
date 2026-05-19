import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sharedBy, sharedWith, url } = body;

  if (!sharedBy || !sharedWith || !url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl) {
    const client = new ConvexHttpClient(convexUrl);
    await client.mutation(api.shares.recordShare, { sharedBy, sharedWith, url });
  } else {
    console.log("[share recorded]", { sharedBy, sharedWith, url, at: new Date().toISOString() });
  }

  return NextResponse.json({ ok: true });
}

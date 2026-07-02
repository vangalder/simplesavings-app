import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexToken } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sharedWith, url } = body;
  if (!sharedWith || !url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl) {
    const client = new ConvexHttpClient(convexUrl);
    const token = await getConvexToken(getToken);
    if (token) client.setAuth(token);
    await client.mutation(api.shares.recordShare, { sharedWith, url });
  }

  return NextResponse.json({ ok: true });
}

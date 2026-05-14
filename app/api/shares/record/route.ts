import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sharedBy, sharedWith, url } = body;

  if (!sharedBy || !sharedWith || !url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Sprint 2: persist to Convex shares table once Convex is initialized
  console.log("[share recorded]", { sharedBy, sharedWith, url, at: new Date().toISOString() });

  return NextResponse.json({ ok: true });
}

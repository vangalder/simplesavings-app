import { NextRequest, NextResponse } from "next/server";

// POST { planId, message, provider, model, conversationHistory }
// Returns: ReadableStream of SSE events
// TODO: wire to provider SDK after prep/insights-prompts.md is finalized
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Insights API not yet implemented" },
    { status: 501 }
  );
}

import { NextRequest, NextResponse } from "next/server";

// POST { planId, message, model, conversationHistory }
// Returns: ReadableStream of SSE events via Ollama
// TODO: wire to Ollama after prep/insights-prompts.md is finalized
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Local Ollama insights not yet implemented" },
    { status: 501 }
  );
}

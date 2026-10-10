import { NextResponse } from "next/server";
import {
  explainReceiptDeterministically,
  isSafeRafikiNarrative,
  verifyReceipt,
  type Receipt,
} from "../../../../packages/core/src";

type ChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function configuredGateway(): URL | null {
  const value = process.env.AI_GATEWAY_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "gateway.ai.cloudflare.com" ||
      !url.pathname.endsWith("/compat/chat/completions")
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: { receipt?: Receipt; question?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.receipt || !(await verifyReceipt(body.receipt))) {
    return NextResponse.json(
      { error: "A valid hash-verified receipt is required" },
      { status: 400 },
    );
  }

  const deterministic = explainReceiptDeterministically(body.receipt);
  const gateway = configuredGateway();
  const gatewayToken = process.env.AI_GATEWAY_TOKEN;
  const model = process.env.RAFIKI_MODEL;
  if (!gateway || !gatewayToken || !model) {
    return NextResponse.json(
      {
        mode: "deterministic",
        source: "RECEIPT",
        explanation: deterministic,
        fallbackReason: "AI Gateway is not configured",
      },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const question = body.question?.trim().slice(0, 240) || "Why?";
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "cf-aig-authorization": `Bearer ${gatewayToken}`,
    };
    if (process.env.RAFIKI_PROVIDER_API_KEY) {
      headers.authorization = `Bearer ${process.env.RAFIKI_PROVIDER_API_KEY}`;
    }
    const response = await fetch(gateway, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content:
              "You are Rafiki, an explain-only assistant. Explain only the supplied receipt facts. Do not advise, recommend, size, trade, or modify exits. Do not write digits; numeric facts are rendered separately by deterministic code. Reply in two short sentences.",
          },
          {
            role: "user",
            content: JSON.stringify({
              question,
              headline: deterministic.headline,
              explanation: deterministic.explanation,
              boundary: deterministic.boundary,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("Gateway request failed");
    const payload = (await response.json()) as ChatResponse;
    const narrative = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!isSafeRafikiNarrative(narrative)) {
      throw new Error("Narrative failed the explain-only validator");
    }
    return NextResponse.json(
      {
        mode: "ai",
        source: "LIVE_AI",
        explanation: {
          ...deterministic,
          explanation: narrative,
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        mode: "deterministic",
        source: "RECEIPT",
        explanation: deterministic,
        fallbackReason: "AI response unavailable or rejected",
      },
      { headers: { "cache-control": "no-store" } },
    );
  }
}

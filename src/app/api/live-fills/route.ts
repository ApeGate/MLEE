import { NextResponse } from "next/server";
import { configuredSolanaRpc } from "@/lib/solana-rpc";
import {
  PUBLIC_CANARY_FILLS,
  verifyCanaryTransaction,
} from "@/lib/public-canary-fills";

export const dynamic = "force-dynamic";
const MAX_RPC_BYTES = 2 * 1024 * 1024;

async function readBoundedJson(response: Response) {
  if (!response.ok || !response.body) {
    throw new Error(`RPC returned ${response.status}`);
  }
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_RPC_BYTES) {
    throw new Error("RPC returned an oversized response");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RPC_BYTES) {
      await reader.cancel();
      throw new Error("RPC response exceeded the size limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

async function readTransaction(endpoint: string, signature: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `apegate-public-fill-${signature.slice(0, 8)}`,
      method: "getTransaction",
      params: [
        signature,
        {
          commitment: "confirmed",
          encoding: "jsonParsed",
          maxSupportedTransactionVersion: 0,
        },
      ],
    }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  const body = (await readBoundedJson(response)) as {
    result?: unknown;
    error?: { message?: string };
  };
  if (body.error || !body.result) {
    throw new Error(body.error?.message ?? "Transaction is unavailable");
  }
  return body.result;
}

export async function GET() {
  const { endpoint, source } = configuredSolanaRpc();
  try {
    const fills = await Promise.all(
      PUBLIC_CANARY_FILLS.map(async (fill) =>
        verifyCanaryTransaction(
          fill,
          await readTransaction(endpoint, fill.signature),
        ),
      ),
    );
    return NextResponse.json(
      {
        verified: true,
        source,
        wallet: fills[0]?.wallet ?? null,
        fills,
        checkedAt: Date.now(),
      },
      { headers: { "cache-control": "public, max-age=15, s-maxage=60" } },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "public canary fill verification failed",
        error: error instanceof Error ? error.message : "unknown error",
      }),
    );
    return NextResponse.json(
      {
        verified: false,
        fills: [],
        error: "Live fill verification is temporarily unavailable",
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

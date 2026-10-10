import { NextResponse } from "next/server";
import { configuredSolanaRpc } from "@/lib/solana-rpc";

const BASE58_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

type SignatureStatusResponse = {
  result?: {
    value?: Array<{
      slot?: number;
      err?: unknown;
      confirmationStatus?: "processed" | "confirmed" | "finalized" | null;
    } | null>;
  };
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const signature = new URL(request.url).searchParams.get("signature") ?? "";
  if (!BASE58_SIGNATURE.test(signature)) {
    return NextResponse.json(
      { error: "Invalid Solana signature" },
      { status: 400 },
    );
  }

  const { endpoint } = configuredSolanaRpc();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "apegate-trade-status",
        method: "getSignatureStatuses",
        params: [[signature], { searchTransactionHistory: true }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      throw new Error(`RPC returned ${response.status}`);
    }
    const body = (await response.json()) as SignatureStatusResponse;
    const status = body.result?.value?.[0] ?? null;
    if (!status) {
      return NextResponse.json(
        { state: "pending", slot: null },
        { headers: { "cache-control": "no-store" } },
      );
    }
    if (status.err) {
      return NextResponse.json(
        { state: "failed", slot: status.slot ?? null },
        { headers: { "cache-control": "no-store" } },
      );
    }
    const confirmed =
      status.confirmationStatus === "confirmed" ||
      status.confirmationStatus === "finalized";
    return NextResponse.json(
      {
        state: confirmed ? "confirmed" : "pending",
        slot: status.slot ?? null,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { state: "unknown", slot: null },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

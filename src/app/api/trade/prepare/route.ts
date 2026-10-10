import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { VersionedTransaction } from "@solana/web3.js";
import { inspectManualBuyTransaction } from "@/lib/manual-buy-transaction";
import { inspectManualSellTransaction } from "@/lib/manual-sell-transaction";
import { configuredSolanaRpc } from "@/lib/solana-rpc";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TRADE_ENDPOINT = "https://pumpportal.fun/api/trade-local";
const MIN_BUY_SOL = 0.01;
const MAX_BUY_SOL = 0.05;
const MAX_TRANSACTION_BYTES = 64 * 1024;
const PRIORITY_FEE_SOL = 0.0005;
const MAX_TIP_LAMPORTS = 100_000;

type PrepareBody = {
  publicKey?: unknown;
  mint?: unknown;
  side?: unknown;
  amountSol?: unknown;
  percent?: unknown;
  slippagePct?: unknown;
};

async function readTokenBaseUnits(owner: string, mint: string) {
  const { endpoint } = configuredSolanaRpc();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "apegate-exit-balance",
      method: "getTokenAccountsByOwner",
      params: [
        owner,
        { mint },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ],
    }),
    signal: AbortSignal.timeout(4_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`RPC returned ${response.status}`);
  const body = (await response.json()) as {
    result?: {
      value?: Array<{
        account?: {
          data?: {
            parsed?: {
              info?: { tokenAmount?: { amount?: string } };
            };
          };
        };
      }>;
    };
    error?: { message?: string };
  };
  if (body.error) throw new Error(body.error.message ?? "RPC balance failed");
  return (body.result?.value ?? []).reduce(
    (total, account) =>
      total +
      BigInt(
        account.account?.data?.parsed?.info?.tokenAmount?.amount ?? "0",
      ),
    BigInt(0),
  );
}

async function readBoundedBytes(response: Response) {
  if (!response.ok || !response.body) {
    throw new Error(`Transaction builder returned ${response.status}`);
  }
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_TRANSACTION_BYTES) {
    throw new Error("Transaction builder returned an oversized response");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_TRANSACTION_BYTES) {
      await reader.cancel();
      throw new Error("Transaction builder response exceeded the size limit");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function POST(request: Request) {
  let body: PrepareBody;
  try {
    body = (await request.json()) as PrepareBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const publicKey =
    typeof body.publicKey === "string" ? body.publicKey.trim() : "";
  const mint = typeof body.mint === "string" ? body.mint.trim() : "";
  if (body.side !== undefined && body.side !== "buy" && body.side !== "sell") {
    return NextResponse.json({ error: "Invalid trade side" }, { status: 400 });
  }
  const side = body.side === "sell" ? "sell" : "buy";
  const amountSol = Number(body.amountSol);
  const percent = Number(body.percent);
  const slippagePct = Number(body.slippagePct);
  if (!BASE58.test(publicKey) || !BASE58.test(mint)) {
    return NextResponse.json(
      { error: "Invalid Solana wallet or mint" },
      { status: 400 },
    );
  }
  if (
    side === "buy" &&
    (!Number.isFinite(amountSol) ||
      amountSol < MIN_BUY_SOL ||
      amountSol > MAX_BUY_SOL)
  ) {
    return NextResponse.json(
      { error: `Buy size must stay between ${MIN_BUY_SOL} and ${MAX_BUY_SOL} SOL` },
      { status: 400 },
    );
  }
  if (
    side === "sell" &&
    (!Number.isInteger(percent) || percent < 1 || percent > 100)
  ) {
    return NextResponse.json(
      { error: "Exit size must stay between 1% and 100%" },
      { status: 400 },
    );
  }
  if (
    !Number.isFinite(slippagePct) ||
    slippagePct < 1 ||
    slippagePct > 15
  ) {
    return NextResponse.json(
      { error: "Slippage must stay between 1% and 15%" },
      { status: 400 },
    );
  }

  try {
    const tokenBaseUnits =
      side === "sell" ? await readTokenBaseUnits(publicKey, mint) : BigInt(0);
    const maxSellTokenBaseUnits =
      side === "sell"
        ? (tokenBaseUnits * BigInt(percent)) / BigInt(100)
        : BigInt(0);
    if (side === "sell" && maxSellTokenBaseUnits <= BigInt(0)) {
      return NextResponse.json(
        { error: "This wallet has no token balance to exit" },
        { status: 409 },
      );
    }
    const tradeResponse = await fetch(TRADE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicKey,
        action: side,
        mint,
        amount: side === "buy" ? amountSol : `${percent}%`,
        denominatedInSol: side === "buy" ? "true" : "false",
        slippage: slippagePct,
        priorityFee: PRIORITY_FEE_SOL,
        pool: "auto",
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const bytes = await readBoundedBytes(tradeResponse);
    const transaction = VersionedTransaction.deserialize(bytes);
    if (side === "sell") {
      const inspection = inspectManualSellTransaction(transaction, {
        expectedSigner: publicKey,
        expectedMint: mint,
        maxSellTokenBaseUnits: maxSellTokenBaseUnits.toString(),
        minimumOutputLamports: "1",
        maxAccountFundingLamports: 0,
        priorityFeeSol: PRIORITY_FEE_SOL,
        maxTipLamports: MAX_TIP_LAMPORTS,
      });
      return NextResponse.json(
        {
          side,
          transaction: Buffer.from(bytes).toString("base64"),
          firewall: {
            decodedSwap: inspection.decodedSwap,
            soldTokenBaseUnits: inspection.soldTokenBaseUnits,
            minOutputLamports: inspection.minOutputLamports,
            fundedLamports: inspection.fundedLamports,
            tippedLamports: inspection.tippedLamports,
            priorityFeeLamports: inspection.priorityFeeLamports,
          },
          intent: {
            maxSellTokenBaseUnits: maxSellTokenBaseUnits.toString(),
            minimumOutputLamports: "1",
            maxAccountFundingLamports: 0,
          },
          expiresAt: Date.now() + 45_000,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }
    const inspection = inspectManualBuyTransaction(transaction, {
      expectedSigner: publicKey,
      expectedMint: mint,
      amountSol,
      slippagePct,
      priorityFeeSol: PRIORITY_FEE_SOL,
      maxTipLamports: MAX_TIP_LAMPORTS,
    });

    return NextResponse.json(
      {
        side,
        transaction: Buffer.from(bytes).toString("base64"),
        firewall: {
          decodedSwap: inspection.decodedSwap,
          fundedLamports: inspection.fundedLamports,
          tippedLamports: inspection.tippedLamports,
          priorityFeeLamports: inspection.priorityFeeLamports,
        },
        expiresAt: Date.now() + 45_000,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "manual trade preparation failed",
        mint,
        error: error instanceof Error ? error.message : "unknown error",
      }),
    );
    return NextResponse.json(
      { error: "The guarded transaction could not be prepared. Try a fresh quote." },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

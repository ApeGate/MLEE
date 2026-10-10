import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { VersionedTransaction } from "@solana/web3.js";
import { assertManualBuyTransactionSafe } from "../../../../../packages/core/src";

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
  amountSol?: unknown;
  slippagePct?: unknown;
};

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
  const amountSol = Number(body.amountSol);
  const slippagePct = Number(body.slippagePct);
  if (!BASE58.test(publicKey) || !BASE58.test(mint)) {
    return NextResponse.json(
      { error: "Invalid Solana wallet or mint" },
      { status: 400 },
    );
  }
  if (
    !Number.isFinite(amountSol) ||
    amountSol < MIN_BUY_SOL ||
    amountSol > MAX_BUY_SOL
  ) {
    return NextResponse.json(
      { error: `Buy size must stay between ${MIN_BUY_SOL} and ${MAX_BUY_SOL} SOL` },
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
    const tradeResponse = await fetch(TRADE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicKey,
        action: "buy",
        mint,
        amount: amountSol,
        denominatedInSol: "true",
        slippage: slippagePct,
        priorityFee: PRIORITY_FEE_SOL,
        pool: "auto",
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const bytes = await readBoundedBytes(tradeResponse);
    const transaction = VersionedTransaction.deserialize(bytes);
    const message = transaction.message;
    const accountKeys = message.getAccountKeys({
      addressLookupTableAccounts: [],
    });
    const summary = assertManualBuyTransactionSafe({
      feePayer: message.staticAccountKeys[0]?.toBase58() ?? "",
      requiredSigners: message.staticAccountKeys
        .slice(0, message.header.numRequiredSignatures)
        .map((key) => key.toBase58()),
      addressLookupTableCount: message.addressTableLookups.length,
      expectedMint: mint,
      maxTradeSpendLamports: Math.ceil(
        amountSol * 1_000_000_000 * (1 + slippagePct / 100),
      ),
      maxPriorityFeeLamports: Math.ceil(
        PRIORITY_FEE_SOL * 1_000_000_000,
      ),
      maxTipLamports: MAX_TIP_LAMPORTS,
      instructions: message.compiledInstructions.map((instruction) => {
        const program = accountKeys.get(instruction.programIdIndex);
        if (!program) {
          throw new Error("Transaction contains an unresolved program");
        }
        return {
          programId: program.toBase58(),
          accountKeys: Array.from(instruction.accountKeyIndexes).map((index) => {
            const key = accountKeys.get(index);
            if (!key) {
              throw new Error("Transaction contains an unresolved account");
            }
            return key.toBase58();
          }),
          dataHex: Buffer.from(instruction.data).toString("hex"),
        };
      }),
    });
    if (summary.feePayer !== publicKey) {
      throw new Error("Prepared transaction has the wrong fee payer");
    }

    return NextResponse.json(
      {
        transaction: Buffer.from(bytes).toString("base64"),
        summary,
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

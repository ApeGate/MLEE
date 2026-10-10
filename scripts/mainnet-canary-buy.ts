import { readFile } from "node:fs/promises";
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  assertManualBuyTransactionSafe,
  authorizeMainnetCanaryBuy,
  createReceipt,
  evaluateGate,
  type LaunchFacts,
} from "../packages/core/src/index";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TRADE_ENDPOINT = "https://pumpportal.fun/api/trade-local";
const PRIORITY_FEE_SOL = 0.001;

type CliOptions = {
  mint: string;
  amountSol: number;
  confirmed: boolean;
};

type DexPair = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  priceNative?: string;
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
  liquidity?: { usd?: number };
  txns?: Record<string, { buys?: number; sells?: number }>;
};

type RiskHolder = {
  owner: string;
  pct: number;
};

type RiskReport = {
  creator?: string;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  score_normalised?: number;
  rugged?: boolean;
  tokenMeta?: {
    name?: string;
    symbol?: string;
    uri?: string;
  };
  knownAccounts?: Record<string, { type?: string }>;
  topHolders?: RiskHolder[];
  graphInsidersDetected?: number;
  insiderNetworks?: unknown[];
  creatorTokens?: unknown[];
  totalMarketLiquidity?: number;
  risks?: Array<{
    name: string;
    description: string;
    level: string;
    value?: string;
  }>;
};

function parseOptions(argv: string[]): CliOptions {
  const valueAfter = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const mint = valueAfter("--mint") ?? "";
  const amountSol = Number(valueAfter("--amount") ?? "0.01");
  if (!BASE58.test(mint)) {
    throw new Error("Pass a valid Solana mint with --mint");
  }
  return {
    mint,
    amountSol,
    confirmed: argv.includes("--confirm-mainnet"),
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function loadKeypair(path: string): Promise<Keypair> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as
    | number[]
    | { secretKey?: number[] };
  const values = Array.isArray(parsed) ? parsed : parsed.secretKey;
  if (!values || values.length !== 64) {
    throw new Error("Canary wallet secret must contain a 64-byte JSON array");
  }
  return Keypair.fromSecretKey(Uint8Array.from(values));
}

async function readDexPair(mint: string): Promise<DexPair> {
  const response = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
    { signal: AbortSignal.timeout(8_000) },
  );
  if (!response.ok) throw new Error(`DexScreener returned ${response.status}`);
  const body = (await response.json()) as { pairs?: DexPair[] };
  const pairs = (body.pairs ?? [])
    .filter((pair) => pair.chainId === "solana" && pair.dexId === "pumpswap")
    .sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
    );
  const pair = pairs[0];
  if (!pair || !pair.pairCreatedAt) {
    throw new Error("No liquid PumpSwap pair was found for this mint");
  }
  return pair;
}

async function readRiskReport(mint: string): Promise<RiskReport> {
  const response = await fetch(
    `https://api.rugcheck.xyz/v1/tokens/${mint}/report`,
    { signal: AbortSignal.timeout(8_000) },
  );
  if (!response.ok) throw new Error(`Risk scan returned ${response.status}`);
  return (await response.json()) as RiskReport;
}

async function readMintAuthorities(
  connection: Connection,
  mint: PublicKey,
) {
  const info = await connection.getParsedAccountInfo(mint, "confirmed");
  if (!info.value || Buffer.isBuffer(info.value.data)) {
    throw new Error("RPC did not return a parsed mint account");
  }
  const parsed = info.value.data as {
    parsed?: {
      info?: {
        mintAuthority?: string | null;
        freezeAuthority?: string | null;
      };
    };
  };
  const mintInfo = parsed.parsed?.info;
  if (!mintInfo) throw new Error("RPC mint account was not parsed");
  return {
    mintAuthority: mintInfo.mintAuthority ?? null,
    freezeAuthority: mintInfo.freezeAuthority ?? null,
  };
}

function countRecentTrades(pair: DexPair): number {
  return Object.values(pair.txns ?? {}).reduce(
    (sum, window) => sum + (window.buys ?? 0) + (window.sells ?? 0),
    0,
  );
}

function marketCapSol(pair: DexPair): number {
  const native = Number(pair.priceNative);
  const usd = Number(pair.priceUsd);
  const marketCapUsd = pair.marketCap ?? pair.fdv ?? 0;
  if (!(native > 0) || !(usd > 0) || !(marketCapUsd > 0)) return 0;
  return marketCapUsd / (usd / native);
}

function concentration(report: RiskReport) {
  const known = report.knownAccounts ?? {};
  const holders = (report.topHolders ?? []).filter(
    (holder) =>
      !["AMM", "LOCKER", "PROGRAM"].includes(
        known[holder.owner]?.type ?? "",
      ),
  );
  const devPct = report.creator
    ? (report.topHolders ?? []).find(
        (holder) => holder.owner === report.creator,
      )?.pct ?? 0
    : null;
  return {
    devPct,
    top10Pct: holders
      .slice(0, 10)
      .reduce((sum, holder) => sum + holder.pct, 0),
  };
}

async function tokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
): Promise<number> {
  const accounts = await connection.getParsedTokenAccountsByOwner(
    owner,
    { mint },
    "confirmed",
  );
  return accounts.value.reduce((sum, account) => {
    const parsed = account.account.data as {
      parsed?: {
        info?: {
          tokenAmount?: { uiAmountString?: string };
        };
      };
    };
    return (
      sum +
      Number(parsed.parsed?.info?.tokenAmount?.uiAmountString ?? "0")
    );
  }, 0);
}

async function sendAndConfirm(
  connection: Connection,
  transaction: VersionedTransaction,
): Promise<string> {
  const rawTransaction = transaction.serialize();
  const send = () =>
    connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
    });
  const signature = await send();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    if (status.value?.err) {
      throw new Error(
        `Mainnet transaction failed: ${JSON.stringify(status.value.err)}`,
      );
    }
    if (
      status.value?.confirmationStatus === "confirmed" ||
      status.value?.confirmationStatus === "finalized"
    ) {
      return signature;
    }

    const validity = await connection.isBlockhashValid(
      transaction.message.recentBlockhash,
      { commitment: "confirmed" },
    );
    if (!validity.value) {
      throw new Error(
        `Transaction ${signature} expired without landing; balances are unchanged`,
      );
    }
    if (attempt > 0 && attempt % 2 === 0) {
      await send();
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(
    `Transaction ${signature} was not confirmed while its blockhash remained valid`,
  );
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (!options.confirmed) {
    throw new Error("Refusing mainnet send without --confirm-mainnet");
  }

  const rpcUrl = requiredEnv("HELIUS_RPC_URL");
  const expectedWallet = requiredEnv("CANARY_EXPECTED_PUBKEY");
  const secretPath = requiredEnv("CANARY_WALLET_SECRET_PATH");
  const connection = new Connection(rpcUrl, "confirmed");
  const mint = new PublicKey(options.mint);
  const signer = await loadKeypair(secretPath);
  const signerAddress = signer.publicKey.toBase58();
  if (signerAddress !== expectedWallet) {
    throw new Error("Loaded wallet does not match CANARY_EXPECTED_PUBKEY");
  }

  const [pair, report, authorities, balanceLamports, beforeTokens] =
    await Promise.all([
      readDexPair(options.mint),
      readRiskReport(options.mint),
      readMintAuthorities(connection, mint),
      connection.getBalance(signer.publicKey, "confirmed"),
      tokenBalance(connection, signer.publicKey, mint),
    ]);
  if (report.rugged) throw new Error("Risk source marks this mint rugged");

  const observedAt = Date.now();
  const holderFacts = concentration(report);
  const currentMarketCapSol = marketCapSol(pair);
  const recentTrades = countRecentTrades(pair);
  const launchFlowResolved =
    report.graphInsidersDetected === 0 &&
    (report.insiderNetworks?.length ?? 0) === 0;
  const creatorHistoryResolved = Array.isArray(report.creatorTokens);
  const canonicalMarketResolved =
    pair.dexId === "pumpswap" &&
    (pair.liquidity?.usd ?? 0) >= 50_000 &&
    recentTrades >= 50;
  const facts: LaunchFacts = {
    mint: options.mint,
    signature: null,
    name: report.tokenMeta?.name ?? "Unknown",
    symbol: report.tokenMeta?.symbol ?? "UNKNOWN",
    creator: report.creator ?? "Unknown",
    uri: report.tokenMeta?.uri ?? "",
    createdAt: pair.pairCreatedAt!,
    observedAt,
    marketCapSol: currentMarketCapSol,
    initialBuySol: 0,
    isMayhem: false,
    pool: "pump-amm",
    tradeCount: recentTrades,
    mintAuthority: authorities.mintAuthority,
    freezeAuthority: authorities.freezeAuthority,
    devPct: holderFacts.devPct,
    top10Pct: holderFacts.top10Pct,
    rugScore: report.score_normalised ?? null,
    launchSecondBuyout: launchFlowResolved ? false : null,
    deployerPulledPool:
      creatorHistoryResolved && report.creatorTokens?.length === 0
        ? false
        : null,
    manufacturedCap: canonicalMarketResolved ? false : null,
    graduatedAt: pair.pairCreatedAt,
    openingPriceHoldPct:
      currentMarketCapSol > 0 ? (currentMarketCapSol / 85) * 100 : null,
    rugRisks:
      report.risks
        ?.filter((risk) => risk.level === "warn" || risk.level === "danger")
        .map((risk) => ({
          name: risk.name,
          description: risk.description,
          level: risk.level as "warn" | "danger",
          value: risk.value,
        })) ?? [],
  };
  const verdict = await evaluateGate(facts, "standard", observedAt);
  if (verdict.kind !== "PASS") {
    throw new Error(
      `Kong returned ${verdict.kind}: ${verdict.topReasons.join("; ")}`,
    );
  }

  const tradeResponse = await fetch(TRADE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      publicKey: signerAddress,
      action: "buy",
      mint: options.mint,
      amount: options.amountSol,
      denominatedInSol: "true",
      slippage: 5,
      priorityFee: PRIORITY_FEE_SOL,
      pool: "auto",
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!tradeResponse.ok) {
    throw new Error(
      `Transaction builder returned ${tradeResponse.status}: ${await tradeResponse.text()}`,
    );
  }
  const transaction = VersionedTransaction.deserialize(
    new Uint8Array(await tradeResponse.arrayBuffer()),
  );
  const message = transaction.message;
  const accountKeys = message.getAccountKeys({
    addressLookupTableAccounts: [],
  });
  const requiredSigners = message.staticAccountKeys
    .slice(0, message.header.numRequiredSignatures)
    .map((key) => key.toBase58());
  const feePayer = message.staticAccountKeys[0]?.toBase58() ?? "";
  if (feePayer !== signerAddress) {
    throw new Error("Transaction fee payer is not the canary wallet");
  }
  assertManualBuyTransactionSafe({
    feePayer,
    requiredSigners,
    addressLookupTableCount: message.addressTableLookups.length,
    programIds: message.compiledInstructions.map((instruction) => {
      const key = accountKeys.get(instruction.programIdIndex);
      if (!key) throw new Error("Transaction contains an unresolved program");
      return key.toBase58();
    }),
  });

  const simulation = await connection.simulateTransaction(transaction, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: "confirmed",
  });
  if (simulation.value.err) {
    throw new Error(
      `Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`,
    );
  }

  const authorization = authorizeMainnetCanaryBuy({
    amountSol: options.amountSol,
    balanceSol: balanceLamports / 1_000_000_000,
    expectedSigner: expectedWallet,
    actualSigner: signerAddress,
    verdict,
    now: Date.now(),
  });
  transaction.sign([signer]);
  const signature = await sendAndConfirm(connection, transaction);

  const [newBalanceLamports, afterTokens, slot] = await Promise.all([
    connection.getBalance(signer.publicKey, "confirmed"),
    tokenBalance(connection, signer.publicKey, mint),
    connection.getSlot("confirmed"),
  ]);
  const confirmedAt = Date.now();
  const receipt = await createReceipt({
    kind: "manual_fill",
    actor: "caesar",
    subject: { mint: options.mint, wallet: signerAddress },
    at: { ts: confirmedAt, slot },
    inputs: {
      factsHash: authorization.factsHash,
      rulesetVersion: authorization.rulesetVersion,
      params: {
        side: "BUY",
        amountSol: options.amountSol,
        approval: "mainnet-canary",
        priorityFeeSol: PRIORITY_FEE_SOL,
      },
    },
    outputs: {
      signature,
      verdict: verdict.kind,
      score: verdict.score,
      timing: verdict.timing.kind,
      tokenDelta: afterTokens - beforeTokens,
      balanceSol: newBalanceLamports / 1_000_000_000,
    },
    evidence: [
      {
        kind: "tx",
        ref: signature,
        note: "Confirmed mainnet manual buy",
      },
      {
        kind: "url",
        ref: `https://solscan.io/tx/${signature}`,
        note: "Solscan transaction",
      },
    ],
    source: "live",
    prev: null,
  });

  console.log(
    JSON.stringify(
      {
        status: "confirmed",
        signature,
        mint: options.mint,
        symbol: facts.symbol,
        amountSol: options.amountSol,
        gate: {
          verdict: verdict.kind,
          score: verdict.score,
          rulesetVersion: verdict.rulesetVersion,
          factsHash: verdict.factsHash,
          timing: verdict.timing.kind,
        },
        tokenDelta: afterTokens - beforeTokens,
        newBalanceSol: newBalanceLamports / 1_000_000_000,
        solscan: `https://solscan.io/tx/${signature}`,
        receiptHash: receipt.hash,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

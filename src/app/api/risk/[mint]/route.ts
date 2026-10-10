import { NextResponse } from "next/server";
import { configuredSolanaRpc } from "@/lib/solana-rpc";
import { selectHolderEvidence } from "@/lib/holder-evidence";
import { safePublicUrl } from "@/lib/token-metadata";
import { deriveOpeningPriceHoldPct } from "../../../../../packages/core/src";

type RugHolder = {
  owner: string;
  pct: number;
  insider?: boolean;
};

type RpcHolder = {
  owner: string;
  pct: number;
};

type RugReport = {
  creator?: string;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  score_normalised?: number;
  rugged?: boolean;
  risks?: Array<{
    name: string;
    value?: string;
    description: string;
    level: "warn" | "danger" | string;
  }>;
  topHolders?: RugHolder[];
  knownAccounts?: Record<string, { name: string; type: string }>;
  tokenMeta?: {
    name?: string;
    symbol?: string;
    uri?: string;
    mutable?: boolean;
    updateAuthority?: string;
  };
  fileMeta?: {
    description?: string;
    image?: string;
  };
  creatorTokens?: Array<{
    mint: string;
    marketCap?: number;
    createdAt?: string;
  }>;
  totalHolders?: number;
  graphInsidersDetected?: number;
  insiderNetworks?: unknown[];
  detectedAt?: string;
};

type DexPair = {
  chainId?: string;
  dexId?: string;
  priceNative?: string;
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
  liquidity?: { usd?: number };
  priceChange?: { h24?: number };
  txns?: Record<string, { buys?: number; sells?: number }>;
};

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function rpcCall<T>(
  endpoint: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `apegate-${method}`,
      method,
      params,
    }),
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`RPC ${response.status}`);
  const body = (await response.json()) as {
    result?: T;
    error?: { message?: string };
  };
  if (body.error || body.result === undefined) {
    throw new Error(body.error?.message ?? `${method} returned no result`);
  }
  return body.result;
}

async function readRpcHolders(
  endpoint: string,
  mint: string,
  bondingCurve: string | null,
): Promise<RpcHolder[]> {
  const [supply, largest] = await Promise.all([
    rpcCall<{ value?: { amount?: string } }>(endpoint, "getTokenSupply", [
      mint,
      { commitment: "confirmed" },
    ]),
    rpcCall<{
      value?: Array<{ address?: string; amount?: string }>;
    }>(endpoint, "getTokenLargestAccounts", [
      mint,
      { commitment: "confirmed" },
    ]),
  ]);
  const supplyAmount = BigInt(supply.value?.amount ?? "0");
  const accounts = (largest.value ?? []).filter(
    (entry): entry is { address: string; amount: string } =>
      Boolean(entry.address && entry.amount),
  );
  if (supplyAmount <= BigInt(0) || accounts.length === 0) return [];

  const accountInfo = await rpcCall<{
    value?: Array<{
      data?: {
        parsed?: {
          info?: { owner?: string };
        };
      };
    } | null>;
  }>(endpoint, "getMultipleAccounts", [
    accounts.map((entry) => entry.address),
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);

  const amountsByOwner = new Map<string, bigint>();
  accounts.forEach((entry, index) => {
    const owner = accountInfo.value?.[index]?.data?.parsed?.info?.owner;
    if (!owner || owner === bondingCurve) return;
    amountsByOwner.set(
      owner,
      (amountsByOwner.get(owner) ?? BigInt(0)) + BigInt(entry.amount),
    );
  });

  return [...amountsByOwner.entries()]
    .sort(([, a], [, b]) => (a === b ? 0 : a > b ? -1 : 1))
    .slice(0, 20)
    .map(([owner, amount]) => ({
      owner,
      pct:
        Number((amount * BigInt(1_000_000)) / supplyAmount) / 10_000,
    }));
}

async function readMintFromRpc(mint: string, bondingCurve: string | null) {
  const { endpoint, source } = configuredSolanaRpc();
  const mintAccount = await rpcCall<{
    value?: {
      data?: {
        parsed?: {
          info?: {
            mintAuthority?: string | null;
            freezeAuthority?: string | null;
          };
        };
      };
    };
  }>(endpoint, "getAccountInfo", [
    mint,
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);
  const info = mintAccount.value?.data?.parsed?.info;
  if (!info) throw new Error("Mint account was not parsed");
  const holders = await readRpcHolders(endpoint, mint, bondingCurve).catch(
    () => [] as RpcHolder[],
  );
  return {
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
    topHolders: holders,
    source,
  };
}

async function readRiskReport(mint: string): Promise<RugReport> {
  const response = await fetch(
    `https://api.rugcheck.xyz/v1/tokens/${mint}/report`,
    {
      headers: process.env.RUGCHECK_API_KEY
        ? { authorization: `Bearer ${process.env.RUGCHECK_API_KEY}` }
        : undefined,
      signal: AbortSignal.timeout(6_000),
      next: { revalidate: 15 },
    },
  );
  if (!response.ok) throw new Error(`Risk scan ${response.status}`);
  return (await response.json()) as RugReport;
}

async function readPumpSwapPair(mint: string) {
  const response = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
    {
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: 10 },
    },
  );
  if (!response.ok) throw new Error(`Market source ${response.status}`);
  const body = (await response.json()) as { pairs?: DexPair[] };
  const pair = (body.pairs ?? [])
    .filter((candidate) => {
      return candidate.chainId === "solana" && candidate.dexId === "pumpswap";
    })
    .sort(
      (left, right) =>
        (right.liquidity?.usd ?? 0) - (left.liquidity?.usd ?? 0),
    )[0];
  if (!pair?.pairCreatedAt) {
    throw new Error("No PumpSwap market was found");
  }

  const shortestWindow =
    pair.txns?.m5 ?? pair.txns?.h1 ?? pair.txns?.h6 ?? pair.txns?.h24;
  const tradeCount =
    (shortestWindow?.buys ?? 0) + (shortestWindow?.sells ?? 0);
  const nativePrice = Number(pair.priceNative);
  const usdPrice = Number(pair.priceUsd);
  const marketCapUsd = pair.marketCap ?? pair.fdv ?? 0;
  const marketCapSol =
    nativePrice > 0 && usdPrice > 0 && marketCapUsd > 0
      ? marketCapUsd / (usdPrice / nativePrice)
      : null;
  const observedAt = Date.now();

  return {
    pairCreatedAt: pair.pairCreatedAt,
    tradeCount,
    marketCapSol,
    liquidityUsd: pair.liquidity?.usd ?? 0,
    openingPriceHoldPct: deriveOpeningPriceHoldPct({
      pairCreatedAt: pair.pairCreatedAt,
      priceChange24hPct: pair.priceChange?.h24,
      observedAt,
    }),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ mint: string }> },
) {
  const { mint } = await context.params;
  if (!BASE58.test(mint)) {
    return NextResponse.json({ error: "Invalid Solana mint" }, { status: 400 });
  }
  const requestedCurve = new URL(request.url).searchParams.get("curve");
  const bondingCurve =
    requestedCurve && BASE58.test(requestedCurve) ? requestedCurve : null;
  const requestedPool = new URL(request.url).searchParams.get("pool");
  const shouldReadMarket =
    requestedPool === "pump-amm" || requestedPool === "pumpswap";

  const [rpcResult, reportResult, pairResult] = await Promise.allSettled([
    readMintFromRpc(mint, bondingCurve),
    readRiskReport(mint),
    shouldReadMarket
      ? readPumpSwapPair(mint)
      : Promise.reject(new Error("Market read not requested")),
  ]);
  const rpc = rpcResult.status === "fulfilled" ? rpcResult.value : null;
  const report =
    reportResult.status === "fulfilled" ? reportResult.value : null;
  const pair = pairResult.status === "fulfilled" ? pairResult.value : null;

  if (!rpc && !report) {
    return NextResponse.json(
      {
        error: "Risk sources are temporarily unavailable",
        retryable: true,
      },
      { status: 503 },
    );
  }

  const known = report?.knownAccounts ?? {};
  const creator = report?.creator;
  const holderEvidence = selectHolderEvidence({
    reportHolders: report?.topHolders ?? [],
    rpcHolders: rpc?.topHolders ?? [],
    knownAccounts: known,
    bondingCurve,
    creator: creator ?? null,
    rpcSource: rpc?.source ?? null,
  });
  const insiderGraphResolved =
    typeof report?.graphInsidersDetected === "number" &&
    Array.isArray(report.insiderNetworks);
  const launchSecondBuyout = insiderGraphResolved
    ? report.graphInsidersDetected > 0 || report.insiderNetworks!.length > 0
    : null;
  const creatorHistoryResolved = Array.isArray(report?.creatorTokens);
  const liquidityPullRisk = report?.risks?.some((risk) => {
    const text = `${risk.name} ${risk.description}`.toLowerCase();
    return (
      risk.level === "danger" &&
      text.includes("liquidity") &&
      (text.includes("pull") || text.includes("remov"))
    );
  });

  return NextResponse.json(
    {
      mintAuthority:
        rpc
          ? rpc.mintAuthority
          : report
            ? report.mintAuthority
            : undefined,
      freezeAuthority:
        rpc
          ? rpc.freezeAuthority
          : report
            ? report.freezeAuthority
            : undefined,
      devPct: holderEvidence.devPct,
      top10Pct: holderEvidence.top10Pct,
      clusterRetainedPct: holderEvidence.insiderPct,
      launchSecondBuyout,
      deployerPulledPool: liquidityPullRisk
        ? true
        : creatorHistoryResolved && report!.creatorTokens!.length === 0
          ? false
          : null,
      manufacturedCap:
        pair && pair.liquidityUsd >= 50_000 && pair.tradeCount >= 50
          ? false
          : null,
      rugScore: report?.score_normalised ?? null,
      rugged: report?.rugged ?? null,
      creator: report?.creator ?? null,
      metadata: report
        ? {
            name: report.tokenMeta?.name ?? null,
            symbol: report.tokenMeta?.symbol ?? null,
            uri: safePublicUrl(report.tokenMeta?.uri),
            mutable: report.tokenMeta?.mutable ?? null,
            updateAuthority: report.tokenMeta?.updateAuthority ?? null,
            description: report.fileMeta?.description ?? null,
            image: safePublicUrl(
              report.fileMeta?.image,
              safePublicUrl(report.tokenMeta?.uri),
            ),
          }
        : null,
      totalHolders: report?.totalHolders ?? null,
      graphInsidersDetected: report?.graphInsidersDetected ?? null,
      detectedAt: report?.detectedAt ?? null,
      market: pair
        ? {
            pool: "pump-amm",
            tradeCount: pair.tradeCount,
            marketCapSol: pair.marketCapSol,
            graduatedAt: pair.pairCreatedAt,
            openingPriceHoldPct: pair.openingPriceHoldPct,
            liquidityUsd: pair.liquidityUsd,
          }
        : null,
      topHolders: holderEvidence.holders.slice(0, 20).map((holder) => ({
          owner: holder.owner,
          pct: holder.pct,
          insider: "insider" in holder ? Boolean(holder.insider) : false,
          label: known[holder.owner]?.name ?? null,
          type: known[holder.owner]?.type ?? null,
        })),
      creatorHistory:
        report?.creatorTokens?.slice(0, 12).map((token) => ({
          mint: token.mint,
          marketCap: token.marketCap ?? null,
          createdAt: token.createdAt ?? null,
        })) ?? [],
      rugRisks:
        report?.risks
          ?.filter((risk) => risk.level === "warn" || risk.level === "danger")
          .slice(0, 8) ?? [],
      sources: {
        mintSafety: rpc ? rpc.source : report ? "external risk scan" : null,
        concentration: holderEvidence.source,
        market: pair ? "DexScreener PumpSwap snapshot" : null,
      },
    },
    {
      headers: {
        "cache-control": "public, max-age=10, stale-while-revalidate=30",
      },
    },
  );
}

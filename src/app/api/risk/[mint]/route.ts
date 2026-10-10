import { NextResponse } from "next/server";
import { configuredSolanaRpc } from "@/lib/solana-rpc";
import { selectHolderEvidence } from "@/lib/holder-evidence";
import { safePublicUrl } from "@/lib/token-metadata";

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
  detectedAt?: string;
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

  const [rpcResult, reportResult] = await Promise.allSettled([
    readMintFromRpc(mint, bondingCurve),
    readRiskReport(mint),
  ]);
  const rpc = rpcResult.status === "fulfilled" ? rpcResult.value : null;
  const report =
    reportResult.status === "fulfilled" ? reportResult.value : null;

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
      },
    },
    {
      headers: {
        "cache-control": "public, max-age=10, stale-while-revalidate=30",
      },
    },
  );
}

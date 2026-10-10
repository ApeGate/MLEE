import { NextResponse } from "next/server";

type RugHolder = {
  owner: string;
  pct: number;
  insider?: boolean;
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
const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

async function readMintFromRpc(mint: string) {
  const endpoint = process.env.HELIUS_RPC_URL ?? PUBLIC_RPC;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "apegate-mint",
      method: "getAccountInfo",
      params: [mint, { encoding: "jsonParsed", commitment: "confirmed" }],
    }),
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`RPC ${response.status}`);
  const body = (await response.json()) as {
    result?: {
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
    };
  };
  const info = body.result?.value?.data?.parsed?.info;
  if (!info) throw new Error("Mint account was not parsed");
  return {
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
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
    readMintFromRpc(mint),
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
  const userHolders = (report?.topHolders ?? []).filter((holder) => {
    const type = known[holder.owner]?.type;
    return (
      holder.owner !== bondingCurve &&
      type !== "AMM" &&
      type !== "LOCKER" &&
      type !== "PROGRAM"
    );
  });
  const creator = report?.creator;
  const devPct = creator
    ? (report?.topHolders ?? []).find((holder) => holder.owner === creator)?.pct ??
      0
    : null;
  const top10Pct = userHolders
    .slice(0, 10)
    .reduce((sum, holder) => sum + holder.pct, 0);

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
      devPct,
      top10Pct: report ? top10Pct : null,
      rugScore: report?.score_normalised ?? null,
      rugged: report?.rugged ?? null,
      creator: report?.creator ?? null,
      metadata: report
        ? {
            name: report.tokenMeta?.name ?? null,
            symbol: report.tokenMeta?.symbol ?? null,
            uri: report.tokenMeta?.uri ?? null,
            mutable: report.tokenMeta?.mutable ?? null,
            updateAuthority: report.tokenMeta?.updateAuthority ?? null,
            description: report.fileMeta?.description ?? null,
            image: report.fileMeta?.image ?? null,
          }
        : null,
      totalHolders: report?.totalHolders ?? null,
      graphInsidersDetected: report?.graphInsidersDetected ?? null,
      detectedAt: report?.detectedAt ?? null,
      topHolders:
        report?.topHolders?.slice(0, 20).map((holder) => ({
          owner: holder.owner,
          pct: holder.pct,
          insider: Boolean(holder.insider),
          label: known[holder.owner]?.name ?? null,
          type: known[holder.owner]?.type ?? null,
        })) ?? [],
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
        mintSafety: rpc ? "Solana RPC" : report ? "external risk scan" : null,
        concentration: report ? "external risk scan" : null,
      },
    },
    {
      headers: {
        "cache-control": "public, max-age=10, stale-while-revalidate=30",
      },
    },
  );
}

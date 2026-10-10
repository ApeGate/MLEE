import { NextResponse } from "next/server";
import { configuredSolanaRpc } from "@/lib/solana-rpc";
import { safePublicUrl } from "@/lib/token-metadata";
import {
  parseWalletTokenAccounts,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@/lib/wallet-positions";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_RPC_BYTES = 2 * 1024 * 1024;
const MAX_POSITIONS = 36;

type DasAsset = {
  id?: unknown;
  content?: {
    metadata?: {
      name?: unknown;
      symbol?: unknown;
    };
    links?: {
      image?: unknown;
    };
    files?: Array<{
      uri?: unknown;
      cdn_uri?: unknown;
      mime?: unknown;
    }>;
  };
};

export const dynamic = "force-dynamic";

async function readBoundedJson(response: Response) {
  if (!response.ok || !response.body) {
    throw new Error(`RPC returned ${response.status}`);
  }
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_RPC_BYTES) {
    throw new Error("RPC response is too large");
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

async function rpc(
  endpoint: string,
  id: string,
  method: string,
  params: unknown,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  const body = await readBoundedJson(response);
  if (body.error) throw new Error(`${method} failed`);
  return body;
}

function shortText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function assetMetadata(asset: DasAsset) {
  const imageFile = asset.content?.files?.find(
    (file) =>
      typeof file.mime === "string" && file.mime.toLowerCase().startsWith("image/"),
  );
  return {
    name: shortText(asset.content?.metadata?.name, 96),
    symbol: shortText(asset.content?.metadata?.symbol, 24),
    image:
      safePublicUrl(asset.content?.links?.image) ??
      safePublicUrl(imageFile?.cdn_uri) ??
      safePublicUrl(imageFile?.uri),
  };
}

export async function GET(request: Request) {
  const owner = new URL(request.url).searchParams.get("owner")?.trim() ?? "";
  if (!BASE58.test(owner)) {
    return NextResponse.json(
      { error: "Invalid Solana wallet" },
      { status: 400 },
    );
  }

  const { endpoint, source } = configuredSolanaRpc();
  try {
    const programResponses = await Promise.all(
      [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].map(async (programId) => ({
        programId,
        body: await rpc(
          endpoint,
          `apegate-positions-${programId === TOKEN_PROGRAM_ID ? "spl" : "2022"}`,
          "getTokenAccountsByOwner",
          [
            owner,
            { programId },
            { encoding: "jsonParsed", commitment: "confirmed" },
          ],
        ),
      })),
    );
    const allPositions = parseWalletTokenAccounts(programResponses);
    const positions = allPositions.slice(0, MAX_POSITIONS);
    let metadata = new Map<
      string,
      { name: string | null; symbol: string | null; image: string | null }
    >();

    if (positions.length) {
      try {
        const assetsResponse = await rpc(
          endpoint,
          "apegate-position-assets",
          "getAssetBatch",
          { ids: positions.map((position) => position.mint) },
        );
        const assets = Array.isArray(assetsResponse.result)
          ? (assetsResponse.result as DasAsset[])
          : [];
        metadata = new Map(
          assets.flatMap((asset) => {
            const mint = typeof asset.id === "string" ? asset.id : "";
            return BASE58.test(mint) ? [[mint, assetMetadata(asset)]] : [];
          }),
        );
      } catch {
        // Metadata images also resolve lazily through /api/meta/[mint].
      }
    }

    return NextResponse.json(
      {
        owner,
        source,
        positions: positions.map((position) => ({
          ...position,
          name: metadata.get(position.mint)?.name ?? null,
          symbol: metadata.get(position.mint)?.symbol ?? null,
          image: metadata.get(position.mint)?.image ?? null,
        })),
        total: allPositions.length,
        hasMore: allPositions.length > positions.length,
        observedAt: Date.now(),
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "wallet position read failed",
        owner,
        error: error instanceof Error ? error.message : "unknown error",
      }),
    );
    return NextResponse.json(
      { error: "Wallet positions are temporarily unavailable" },
      { status: 503, headers: { "cache-control": "private, no-store" } },
    );
  }
}

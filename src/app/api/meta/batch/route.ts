import { NextResponse } from "next/server";
import { configuredSolanaRpc } from "@/lib/solana-rpc";
import { parseTokenLogoBatchRequest } from "@/lib/token-logo-batch";
import {
  resolveTokenMetadata,
  safePublicUrl,
  type TokenMetadata,
} from "@/lib/token-metadata";

export const dynamic = "force-dynamic";
const MAX_RPC_BYTES = 2 * 1024 * 1024;

type DasAsset = {
  id?: unknown;
  content?: {
    json_uri?: unknown;
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

function text(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function assetMetadata(asset: DasAsset): TokenMetadata {
  const imageFile = asset.content?.files?.find(
    (file) =>
      typeof file.mime === "string" &&
      file.mime.toLowerCase().startsWith("image/"),
  );
  return {
    name: text(asset.content?.metadata?.name, 96),
    symbol: text(asset.content?.metadata?.symbol, 24),
    image:
      safePublicUrl(asset.content?.links?.image) ??
      safePublicUrl(imageFile?.cdn_uri) ??
      safePublicUrl(imageFile?.uri),
    metadataUri: safePublicUrl(asset.content?.json_uri),
    source: "metadata",
  };
}

async function readBoundedJson(response: Response) {
  if (!response.ok || !response.body) {
    throw new Error(`Asset RPC returned ${response.status}`);
  }
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_RPC_BYTES) {
    throw new Error("Asset RPC response is too large");
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
      throw new Error("Asset RPC response exceeded the size limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as {
    result?: unknown;
    error?: { message?: string };
  };
}

async function readAssets(mints: string[]) {
  if (!mints.length) return new Map<string, TokenMetadata>();
  const { endpoint } = configuredSolanaRpc();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "apegate-token-logo-batch",
      method: "getAssetBatch",
      params: { ids: mints },
    }),
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  });
  const body = await readBoundedJson(response);
  if (body.error || !Array.isArray(body.result)) {
    throw new Error(body.error?.message ?? "Asset metadata is unavailable");
  }
  return new Map(
    (body.result as DasAsset[]).flatMap((asset) => {
      const mint = typeof asset.id === "string" ? asset.id : "";
      return mint ? [[mint, assetMetadata(asset)] as const] : [];
    }),
  );
}

export async function POST(request: Request) {
  let items;
  try {
    items = parseTokenLogoBatchRequest(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid token logo batch",
      },
      { status: 400 },
    );
  }

  let das = new Map<string, TokenMetadata>();
  try {
    das = await readAssets(
      items.filter((item) => !item.uri).map((item) => item.mint),
    );
  } catch {
    // Per-mint Pump metadata remains the bounded fallback below.
  }

  const metadata = await Promise.all(
    items.map(async (item) => {
      const asset = item.uri ? null : das.get(item.mint) ?? null;
      const fallback =
        asset?.image && asset.name && asset.symbol
          ? null
          : await resolveTokenMetadata(
              item.mint,
              item.uri ?? asset?.metadataUri,
            );
      const resolved = {
        image: asset?.image ?? fallback?.image ?? null,
        name: asset?.name ?? fallback?.name ?? null,
        symbol: asset?.symbol ?? fallback?.symbol ?? null,
      };
      return {
        ...item,
        image: resolved.image,
        name: resolved.name,
        symbol: resolved.symbol,
      };
    }),
  );

  return NextResponse.json(
    { items: metadata },
    {
      headers: {
        "cache-control": "public, max-age=300, stale-while-revalidate=900",
      },
    },
  );
}

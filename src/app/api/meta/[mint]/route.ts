import { NextResponse } from "next/server";
import { configuredSolanaRpc } from "@/lib/solana-rpc";
import {
  extractMetadataSignals,
  hashWebsiteTemplate,
  websiteLinksToXHandle,
} from "@/lib/meta-signals";
import {
  fetchPublicText,
  requirePublicHttpsUrl,
} from "@/lib/safe-remote-text";

export const dynamic = "force-dynamic";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type AssetResult = {
  content?: {
    json_uri?: string;
    metadata?: Record<string, unknown>;
    links?: Record<string, unknown>;
  };
};

function normalizeMetadataUri(value: string): string {
  const trimmed = value.trim().slice(0, 2_048);
  if (trimmed.startsWith("ipfs://")) {
    const path = trimmed.slice("ipfs://".length).replace(/^ipfs\//, "");
    return `https://ipfs.io/ipfs/${path}`;
  }
  if (trimmed.startsWith("ar://")) {
    return `https://arweave.net/${trimmed.slice("ar://".length)}`;
  }
  return requirePublicHttpsUrl(trimmed).toString();
}

async function readAsset(mint: string): Promise<AssetResult> {
  const { endpoint } = configuredSolanaRpc();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "apegate-meta",
      method: "getAsset",
      params: { id: mint },
    }),
    signal: AbortSignal.timeout(3_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Asset RPC returned ${response.status}`);
  const body = (await response.json()) as {
    result?: AssetResult;
    error?: { message?: string };
  };
  if (!body.result || body.error) {
    throw new Error(body.error?.message ?? "Asset metadata is unavailable");
  }
  return body.result;
}

async function resolveMetadata(
  mint: string,
  requestedUri: string | null,
): Promise<{ metadata: unknown; source: string }> {
  const asset = requestedUri ? null : await readAsset(mint);
  const uri = requestedUri ?? asset?.content?.json_uri ?? null;
  if (!uri) {
    const inline = asset?.content
      ? {
          ...(asset.content.metadata ?? {}),
          links: asset.content.links ?? {},
        }
      : null;
    if (!inline) throw new Error("Token metadata URI is unavailable");
    return { metadata: inline, source: "Helius DAS" };
  }

  const source = normalizeMetadataUri(uri);
  const response = await fetchPublicText(source, {
    timeoutMs: 2_000,
    maxBytes: 128 * 1_024,
    redirects: 2,
    accept: "application/json, text/json;q=0.9, */*;q=0.1",
  });
  return {
    metadata: JSON.parse(response.text) as unknown,
    source: response.url.toString(),
  };
}

async function checkDomainAge(hostname: string) {
  try {
    const domain = hostname.toLowerCase().replace(/^www\./, "");
    const response = await fetchPublicText(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      {
        timeoutMs: 2_000,
        maxBytes: 128 * 1_024,
        redirects: 2,
        accept: "application/rdap+json, application/json",
      },
    );
    const record = JSON.parse(response.text) as {
      events?: Array<{ eventAction?: string; eventDate?: string }>;
    };
    const registration = record.events?.find(
      (event) => event.eventAction === "registration",
    )?.eventDate;
    const registeredAt = registration ? Date.parse(registration) : Number.NaN;
    if (!Number.isFinite(registeredAt)) {
      return { domainRegisteredAt: null, domainAgeDays: null };
    }
    return {
      domainRegisteredAt: new Date(registeredAt).toISOString(),
      domainAgeDays: Math.max(
        0,
        Math.floor((Date.now() - registeredAt) / (24 * 60 * 60 * 1_000)),
      ),
    };
  } catch {
    return { domainRegisteredAt: null, domainAgeDays: null };
  }
}

async function checkWebsite(
  websiteUrl: string | null,
  token: { mint: string; name: string | null; symbol: string | null },
  xHandle: string | null,
) {
  if (!websiteUrl) {
    return {
      websiteHost: null,
      websiteReachable: null,
      websiteMentionsToken: null,
      websiteMatchesX: null,
      websiteTemplateHash: null,
      domainRegisteredAt: null,
      domainAgeDays: null,
    };
  }

  let hostname: string | null = null;
  try {
    hostname = requirePublicHttpsUrl(websiteUrl).hostname;
    const response = await fetchPublicText(websiteUrl, {
      timeoutMs: 2_000,
      maxBytes: 256 * 1_024,
      redirects: 2,
      accept: "text/html, text/plain;q=0.8, */*;q=0.1",
    });
    const lower = response.text.toLowerCase();
    const mentions = [token.mint, token.name, token.symbol]
      .filter(
        (value): value is string =>
          Boolean(value && (value === token.mint || value.trim().length >= 3)),
      )
      .some((value) => lower.includes(value.toLowerCase()));
    const [templateHash, domain] = await Promise.all([
      hashWebsiteTemplate(
        response.text,
        [token.mint, token.name, token.symbol].filter(
          (value): value is string => Boolean(value),
        ),
      ),
      checkDomainAge(response.url.hostname),
    ]);
    return {
      websiteHost: response.url.hostname,
      websiteReachable: true,
      websiteMentionsToken: mentions,
      websiteMatchesX: xHandle
        ? websiteLinksToXHandle(response.text, xHandle)
        : null,
      websiteTemplateHash: templateHash,
      ...domain,
    };
  } catch {
    return {
      websiteHost: hostname,
      websiteReachable: false,
      websiteMentionsToken: null,
      websiteMatchesX: null,
      websiteTemplateHash: null,
      domainRegisteredAt: null,
      domainAgeDays: null,
    };
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ mint: string }> },
) {
  const { mint } = await context.params;
  if (!BASE58.test(mint)) {
    return NextResponse.json({ error: "Invalid Solana mint" }, { status: 400 });
  }

  const requestedUri = new URL(request.url).searchParams.get("uri");
  let resolved;
  try {
    resolved = await resolveMetadata(mint, requestedUri);
  } catch {
    return NextResponse.json(
      { error: "Token metadata is temporarily unavailable", retryable: true },
      { status: 503 },
    );
  }

  const metadata = extractMetadataSignals(resolved.metadata);
  const website = await checkWebsite(
    metadata.websiteUrl,
    { mint, name: metadata.name, symbol: metadata.symbol },
    metadata.x.handle,
  );

  return NextResponse.json(
    {
      name: metadata.name,
      symbol: metadata.symbol,
      imageUrl: metadata.imageUrl,
      websiteUrl: metadata.websiteUrl,
      ...website,
      xLinkType: metadata.x.type,
      xUrl: metadata.x.url,
      xHandle: metadata.x.handle,
      telegramUrl: metadata.telegramUrl,
      telegramPresent: metadata.telegramPresent,
      sources: {
        metadata: resolved.source,
        website: website.websiteReachable ? metadata.websiteUrl : null,
        domain: website.domainRegisteredAt ? "RDAP" : null,
      },
    },
    {
      headers: {
        "cache-control": "public, max-age=300, stale-while-revalidate=900",
      },
    },
  );
}

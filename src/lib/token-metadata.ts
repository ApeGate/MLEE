const MAX_METADATA_BYTES = 256 * 1024;

export type TokenMetadata = {
  image: string | null;
  name: string | null;
  symbol: string | null;
  metadataUri: string | null;
  source: "metadata" | "pump" | "unavailable";
};

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  );
}

export function safePublicUrl(
  value: unknown,
  base?: string | null,
): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const rewritten = raw.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${raw.slice("ipfs://".length).replace(/^ipfs\//, "")}`
    : raw.startsWith("ar://")
      ? `https://arweave.net/${raw.slice("ar://".length)}`
      : raw;

  try {
    const url = base ? new URL(rewritten, base) : new URL(rewritten);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      !hostname ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname === "::1" ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe80:") ||
      isPrivateIpv4(hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function readBoundedJson(
  response: Response,
): Promise<Record<string, unknown>> {
  if (!response.ok || !response.body) {
    throw new Error(`Metadata request failed with ${response.status}`);
  }
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_METADATA_BYTES) {
    throw new Error("Metadata response is too large");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_METADATA_BYTES) {
      await reader.cancel();
      throw new Error("Metadata response exceeded the size limit");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Metadata response is not an object");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseMetadata(
  body: Record<string, unknown>,
  metadataUri: string,
  source: TokenMetadata["source"],
): TokenMetadata {
  const properties =
    body.properties && typeof body.properties === "object"
      ? (body.properties as Record<string, unknown>)
      : null;
  const files = Array.isArray(properties?.files)
    ? (properties.files as Array<Record<string, unknown>>)
    : [];
  const imageValue =
    body.image ??
    body.image_uri ??
    body.imageUrl ??
    files.find((file) => file.type?.toString().startsWith("image/"))?.uri ??
    files[0]?.uri;

  return {
    image: safePublicUrl(imageValue, metadataUri),
    name: text(body.name),
    symbol: text(body.symbol),
    metadataUri,
    source,
  };
}

async function fetchMetadataUri(uri: string) {
  const response = await fetch(uri, {
    headers: { accept: "application/json" },
    redirect: "follow",
    signal: AbortSignal.timeout(3_500),
  });
  return parseMetadata(await readBoundedJson(response), response.url || uri, "metadata");
}

async function fetchPumpMetadata(mint: string) {
  const endpoint = `https://frontend-api-v3.pump.fun/coins/${encodeURIComponent(mint)}`;
  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(3_500),
  });
  const body = await readBoundedJson(response);
  const nestedUri = safePublicUrl(body.metadata_uri ?? body.uri);
  const direct = parseMetadata(body, response.url || endpoint, "pump");
  if (direct.image || !nestedUri) return direct;
  const nested = await fetchMetadataUri(nestedUri);
  return { ...nested, source: "pump" as const };
}

export async function resolveTokenMetadata(
  mint: string,
  rawUri?: string | null,
): Promise<TokenMetadata> {
  const uri = safePublicUrl(rawUri);
  if (uri) {
    try {
      const metadata = await fetchMetadataUri(uri);
      if (metadata.image) return metadata;
    } catch {
      // Pump's indexed record is the controlled fallback below.
    }
  }

  try {
    return await fetchPumpMetadata(mint);
  } catch {
    return {
      image: null,
      name: null,
      symbol: null,
      metadataUri: uri,
      source: "unavailable",
    };
  }
}

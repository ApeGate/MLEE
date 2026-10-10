import "server-only";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

export function requirePublicHttpsUrl(value: string): URL {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !hostname ||
    BLOCKED_HOSTS.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.startsWith("[") ||
    /^\d+(?:\.\d+){0,3}$/.test(hostname)
  ) {
    throw new Error("Remote URL must use a public HTTPS hostname");
  }
  url.hash = "";
  return url;
}

async function readLimitedText(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error("Remote response is too large");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new Error("Remote response is too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function fetchPublicText(
  value: string,
  options: {
    timeoutMs: number;
    maxBytes: number;
    redirects?: number;
    accept?: string;
  },
): Promise<{ text: string; url: URL; contentType: string | null }> {
  const signal = AbortSignal.timeout(options.timeoutMs);
  let url = requirePublicHttpsUrl(value);
  const redirectLimit = options.redirects ?? 2;

  for (let redirect = 0; redirect <= redirectLimit; redirect += 1) {
    const response = await fetch(url, {
      headers: {
        accept: options.accept ?? "text/plain, text/html;q=0.9, */*;q=0.1",
        "user-agent": "Apegate-Metadata-Resolver/1.0 (+https://apegate.io)",
      },
      redirect: "manual",
      signal,
      cache: "no-store",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === redirectLimit) {
        throw new Error("Remote redirect limit exceeded");
      }
      url = requirePublicHttpsUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Remote source returned ${response.status}`);
    return {
      text: await readLimitedText(response, options.maxBytes),
      url,
      contentType: response.headers.get("content-type"),
    };
  }

  throw new Error("Remote redirect limit exceeded");
}

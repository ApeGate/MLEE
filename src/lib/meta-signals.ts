import type { XLinkType } from "../../packages/core/src";

export type XLinkSignal = {
  type: XLinkType;
  url: string | null;
  handle: string | null;
};

export type MetadataSignals = {
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  x: XLinkSignal;
  telegramUrl: string | null;
  telegramPresent: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, 2_048);
  return cleaned || null;
}

function firstString(
  source: Record<string, unknown>,
  paths: readonly (readonly string[])[],
): string | null {
  for (const path of paths) {
    let value: unknown = source;
    for (const key of path) {
      value = asRecord(value)?.[key];
    }
    const found = cleanString(value);
    if (found) return found;
  }
  return null;
}

function normalizeSocialUrl(value: string | null): string | null {
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value)
    ? value
    : `https://${value.replace(/^\/+/, "")}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function classifyXLink(value: string | null | undefined): XLinkSignal {
  const raw = value?.trim() || null;
  const normalized = normalizeSocialUrl(
    raw?.startsWith("@") ? `https://x.com/${raw.slice(1)}` : raw,
  );
  if (!normalized) return { type: "none", url: null, handle: null };

  const url = new URL(normalized);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "x.com" && host !== "twitter.com") {
    return { type: "none", url: null, handle: null };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const lower = parts.map((part) => part.toLowerCase());
  if (
    lower[0] === "i" &&
    lower[1] === "communities" &&
    Boolean(parts[2])
  ) {
    return { type: "community", url: url.toString(), handle: null };
  }

  const handle = parts[0]?.replace(/^@/, "") ?? null;
  const reserved = new Set([
    "home",
    "intent",
    "search",
    "share",
    "explore",
    "notifications",
    "messages",
    "settings",
    "i",
  ]);
  if (!handle || reserved.has(handle.toLowerCase())) {
    return { type: "none", url: url.toString(), handle: null };
  }
  if (lower[1] === "status" && Boolean(parts[2])) {
    return { type: "post", url: url.toString(), handle };
  }
  if (parts.length === 1) {
    return { type: "profile", url: url.toString(), handle };
  }
  return { type: "none", url: url.toString(), handle };
}

export function extractMetadataSignals(metadata: unknown): MetadataSignals {
  const source = asRecord(metadata) ?? {};
  const websiteUrl = normalizeSocialUrl(
    firstString(source, [
      ["website"],
      ["external_url"],
      ["externalUrl"],
      ["links", "website"],
      ["extensions", "website"],
    ]),
  );
  const xValue = firstString(source, [
    ["twitter"],
    ["x"],
    ["social"],
    ["links", "twitter"],
    ["links", "x"],
    ["extensions", "twitter"],
    ["extensions", "x"],
  ]);
  const telegramUrl = normalizeSocialUrl(
    firstString(source, [
      ["telegram"],
      ["links", "telegram"],
      ["extensions", "telegram"],
    ]),
  );

  return {
    name: cleanString(source.name),
    symbol: cleanString(source.symbol),
    imageUrl: normalizeSocialUrl(
      firstString(source, [["image"], ["image_url"], ["imageUrl"]]),
    ),
    websiteUrl,
    x: classifyXLink(xValue),
    telegramUrl,
    telegramPresent: Boolean(telegramUrl),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeWebsiteTemplate(
  html: string,
  tokenValues: readonly string[] = [],
): string {
  let normalized = html
    .slice(0, 256 * 1_024)
    .toLowerCase()
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, " ")
    .replace(/[1-9a-km-z]{32,44}/g, "{address}")
    .replace(/0x[a-f0-9]{40,64}/gi, "{address}");

  for (const value of tokenValues) {
    const cleaned = value.trim().toLowerCase();
    if (cleaned.length >= 2) {
      normalized = normalized.replace(
        new RegExp(escapeRegExp(cleaned), "g"),
        "{token}",
      );
    }
  }

  return normalized
    .replace(/([?&](?:v|ver|version|t|ts|cache)=[^"'&\s>]+)/g, "")
    .replace(/\d+/g, "{n}")
    .replace(/\s+/g, " ")
    .trim();
}

export async function hashWebsiteTemplate(
  html: string,
  tokenValues: readonly string[] = [],
): Promise<string> {
  const normalized = normalizeWebsiteTemplate(html, tokenValues);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function websiteLinksToXHandle(
  html: string,
  expectedHandle: string | null,
): boolean {
  if (!expectedHandle) return false;
  const links =
    html.match(
      /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^"'<>\\\s]+/gi,
    ) ?? [];
  return links.some(
    (link) =>
      classifyXLink(link.replace(/&amp;/g, "&")).handle?.toLowerCase() ===
      expectedHandle.toLowerCase(),
  );
}

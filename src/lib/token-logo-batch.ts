const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_BATCH_ITEMS = 40;
const MAX_URI_LENGTH = 2_048;

export type TokenLogoBatchItem = {
  mint: string;
  uri: string | null;
};

export function tokenLogoBatchKey(item: TokenLogoBatchItem) {
  return `${item.mint}:${item.uri ?? ""}`;
}

export function parseTokenLogoBatchRequest(
  value: unknown,
): TokenLogoBatchItem[] {
  if (
    !value ||
    typeof value !== "object" ||
    !("items" in value) ||
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    value.items.length > MAX_BATCH_ITEMS
  ) {
    throw new Error("Token logo batch must contain 1–40 items");
  }

  const unique = new Map<string, TokenLogoBatchItem>();
  for (const candidate of value.items) {
    if (!candidate || typeof candidate !== "object") {
      throw new Error("Token logo batch item is invalid");
    }
    const mint =
      "mint" in candidate && typeof candidate.mint === "string"
        ? candidate.mint.trim()
        : "";
    const uri =
      "uri" in candidate && typeof candidate.uri === "string"
        ? candidate.uri.trim()
        : null;
    if (
      !BASE58.test(mint) ||
      (uri !== null && (!uri || uri.length > MAX_URI_LENGTH))
    ) {
      throw new Error("Token logo batch item is invalid");
    }
    const item = { mint, uri };
    unique.set(tokenLogoBatchKey(item), item);
  }
  return [...unique.values()];
}

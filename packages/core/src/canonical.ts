/**
 * RFC 8785-style JSON canonicalization for JSON-safe values.
 * Numbers and strings use the host's ECMAScript serialization; object keys are
 * sorted recursively and unsupported JSON values are rejected.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON cannot contain non-finite numbers");
    }
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => {
        const item = record[key];
        if (
          item === undefined ||
          typeof item === "function" ||
          typeof item === "symbol" ||
          typeof item === "bigint"
        ) {
          throw new TypeError(`Canonical JSON cannot contain ${typeof item}`);
        }
        return `${JSON.stringify(key)}:${canonicalize(item)}`;
      });
    return `{${entries.join(",")}}`;
  }

  throw new TypeError(`Canonical JSON cannot contain ${typeof value}`);
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function hashCanonical(value: unknown): Promise<string> {
  return sha256(canonicalize(value));
}

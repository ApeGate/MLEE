import { hashCanonical } from "./canonical";

export const OFFICIAL_TOKEN_NAME = "Apegate";
export const OFFICIAL_TOKEN_SYMBOL = "APEGATE";
export const OFFICIAL_TOKEN_DESCRIPTION =
  "The official Apegate utility token. Verify the contract address on apegate.io before interacting.";

function normalizeIdentity(value: string): string {
  return value
    .toLowerCase()
    .replace(/8/g, "ate")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/[^a-z]/g, "");
}

function editDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0]!;
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex]!;
      row[rightIndex] = Math.min(
        row[rightIndex]! + 1,
        row[rightIndex - 1]! + 1,
        diagonal +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return row[right.length]!;
}

export function resemblesApegateIdentity(value: string): boolean {
  const normalized = normalizeIdentity(value);
  if (!normalized) return false;
  if (normalized.includes("apegate")) return true;
  return (
    normalized.length >= 5 &&
    normalized.length <= 9 &&
    editDistance(normalized, "apegate") <= 2
  );
}

export function isOfficialApegateMint(
  mint: string,
  officialMint?: string | null,
): boolean {
  return mint === normalizeOfficialApegateMint(officialMint);
}

export function normalizeOfficialApegateMint(
  value?: string | null,
): string | null {
  const mint = value?.trim() ?? "";
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint) ? mint : null;
}

export async function officialTokenManifestHash(): Promise<string> {
  return hashCanonical({
    name: OFFICIAL_TOKEN_NAME,
    symbol: OFFICIAL_TOKEN_SYMBOL,
    description: OFFICIAL_TOKEN_DESCRIPTION,
    quoteAsset: "SOL",
    image: "/apegate-logo.jpg",
    website: "https://apegate.io",
    singleSignerOnly: true,
    bundles: false,
    promotionServices: false,
  });
}

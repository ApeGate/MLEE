const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const TOKEN_PROGRAM_ID =
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export type WalletPosition = {
  mint: string;
  rawAmount: string;
  decimals: number;
  uiAmount: string;
  tokenProgram: typeof TOKEN_PROGRAM_ID | typeof TOKEN_2022_PROGRAM_ID;
};

type ParsedTokenAccountsResponse = {
  result?: {
    value?: Array<{
      account?: {
        data?: {
          parsed?: {
            info?: {
              mint?: unknown;
              tokenAmount?: {
                amount?: unknown;
                decimals?: unknown;
              };
            };
          };
        };
      };
    }>;
  };
};

export function formatTokenAmount(rawAmount: bigint, decimals: number) {
  const raw = rawAmount.toString();
  if (decimals === 0) return raw;
  const padded = raw.padStart(decimals + 1, "0");
  const integer = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer;
}

export function parseWalletTokenAccounts(
  responses: ReadonlyArray<{
    programId: typeof TOKEN_PROGRAM_ID | typeof TOKEN_2022_PROGRAM_ID;
    body: ParsedTokenAccountsResponse;
  }>,
): WalletPosition[] {
  const aggregated = new Map<
    string,
    {
      amount: bigint;
      decimals: number;
      tokenProgram: typeof TOKEN_PROGRAM_ID | typeof TOKEN_2022_PROGRAM_ID;
    }
  >();

  for (const response of responses) {
    for (const item of response.body.result?.value ?? []) {
      const info = item.account?.data?.parsed?.info;
      const mint = typeof info?.mint === "string" ? info.mint : "";
      const rawAmount = info?.tokenAmount?.amount;
      const decimals = info?.tokenAmount?.decimals;
      if (
        !BASE58.test(mint) ||
        typeof rawAmount !== "string" ||
        !/^\d+$/.test(rawAmount) ||
        !Number.isInteger(decimals) ||
        (decimals as number) < 0 ||
        (decimals as number) > 18
      ) {
        continue;
      }
      const amount = BigInt(rawAmount);
      if (amount <= BigInt(0)) continue;
      const existing = aggregated.get(mint);
      if (existing) {
        if (
          existing.decimals !== decimals ||
          existing.tokenProgram !== response.programId
        ) {
          continue;
        }
        existing.amount += amount;
      } else {
        aggregated.set(mint, {
          amount,
          decimals: decimals as number,
          tokenProgram: response.programId,
        });
      }
    }
  }

  return [...aggregated.entries()]
    .map(([mint, position]) => ({
      mint,
      rawAmount: position.amount.toString(),
      decimals: position.decimals,
      uiAmount: formatTokenAmount(position.amount, position.decimals),
      tokenProgram: position.tokenProgram,
    }))
    .sort((left, right) => {
      const scale = Math.max(left.decimals, right.decimals);
      const leftScaled =
        BigInt(left.rawAmount) * BigInt(10) ** BigInt(scale - left.decimals);
      const rightScaled =
        BigInt(right.rawAmount) * BigInt(10) ** BigInt(scale - right.decimals);
      if (leftScaled === rightScaled) return left.mint.localeCompare(right.mint);
      return leftScaled > rightScaled ? -1 : 1;
    });
}

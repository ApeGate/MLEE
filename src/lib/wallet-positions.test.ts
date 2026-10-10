import { describe, expect, it } from "vitest";
import {
  formatTokenAmount,
  parseWalletTokenAccounts,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "./wallet-positions";

const MINT_A = "So11111111111111111111111111111111111111112";
const MINT_B = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6fPwBGfhXvqEyQX";

function response(
  entries: Array<{ mint: string; amount: string; decimals: number }>,
) {
  return {
    result: {
      value: entries.map((entry) => ({
        account: {
          data: {
            parsed: {
              info: {
                mint: entry.mint,
                tokenAmount: {
                  amount: entry.amount,
                  decimals: entry.decimals,
                },
              },
            },
          },
        },
      })),
    },
  };
}

describe("wallet positions", () => {
  it("formats base units without floating-point loss", () => {
    expect(formatTokenAmount(BigInt("123456789012345678"), 9)).toBe(
      "123456789.012345678",
    );
    expect(formatTokenAmount(BigInt("42"), 6)).toBe("0.000042");
    expect(formatTokenAmount(BigInt("1000000"), 6)).toBe("1");
  });

  it("aggregates token accounts and drops empty or malformed entries", () => {
    const positions = parseWalletTokenAccounts([
      {
        programId: TOKEN_PROGRAM_ID,
        body: response([
          { mint: MINT_A, amount: "1250000", decimals: 6 },
          { mint: MINT_A, amount: "750000", decimals: 6 },
          { mint: MINT_B, amount: "0", decimals: 6 },
          { mint: "not-a-mint", amount: "12", decimals: 6 },
        ]),
      },
      {
        programId: TOKEN_2022_PROGRAM_ID,
        body: response([{ mint: MINT_B, amount: "1", decimals: 0 }]),
      },
    ]);

    expect(positions).toEqual([
      {
        mint: MINT_A,
        rawAmount: "2000000",
        decimals: 6,
        uiAmount: "2",
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      {
        mint: MINT_B,
        rawAmount: "1",
        decimals: 0,
        uiAmount: "1",
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      },
    ]);
  });
});

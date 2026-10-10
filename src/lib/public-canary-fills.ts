export const CANARY_WALLET =
  "6hwUCrUfQwVNNUScKshSvksJK7rNC2JphioJztjdEEcr";

export type CanaryFillEvidence = {
  signature: string;
  mint: string;
  symbol: string;
  side: "BUY" | "SELL";
  expectedSlot: number;
  expectedSolDeltaLamports: number;
  expectedTokenDeltaBaseUnits: string;
  tokenDecimals: number;
  receiptHash: string | null;
};

export type VerifiedCanaryFill = CanaryFillEvidence & {
  wallet: string;
  slot: number;
  blockTime: number | null;
  solDelta: number;
  tokenDelta: number;
  feeSol: number;
  confirmed: true;
  solscan: string;
};

export const PUBLIC_CANARY_FILLS = [
  {
    signature:
      "33e1C24vhXFvEmQxSz6exoNjvs6npoovYc9MevaWffT4nf59JRkNN96NJWML8R2aJvVC4q6dcYSZd3oezdaT8DRJ",
    mint: "BQAeeSowpwEx8Km8GcporcbuLKq4a7EQceH3F2qZpump",
    symbol: "BQA",
    side: "BUY",
    expectedSlot: 455_141_820,
    expectedSolDeltaLamports: -9_954_108,
    expectedTokenDeltaBaseUnits: "122964775",
    tokenDecimals: 6,
    receiptHash: null,
  },
  {
    signature:
      "ciaZk9YFsrb34vadVU7itnnqFMTdCVwbDQBHquDDsNhFDZ6bADeCoxqEdWMiy7mQxLJKLAeUy7oGnwBLsahq3AT",
    mint: "BQAeeSowpwEx8Km8GcporcbuLKq4a7EQceH3F2qZpump",
    symbol: "BQA",
    side: "SELL",
    expectedSlot: 455_149_851,
    expectedSolDeltaLamports: 4_821_792,
    expectedTokenDeltaBaseUnits: "-122964775",
    tokenDecimals: 6,
    receiptHash:
      "bb768c382b0ad9cd283a831f4bf78fe4ef9263c6157c9333ca1c9b22d5ecfb63",
  },
  {
    signature:
      "2hbmGzSWQj6WsTasDAKwpx99Q3L5vp4NzRvBJenDp5pc8vZN7DeJ6xEeWtjwKxXM6yCmgKFQYqfios4MUdZr6NCw",
    mint: "Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump",
    symbol: "CATE",
    side: "BUY",
    expectedSlot: 455_138_333,
    expectedSolDeltaLamports: -13_929_482,
    expectedTokenDeltaBaseUnits: "20410552",
    tokenDecimals: 6,
    receiptHash: null,
  },
] as const satisfies readonly CanaryFillEvidence[];

type ParsedTokenBalance = {
  owner?: unknown;
  mint?: unknown;
  uiTokenAmount?: {
    amount?: unknown;
    decimals?: unknown;
  };
};

type ParsedTransaction = {
  slot?: unknown;
  blockTime?: unknown;
  meta?: {
    err?: unknown;
    fee?: unknown;
    preBalances?: unknown;
    postBalances?: unknown;
    preTokenBalances?: unknown;
    postTokenBalances?: unknown;
  };
  transaction?: {
    signatures?: unknown;
    message?: {
      accountKeys?: unknown;
    };
  };
};

function parsedAccountKey(value: unknown) {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "pubkey" in value &&
    typeof value.pubkey === "string"
  ) {
    return value.pubkey;
  }
  return null;
}

function tokenBalance(
  balances: unknown,
  owner: string,
  mint: string,
  decimals: number,
) {
  if (!Array.isArray(balances)) return BigInt(0);
  return balances.reduce((total: bigint, candidate: unknown) => {
    const balance = candidate as ParsedTokenBalance;
    if (
      balance?.owner !== owner ||
      balance.mint !== mint ||
      balance.uiTokenAmount?.decimals !== decimals ||
      typeof balance.uiTokenAmount.amount !== "string" ||
      !/^\d+$/.test(balance.uiTokenAmount.amount)
    ) {
      return total;
    }
    return total + BigInt(balance.uiTokenAmount.amount);
  }, BigInt(0));
}

export function verifyCanaryTransaction(
  fill: CanaryFillEvidence,
  candidate: unknown,
): VerifiedCanaryFill {
  const parsed = candidate as ParsedTransaction;
  if (!parsed || parsed.meta?.err) {
    throw new Error("Transaction is missing or failed");
  }
  if (parsed.slot !== fill.expectedSlot) {
    throw new Error("Transaction slot does not match the published evidence");
  }
  const signatures = parsed.transaction?.signatures;
  if (!Array.isArray(signatures) || signatures[0] !== fill.signature) {
    throw new Error("Transaction signature does not match");
  }
  const accountKeys = parsed.transaction?.message?.accountKeys;
  if (!Array.isArray(accountKeys)) {
    throw new Error("Transaction account keys are unavailable");
  }
  const walletIndex = accountKeys.findIndex(
    (account) => parsedAccountKey(account) === CANARY_WALLET,
  );
  const preBalances = parsed.meta?.preBalances;
  const postBalances = parsed.meta?.postBalances;
  if (
    walletIndex < 0 ||
    !Array.isArray(preBalances) ||
    !Array.isArray(postBalances) ||
    typeof preBalances[walletIndex] !== "number" ||
    typeof postBalances[walletIndex] !== "number"
  ) {
    throw new Error("Canary wallet balance evidence is unavailable");
  }
  const solDeltaLamports =
    (postBalances[walletIndex] as number) -
    (preBalances[walletIndex] as number);
  if (solDeltaLamports !== fill.expectedSolDeltaLamports) {
    throw new Error("Canary wallet SOL delta does not match");
  }
  const preTokens = tokenBalance(
    parsed.meta?.preTokenBalances,
    CANARY_WALLET,
    fill.mint,
    fill.tokenDecimals,
  );
  const postTokens = tokenBalance(
    parsed.meta?.postTokenBalances,
    CANARY_WALLET,
    fill.mint,
    fill.tokenDecimals,
  );
  const tokenDeltaBaseUnits = postTokens - preTokens;
  if (tokenDeltaBaseUnits.toString() !== fill.expectedTokenDeltaBaseUnits) {
    throw new Error("Canary wallet token delta does not match");
  }
  if (typeof parsed.meta?.fee !== "number" || parsed.meta.fee < 0) {
    throw new Error("Transaction fee evidence is unavailable");
  }

  const tokenScale = 10 ** fill.tokenDecimals;
  return {
    ...fill,
    wallet: CANARY_WALLET,
    slot: fill.expectedSlot,
    blockTime:
      typeof parsed.blockTime === "number" ? parsed.blockTime : null,
    solDelta: solDeltaLamports / 1_000_000_000,
    tokenDelta: Number(tokenDeltaBaseUnits) / tokenScale,
    feeSol: parsed.meta.fee / 1_000_000_000,
    confirmed: true,
    solscan: `https://solscan.io/tx/${fill.signature}`,
  };
}

import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  assertManualSellTransactionSafe,
  authorizeMainnetCanarySell,
  createReceipt,
} from "../packages/core/src/index";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TRADE_ENDPOINT = "https://pumpportal.fun/api/trade-local";
const PRIORITY_FEE_SOL = 0.001;
const SLIPPAGE_PCT = 5;
const MAX_TIP_LAMPORTS = 100_000;

type CliOptions = {
  mint: string;
  percent: number;
  minimumOutputLamports: string;
  confirmed: boolean;
  dryRun: boolean;
};

function parseOptions(argv: string[]): CliOptions {
  const valueAfter = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const mint = valueAfter("--mint") ?? "";
  const percent = Number(valueAfter("--percent") ?? "100");
  const minimumOutputLamports =
    valueAfter("--minimum-output-lamports") ?? "";
  if (!BASE58.test(mint)) {
    throw new Error("Pass a valid Solana mint with --mint");
  }
  if (!Number.isInteger(percent)) {
    throw new Error("Canary exit percent must be a whole number");
  }
  if (
    !/^\d+$/.test(minimumOutputLamports) ||
    BigInt(minimumOutputLamports) <= BigInt(0)
  ) {
    throw new Error(
      "Pass an independently calculated positive --minimum-output-lamports floor",
    );
  }
  return {
    mint,
    percent,
    minimumOutputLamports,
    confirmed: argv.includes("--confirm-mainnet"),
    dryRun: argv.includes("--dry-run"),
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function loadKeypair(encoded: string): Keypair {
  const values = Buffer.from(encoded, "base64");
  if (values.length !== 64) {
    throw new Error("Canary wallet secret must be a base64-encoded 64-byte key");
  }
  return Keypair.fromSecretKey(values);
}

async function tokenPosition(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
) {
  const accounts = await connection.getParsedTokenAccountsByOwner(
    owner,
    { mint },
    "confirmed",
  );
  let baseUnits = BigInt(0);
  let uiAmount = 0;
  let decimals: number | null = null;
  for (const account of accounts.value) {
    const parsed = account.account.data as {
      parsed?: {
        info?: {
          tokenAmount?: {
            amount?: string;
            uiAmountString?: string;
            decimals?: number;
          };
        };
      };
    };
    const amount = parsed.parsed?.info?.tokenAmount;
    baseUnits += BigInt(amount?.amount ?? "0");
    uiAmount += Number(amount?.uiAmountString ?? "0");
    if (typeof amount?.decimals === "number") decimals = amount.decimals;
  }
  return { baseUnits, uiAmount, decimals };
}

async function sendAndConfirm(
  connection: Connection,
  transaction: VersionedTransaction,
): Promise<string> {
  const rawTransaction = transaction.serialize();
  const send = () =>
    connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      maxRetries: 2,
    });
  const signature = await send();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    if (status.value?.err) {
      throw new Error(
        `Mainnet exit failed: ${JSON.stringify(status.value.err)}`,
      );
    }
    if (
      status.value?.confirmationStatus === "confirmed" ||
      status.value?.confirmationStatus === "finalized"
    ) {
      return signature;
    }
    const validity = await connection.isBlockhashValid(
      transaction.message.recentBlockhash,
      { commitment: "confirmed" },
    );
    if (!validity.value) {
      throw new Error(
        `Exit ${signature} expired without landing; balances are unchanged`,
      );
    }
    if (attempt > 0 && attempt % 2 === 0) await send();
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(
    `Exit ${signature} was not confirmed while its blockhash remained valid`,
  );
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (!options.dryRun && !options.confirmed) {
    throw new Error("Refusing mainnet exit without --confirm-mainnet");
  }
  if (options.dryRun && options.confirmed) {
    throw new Error("Choose either --dry-run or --confirm-mainnet");
  }

  const rpcUrl = requiredEnv("HELIUS_RPC_URL");
  const expectedWallet = requiredEnv("CANARY_EXPECTED_PUBKEY");
  const connection = new Connection(rpcUrl, "confirmed");
  const mint = new PublicKey(options.mint);
  const signer = options.dryRun
    ? null
    : loadKeypair(requiredEnv("CANARY_WALLET_SECRET_KEY_BASE64"));
  const signerAddress = signer?.publicKey.toBase58() ?? expectedWallet;
  if (signerAddress !== expectedWallet) {
    throw new Error("Loaded wallet does not match CANARY_EXPECTED_PUBKEY");
  }
  const owner = new PublicKey(signerAddress);
  const [balanceLamports, beforePosition] = await Promise.all([
    connection.getBalance(owner, "confirmed"),
    tokenPosition(connection, owner, mint),
  ]);
  const authorization = authorizeMainnetCanarySell({
    percent: options.percent,
    balanceSol: balanceLamports / 1_000_000_000,
    tokenBalance: beforePosition.uiAmount,
    mint: options.mint,
    expectedSigner: expectedWallet,
    actualSigner: signerAddress,
    now: Date.now(),
  });
  const maxSellTokenBaseUnits =
    (beforePosition.baseUnits * BigInt(options.percent)) / BigInt(100);

  const tradeResponse = await fetch(TRADE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      publicKey: signerAddress,
      action: "sell",
      mint: options.mint,
      amount: `${options.percent}%`,
      denominatedInSol: "false",
      slippage: SLIPPAGE_PCT,
      priorityFee: PRIORITY_FEE_SOL,
      pool: "auto",
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!tradeResponse.ok) {
    throw new Error(
      `Transaction builder returned ${tradeResponse.status}: ${await tradeResponse.text()}`,
    );
  }
  const transaction = VersionedTransaction.deserialize(
    new Uint8Array(await tradeResponse.arrayBuffer()),
  );
  const message = transaction.message;
  const accountKeys = message.getAccountKeys({
    addressLookupTableAccounts: [],
  });
  const decodedInstructions = message.compiledInstructions.map((instruction) => {
    const program = accountKeys.get(instruction.programIdIndex);
    if (!program) throw new Error("Exit contains an unresolved program");
    return {
      programId: program.toBase58(),
      accountKeys: Array.from(instruction.accountKeyIndexes).map((index) => {
        const key = accountKeys.get(index);
        if (!key) throw new Error("Exit contains an unresolved account");
        return key.toBase58();
      }),
      dataHex: Buffer.from(instruction.data).toString("hex"),
    };
  });
  const firewall = assertManualSellTransactionSafe({
    feePayer: message.staticAccountKeys[0]?.toBase58() ?? "",
    requiredSigners: message.staticAccountKeys
      .slice(0, message.header.numRequiredSignatures)
      .map((key) => key.toBase58()),
    addressLookupTableCount: message.addressTableLookups.length,
    expectedMint: options.mint,
    maxSellTokenBaseUnits: maxSellTokenBaseUnits.toString(),
    minimumOutputLamports: options.minimumOutputLamports,
    maxAccountFundingLamports: 0,
    maxPriorityFeeLamports: Math.ceil(
      PRIORITY_FEE_SOL * 1_000_000_000,
    ),
    maxTipLamports: MAX_TIP_LAMPORTS,
    instructions: decodedInstructions,
  });

  const simulation = await connection.simulateTransaction(transaction, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: "confirmed",
  });
  if (simulation.value.err) {
    throw new Error(
      `Exit simulation failed: ${JSON.stringify(simulation.value.err)}`,
    );
  }

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          status: "simulation-passed",
          sendEnabled: false,
          mint: options.mint,
          signer: signerAddress,
          percent: options.percent,
          tokenBalance: beforePosition.uiAmount,
          tokenDecimals: beforePosition.decimals,
          firewall: {
            decodedSwap: firewall.decodedSwap,
            soldTokenBaseUnits: firewall.soldTokenBaseUnits,
            minOutputLamports: firewall.minOutputLamports,
            tippedLamports: firewall.tippedLamports,
            priorityFeeLamports: firewall.priorityFeeLamports,
          },
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!signer) throw new Error("Canary signer was not loaded");
  transaction.sign([signer]);
  const signature = await sendAndConfirm(connection, transaction);
  const [newBalanceLamports, afterPosition, slot] = await Promise.all([
    connection.getBalance(signer.publicKey, "confirmed"),
    tokenPosition(connection, signer.publicKey, mint),
    connection.getSlot("confirmed"),
  ]);
  const receipt = await createReceipt({
    kind: "manual_fill",
    actor: "cornelius",
    subject: { mint: options.mint, wallet: signerAddress },
    at: { ts: Date.now(), slot },
    inputs: {
      rulesetVersion: "gate-1.2.0",
      params: {
        side: "SELL",
        percent: authorization.percent,
        approval: "mainnet-canary",
        priorityFeeSol: PRIORITY_FEE_SOL,
      },
    },
    outputs: {
      signature,
      side: "SELL",
      tokenDelta: afterPosition.uiAmount - beforePosition.uiAmount,
      solDelta:
        (newBalanceLamports - balanceLamports) / 1_000_000_000,
      balanceSol: newBalanceLamports / 1_000_000_000,
      remainingTokens: afterPosition.uiAmount,
      minOutputLamports: firewall.minOutputLamports,
    },
    evidence: [
      {
        kind: "tx",
        ref: signature,
        note: "Confirmed mainnet manual exit",
      },
      {
        kind: "url",
        ref: `https://solscan.io/tx/${signature}`,
        note: "Solscan transaction",
      },
    ],
    source: "live",
    prev: null,
  });

  console.log(
    JSON.stringify(
      {
        status: "confirmed",
        signature,
        mint: options.mint,
        side: "SELL",
        percent: options.percent,
        tokenDelta: afterPosition.uiAmount - beforePosition.uiAmount,
        solDelta:
          (newBalanceLamports - balanceLamports) / 1_000_000_000,
        remainingTokens: afterPosition.uiAmount,
        newBalanceSol: newBalanceLamports / 1_000_000_000,
        solscan: `https://solscan.io/tx/${signature}`,
        receiptHash: receipt.hash,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

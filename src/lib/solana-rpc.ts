import "server-only";

const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

type RpcEnvironment = Readonly<Record<string, string | undefined>>;

export function configuredSolanaRpc(
  env: RpcEnvironment = process.env,
): { endpoint: string; source: string } {
  if (env.SOLANA_RPC_URL?.trim()) {
    return {
      endpoint: env.SOLANA_RPC_URL.trim(),
      source: "private Solana RPC",
    };
  }
  if (env.HELIUS_RPC_URL?.trim()) {
    return {
      endpoint: env.HELIUS_RPC_URL.trim(),
      source: "Helius mainnet RPC",
    };
  }
  if (env.HELIUS_API_KEY?.trim()) {
    return {
      endpoint: `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(env.HELIUS_API_KEY.trim())}`,
      source: "Helius mainnet RPC",
    };
  }
  return { endpoint: PUBLIC_RPC, source: "public Solana RPC fallback" };
}

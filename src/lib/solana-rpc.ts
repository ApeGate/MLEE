import "server-only";

const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

type RpcEnvironment = Readonly<Record<string, string | undefined>>;

function sourceForEndpoint(endpoint: string): string {
  try {
    if (new URL(endpoint).hostname.endsWith("helius-rpc.com")) {
      return "Helius mainnet RPC";
    }
  } catch {
    // Fetch will reject malformed operator configuration without exposing it.
  }
  return "private Solana RPC";
}

export function configuredSolanaRpc(
  env: RpcEnvironment = process.env,
): { endpoint: string; source: string } {
  if (env.SOLANA_RPC_URL?.trim()) {
    const endpoint = env.SOLANA_RPC_URL.trim();
    return {
      endpoint,
      source: sourceForEndpoint(endpoint),
    };
  }
  if (env.HELIUS_RPC_URL?.trim()) {
    const endpoint = env.HELIUS_RPC_URL.trim();
    return {
      endpoint,
      source: sourceForEndpoint(endpoint),
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

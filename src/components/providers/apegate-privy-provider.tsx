"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { PRIVY_CLIENT_CONFIG } from "@/lib/privy/client-config";

// Privy App IDs are public identifiers. Keep the deployed ID as the local
// fallback so static builds still render inside the provider; secrets remain
// server-only and are never represented here.
const appId =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "cmv1sxfv2009t0gk1a6hwqhdb";
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
});

export function ApegatePrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        ...PRIVY_CLIENT_CONFIG,
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

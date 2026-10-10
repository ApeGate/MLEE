"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { PRIVY_CLIENT_CONFIG } from "@/lib/privy/client-config";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
});

export function ApegatePrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!appId) return children;

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

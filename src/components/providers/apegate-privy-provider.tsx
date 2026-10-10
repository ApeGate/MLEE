"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { PRIVY_CLIENT_CONFIG } from "@/lib/privy/client-config";

const appId =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID ??
  "cmv1sxfv2009t0gk1a6hwqhdb";

export function ApegatePrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={appId}
      config={PRIVY_CLIENT_CONFIG}
    >
      {children}
    </PrivyProvider>
  );
}

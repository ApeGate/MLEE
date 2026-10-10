import { NextResponse } from "next/server";
import { getPrivyClient, readPrivyVaultConfig } from "@/lib/privy/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = readPrivyVaultConfig();
  let clientInitialized = false;
  if (readiness.clientConfigured) {
    try {
      getPrivyClient();
      clientInitialized = true;
    } catch {
      clientInitialized = false;
    }
  }

  return NextResponse.json({ ...readiness, clientInitialized }, {
    headers: {
      "cache-control": "no-store",
    },
  });
}

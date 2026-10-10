import { NextResponse } from "next/server";
import { readPrivyVaultConfig } from "@/lib/privy/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(readPrivyVaultConfig(), {
    headers: {
      "cache-control": "no-store",
    },
  });
}

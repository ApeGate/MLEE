import { NextResponse } from "next/server";
import { resolveTokenMetadata } from "@/lib/token-metadata";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(
  request: Request,
  context: { params: Promise<{ mint: string }> },
) {
  const { mint } = await context.params;
  if (!BASE58.test(mint)) {
    return NextResponse.json({ error: "Invalid Solana mint" }, { status: 400 });
  }

  const uri = new URL(request.url).searchParams.get("uri");
  const metadata = await resolveTokenMetadata(mint, uri);
  return NextResponse.json(metadata, {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      "x-content-type-options": "nosniff",
    },
  });
}

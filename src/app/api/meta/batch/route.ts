import { NextResponse } from "next/server";
import { parseTokenLogoBatchRequest } from "@/lib/token-logo-batch";
import { resolveTokenMetadata } from "@/lib/token-metadata";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let items;
  try {
    items = parseTokenLogoBatchRequest(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid token logo batch",
      },
      { status: 400 },
    );
  }

  const metadata = await Promise.all(
    items.map(async (item) => {
      const resolved = await resolveTokenMetadata(item.mint, item.uri);
      return {
        ...item,
        image: resolved.image,
        name: resolved.name,
        symbol: resolved.symbol,
      };
    }),
  );

  return NextResponse.json(
    { items: metadata },
    {
      headers: {
        "cache-control": "public, max-age=300, stale-while-revalidate=900",
      },
    },
  );
}

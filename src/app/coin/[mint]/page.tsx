import type { Metadata } from "next";
import { CoinDossier } from "@/components/coin/coin-dossier";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mint: string }>;
}): Promise<Metadata> {
  const { mint } = await params;
  return {
    title: "Coin dossier",
    description:
      "Inspect a public Solana mint through Kong's evidence-linked Apegate dossier.",
    alternates: {
      canonical: `https://apegate.io/coin/${encodeURIComponent(mint)}`,
    },
  };
}

export default async function CoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ mint: string }>;
  searchParams: Promise<{ curve?: string }>;
}) {
  const { mint } = await params;
  const { curve } = await searchParams;
  return <CoinDossier mint={mint} bondingCurve={curve ?? null} />;
}

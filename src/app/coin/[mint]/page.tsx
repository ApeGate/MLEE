import type { Metadata } from "next";
import { CoinDossier } from "@/components/coin/coin-dossier";

export const metadata: Metadata = {
  title: "Coin dossier",
  description:
    "Inspect a public Solana mint through Kong's evidence-linked Apegate dossier.",
};

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

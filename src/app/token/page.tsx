import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CopyCheck,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  normalizeOfficialApegateMint,
  OFFICIAL_TOKEN_DESCRIPTION,
  OFFICIAL_TOKEN_NAME,
  OFFICIAL_TOKEN_SYMBOL,
  officialTokenManifestHash,
} from "../../../packages/core/src";

export const metadata: Metadata = {
  title: "Official token",
  description:
    "Verify Apegate's official token status and contract address on apegate.io before interacting.",
  alternates: {
    canonical: "https://apegate.io/token",
  },
};

export default async function TokenPage() {
  const officialMint = normalizeOfficialApegateMint(
    process.env.NEXT_PUBLIC_APEGATE_TOKEN_MINT,
  );
  const tokenLive =
    Boolean(officialMint) &&
    process.env.OFFICIAL_TOKEN_LAUNCH_ENABLED === "true";
  const manifestHash = await officialTokenManifestHash();

  return (
    <main className="min-h-[100svh] bg-[#080705] text-[#f4efe5]">
      <header className="border-b border-[#31291f] bg-[#080705]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/apegate-logo.jpg"
              alt=""
              width={38}
              height={38}
              priority
              className="size-9 rounded-xl border border-[#ff4f1f]/35 object-cover"
            />
            <span className="text-sm font-extrabold">APEGATE</span>
          </Link>
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#31291f] px-3 py-2 text-xs font-bold hover:border-[#ff7250]/50"
          >
            <ArrowLeft className="size-3" />
            Kong&apos;s Gate
          </Link>
        </div>
      </header>

      <section className="px-5 py-12 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div className="relative">
            <div className="absolute -inset-16 -z-0 bg-[radial-gradient(circle,rgb(255_79_31_/_16%),transparent_62%)]" />
            <Image
              src="/apegate-logo.jpg"
              alt="Official Apegate token mark"
              width={560}
              height={560}
              className="relative mx-auto w-full max-w-md rotate-[-2deg] rounded-[2.2rem] border border-[#ff7250]/30 object-cover shadow-[0_40px_110px_rgb(0_0_0_/_55%)]"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ff7250]/25 bg-[#ff4f1f]/7 px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#ff8a64]">
                <BadgeCheck className="size-3" />
                Official registry · apegate.io
              </span>
              <span
                className={`rounded-full border px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] ${
                  tokenLive
                    ? "border-pass/25 bg-pass/7 text-pass"
                    : "border-wait/25 bg-wait/7 text-wait"
                }`}
              >
                {tokenLive ? "Live" : "Pre-launch"}
              </span>
            </div>

            <p className="mt-7 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f685f]">
              {OFFICIAL_TOKEN_NAME} · ${OFFICIAL_TOKEN_SYMBOL}
            </p>
            <h1 className="mt-2 text-5xl font-extrabold leading-[0.92] tracking-[-0.065em] sm:text-7xl">
              Verify before
              <br />
              <span className="text-[#ff4f1f]">you ape.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[#91897e]">
              {OFFICIAL_TOKEN_DESCRIPTION} Kong treats every lookalike as an
              impersonator unless its mint exactly matches the address below.
            </p>

            <div
              className={`mt-7 rounded-2xl border p-5 ${
                officialMint
                  ? "border-pass/25 bg-pass/6"
                  : "border-[#ffb13c]/25 bg-[#ffb13c]/6"
              }`}
            >
              <div className="flex items-start gap-3">
                {officialMint ? (
                  <CopyCheck className="mt-0.5 size-5 shrink-0 text-pass" />
                ) : (
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-[#ffb13c]" />
                )}
                <div className="min-w-0">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#6f685f]">
                    Official contract address
                  </p>
                  <p className="mt-2 break-all font-mono text-sm font-bold sm:text-base">
                    {officialMint ?? "NOT PUBLISHED"}
                  </p>
                  <p className="mt-2 text-[10px] leading-relaxed text-[#91897e]">
                    {officialMint
                      ? tokenLive
                        ? "This is the only mint recognized as official by Kong."
                        : "The address is staged, but the official buy route is still locked."
                      : "Any Apegate-named coin visible elsewhere is not the official Apegate token."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {tokenLive && officialMint ? (
                <a
                  href={`https://pump.fun/coin/${officialMint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#ff4f1f] px-5 py-3.5 text-sm font-extrabold text-[#090806] transition-transform hover:-translate-y-0.5 hover:bg-[#ff6438]"
                >
                  Buy official $APEGATE
                  <ArrowUpRight className="size-4" />
                </a>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center rounded-full border border-[#31291f] bg-[#12100c] px-5 py-3.5 text-sm font-extrabold text-[#5f584f]">
                  Buy route locked · CA pending
                </span>
              )}
              <Link
                href="/status"
                className="inline-flex items-center gap-2 rounded-full border border-[#3a3328] px-5 py-3.5 text-sm font-bold text-[#b6aea1] hover:border-[#ff7250]/50"
              >
                Review launch status
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#302a20] bg-[#0d0b09] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          <RegistryCard
            icon={<ShieldCheck className="size-5" />}
            eyebrow="Kong"
            title="Exact-mint protection"
            body="Spacing, leetspeak, and close Apegate identity variants are hard-blocked unless the exact published CA matches."
          />
          <RegistryCard
            icon={<Fingerprint className="size-5" />}
            eyebrow="Launch manifest"
            title="Deterministic brief"
            body={`SHA-256 ${manifestHash.slice(0, 14)}…${manifestHash.slice(-8)}`}
            mono
          />
          <RegistryCard
            icon={<Check className="size-5" />}
            eyebrow="Clean launch"
            title="Single creator wallet"
            body="No bundled buys, volume bots, promotion services, or hidden multi-wallet launch path."
          />
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border border-[#302a20] bg-[#12100c] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold">Official-domain check</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#6f685f]">
              Apegate never DMs first, never asks for seed phrases, and only
              publishes the official CA at apegate.io/token.
            </p>
          </div>
          <Link
            href="/feed"
            className="shrink-0 text-xs font-bold text-[#ff8a64] hover:text-[#ffb09a]"
          >
            Run a coin through Kong →
          </Link>
        </div>
      </section>
    </main>
  );
}

function RegistryCard({
  icon,
  eyebrow,
  title,
  body,
  mono,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  mono?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#302a20] bg-[#090806] p-5">
      <span className="flex size-10 items-center justify-center rounded-xl border border-[#ff7250]/25 bg-[#ff4f1f]/8 text-[#ff7250]">
        {icon}
      </span>
      <p className="mt-5 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#6f685f]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-extrabold">{title}</h2>
      <p
        className={`mt-3 text-[10px] leading-relaxed text-[#91897e] ${
          mono ? "font-mono" : ""
        }`}
      >
        {body}
      </p>
    </article>
  );
}

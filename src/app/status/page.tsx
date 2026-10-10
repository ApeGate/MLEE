import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, CircleDot, ServerCog } from "lucide-react";

export const metadata: Metadata = {
  title: "System status",
  description:
    "Apegate live source and capability status. No made-up uptime claims.",
  alternates: {
    canonical: "https://apegate.io/status",
  },
};

const SERVICES = [
  {
    name: "Web application",
    state: "Operational",
    detail:
      "Homepage, live feed, token metadata images, public dossiers, crew roster, receipts, and wallet signing path",
  },
  {
    name: "Launch discovery",
    state: "Client checked",
    detail:
      "The feed opens the public launch stream in your browser and falls back to recorded tape",
  },
  {
    name: "Mint safety",
    state: "Live via Helius",
    detail:
      "Server-only Helius mainnet reads plus an independent risk report when you open a launch; the key never enters the browser",
  },
  {
    name: "Wallet authentication",
    state: "Operational",
    detail:
      "Privy authenticates external Solana wallets only; embedded and smart wallet creation remain off",
  },
  {
    name: "Launch Bay",
    state: "Parked",
    detail:
      "Removed from the v1 product surface while Gate intelligence, manual trading, and exit safety take priority",
  },
  {
    name: "Official $APEGATE registry",
    state: process.env.NEXT_PUBLIC_APEGATE_TOKEN_MINT
      ? "CA configured"
      : "Pre-launch",
    detail:
      "Official token page is ready; Kong hard-blocks protected identity variants unless the exact configured mint matches",
  },
  {
    name: "Paper trading",
    state: "Operational",
    detail:
      "Local 10 SOL practice portfolio, deterministic estimated quotes, itemized 0.5% fee, modeled exits, and hash-chained PAPER fill receipts",
  },
  {
    name: "Plans and Privy Vault",
    state: "Preview only",
    detail:
      "Immutable local plan rehearsal and hashed Vault policy previews are live; PlanRunner, signer creation, funding, and automation stay disabled",
  },
  {
    name: "Lab and Rafiki",
    state: "Limited",
    detail:
      "Deterministic fixture replay and hash-verified receipt explanations are live; accuracy metrics wait for outcome labels and AI falls back when Gateway credentials are absent",
  },
  {
    name: "Real trading and Vault",
    state: "Canary gated",
    detail:
      "PumpSwap buys decode actual bytes in the server and browser before a wallet prompt; bonding-curve sends and Vault automation stay locked until equivalent decoders pass canaries",
  },
] as const;

export default function StatusPage() {
  return (
    <main className="min-h-[100svh] px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/apegate-logo.jpg"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-xl border border-[#ff4f1f]/30 object-cover"
            />
            <span className="text-sm font-extrabold">APEGATE</span>
          </Link>
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-signal"
          >
            <ArrowLeft className="size-3" />
            Back to the Gate
          </Link>
        </div>

        <div className="mt-16">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-signal">
            Honest status
          </p>
          <h1 className="mt-3 text-5xl font-extrabold tracking-[-0.06em]">
            What&apos;s actually on.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#91897e]">
            Apegate does not publish synthetic uptime. This page describes the
            current release; the feed shows its own live connection state in
            real time.
          </p>
        </div>

        <section className="mt-10 overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
          <div className="flex items-center gap-3 border-b border-[#31291f] p-4">
            <ServerCog className="size-4 text-signal" />
            <h2 className="text-sm font-bold">Capability status</h2>
          </div>
          <div className="divide-y divide-[#272119]">
            {SERVICES.map((service) => (
              <article
                key={service.name}
                className="flex items-start justify-between gap-5 p-4"
              >
                <div>
                  <p className="text-xs font-bold">{service.name}</p>
                  <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-[#6f685f]">
                    {service.detail}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[7px] font-bold uppercase ${
                    service.state === "Pre-launch" ||
                          service.state === "Parked" ||
                          service.state === "Preview only" ||
                          service.state === "Limited" ||
                          service.state === "Canary gated"
                        ? "border-wait/25 bg-wait/6 text-wait"
                      : "border-pass/25 bg-pass/6 text-pass"
                  }`}
                >
                  {service.state === "Pre-launch" ||
                  service.state === "Parked" ||
                  service.state === "Preview only" ||
                  service.state === "Limited" ||
                  service.state === "Canary gated" ? (
                    <CircleDot className="size-2.5" />
                  ) : (
                    <CheckCircle2 className="size-2.5" />
                  )}
                  {service.state}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  ShieldAlert,
  WalletCards,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Safety and disclosures",
  description:
    "Apegate custody, execution, fee, privacy, and trading-risk disclosures.",
  alternates: {
    canonical: "https://apegate.io/trust",
  },
};

const DISCLOSURES = [
  {
    icon: WalletCards,
    title: "Your wallet signs",
    eyebrow: "Custody",
    body: "Apegate does not take custody of your external wallet. Privy handles wallet authentication, and your wallet must approve every live transaction. Never enter a seed phrase into Apegate.",
  },
  {
    icon: LockKeyhole,
    title: "Decoded routes only",
    eyebrow: "Execution",
    body: "The browser and server independently decode PumpSwap transaction bytes and enforce signer, mint, spend, fee, tip, and program caps. Bonding-curve sends and automated Vault execution remain disabled until equivalent decoders and external review pass.",
  },
  {
    icon: BadgeDollarSign,
    title: "0.5% Apegate fee",
    eyebrow: "Fees",
    body: "Quotes itemize Apegate’s 0.5% fee separately from protocol, priority, network, and slippage costs. The guarded browser beta currently waives the Apegate fee; receipts state whether it was charged.",
  },
  {
    icon: ShieldAlert,
    title: "You can lose everything",
    eyebrow: "Trading risk",
    body: "Pump.fun tokens are highly volatile, illiquid, and frequently manipulated or abandoned. A PASS is a ruleset result, not financial advice, a safety guarantee, or a prediction. Verify the mint and wallet prompt before signing.",
  },
  {
    icon: KeyRound,
    title: "Local-first records",
    eyebrow: "Privacy",
    body: "Decision receipts, outcome checkpoints, plans, and paper positions are stored in this browser today. Connected wallet addresses and signed transactions are public on Solana. RPC, metadata, risk, Privy, and market-data providers receive the minimum request data needed for their reads.",
  },
] as const;

export default function TrustPage() {
  return (
    <main className="min-h-[100svh] px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
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

        <section className="mt-16 grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-signal">
              Read before you sign
            </p>
            <h1 className="mt-3 text-5xl font-extrabold leading-[0.94] tracking-[-0.06em] sm:text-7xl">
              Clear limits.
              <br />
              <span className="text-stroke">No magic.</span>
            </h1>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-[#91897e]">
            Apegate is launch intelligence and user-approved execution software.
            Kong can reject obvious risk and the firewall can constrain a
            transaction, but neither can make a memecoin safe.
          </p>
        </section>

        <section className="mt-12 grid gap-3 md:grid-cols-2">
          {DISCLOSURES.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className={`rounded-2xl border border-[#31291f] bg-[#0d0b09] p-5 ${
                  index === DISCLOSURES.length - 1
                    ? "md:col-span-2"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-signal/25 bg-signal/8 text-signal">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="rounded border border-[#3a3328] px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.14em] text-[#766f65]">
                    {item.eyebrow}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-extrabold tracking-[-0.04em]">
                  {item.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#91897e]">
                  {item.body}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-4 flex flex-col gap-4 rounded-2xl border border-pass/20 bg-pass/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold">Verify the release, not the pitch.</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#7f8f68]">
              Capability status and confirmed mainnet canary fills are public.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/status"
              className="rounded-full border border-pass/25 px-3 py-2 text-[10px] font-bold text-pass hover:border-pass/55"
            >
              System status
            </Link>
            <Link
              href="/feed"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f4efe5] px-3 py-2 text-[10px] font-extrabold text-[#090806]"
            >
              Mainnet evidence <ExternalLink className="size-3" />
            </Link>
          </div>
        </section>

        <p className="mt-8 text-[9px] leading-relaxed text-[#554f47]">
          These product disclosures describe the current Apegate release and do
          not replace independent legal, tax, or financial advice.
        </p>
      </div>
    </main>
  );
}

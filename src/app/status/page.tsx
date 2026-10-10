import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, CircleDot, ServerCog } from "lucide-react";

export const metadata: Metadata = {
  title: "System status",
  description:
    "Apegate Phase 1 source and capability status. No made-up uptime claims.",
};

const SERVICES = [
  {
    name: "Web application",
    state: "Operational",
    detail:
      "Homepage, live feed, public coin dossiers, crew roster, local receipts, and wallet connect path",
  },
  {
    name: "Launch discovery",
    state: "Client checked",
    detail:
      "The feed opens the public launch stream in your browser and falls back to recorded tape",
  },
  {
    name: "Mint safety",
    state: "On demand",
    detail:
      "Solana RPC plus an optional independent risk report when you open a launch",
  },
  {
    name: "Launch Bay",
    state: "Prepare only",
    detail:
      "Local metadata and token draft, deterministic Kong preflight, and receipt preview; no upload, transaction build, or signature",
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
    name: "Trading and Vault",
    state: "Disabled",
    detail:
      "Phase 1 is read-only. Manual signing is the future default; Privy is scaffolded only",
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
            <h2 className="text-sm font-bold">Phase 1 capability status</h2>
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
                    service.state === "Disabled"
                      ? "border-[#6f685f]/25 text-[#6f685f]"
                      : service.state === "Pre-launch"
                        ? "border-wait/25 bg-wait/6 text-wait"
                      : "border-pass/25 bg-pass/6 text-pass"
                  }`}
                >
                  {service.state === "Disabled" ||
                  service.state === "Pre-launch" ? (
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

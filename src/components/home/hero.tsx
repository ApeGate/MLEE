import Link from "next/link";
import { SAMPLE_TAPE } from "@/lib/strategies";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden pt-20 sm:pt-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:pb-24">
        <div className="rise">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#243044] bg-[#121a2a]/80 px-3 py-1 font-mono text-[11px] text-[#8b9bb0]">
            <span className="size-1.5 rounded-full bg-[#3dd6c6]" />
            Simulated Pump.fun desk · no wallet
          </div>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-[#e8eef7] sm:text-5xl lg:text-6xl text-balance">
            <span className="text-[#3dd6c6]">Blotter</span> runs your Pump.fun
            rules and keeps the record.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#8b9bb0] sm:text-lg">
            For traders who already know what they want to buy. Blotter checks
            new coins, waits for your entry, then buys and exits inside your
            limits — with a decision log you can read later.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-[#e8eef7]">
            <li className="flex gap-2">
              <span className="text-[#3dd6c6]">→</span>
              Watches age, liquidity, and top-holder concentration
            </li>
            <li className="flex gap-2">
              <span className="text-[#3dd6c6]">→</span>
              Helps you decide: skip, watch, approve a buy, or exit
            </li>
            <li className="flex gap-2">
              <span className="text-[#3dd6c6]">→</span>
              After you open the desk: set a style → start → approve the first
              buy
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/desk"
              className="rounded-md bg-[#3dd6c6] px-5 py-3 text-sm font-semibold text-[#041016] hover:bg-[#5eead4]"
            >
              Try the simulated desk
            </Link>
            <Link
              href="/#how"
              className="rounded-md border border-[#243044] px-5 py-3 text-sm font-medium text-[#e8eef7] hover:border-[#3dd6c6] hover:text-[#3dd6c6]"
            >
              See the workflow
            </Link>
          </div>
        </div>

        <div className="rise-delay rounded-xl border border-[#243044] bg-[#121a2a]/90 p-4 shadow-[0_0_0_1px_rgb(36_48_68_/_40%)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#e8eef7]">
              Sample decision log
            </p>
            <span className="rounded-full bg-[#182235] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#f5a524]">
              Example · not live
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8b9bb0]">
            What Blotter writes when a Clips plan runs on Pump.fun-style coins.
          </p>
          <ul className="mt-4 space-y-0 divide-y divide-[#243044]">
            {SAMPLE_TAPE.map((row) => (
              <li key={`${row.coin}-${row.action}`} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-mono text-[11px] font-semibold text-[#3dd6c6]">
                    {row.who}
                  </span>
                  <span className="text-sm font-semibold text-[#e8eef7]">
                    {row.action}
                  </span>
                  <span className="font-mono text-sm text-[#e8eef7]">
                    {row.coin}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#8b9bb0]">
                  {row.why}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

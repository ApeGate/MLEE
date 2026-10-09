import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HandoffVisual } from "./handoff-visual";

export function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div className="atmosphere-grid pointer-events-none absolute inset-0" />
      <div className="noise-overlay pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col px-5 pb-10 pt-6 sm:px-8">
        <header className="animate-rise flex items-center justify-between">
          <div className="font-display text-xl font-bold tracking-tight text-signal sm:text-2xl">
            RELAY
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="#how"
              className="hidden text-sm text-mist transition-colors hover:text-foreground sm:inline"
            >
              How it works
            </Link>
            <Link
              href="/desk"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-signal/30 bg-transparent text-foreground hover:bg-signal/10 hover:text-signal",
              )}
            >
              Open desk
            </Link>
          </nav>
        </header>

        <div className="relative mt-10 flex flex-1 flex-col justify-center gap-10 lg:mt-0 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8">
          <div className="relative z-10 max-w-xl">
            <p className="animate-rise font-display text-5xl font-extrabold leading-[0.92] tracking-tight text-signal sm:text-7xl md:text-8xl">
              RELAY
            </p>
            <h1 className="animate-rise-delay mt-5 font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl text-balance">
              Your strategy desk for Solana trenches.
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-md text-base leading-relaxed text-mist sm:text-lg">
              Set the plan once. Scout filters, Watch waits for the entry, Desk
              trades inside your rules — Relay keeps the handoffs moving.
            </p>
            <div className="animate-rise-delay-2 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/desk"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-signal px-5 text-signal-foreground hover:bg-signal/90",
                )}
              >
                Run a live desk
              </Link>
              <Link
                href="#how"
                className={cn(
                  buttonVariants({ size: "lg", variant: "ghost" }),
                  "text-mist hover:bg-white/5 hover:text-foreground",
                )}
              >
                See the handoff
              </Link>
            </div>
          </div>

          <div className="animate-rise-delay relative min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]">
            <HandoffVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

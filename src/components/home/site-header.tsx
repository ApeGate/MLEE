import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="Apegate home"
        >
          <Image
            src="/apegate-logo.jpg"
            alt=""
            width={38}
            height={38}
            priority
            className="size-9 rounded-lg border border-[#ff4f1f]/40 object-cover transition-transform group-hover:-rotate-3"
          />
          <span className="text-lg font-extrabold tracking-[-0.04em] text-[#f4efe5]">
            APEGATE
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/feed"
            className="hidden text-[#a79f92] transition-colors hover:text-[#f4efe5] md:inline"
          >
            Live gate
          </Link>
          <Link
            href="/#crew"
            className="hidden text-[#a79f92] transition-colors hover:text-[#f4efe5] sm:inline"
          >
            Crew
          </Link>
          <Link
            href="/#receipts"
            className="hidden text-[#a79f92] transition-colors hover:text-[#f4efe5] lg:inline"
          >
            Receipts
          </Link>
          <Link
            href="/feed"
            className="rounded-full bg-[#ff4f1f] px-4 py-2.5 font-bold text-[#0b0906] transition-transform hover:-translate-y-0.5 hover:bg-[#ff6438]"
          >
            Open Apegate
          </Link>
        </nav>
      </div>
    </header>
  );
}

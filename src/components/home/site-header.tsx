import Link from "next/link";

export function SiteHeader({ solid }: { solid?: boolean }) {
  return (
    <header
      className={
        solid
          ? "border-b border-[#242824] bg-[#070807]/90 backdrop-blur-sm"
          : "absolute inset-x-0 top-0 z-20"
      }
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight text-[#ff5c2e]"
        >
          RIVET
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/#how"
            className="hidden text-[#8d9488] transition-colors hover:text-[#e9ece6] sm:inline"
          >
            How it works
          </Link>
          <Link
            href="/desk"
            className="border border-[#ff5c2e] bg-[#ff5c2e] px-3 py-1.5 font-medium text-[#070807] transition-colors hover:bg-transparent hover:text-[#ff5c2e]"
          >
            Open desk
          </Link>
        </nav>
      </div>
    </header>
  );
}

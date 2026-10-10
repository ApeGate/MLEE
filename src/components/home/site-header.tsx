import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-[#3dd6c6]">
          Blotter
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/#how"
            className="hidden text-[#8b9bb0] transition-colors hover:text-[#e8eef7] sm:inline"
          >
            How it works
          </Link>
          <Link
            href="/desk"
            className="rounded-md bg-[#3dd6c6] px-3.5 py-2 font-semibold text-[#041016] transition-colors hover:bg-[#5eead4]"
          >
            Open desk
          </Link>
        </nav>
      </div>
    </header>
  );
}

const NODES = [
  { id: "scout", label: "Scout", x: 18, y: 28, blurb: "Filters" },
  { id: "watch", label: "Watch", x: 72, y: 22, blurb: "Entries" },
  { id: "desk", label: "Desk", x: 55, y: 72, blurb: "Exits" },
] as const;

export function HandoffVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(200_245_66/0.12),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/80 to-transparent" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c8f542" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#c8f542" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffb45a" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d="M22 32 C 40 18, 55 18, 70 26"
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="0.6"
          strokeDasharray="4 3"
          className="animate-handoff"
        />
        <path
          d="M70 30 C 68 48, 62 58, 56 68"
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="0.6"
          strokeDasharray="4 3"
          className="animate-handoff"
          style={{ animationDelay: "0.4s" }}
        />
        <path
          d="M52 72 C 30 68, 22 52, 20 36"
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="0.45"
          strokeDasharray="3 4"
          opacity="0.5"
          className="animate-handoff"
          style={{ animationDelay: "0.8s" }}
        />
      </svg>

      {NODES.map((node, i) => (
        <div
          key={node.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <div
            className="animate-pulse-soft rounded-full border border-signal/40 bg-ink/70 px-4 py-3 backdrop-blur-sm"
            style={{ animationDelay: `${i * 0.35}s` }}
          >
            <div className="font-display text-sm font-semibold tracking-wide text-signal">
              {node.label}
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-mist">
              {node.blurb}
            </div>
          </div>
        </div>
      ))}

      <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mist">
          Live handoff · simulated market
        </p>
        <p className="mt-1 max-w-sm font-display text-lg font-semibold text-foreground sm:text-xl">
          Work moves between specialists. You stay in the loop.
        </p>
      </div>
    </div>
  );
}

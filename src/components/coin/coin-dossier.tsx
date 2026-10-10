"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleDot,
  Copy,
  ExternalLink,
  Fingerprint,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserRoundSearch,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  isOfficialApegateMint,
  resemblesApegateIdentity,
} from "../../../packages/core/src";

type RiskPayload = {
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  devPct: number | null;
  top10Pct: number | null;
  rugScore: number | null;
  rugged: boolean | null;
  creator: string | null;
  metadata: {
    name: string | null;
    symbol: string | null;
    uri: string | null;
    mutable: boolean | null;
    updateAuthority: string | null;
    description: string | null;
    image: string | null;
  } | null;
  totalHolders: number | null;
  graphInsidersDetected: number | null;
  detectedAt: string | null;
  topHolders: Array<{
    owner: string;
    pct: number;
    insider: boolean;
    label: string | null;
    type: string | null;
  }>;
  creatorHistory: Array<{
    mint: string;
    marketCap: number | null;
    createdAt: string | null;
  }>;
  rugRisks: Array<{
    name: string;
    value?: string;
    description: string;
    level: "warn" | "danger";
  }>;
  sources: {
    mintSafety: string | null;
    concentration: string | null;
  };
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: RiskPayload }
  | { kind: "error"; message: string };

function isRiskPayload(value: unknown): value is RiskPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      "sources" in value &&
      "topHolders" in value &&
      "creatorHistory" in value,
  );
}

const OFFICIAL_APEGATE_MINT =
  process.env.NEXT_PUBLIC_APEGATE_TOKEN_MINT ?? null;

export function CoinDossier({
  mint,
  bondingCurve,
}: {
  mint: string;
  bondingCurve: string | null;
}) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [reload, setReload] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState({ kind: "loading" });
      try {
        const curve = bondingCurve
          ? `?curve=${encodeURIComponent(bondingCurve)}`
          : "";
        const response = await fetch(`/api/risk/${encodeURIComponent(mint)}${curve}`, {
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok || !isRiskPayload(payload)) {
          const errorPayload = payload as { error?: unknown };
          throw new Error(
            typeof errorPayload.error === "string"
              ? errorPayload.error
              : "Live dossier sources are unavailable",
          );
        }
        setState({ kind: "ready", data: payload });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Live dossier sources are unavailable",
        });
      }
    }
    void load();
    return () => controller.abort();
  }, [bondingCurve, mint, reload]);

  const data = state.kind === "ready" ? state.data : null;
  const name = data?.metadata?.name ?? "Unresolved token";
  const symbol = data?.metadata?.symbol ?? "—";
  const protectedIdentity = useMemo(
    () =>
      resemblesApegateIdentity(name) ||
      (symbol !== "—" && resemblesApegateIdentity(symbol)),
    [name, symbol],
  );
  const official = isOfficialApegateMint(mint, OFFICIAL_APEGATE_MINT);

  async function copyMint() {
    await navigator.clipboard.writeText(mint);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="min-h-[100svh] bg-[#080705] text-[#f4efe5]">
      <header className="sticky top-0 z-40 border-b border-[#31291f] bg-[#080705]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <Image
                src="/apegate-logo.jpg"
                alt=""
                width={38}
                height={38}
                priority
                className="size-9 rounded-xl border border-[#ff4f1f]/35 object-cover"
              />
              <span className="hidden text-sm font-extrabold sm:block">
                APEGATE
              </span>
            </Link>
            <span className="h-5 w-px bg-[#31291f]" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">Public coin dossier</p>
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#6f685f]">
                Kong · on-demand facts
              </p>
            </div>
          </div>
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#31291f] px-3 py-2 text-xs font-bold hover:border-[#ff7250]/50"
          >
            <ArrowLeft className="size-3" />
            Live Gate
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-10">
        <section className="overflow-hidden rounded-[1.6rem] border border-[#3a3328] bg-[#0d0b09]">
          <div className="grid lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <TokenMark symbol={symbol} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-extrabold tracking-[-0.05em]">
                      {symbol === "—" ? "Coin dossier" : `$${symbol}`}
                    </h1>
                    <SourceBadge source={state.kind === "ready" ? "LIVE" : "CHECKING"} />
                    {official ? (
                      <span className="rounded border border-pass/25 bg-pass/8 px-2 py-1 font-mono text-[7px] font-bold uppercase text-pass">
                        OFFICIAL $APEGATE
                      </span>
                    ) : protectedIdentity ? (
                      <span className="rounded border border-block/25 bg-block/8 px-2 py-1 font-mono text-[7px] font-bold uppercase text-block">
                        IMPERSONATION BLOCK
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[#91897e]">{name}</p>
                  <div className="mt-4 flex max-w-3xl items-center gap-2">
                    <code className="min-w-0 truncate font-mono text-[10px] text-[#766f65]">
                      {mint}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyMint()}
                      className="shrink-0 text-[#766f65] hover:text-[#f4efe5]"
                      aria-label="Copy mint"
                    >
                      {copied ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                    <a
                      href={`https://solscan.io/token/${mint}`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-[#766f65] hover:text-[#f4efe5]"
                      aria-label="Open mint on Solscan"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#31291f] p-5 lg:w-[360px] lg:border-l lg:border-t-0">
              <IdentityStatus
                official={official}
                protectedIdentity={protectedIdentity}
                resolved={Boolean(data?.metadata)}
              />
            </div>
          </div>
        </section>

        {state.kind === "loading" ? (
          <LoadingDossier />
        ) : state.kind === "error" ? (
          <ErrorDossier
            message={state.message}
            onRetry={() => setReload((value) => value + 1)}
          />
        ) : (
          <Dossier data={state.data} mint={mint} />
        )}
      </main>
    </div>
  );
}

function Dossier({ data, mint }: { data: RiskPayload; mint: string }) {
  const hardBlock =
    Boolean(data.mintAuthority) ||
    Boolean(data.freezeAuthority) ||
    data.devPct !== null && data.devPct >= 20 ||
    data.top10Pct !== null && data.top10Pct >= 50;

  return (
    <>
      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Creator holding"
          value={formatPct(data.devPct)}
          source={data.sources.concentration ? "LIVE" : "UNAVAILABLE"}
          tone={
            data.devPct === null
              ? "unknown"
              : data.devPct >= 20
                ? "fail"
                : data.devPct >= 5
                  ? "warn"
                  : "pass"
          }
        />
        <Metric
          label="Top 10 users"
          value={formatPct(data.top10Pct)}
          source={data.sources.concentration ? "LIVE" : "UNAVAILABLE"}
          tone={
            data.top10Pct === null
              ? "unknown"
              : data.top10Pct >= 50
                ? "fail"
                : data.top10Pct >= 30
                  ? "warn"
                  : "pass"
          }
        />
        <Metric
          label="Known holders"
          value={data.totalHolders === null ? "Collecting" : String(data.totalHolders)}
          source={data.sources.concentration ? "LIVE" : "UNAVAILABLE"}
          tone="neutral"
        />
        <Metric
          label="Independent risk"
          value={data.rugScore === null ? "Unavailable" : `${data.rugScore}/100`}
          source={data.rugScore === null ? "UNAVAILABLE" : "LIVE"}
          tone={
            data.rugScore === null
              ? "unknown"
              : data.rugScore >= 50
                ? "warn"
                : "neutral"
          }
        />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
        <section className="overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
          <div className="flex items-start justify-between gap-4 border-b border-[#31291f] p-4 sm:p-5">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#ff7250]">
                Kong · Dossier checks
              </p>
              <h2 className="mt-1 text-xl font-extrabold">Facts before verdict.</h2>
              <p className="mt-1 text-[10px] text-[#6f685f]">
                On-demand reads · not a cached Gate receipt
              </p>
            </div>
            <span
              className={`rounded-md border-2 px-2.5 py-1 font-mono text-[8px] font-black ${
                hardBlock
                  ? "border-block text-block"
                  : "border-wait text-wait"
              }`}
            >
              {hardBlock ? "HARD RISK" : "DOSSIER"}
            </span>
          </div>

          <div className="space-y-2 p-4 sm:p-5">
            <FactCheck
              label="Mint authority"
              value={authorityValue(data.mintAuthority)}
              detail={
                data.mintAuthority === undefined
                  ? "Solana mint read unavailable"
                  : data.mintAuthority === null
                    ? "Authority is revoked"
                    : "Authority remains active"
              }
              outcome={
                data.mintAuthority === undefined
                  ? "unknown"
                  : data.mintAuthority === null
                    ? "pass"
                    : "fail"
              }
              evidence={`https://solscan.io/token/${mint}`}
            />
            <FactCheck
              label="Freeze authority"
              value={authorityValue(data.freezeAuthority)}
              detail={
                data.freezeAuthority === undefined
                  ? "Solana mint read unavailable"
                  : data.freezeAuthority === null
                    ? "Authority is revoked"
                    : "Authority remains active"
              }
              outcome={
                data.freezeAuthority === undefined
                  ? "unknown"
                  : data.freezeAuthority === null
                    ? "pass"
                    : "fail"
              }
              evidence={`https://solscan.io/token/${mint}`}
            />
            <FactCheck
              label="Metadata mutability"
              value={
                data.metadata?.mutable === null
                  ? "Unknown"
                  : data.metadata?.mutable
                    ? "Mutable"
                    : "Immutable"
              }
              detail={
                data.metadata?.mutable
                  ? "Metadata can still be changed by its update authority"
                  : "Metadata source reports no mutable update path"
              }
              outcome={
                data.metadata?.mutable === null
                  ? "unknown"
                  : data.metadata?.mutable
                    ? "warn"
                    : "pass"
              }
              evidence={data.metadata?.uri ?? `https://solscan.io/token/${mint}`}
            />
            <FactCheck
              label="Insider graph"
              value={
                data.graphInsidersDetected === null
                  ? "Unavailable"
                  : `${data.graphInsidersDetected} detected`
              }
              detail="Independent graph result; informational, never a silent pass"
              outcome={
                data.graphInsidersDetected === null
                  ? "unknown"
                  : data.graphInsidersDetected > 0
                    ? "warn"
                    : "pass"
              }
              evidence={`https://api.rugcheck.xyz/v1/tokens/${mint}/report`}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
          <div className="border-b border-[#31291f] p-4 sm:p-5">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#ffb13c]">
              Holder map · best effort
            </p>
            <h2 className="mt-1 text-xl font-extrabold">Largest observed accounts.</h2>
          </div>
          {data.topHolders.length ? (
            <div className="divide-y divide-[#272119]">
              {data.topHolders.slice(0, 8).map((holder, index) => (
                <a
                  key={`${holder.owner}-${index}`}
                  href={`https://solscan.io/account/${holder.owner}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-[#15120e] sm:px-5"
                >
                  <span className="font-mono text-[8px] text-[#4f4941]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[9px] text-[#b6aea1]">
                      {holder.owner}
                    </p>
                    <p className="mt-0.5 text-[8px] text-[#5f584f]">
                      {holder.label ?? "Unlabeled"}
                      {holder.type ? ` · ${holder.type}` : ""}
                      {holder.insider ? " · insider flag" : ""}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] font-bold">
                    {holder.pct.toFixed(2)}%
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <EmptyLine copy="Holder data is unavailable from the live source." />
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#31291f] bg-[#0d0b09] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <UserRoundSearch className="size-4 text-[#c7ff45]" />
            <div>
              <p className="text-sm font-bold">Creator context</p>
              <p className="text-[9px] text-[#6f685f]">
                External snapshot · not Apegate outcome labels
              </p>
            </div>
          </div>
          {data.creator ? (
            <a
              href={`https://solscan.io/account/${data.creator}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#272119] bg-[#090806] p-3"
            >
              <code className="min-w-0 truncate font-mono text-[9px] text-[#91897e]">
                {data.creator}
              </code>
              <ExternalLink className="size-3 shrink-0 text-[#6f685f]" />
            </a>
          ) : (
            <EmptyLine copy="Creator wallet was not resolved." compact />
          )}
          <div className="mt-3 flex items-baseline justify-between rounded-xl border border-[#272119] bg-[#090806] p-3">
            <span className="text-[10px] text-[#6f685f]">Prior tokens surfaced</span>
            <span className="font-mono text-lg font-extrabold">
              {data.creatorHistory.length}
            </span>
          </div>
          <p className="mt-3 text-[9px] leading-relaxed text-[#5f584f]">
            This does not classify prior outcomes. Apegate&apos;s own indexed
            creator history needs production tape storage and remains unavailable.
          </p>
        </section>

        <section className="rounded-2xl border border-[#31291f] bg-[#0d0b09] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <ShieldAlert className="size-4 text-[#ffb13c]" />
            <div>
              <p className="text-sm font-bold">Independent risk flags</p>
              <p className="text-[9px] text-[#6f685f]">
                Second opinion · cannot create a PASS
              </p>
            </div>
          </div>
          {data.rugRisks.length ? (
            <div className="mt-4 space-y-2">
              {data.rugRisks.map((risk, index) => (
                <div
                  key={`${risk.name}-${index}`}
                  className="rounded-xl border border-[#ffb13c]/18 bg-[#ffb13c]/5 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[10px] font-bold text-[#d8b77c]">
                      {risk.name}
                    </p>
                    <span className="font-mono text-[7px] font-bold uppercase text-[#ffb13c]">
                      {risk.level}
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] leading-relaxed text-[#8e7652]">
                    {risk.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine
              copy={
                data.rugScore === null
                  ? "Independent risk source is unavailable."
                  : "No high-level flags returned in this snapshot."
              }
              compact
            />
          )}
        </section>
      </div>
    </>
  );
}

function IdentityStatus({
  official,
  protectedIdentity,
  resolved,
}: {
  official: boolean;
  protectedIdentity: boolean;
  resolved: boolean;
}) {
  const config = official
    ? {
        icon: <ShieldCheck className="size-4 text-pass" />,
        title: "Official CA match",
        body: "This mint exactly matches the address published by apegate.io.",
        className: "border-pass/25 bg-pass/6",
      }
    : protectedIdentity
      ? {
          icon: <ShieldAlert className="size-4 text-block" />,
          title: "Kong blocks this identity",
          body: "The name or ticker resembles Apegate, but the mint is not the official published CA.",
          className: "border-block/25 bg-block/6",
        }
      : {
          icon: <Fingerprint className="size-4 text-[#ff7250]" />,
          title: resolved ? "No protected identity match" : "Resolving identity",
          body: resolved
            ? "Kong found no Apegate name or ticker resemblance in current metadata."
            : "Live metadata must resolve before the identity check can finish.",
          className: "border-[#ff7250]/20 bg-[#ff4f1f]/6",
        };
  return (
    <div className={`rounded-xl border p-4 ${config.className}`}>
      <div className="flex items-center gap-2">
        {config.icon}
        <p className="text-xs font-extrabold">{config.title}</p>
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-[#91897e]">
        {config.body}
      </p>
    </div>
  );
}

function FactCheck({
  label,
  value,
  detail,
  outcome,
  evidence,
}: {
  label: string;
  value: string;
  detail: string;
  outcome: "pass" | "warn" | "fail" | "unknown";
  evidence: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border border-[#272119] bg-[#090806]/60 p-3">
      <OutcomeIcon outcome={outcome} />
      <div>
        <p className="text-[10px] font-bold">{label}</p>
        <p className="mt-1 text-[9px] leading-relaxed text-[#6f685f]">{detail}</p>
        <a
          href={evidence}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 font-mono text-[7px] font-bold uppercase text-[#ff8a64]"
        >
          Evidence <ExternalLink className="size-2.5" />
        </a>
      </div>
      <span className="font-mono text-[9px] font-bold text-[#b6aea1]">
        {value}
      </span>
    </div>
  );
}

function OutcomeIcon({ outcome }: { outcome: "pass" | "warn" | "fail" | "unknown" }) {
  if (outcome === "pass") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-pass/10 text-pass">
        <Check className="size-3" />
      </span>
    );
  }
  if (outcome === "fail") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-block/10 text-block">
        <X className="size-3" />
      </span>
    );
  }
  if (outcome === "warn") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-warn/10 text-warn">
        <AlertTriangle className="size-3" />
      </span>
    );
  }
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-wait/10 text-wait">
      <CircleDot className="size-3" />
    </span>
  );
}

function Metric({
  label,
  value,
  source,
  tone,
}: {
  label: string;
  value: string;
  source: string;
  tone: "pass" | "warn" | "fail" | "unknown" | "neutral";
}) {
  const colors = {
    pass: "text-pass",
    warn: "text-warn",
    fail: "text-block",
    unknown: "text-wait",
    neutral: "text-[#f4efe5]",
  };
  return (
    <article className="rounded-2xl border border-[#31291f] bg-[#0d0b09] p-4">
      <div className="flex items-start justify-between gap-3">
        <Users className="size-4 text-[#ff7250]" />
        <SourceBadge source={source} compact />
      </div>
      <p className={`mt-4 text-2xl font-extrabold ${colors[tone]}`}>{value}</p>
      <p className="mt-1 text-[9px] text-[#6f685f]">{label}</p>
    </article>
  );
}

function LoadingDossier() {
  return (
    <section className="mt-4 flex min-h-80 items-center justify-center rounded-2xl border border-[#31291f] bg-[#0d0b09] p-8 text-center">
      <div>
        <RefreshCw className="mx-auto size-6 animate-spin text-[#ff7250]" />
        <p className="mt-4 text-sm font-bold">Kong is resolving the dossier.</p>
        <p className="mt-1 text-[10px] text-[#6f685f]">
          Solana mint safety and independent holder context are checked live.
        </p>
      </div>
    </section>
  );
}

function ErrorDossier({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="mt-4 flex min-h-80 items-center justify-center rounded-2xl border border-warn/25 bg-warn/5 p-8 text-center">
      <div className="max-w-md">
        <AlertTriangle className="mx-auto size-6 text-warn" />
        <p className="mt-4 text-sm font-bold">Live dossier unavailable.</p>
        <p className="mt-2 text-[10px] leading-relaxed text-[#9f8b63]">
          {message}. Apegate will not turn missing reads into a PASS.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-warn/30 px-4 py-2 text-xs font-bold text-warn"
        >
          <RefreshCw className="size-3" />
          Retry live reads
        </button>
      </div>
    </section>
  );
}

function EmptyLine({ copy, compact }: { copy: string; compact?: boolean }) {
  return (
    <div className={compact ? "mt-4" : "p-5"}>
      <p className="rounded-xl border border-[#272119] bg-[#090806] p-3 text-[9px] leading-relaxed text-[#6f685f]">
        {copy}
      </p>
    </div>
  );
}

function TokenMark({ symbol }: { symbol: string }) {
  return (
    <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#ff7250]/25 bg-[#ff4f1f]/8 font-mono text-sm font-black text-[#ff7250]">
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255_/_16%),transparent_45%)]" />
      <span className="relative">{symbol === "—" ? "?" : symbol.slice(0, 2)}</span>
    </div>
  );
}

function SourceBadge({
  source,
  compact,
}: {
  source: string;
  compact?: boolean;
}) {
  const live = source === "LIVE";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border font-mono font-bold uppercase tracking-[0.1em] ${
        live
          ? "border-pass/25 bg-pass/8 text-pass"
          : "border-[#ff7250]/20 bg-[#ff4f1f]/7 text-[#ff8a64]"
      } ${compact ? "px-1.5 py-0.5 text-[7px]" : "px-2 py-1 text-[8px]"}`}
    >
      {source}
    </span>
  );
}

function authorityValue(value: string | null | undefined) {
  return value === undefined ? "Unknown" : value === null ? "Revoked" : "Active";
}

function formatPct(value: number | null) {
  return value === null ? "Collecting" : `${value.toFixed(1)}%`;
}

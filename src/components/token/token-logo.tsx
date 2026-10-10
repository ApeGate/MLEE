"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  tokenLogoBatchKey,
  type TokenLogoBatchItem,
} from "@/lib/token-logo-batch";

type MetadataResponse = {
  image: string | null;
  name?: string | null;
  symbol?: string | null;
};

type ResolvedMetadata = {
  image: string | null;
  name: string | null;
  symbol: string | null;
};

const resolvedMetadata = new Map<
  string,
  { metadata: ResolvedMetadata; expiresAt: number }
>();
const pendingMetadata = new Map<string, Promise<ResolvedMetadata>>();
const queuedMetadata = new Map<
  string,
  TokenLogoBatchItem & {
    resolve: (metadata: ResolvedMetadata) => void;
  }
>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function allowedImage(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizedMetadata(payload: MetadataResponse): ResolvedMetadata {
  return {
    image: allowedImage(payload.image),
    name:
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name.trim()
        : null,
    symbol:
      typeof payload.symbol === "string" && payload.symbol.trim()
        ? payload.symbol.trim()
        : null,
  };
}

function requestMetadataIndividually(mint: string, uri?: string | null) {
  const query = new URLSearchParams({ logo: "1" });
  if (uri) query.set("uri", uri);
  return fetch(
    `/api/meta/${encodeURIComponent(mint)}?${query.toString()}`,
  )
    .then(async (response) => {
      if (!response.ok) {
        return { image: null, name: null, symbol: null };
      }
      return normalizedMetadata(
        (await response.json()) as MetadataResponse,
      );
    })
    .catch(
      (): ResolvedMetadata => ({
        image: null,
        name: null,
        symbol: null,
      }),
    );
}

async function flushMetadataQueue() {
  flushTimer = null;
  const batch = [...queuedMetadata.entries()];
  queuedMetadata.clear();
  if (!batch.length) return;

  try {
    const response = await fetch("/api/meta/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: batch.map(([, item]) => ({
          mint: item.mint,
          uri: item.uri,
        })),
      }),
    });
    if (!response.ok) throw new Error("Token logo batch failed");
    const payload = (await response.json()) as {
      items?: Array<TokenLogoBatchItem & MetadataResponse>;
    };
    const byKey = new Map(
      (payload.items ?? []).map((item) => [
        tokenLogoBatchKey(item),
        normalizedMetadata(item),
      ]),
    );
    await Promise.all(
      batch.map(async ([key, item]) => {
        item.resolve(
          byKey.get(key) ??
            (await requestMetadataIndividually(item.mint, item.uri)),
        );
      }),
    );
  } catch {
    await Promise.all(
      batch.map(async ([, item]) => {
        item.resolve(
          await requestMetadataIndividually(item.mint, item.uri),
        );
      }),
    );
  }
}

function requestMetadata(mint: string, uri?: string | null) {
  const item = { mint, uri: uri ?? null };
  const key = tokenLogoBatchKey(item);
  const cached = resolvedMetadata.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.metadata);
  }
  resolvedMetadata.delete(key);
  const existing = pendingMetadata.get(key);
  if (existing) return existing;

  const request = new Promise<ResolvedMetadata>((resolve) => {
    queuedMetadata.set(key, { ...item, resolve });
    if (flushTimer === null) {
      flushTimer = setTimeout(() => void flushMetadataQueue(), 12);
    }
  }).then((metadata) => {
    resolvedMetadata.set(key, {
      metadata,
      expiresAt:
        Date.now() + (metadata.image ? 5 * 60_000 : 10_000),
    });
    pendingMetadata.delete(key);
    return metadata;
  });
  pendingMetadata.set(key, request);
  return request;
}

export function TokenLogo({
  mint,
  symbol,
  uri,
  imageUrl,
  size = "md",
  className,
  eager = false,
  onMetadata,
}: {
  mint: string;
  symbol: string;
  uri?: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  eager?: boolean;
  onMetadata?: (metadata: ResolvedMetadata) => void;
}) {
  const directImage = useMemo(() => allowedImage(imageUrl), [imageUrl]);
  const onMetadataRef = useRef(onMetadata);
  useEffect(() => {
    onMetadataRef.current = onMetadata;
  }, [onMetadata]);
  const requestKey = tokenLogoBatchKey({ mint, uri: uri ?? null });
  const [loaded, setLoaded] = useState<{
    key: string;
    metadata: ResolvedMetadata;
  } | null>(null);
  const [retry, setRetry] = useState({ key: requestKey, count: 0 });
  const retryAttempt = retry.key === requestKey ? retry.count : 0;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const resolved =
    directImage ??
    (loaded?.key === requestKey ? loaded.metadata.image : null);
  const failed = Boolean(resolved && failedSource === resolved);

  useEffect(() => {
    if (directImage && !onMetadataRef.current) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    void requestMetadata(mint, uri).then((metadata) => {
      if (cancelled) return;
      setLoaded({ key: requestKey, metadata });
      onMetadataRef.current?.(metadata);
      if (!metadata.image && retryAttempt < 2) {
        retryTimer = setTimeout(() => {
          resolvedMetadata.delete(requestKey);
          setRetry({ key: requestKey, count: retryAttempt + 1 });
        }, (retryAttempt + 1) * 10_000);
      }
    });
    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [directImage, mint, requestKey, retryAttempt, uri]);

  const dimensions = {
    sm: "size-8 rounded-lg text-[9px]",
    md: "size-10 rounded-xl text-[10px]",
    lg: "size-12 rounded-xl text-xs",
    xl: "size-14 rounded-2xl text-sm",
  };
  const initials =
    symbol && symbol !== "—" ? symbol.slice(0, 2).toUpperCase() : "?";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-[#493a2d] bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255_/_14%),transparent_45%),#17130e] font-mono font-black text-[#ff8a64] shadow-[inset_0_1px_0_rgb(255_255_255_/_8%)]",
        dimensions[size],
        className,
      )}
      data-token-logo={resolved && !failed ? "metadata" : "fallback"}
      title={resolved && !failed ? `${symbol} metadata image` : `${symbol} image unavailable`}
    >
      <span aria-hidden="true">{initials}</span>
      {resolved && !failed ? (
        <img
          src={resolved}
          alt={`${symbol} token logo`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSource(resolved)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </span>
  );
}

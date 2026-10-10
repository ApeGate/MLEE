"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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

const resolvedMetadata = new Map<string, ResolvedMetadata>();
const pendingMetadata = new Map<string, Promise<ResolvedMetadata>>();

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

function requestMetadata(mint: string, uri?: string | null) {
  const key = `${mint}:${uri ?? ""}`;
  if (resolvedMetadata.has(key)) {
    return Promise.resolve(resolvedMetadata.get(key)!);
  }
  const existing = pendingMetadata.get(key);
  if (existing) return existing;

  const query = uri ? `?uri=${encodeURIComponent(uri)}` : "";
  const request = fetch(`/api/meta/${encodeURIComponent(mint)}${query}`)
    .then(async (response) => {
      if (!response.ok) {
        return { image: null, name: null, symbol: null };
      }
      const payload = (await response.json()) as MetadataResponse;
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
    })
    .catch(
      (): ResolvedMetadata => ({
        image: null,
        name: null,
        symbol: null,
      }),
    )
    .then((metadata) => {
      resolvedMetadata.set(key, metadata);
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
  const requestKey = `${mint}:${uri ?? ""}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    metadata: ResolvedMetadata;
  } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const resolved =
    directImage ??
    (loaded?.key === requestKey ? loaded.metadata.image : null);
  const failed = Boolean(resolved && failedSource === resolved);

  useEffect(() => {
    if (directImage && !onMetadataRef.current) return;
    let cancelled = false;
    void requestMetadata(mint, uri).then((metadata) => {
      if (cancelled) return;
      setLoaded({ key: requestKey, metadata });
      onMetadataRef.current?.(metadata);
    });
    return () => {
      cancelled = true;
    };
  }, [directImage, mint, requestKey, uri]);

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

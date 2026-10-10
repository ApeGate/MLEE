"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type MetadataResponse = {
  image: string | null;
};

const resolvedImages = new Map<string, string | null>();
const pendingImages = new Map<string, Promise<string | null>>();

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

function requestImage(mint: string, uri?: string | null) {
  const key = `${mint}:${uri ?? ""}`;
  if (resolvedImages.has(key)) {
    return Promise.resolve(resolvedImages.get(key) ?? null);
  }
  const existing = pendingImages.get(key);
  if (existing) return existing;

  const query = uri ? `?uri=${encodeURIComponent(uri)}` : "";
  const request = fetch(`/api/meta/${encodeURIComponent(mint)}${query}`)
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json()) as MetadataResponse;
      return allowedImage(payload.image);
    })
    .catch(() => null)
    .then((image) => {
      resolvedImages.set(key, image);
      pendingImages.delete(key);
      return image;
    });
  pendingImages.set(key, request);
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
}: {
  mint: string;
  symbol: string;
  uri?: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  eager?: boolean;
}) {
  const directImage = useMemo(() => allowedImage(imageUrl), [imageUrl]);
  const requestKey = `${mint}:${uri ?? ""}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    image: string | null;
  } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const resolved =
    directImage ?? (loaded?.key === requestKey ? loaded.image : null);
  const failed = Boolean(resolved && failedSource === resolved);

  useEffect(() => {
    if (directImage) return;
    let cancelled = false;
    void requestImage(mint, uri).then((image) => {
      if (!cancelled) setLoaded({ key: requestKey, image });
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

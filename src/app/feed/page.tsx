import type { Metadata } from "next";
import { FeedApp } from "@/components/feed/feed-app";

export const metadata: Metadata = {
  title: "Live Pump.fun Gate",
  description:
    "Watch fresh Pump.fun launches pass through Kong's deterministic risk gate, with evidence-backed decision receipts.",
  alternates: {
    canonical: "https://apegate.io/feed",
  },
};

export default function FeedPage() {
  return <FeedApp />;
}

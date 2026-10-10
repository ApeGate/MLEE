import type { Metadata } from "next";
import { FeedApp } from "@/components/feed/feed-app";

export const metadata: Metadata = {
  title: "Live Gate desk",
  description:
    "Open Apegate's live desk for Kong's evidence-backed Pump.fun checks, guarded browser trading, and decision receipts.",
  alternates: {
    canonical: "https://apegate.io/feed",
  },
};

export default function FeedPage() {
  return <FeedApp />;
}

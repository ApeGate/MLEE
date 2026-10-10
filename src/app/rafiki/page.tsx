import type { Metadata } from "next";
import { RafikiDesk } from "@/components/rafiki/rafiki-desk";

export const metadata: Metadata = {
  title: "Ask Rafiki",
  description:
    "Ask why a local Apegate receipt says what it says. Rafiki explains only and cannot trade.",
  alternates: {
    canonical: "https://apegate.io/rafiki",
  },
};

export default function RafikiPage() {
  return (
    <RafikiDesk
      aiConfigured={Boolean(
        process.env.AI_GATEWAY_URL &&
          process.env.AI_GATEWAY_TOKEN &&
          process.env.RAFIKI_MODEL,
      )}
    />
  );
}

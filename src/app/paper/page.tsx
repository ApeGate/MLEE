import type { Metadata } from "next";
import { PaperDesk } from "@/components/paper/paper-desk";

export const metadata: Metadata = {
  title: "Paper desk",
  description:
    "Practice Apegate entries and exits against live or recorded launch data with explicit simulated fills and fees.",
  alternates: {
    canonical: "https://apegate.io/paper",
  },
};

export default function PaperPage() {
  return <PaperDesk />;
}

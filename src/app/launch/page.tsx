import type { Metadata } from "next";
import { LaunchBay } from "@/components/launch/launch-bay";

export const metadata: Metadata = {
  title: "Launch Bay",
  description:
    "Prepare a transparent Pump.fun launch, run Kong's local preflight, and preview the facts a Clean Launch Receipt will record.",
  alternates: {
    canonical: "https://apegate.io/launch",
  },
};

export default function LaunchPage() {
  return <LaunchBay />;
}

import type { Metadata } from "next";
import { LabReplay } from "@/components/lab/lab-replay";

export const metadata: Metadata = {
  title: "Zira Lab",
  description:
    "Deterministically recompute Kong's recorded Gate tape and see which accuracy metrics are not yet supportable.",
};

export default function LabPage() {
  return <LabReplay />;
}

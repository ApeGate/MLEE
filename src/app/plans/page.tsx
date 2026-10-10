import type { Metadata } from "next";
import { PlanBuilder } from "@/components/plans/plan-builder";

export const metadata: Metadata = {
  title: "Plans",
  description:
    "Draft bounded Apegate plans, validate limits, and rehearse Gate eligibility on recorded tape.",
  alternates: {
    canonical: "https://apegate.io/plans",
  },
};

export default function PlansPage() {
  return <PlanBuilder />;
}

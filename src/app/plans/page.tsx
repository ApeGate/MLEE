import type { Metadata } from "next";
import { PlanBuilder } from "@/components/plans/plan-builder";

export const metadata: Metadata = {
  title: "Plans",
  description:
    "Draft bounded Apegate plans, validate limits, and rehearse Gate eligibility on recorded tape.",
};

export default function PlansPage() {
  return <PlanBuilder />;
}

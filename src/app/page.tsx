import { SiteHeader } from "@/components/home/site-header";
import { GateHero } from "@/components/home/gate-hero";
import { GateSections } from "@/components/home/gate-sections";

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <GateHero />
      <GateSections />
    </main>
  );
}

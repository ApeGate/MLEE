import { SiteHeader } from "@/components/home/site-header";
import { HomeHero } from "@/components/home/hero";
import { HomeSections } from "@/components/home/sections";

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <HomeHero />
      <HomeSections />
    </main>
  );
}

import { CraftIntelligence } from "@/components/craft-intelligence";
import { CraftStory } from "@/components/craft-story";
import { FeatureVideos } from "@/components/feature-videos";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { FloatingActions } from "@/components/floating-actions";
import { Hero } from "@/components/hero";
import { LovedBy } from "@/components/loved-by";
import { ProductRail } from "@/components/product-rail";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default async function Home() {
  // Signed-in customers stay inside their account until they sign out.
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ProductRail />
        <FeatureVideos />
        <CraftStory />
        <CraftIntelligence />
        <LovedBy />
      </main>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}

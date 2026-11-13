import { CraftIntelligence } from "@/components/craft-intelligence";
import { CraftStory } from "@/components/craft-story";
import { FeatureVideos } from "@/components/feature-videos";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { FloatingActions } from "@/components/floating-actions";
import { Hero } from "@/components/hero";
import { LovedBy } from "@/components/loved-by";
import { ProductRail } from "@/components/product-rail";
import { HappyCustomers } from "@/components/showcase/happy-customers";
import { MostLoved } from "@/components/showcase/most-loved";
import { MostViral } from "@/components/showcase/most-viral";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getShowcase } from "@/lib/showcase";

export default async function Home() {
  // Signed-in customers stay inside their account until they sign out.
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const showcase = await getShowcase();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <MostViral products={showcase.viral} signedIn />
        <ProductRail />
        <MostLoved products={showcase.loved} signedIn />
        <FeatureVideos />
        <CraftStory />
        <HappyCustomers feedback={showcase.feedback} />
        <CraftIntelligence />
        <LovedBy />
      </main>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { CollectionView } from "@/components/collection-view";
import { FloatingActions } from "@/components/floating-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { collectionSlugs, getCollection } from "@/lib/collections";

export function generateStaticParams() {
  return collectionSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const collection = getCollection(slug);
  return { title: collection ? `${collection.title} — Rangkaarii` : "Rangkaarii" };
}

export default async function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  return (
    <>
      <SiteHeader solid />
      <main className="flex-1">
        <CollectionView collection={collection} />
      </main>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}

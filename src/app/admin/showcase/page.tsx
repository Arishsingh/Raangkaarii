import { FeedbackManager } from "@/components/admin/feedback-manager";
import { ShelfPicker } from "@/components/admin/shelf-picker";
import { getShopCatalog } from "@/lib/catalog";
import { listFeedback, listPicks } from "@/lib/showcase-store";

export const metadata = { title: "Homepage showcase — Admin" };

export default async function ShowcasePage() {
  const [{ products }, picks, feedback] = await Promise.all([
    getShopCatalog(),
    listPicks(),
    listFeedback(),
  ]);

  const options = products.map((product) => ({
    id: product.id,
    name: product.name,
    image: product.image,
    category: product.category,
  }));

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-heading text-2xl font-light">Homepage showcase</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Choose what the homepage spotlights. Until you pick anything for a
          shelf, it fills itself with your newest pieces.
        </p>
      </div>

      <ShelfPicker
        shelf="viral"
        title="Most Viral"
        description="A scrolling rail near the top of the homepage. Pieces with a video play it here — reels work best."
        products={options}
        initial={picks.viral}
        max={12}
      />

      <ShelfPicker
        shelf="loved"
        title="Most Loved"
        description="A large grid of four. The first one you pick is shown biggest."
        products={options}
        initial={picks.loved}
        max={4}
      />

      <FeedbackManager feedback={feedback} />
    </div>
  );
}

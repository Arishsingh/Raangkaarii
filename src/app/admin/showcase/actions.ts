"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";

import { getAdminUser } from "@/lib/admin";
import {
  addFeedback,
  deleteFeedback,
  isShelf,
  setShelf,
} from "@/lib/showcase-store";

export type ShowcaseResult = { ok: boolean; message: string };

/** Reachable by direct POST, so each action re-checks rather than trusts. */
async function assertAdmin() {
  if (!(await getAdminUser())) throw new Error("Not authorised.");
}

function revalidateShowcase() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin/showcase");
}

export async function saveShelf(
  shelf: string,
  productIds: string[],
): Promise<ShowcaseResult> {
  await assertAdmin();
  if (!isShelf(shelf)) return { ok: false, message: "Unknown shelf." };
  const ids = productIds.filter((id) => typeof id === "string" && id).slice(0, 24);

  try {
    await setShelf(shelf, ids);
  } catch (caught) {
    console.error("Could not save shelf", caught);
    return { ok: false, message: "Could not save. Please try again." };
  }
  revalidateShowcase();
  return {
    ok: true,
    message:
      ids.length === 0
        ? "Shelf cleared — the homepage will show automatic picks."
        : `Saved ${ids.length} piece${ids.length === 1 ? "" : "s"}.`,
  };
}

/** Only files this site stored itself can be shown — never an outside URL. */
function isOwnMedia(url: string) {
  return /^\/api\/media\/[a-f0-9]{32}$/.test(url) || /^\/[\w\-/.]+$/.test(url);
}

export async function createFeedback(input: {
  image: string;
  name: string;
  quote: string;
  rating: number;
}): Promise<ShowcaseResult> {
  await assertAdmin();
  const image = String(input.image ?? "").trim();
  if (!image || !isOwnMedia(image)) {
    return { ok: false, message: "Upload a photo first." };
  }
  const rating = Math.round(Number(input.rating));

  try {
    await addFeedback({
      id: crypto.randomBytes(8).toString("hex"),
      image,
      name: String(input.name ?? "").trim().slice(0, 80),
      quote: String(input.quote ?? "").trim().slice(0, 400),
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 5,
    });
  } catch (caught) {
    console.error("Could not save feedback", caught);
    return { ok: false, message: "Could not save. Please try again." };
  }
  revalidateShowcase();
  return { ok: true, message: "Added to the homepage." };
}

export async function removeFeedback(id: string): Promise<ShowcaseResult> {
  await assertAdmin();
  try {
    await deleteFeedback(String(id));
  } catch (caught) {
    console.error("Could not remove feedback", caught);
    return { ok: false, message: "Could not remove. Please try again." };
  }
  revalidateShowcase();
  return { ok: true, message: "Removed." };
}

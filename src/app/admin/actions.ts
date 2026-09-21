"use server";

import { revalidatePath } from "next/cache";

import { getAdminUser } from "@/lib/admin";
import {
  adminProductIdExists,
  deleteAdminProduct,
  getAdminProduct,
  hideBuiltIn,
  upsertAdminProduct,
  type ProductInput,
} from "@/lib/catalog-store";
import { slugify } from "@/lib/collections";
import { updateOrderStatus, type OrderStatus } from "@/lib/orders-store";
import { getProduct as getBuiltInProduct } from "@/lib/products";

export type ActionState = { ok: boolean; message: string };

/**
 * The form only asks for media, name, price, category and heading. Everything
 * else gets a sensible default so the listing is complete and buyable — an
 * empty size run in particular would leave "Add to cart" with nothing to send.
 */
const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

/**
 * Server Actions are reachable by direct POST, so every one of them re-checks
 * the signed-in user rather than trusting that the panel rendered.
 */
async function assertAdmin() {
  const user = await getAdminUser();
  if (!user) throw new Error("Not authorised.");
  return user;
}

function readNumber(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** A slug that does not collide with anything already in the table. */
async function uniqueId(name: string) {
  const base = slugify(name) || "product";
  let candidate = base;
  let suffix = 2;
  while (await adminProductIdExists(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function revalidateStorefront(collections: string[]) {
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  for (const slug of collections) revalidatePath(`/collections/${slug}`);
}

export async function saveProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, message: "Not authorised." };
  }

  const editingId = String(formData.get("editingId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const price = readNumber(formData.get("price"));
  const category = String(formData.get("category") ?? "").trim();
  const collections = formData.getAll("collections").map(String).filter(Boolean);

  if (!name) return { ok: false, message: "Give the product a name." };
  if (price === null || price <= 0) {
    return { ok: false, message: "Enter a price greater than zero." };
  }
  if (!category && collections.length === 0) {
    return {
      ok: false,
      message: "Pick a category or a heading, so the product has somewhere to show.",
    };
  }

  /**
   * A product can carry several stills and several clips. The first of each is
   * kept in the singular column too, because cards, cart lines and past orders
   * all read that — the gallery is additive, not a replacement.
   */
  const images = formData.getAll("images").map(String).map((entry) => entry.trim()).filter(Boolean);
  const videos = formData.getAll("videos").map(String).map((entry) => entry.trim()).filter(Boolean);
  const image = images[0] ?? "";
  const video = videos[0] ?? "";
  if (!image && !video) {
    return { ok: false, message: "Add a photo or a video for this product." };
  }

  const compareAt = readNumber(formData.get("compareAt"));
  if (compareAt !== null && compareAt <= price) {
    return {
      ok: false,
      message: "The was-price must be higher than the selling price.",
    };
  }

  const rating = readNumber(formData.get("rating"));
  const sizes = formData.getAll("sizes").map(String).filter(Boolean);
  // Absent (simple form) means in stock; present-but-unchecked means it is not.
  const stockField = formData.get("inStock");

  const input: ProductInput = {
    id: editingId || (await uniqueId(name)),
    name,
    blurb: String(formData.get("blurb") ?? "").trim(),
    price: Math.round(price),
    compareAt: compareAt === null ? null : Math.round(compareAt),
    image,
    video,
    images,
    videos,
    alt: String(formData.get("alt") ?? "").trim() || name,
    category,
    collections,
    fabric: String(formData.get("fabric") ?? "").trim() || "Cotton",
    colour: String(formData.get("colour") ?? "").trim() || "Ivory",
    occasion: String(formData.get("occasion") ?? "").trim() || "Everyday",
    style: String(formData.get("style") ?? "").trim() || "Separates",
    print: String(formData.get("print") ?? "").trim() || "Plain",
    sizes: sizes.length > 0 ? sizes : DEFAULT_SIZES,
    badges: formData.getAll("badges").map(String).filter(Boolean),
    rating: rating === null ? 4.6 : Math.min(5, Math.max(1, rating)),
    inStock: stockField === null ? true : stockField === "on",
  };

  try {
    // Revalidate the collections it is leaving as well as the ones it joins.
    const previous = editingId ? await getAdminProduct(editingId) : null;
    await upsertAdminProduct(input);
    revalidateStorefront([
      ...new Set([...input.collections, ...(previous?.collections ?? [])]),
    ]);
  } catch (caught) {
    console.error("Could not save product", caught);
    return { ok: false, message: "Could not save the product. Please try again." };
  }

  return {
    ok: true,
    message: editingId ? `Updated “${name}”.` : `Added “${name}” to the store.`,
  };
}

export async function removeProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, message: "Not authorised." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing product id." };

  try {
    const existing = await getAdminProduct(id);
    await deleteAdminProduct(id);
    revalidateStorefront(existing?.collections ?? []);
    return { ok: true, message: `Removed “${existing?.name ?? id}”.` };
  } catch (caught) {
    console.error("Could not delete product", caught);
    return { ok: false, message: "Could not remove the product." };
  }
}

/**
 * Built-in pieces are defined in code, so there is no row to delete. Removing
 * one records the id instead and the catalogue filters it out; past orders are
 * untouched because they resolve names through the built-in list directly.
 */
export async function removeBuiltInProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, message: "Not authorised." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing product id." };

  const product = getBuiltInProduct(id);
  if (!product) return { ok: false, message: "No such built-in product." };

  try {
    await hideBuiltIn(id);
    revalidateStorefront([]);
    return { ok: true, message: `Removed \u201C${product.name}\u201D from the site.` };
  } catch (caught) {
    console.error("Could not hide built-in product", caught);
    return { ok: false, message: "Could not remove the product." };
  }
}

export async function updateOrderStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, message: "Not authorised." };
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as OrderStatus;

  if (!orderId || !status) {
    return { ok: false, message: "Missing order ID or status." };
  }

  try {
    const change = await updateOrderStatus(orderId, status);
    // A refusal is the store declining an unpaid order, not a failure to write.
    if (!change.ok) return { ok: false, message: change.reason };

    revalidatePath("/admin/orders");
    revalidatePath("/admin/revenue");
    revalidatePath("/admin");
    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${orderId}`);
    return { ok: true, message: `Order ${orderId} updated to ${status}.` };
  } catch (caught) {
    console.error("Could not update order status", caught);
    return { ok: false, message: "Could not update order status." };
  }
}

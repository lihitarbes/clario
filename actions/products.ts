"use server";

import { redirect } from "next/navigation";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import {
  removeProductImage,
  uploadProductImage,
} from "@/lib/products/image-actions";
import { revalidateProductPaths } from "@/lib/products/revalidate";
import {
  productFormSchema,
  productIdSchema,
  updateProductFormSchema,
} from "@/lib/validation/products";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";

type ProductActionState = ActionResult<{ message?: string }> | null;

function mapProductError(message: string): string {
  if (message.toLowerCase().includes("check")) {
    return "Invalid product details.";
  }
  return message;
}

function getOptionalImageFile(formData: FormData): File | null {
  const value = formData.get("image");
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }
  return value;
}

export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsed = productFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    currency: formData.get("currency"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { supabase, business } = auth.ctx;
  const productId = crypto.randomUUID();
  const imageFile = getOptionalImageFile(formData);

  const { error } = await supabase.from("products").insert({
    id: productId,
    business_id: business.id,
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    currency: parsed.data.currency,
    is_active: true,
    image_path: null,
  });

  if (error) {
    return actionError(mapProductError(error.message));
  }

  if (imageFile) {
    const uploaded = await uploadProductImage({
      supabase,
      businessId: business.id,
      productId,
      file: imageFile,
    });
    if (!uploaded.ok) {
      revalidateProductPaths(productId);
      return actionError(
        `Product created, but image upload failed: ${uploaded.error}`,
      );
    }
  }

  revalidateProductPaths();
  redirect(`/products/${productId}`);
}

export async function updateProductAction(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsed = updateProductFormSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    currency: formData.get("currency"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { supabase, business } = auth.ctx;

  const { data: existing } = await supabase
    .from("products")
    .select("id, image_path")
    .eq("id", parsed.data.productId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!existing) {
    return actionError("Product not found.");
  }

  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      currency: parsed.data.currency,
    })
    .eq("id", parsed.data.productId)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapProductError(error.message));
  }

  const imageFile = getOptionalImageFile(formData);
  if (imageFile) {
    const uploaded = await uploadProductImage({
      supabase,
      businessId: business.id,
      productId: parsed.data.productId,
      file: imageFile,
      previousPath: existing.image_path,
    });
    if (!uploaded.ok) {
      revalidateProductPaths(parsed.data.productId);
      return actionError(`Details saved, but image upload failed: ${uploaded.error}`);
    }
  }

  revalidateProductPaths(parsed.data.productId);
  return actionSuccess({ message: "Product saved." });
}

export async function removeProductImageAction(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsedId = productIdSchema.safeParse(formData.get("productId"));
  if (!parsedId.success) {
    return actionError(parsedId.error.issues[0]?.message ?? "Invalid product.");
  }

  const { supabase, business } = auth.ctx;

  const { data: existing } = await supabase
    .from("products")
    .select("id, image_path")
    .eq("id", parsedId.data)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!existing) {
    return actionError("Product not found.");
  }

  if (!existing.image_path) {
    return actionSuccess({ message: "No image to remove." });
  }

  const removed = await removeProductImage({
    supabase,
    businessId: business.id,
    productId: parsedId.data,
    imagePath: existing.image_path,
  });

  if (!removed.ok) {
    return actionError(removed.error);
  }

  revalidateProductPaths(parsedId.data);
  return actionSuccess({ message: "Image removed." });
}

export async function setProductActiveAction(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsedId = productIdSchema.safeParse(formData.get("productId"));
  if (!parsedId.success) {
    return actionError(parsedId.error.issues[0]?.message ?? "Invalid product.");
  }

  const activeRaw = formData.get("isActive");
  const isActive = activeRaw === "true";

  const { supabase, business } = auth.ctx;

  const { data: existing } = await supabase
    .from("products")
    .select("id, is_active")
    .eq("id", parsedId.data)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!existing) {
    return actionError("Product not found.");
  }

  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", parsedId.data)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapProductError(error.message));
  }

  revalidateProductPaths(parsedId.data);
  return actionSuccess({
    message: isActive ? "Product activated." : "Product deactivated.",
  });
}

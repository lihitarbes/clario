import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PRODUCT_IMAGES_BUCKET,
  buildProductImageStoragePath,
  extensionForProductImageMime,
  validateProductImageFile,
} from "@/lib/products/storage";
import type { Database } from "@/types/database";

type AppSupabase = SupabaseClient<Database>;

export async function uploadProductImage(params: {
  supabase: AppSupabase;
  businessId: string;
  productId: string;
  file: File;
  previousPath?: string | null;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const validationError = validateProductImageFile(params.file);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const extension = extensionForProductImageMime(params.file.type);
  if (!extension) {
    return { ok: false, error: "Use a JPG, PNG, or WebP image." };
  }

  const fileName = `${crypto.randomUUID()}.${extension}`;
  const path = buildProductImageStoragePath({
    businessId: params.businessId,
    productId: params.productId,
    fileName,
  });

  const buffer = Buffer.from(await params.file.arrayBuffer());

  const { error: uploadError } = await params.supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, buffer, {
      contentType: params.file.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { error: updateError } = await params.supabase
    .from("products")
    .update({ image_path: path })
    .eq("id", params.productId)
    .eq("business_id", params.businessId);

  if (updateError) {
    await params.supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
    return { ok: false, error: updateError.message };
  }

  if (params.previousPath && params.previousPath !== path) {
    await params.supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([params.previousPath]);
  }

  return { ok: true, path };
}

export async function removeProductImage(params: {
  supabase: AppSupabase;
  businessId: string;
  productId: string;
  imagePath: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: updateError } = await params.supabase
    .from("products")
    .update({ image_path: null })
    .eq("id", params.productId)
    .eq("business_id", params.businessId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  if (params.imagePath) {
    await params.supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([params.imagePath]);
  }

  return { ok: true };
}

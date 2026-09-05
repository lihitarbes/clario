import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PRODUCT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProductImageMimeType = (typeof PRODUCT_IMAGE_MIME_TYPES)[number];

export function buildProductImageStoragePath(params: {
  businessId: string;
  productId: string;
  fileName: string;
}): string {
  return `${params.businessId}/products/${params.productId}/${params.fileName}`;
}

export function extensionForProductImageMime(
  mime: string,
): "jpg" | "png" | "webp" | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

export function validateProductImageFile(file: File): string | null {
  if (!PRODUCT_IMAGE_MIME_TYPES.includes(file.type as ProductImageMimeType)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size <= 0) {
    return "Image file is empty.";
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export async function createProductImageSignedUrl(
  supabase: SupabaseClient<Database>,
  imagePath: string | null | undefined,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  if (!imagePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUrl(imagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function signProductImagePaths(
  supabase: SupabaseClient<Database>,
  products: { id: string; image_path: string | null }[],
): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    products.map(async (product) => {
      const url = await createProductImageSignedUrl(
        supabase,
        product.image_path,
      );
      return [product.id, url] as const;
    }),
  );

  return new Map(entries);
}

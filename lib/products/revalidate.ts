import { revalidatePath } from "next/cache";
import { revalidateNotificationLayouts } from "@/lib/notifications/revalidate";

export function revalidateProductPaths(productId?: string) {
  revalidatePath("/products");
  revalidatePath("/shop");
  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

export function revalidatePurchasePaths() {
  revalidatePath("/products");
  revalidatePath("/shop");
  revalidateNotificationLayouts();
}

import type { PurchaseStatus } from "@/types/database";
import {
  normalizeProductCurrency,
  type ProductCurrency,
} from "@/lib/products/display";

/** Statuses that count toward Buy again history. */
export const BUY_AGAIN_PURCHASE_STATUSES: PurchaseStatus[] = [
  "confirmed",
  "completed",
];

export type BuyAgainPurchaseRow = {
  id: string;
  status: PurchaseStatus;
  created_at: string;
  business_id: string;
  client_id: string;
  businesses: { name: string } | null;
  purchase_items: Array<{
    product_id: string;
    quantity: number;
    products: {
      id: string;
      name: string;
      price: number | string;
      currency?: string | null;
      is_active: boolean;
      business_id: string;
      image_path: string | null;
    } | null;
  }> | null;
};

export type BuyAgainItem = {
  productId: string;
  businessId: string;
  clientId: string;
  businessName: string;
  name: string;
  price: number | string;
  currency: ProductCurrency;
  imagePath: string | null;
  lastPurchasedAt: string;
};

/**
 * Build unique Buy again items from purchase history.
 * Most recent eligible purchase wins per product; cancelled/pending excluded upstream.
 */
export function buildBuyAgainItems(
  purchases: BuyAgainPurchaseRow[],
): BuyAgainItem[] {
  const byProduct = new Map<string, BuyAgainItem>();

  const sorted = [...purchases].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  for (const purchase of sorted) {
    if (!BUY_AGAIN_PURCHASE_STATUSES.includes(purchase.status)) {
      continue;
    }

    for (const item of purchase.purchase_items ?? []) {
      const product = item.products;
      if (!product || !product.is_active) {
        continue;
      }
      if (product.business_id !== purchase.business_id) {
        continue;
      }
      if (byProduct.has(product.id)) {
        continue;
      }

      byProduct.set(product.id, {
        productId: product.id,
        businessId: purchase.business_id,
        clientId: purchase.client_id,
        businessName: purchase.businesses?.name ?? "Business",
        name: product.name,
        price: product.price,
        currency: normalizeProductCurrency(product.currency),
        imagePath: product.image_path,
        lastPurchasedAt: purchase.created_at,
      });
    }
  }

  return [...byProduct.values()].sort((a, b) =>
    b.lastPurchasedAt.localeCompare(a.lastPurchasedAt),
  );
}

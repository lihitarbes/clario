"use client";

import { ProductImage } from "@/components/products/ProductImage";
import { Button } from "@/components/ui/button";
import {
  formatProductPrice,
  type ProductCurrency,
} from "@/lib/products/display";

export type BuyAgainDisplayItem = {
  productId: string;
  businessId: string;
  clientId: string;
  businessName: string;
  name: string;
  price: number | string;
  currency: ProductCurrency;
  imageUrl: string | null;
  lastPurchasedAt: string;
};

type BuyAgainSectionProps = {
  items: BuyAgainDisplayItem[];
  onAddToCart: (item: BuyAgainDisplayItem) => void;
};

export function BuyAgainSection({ items, onAddToCart }: BuyAgainSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-medium text-zinc-900">Buy again</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Quickly add products you have ordered before.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-zinc-50"
          >
            <ProductImage
              src={item.imageUrl}
              alt={item.name}
              size="tile"
              className="rounded-none border-0 border-b border-zinc-200"
            />
            <div className="flex flex-1 flex-col gap-2 p-3">
              <div className="min-w-0 space-y-0.5">
                <p className="line-clamp-2 text-sm font-medium text-zinc-900">
                  {item.name}
                </p>
                <p className="text-sm font-medium text-zinc-800">
                  {formatProductPrice(item.price, item.currency)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-auto w-full"
                onClick={() => onAddToCart(item)}
              >
                Add to cart
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

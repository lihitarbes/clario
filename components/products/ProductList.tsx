import Link from "next/link";
import { ProductActiveToggle } from "@/components/products/ProductActiveToggle";
import { ProductImage } from "@/components/products/ProductImage";
import { Button } from "@/components/ui/button";
import { formatProductPrice } from "@/lib/products/display";
import type { Product } from "@/types/database";

export type ProductListItem = Product & {
  imageUrl: string | null;
};

type ProductListProps = {
  products: ProductListItem[];
};

export function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No products yet. Create your first product to show in the client shop.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
      {products.map((product) => (
        <li
          key={product.id}
          className="flex flex-wrap items-start justify-between gap-4 p-4"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              size="thumb"
              className="shrink-0"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/products/${product.id}`}
                  className="text-sm font-medium text-zinc-900 hover:underline"
                >
                  {product.name}
                </Link>
                <span
                  className={
                    product.is_active
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                      : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
                  }
                >
                  {product.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              {product.description ? (
                <p className="max-w-xl text-sm text-zinc-600 line-clamp-2">
                  {product.description}
                </p>
              ) : null}
              <p className="text-sm font-medium text-zinc-800">
                {formatProductPrice(product.price, product.currency)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/products/${product.id}`}>Edit</Link>
            </Button>
            <ProductActiveToggle
              productId={product.id}
              isActive={product.is_active}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

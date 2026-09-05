import Link from "next/link";
import { OwnerPurchaseList } from "@/components/products/OwnerPurchaseList";
import type { OwnerPurchaseListItem } from "@/components/products/OwnerPurchaseList";
import { ProductList } from "@/components/products/ProductList";
import type { ProductListItem } from "@/components/products/ProductList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { signProductImagePaths } from "@/lib/products/storage";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function BusinessProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const business = await getOwnedBusiness();
  if (!business) {
    return null;
  }

  const { purchase: focusPurchaseParam } = await searchParams;
  const focusPurchaseId =
    typeof focusPurchaseParam === "string" && focusPurchaseParam.length > 0
      ? focusPurchaseParam
      : null;

  const supabase = await createClient();

  const [productsResult, purchasesResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("business_id", business.id)
      .order("name"),
    supabase
      .from("purchases")
      .select(
        "id, status, total_amount, created_at, clients(full_name, email, phone), purchase_items(id, quantity, unit_price, products(name, currency))",
      )
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const products = (productsResult.data ?? []) as Product[];
  const imageUrls = productsResult.error
    ? new Map<string, string | null>()
    : await signProductImagePaths(supabase, products);

  const productsWithImages: ProductListItem[] = products.map((product) => ({
    ...product,
    imageUrl: imageUrls.get(product.id) ?? null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Products</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage your catalog and review client purchase requests for{" "}
            {business.name}.
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">New product</Link>
        </Button>
      </div>

      {productsResult.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Could not load products. Please try again.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catalog</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductList products={productsWithImages} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase requests</CardTitle>
        </CardHeader>
        <CardContent>
          {purchasesResult.error ? (
            <p className="text-sm text-red-600" role="alert">
              Could not load purchases. Please try again.
            </p>
          ) : (
            <OwnerPurchaseList
              purchases={
                (purchasesResult.data ?? []) as OwnerPurchaseListItem[]
              }
              focusPurchaseId={focusPurchaseId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

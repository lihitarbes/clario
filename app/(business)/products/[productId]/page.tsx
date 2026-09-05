import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductActiveToggle } from "@/components/products/ProductActiveToggle";
import { ProductForm } from "@/components/products/ProductForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { createProductImageSignedUrl } from "@/lib/products/storage";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: PageProps<"/products/[productId]">) {
  const { productId } = await params;
  const business = await getOwnedBusiness();
  if (!business) {
    notFound();
  }

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!product) {
    notFound();
  }

  const typed = product as Product;
  const currentImageUrl = await createProductImageSignedUrl(
    supabase,
    typed.image_path,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/products"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {typed.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {typed.is_active ? "Active in the client shop." : "Inactive — hidden from the shop."}
        </p>
      </div>

      <ProductForm
        mode="edit"
        product={typed}
        currentImageUrl={currentImageUrl}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600">
            Deactivate a product to hide it from the shop while keeping past
            orders intact. Hard delete is not used in this MVP.
          </p>
          <ProductActiveToggle
            productId={typed.id}
            isActive={typed.is_active}
          />
        </CardContent>
      </Card>
    </div>
  );
}

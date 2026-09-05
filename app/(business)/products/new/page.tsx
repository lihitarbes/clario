import Link from "next/link";
import { ProductForm } from "@/components/products/ProductForm";
import { getOwnedBusiness } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const business = await getOwnedBusiness();
  if (!business) {
    return null;
  }

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
          New product
        </h1>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}

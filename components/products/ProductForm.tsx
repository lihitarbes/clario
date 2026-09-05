"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createProductAction,
  removeProductImageAction,
  updateProductAction,
} from "@/actions/products";
import { ProductImage } from "@/components/products/ProductImage";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toProductPriceNumber } from "@/lib/products/display";
import { PRODUCT_IMAGE_MAX_BYTES } from "@/lib/products/storage";
import type { Product } from "@/types/database";

type ProductFormProps =
  | { mode: "create"; product?: undefined; currentImageUrl?: null }
  | {
      mode: "edit";
      product: Product;
      currentImageUrl: string | null;
    };

export function ProductForm({
  mode,
  product,
  currentImageUrl = null,
}: ProductFormProps) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, pending] = useActionState(action, null);
  const [removeState, removeAction, removePending] = useActionState(
    removeProductImageAction,
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (!file) {
      setPreviewUrl(null);
      setSelectedFileName(null);
      return;
    }
    setSelectedFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
  }

  const displayPreview = previewUrl ?? currentImageUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "New product" : "Edit product"}
        </CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Add a product clients can order from your shop."
            : "Update product details. Deactivate instead of deleting to keep order history."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={formAction} className="space-y-4">
          {mode === "edit" ? (
            <input type="hidden" name="productId" value={product.id} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              defaultValue={product?.name ?? ""}
              required
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={product?.description ?? ""}
              maxLength={2000}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                defaultValue={
                  product ? toProductPriceNumber(product.price).toFixed(2) : ""
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                required
                defaultValue={product?.currency ?? "ILS"}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <option value="ILS">ILS (₪)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-zinc-200 p-4">
            <div className="space-y-1">
              <Label htmlFor="image">Product image (optional)</Label>
              <p className="text-xs text-zinc-500">
                JPG, PNG, or WebP · max {Math.round(PRODUCT_IMAGE_MAX_BYTES / (1024 * 1024))}{" "}
                MB
              </p>
            </div>
            <ProductImage
              src={displayPreview}
              alt={product?.name ?? "Product preview"}
              size="preview"
            />
            <Input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
            />
            {selectedFileName ? (
              <p className="text-xs text-zinc-600">Selected: {selectedFileName}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              <ActionPendingLabel
                pending={pending}
                pendingLabel={mode === "create" ? "Creating…" : "Saving…"}
                idleLabel={
                  mode === "create" ? "Create product" : "Save changes"
                }
              />
            </Button>
            {state && !state.success ? (
              <p className="text-sm text-red-600" role="alert">
                {state.error}
              </p>
            ) : null}
            {state?.success ? (
              <p className="text-sm text-green-700" role="status">
                {state.data?.message ?? "Saved."}
              </p>
            ) : null}
          </div>
        </form>

        {mode === "edit" && product.image_path ? (
          <form action={removeAction} className="space-y-2 border-t border-zinc-100 pt-4">
            <input type="hidden" name="productId" value={product.id} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={removePending}
            >
              <ActionPendingLabel
                pending={removePending}
                pendingLabel="Removing…"
                idleLabel="Remove image"
              />
            </Button>
            {removeState && !removeState.success ? (
              <p className="text-sm text-red-600" role="alert">
                {removeState.error}
              </p>
            ) : null}
            {removeState?.success ? (
              <p className="text-sm text-green-700" role="status">
                {removeState.data?.message}
              </p>
            ) : null}
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

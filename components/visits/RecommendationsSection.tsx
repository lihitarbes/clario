"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRecommendationAction,
  deleteRecommendationAction,
  updateRecommendationAction,
} from "@/actions/recommendations";
import type { VisitRecommendationWithProduct } from "@/actions/visits";
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
import {
  RECOMMENDATION_CATEGORIES,
  visitFormSelectClassName,
} from "@/components/visits/constants";
import {
  recommendationCategoryClassName,
  recommendationCategoryLabel,
} from "@/lib/visits/display";
import type { Product } from "@/types/database";
import { cn } from "@/lib/utils";

type ProductOption = Pick<Product, "id" | "name" | "is_active">;

type RecommendationRowProps = {
  recommendation: VisitRecommendationWithProduct;
  products: ProductOption[];
};

export function RecommendationRow({
  recommendation,
  products,
}: RecommendationRowProps) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateRecommendationAction,
    null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteRecommendationAction,
    null,
  );

  const error =
    (updateState && !updateState.success ? updateState.error : null) ??
    (deleteState && !deleteState.success ? deleteState.error : null);

  function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Remove this recommendation?")) {
      event.preventDefault();
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Edit recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="space-y-4">
            <input
              type="hidden"
              name="recommendationId"
              value={recommendation.id}
            />

            <div className="space-y-2">
              <Label htmlFor={`category-${recommendation.id}`}>Category</Label>
              <select
                id={`category-${recommendation.id}`}
                name="category"
                defaultValue={recommendation.category}
                required
                className={visitFormSelectClassName}
              >
                {RECOMMENDATION_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`title-${recommendation.id}`}>Title</Label>
              <Input
                id={`title-${recommendation.id}`}
                name="title"
                defaultValue={recommendation.title}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`instructions-${recommendation.id}`}>
                Instructions
              </Label>
              <Textarea
                id={`instructions-${recommendation.id}`}
                name="instructions"
                defaultValue={recommendation.instructions ?? ""}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`product-${recommendation.id}`}>
                Catalog product (optional)
              </Label>
              <select
                id={`product-${recommendation.id}`}
                name="productId"
                defaultValue={recommendation.product_id ?? ""}
                className={visitFormSelectClassName}
              >
                <option value="">No linked product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.is_active
                      ? product.name
                      : `${product.name} (inactive)`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={updatePending || deletePending}>
                <ActionPendingLabel
                  pending={updatePending}
                  pendingLabel="Saving…"
                  idleLabel="Save changes"
                />
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={updatePending || deletePending}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>

            {error ? (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                recommendationCategoryClassName(recommendation.category),
              )}
            >
              {recommendationCategoryLabel(recommendation.category)}
            </span>
            <p className="font-medium text-zinc-900">{recommendation.title}</p>
          </div>

          {recommendation.instructions ? (
            <p className="text-sm whitespace-pre-wrap text-zinc-600">
              {recommendation.instructions}
            </p>
          ) : null}

          {recommendation.products ? (
            <p className="text-sm text-zinc-500">
              Product: {recommendation.products.name}
              {recommendation.products.is_active === false
                ? " (inactive)"
                : null}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            disabled={deletePending}
          >
            Edit
          </Button>
          <form action={deleteAction} onSubmit={handleDelete}>
            <input
              type="hidden"
              name="recommendationId"
              value={recommendation.id}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={deletePending}
            >
              <ActionPendingLabel
                pending={deletePending}
                pendingLabel="Removing…"
                idleLabel="Delete"
              />
            </Button>
          </form>
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>
      ) : null}
    </div>
  );
}

type AddRecommendationFormProps = {
  visitId: string;
  products: ProductOption[];
  onCancel?: () => void;
  onSuccess?: () => void;
};

export function AddRecommendationForm({
  visitId,
  products,
  onCancel,
  onSuccess,
}: AddRecommendationFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createRecommendationAction,
    null,
  );
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (state?.success) {
      onSuccessRef.current?.();
      router.refresh();
    }
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add recommendation</CardTitle>
        <CardDescription>
          Recommend products, treatments, or care steps for your client.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="visitId" value={visitId} />

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              defaultValue="product"
              required
              className={visitFormSelectClassName}
            >
              {RECOMMENDATION_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea id="instructions" name="instructions" rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productId">Catalog product (optional)</Label>
            <select
              id="productId"
              name="productId"
              defaultValue=""
              className={visitFormSelectClassName}
            >
              <option value="">No linked product</option>
              {products
                .filter((product) => product.is_active)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
            </select>
            {products.filter((product) => product.is_active).length === 0 ? (
              <p className="text-xs text-zinc-500">
                No active catalog products yet — you can still add
                recommendations without linking a product.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              <ActionPendingLabel
                pending={pending}
                pendingLabel="Adding…"
                idleLabel="Add"
              />
            </Button>
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={onCancel}
              >
                Cancel
              </Button>
            ) : null}
          </div>

          {state && !state.success ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

type RecommendationsSectionProps = {
  visitId: string;
  recommendations: VisitRecommendationWithProduct[];
  products: ProductOption[];
};

export function RecommendationsSection({
  visitId,
  recommendations,
  products,
}: RecommendationsSectionProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Recommendations</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Client-visible care and product recommendations for this visit.
          </p>
        </div>
        {!addOpen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
          >
            + Add recommendation
          </Button>
        ) : null}
      </div>

      {recommendations.length > 0 ? (
        <ul className="space-y-3">
          {recommendations.map((recommendation) => (
            <li key={recommendation.id}>
              <RecommendationRow
                recommendation={recommendation}
                products={products}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600">No recommendations yet.</p>
      )}

      {addOpen ? (
        <AddRecommendationForm
          visitId={visitId}
          products={products}
          onCancel={() => setAddOpen(false)}
          onSuccess={() => setAddOpen(false)}
        />
      ) : null}
    </section>
  );
}

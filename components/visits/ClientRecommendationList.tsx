import Link from "next/link";
import {
  recommendationCategoryClassName,
  recommendationCategoryLabel,
} from "@/lib/visits/display";
import type { VisitRecommendation } from "@/types/database";
import { cn } from "@/lib/utils";

export type ClientRecommendationProduct = {
  id: string;
  name: string;
  is_active: boolean;
} | null;

type ClientRecommendationListProps = {
  recommendations: Array<
    VisitRecommendation & { products: ClientRecommendationProduct }
  >;
};

export function ClientRecommendationList({
  recommendations,
}: ClientRecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-zinc-600">No recommendations for this visit.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {recommendations.map((recommendation) => {
        const product = recommendation.products;
        const canShop = Boolean(product?.is_active);

        return (
          <li
            key={recommendation.id}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
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
                <p className="font-medium text-zinc-900">
                  {recommendation.title}
                </p>
              </div>

              {recommendation.instructions ? (
                <p className="text-sm whitespace-pre-wrap text-zinc-600">
                  {recommendation.instructions}
                </p>
              ) : null}

              {product ? (
                <div className="space-y-2 pt-1">
                  <p className="text-sm text-zinc-500">
                    Product: {product.name}
                    {!product.is_active ? " (no longer available)" : null}
                  </p>
                  {canShop ? (
                    <Link
                      href={`/shop?product=${product.id}`}
                      className="inline-flex text-sm font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
                    >
                      View product
                    </Link>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      This product is inactive, so purchase is unavailable.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

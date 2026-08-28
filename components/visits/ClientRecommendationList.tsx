import {
  recommendationCategoryClassName,
  recommendationCategoryLabel,
} from "@/lib/visits/display";
import type { VisitRecommendation } from "@/types/database";
import { cn } from "@/lib/utils";

type ClientRecommendationListProps = {
  recommendations: Array<
    VisitRecommendation & { products: { name: string } | null }
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
      {recommendations.map((recommendation) => (
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
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

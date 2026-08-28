import type { RecommendationCategory, VisitPublicationScope } from "@/types/database";

export function ownerPublicationScopeLabel(scope: VisitPublicationScope): string {
  switch (scope) {
    case "full":
      return "Published — full visit";
    case "recommendations_only":
      return "Published — recommendations only";
  }
}

export function clientVisitListExcerpt(
  publicationScope: VisitPublicationScope,
  summary: string | null,
  max = 120,
): string {
  if (publicationScope === "recommendations_only") {
    return "Recommendations from this visit";
  }
  return visitSummaryExcerpt(summary, max);
}

export function isFullClientPublication(scope: VisitPublicationScope): boolean {
  return scope === "full";
}

export function recommendationCategoryLabel(
  category: RecommendationCategory,
): string {
  switch (category) {
    case "product":
      return "Product";
    case "medication":
      return "Medication";
    case "device":
      return "Device";
    case "treatment":
      return "Treatment";
    case "other":
      return "Other";
  }
}

export function recommendationCategoryClassName(
  category: RecommendationCategory,
): string {
  switch (category) {
    case "product":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "medication":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "device":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "treatment":
      return "bg-green-100 text-green-800 border-green-200";
    case "other":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

export function visitSummaryExcerpt(summary: string | null, max = 120): string {
  if (!summary || summary.trim() === "") {
    return "No summary recorded yet.";
  }
  const trimmed = summary.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import { mapVisitError } from "@/lib/visits/errors";
import { revalidateVisitPaths } from "@/lib/visits/revalidate";
import {
  createRecommendationSchema,
  recommendationIdSchema,
  updateRecommendationSchema,
} from "@/lib/validation/recommendations";
import { getVisitForOwner } from "@/actions/visits";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";
import type { VisitRecommendation } from "@/types/database";

type RecommendationActionState = ActionResult<{ message?: string }> | null;

async function getRecommendationForOwner(recommendationId: string) {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const { supabase } = auth.ctx;
  const { data, error } = await supabase
    .from("visit_recommendations")
    .select("*")
    .eq("id", recommendationId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: mapVisitError(error.message) };
  }

  if (!data) {
    return { ok: false as const, error: "Recommendation not found." };
  }

  const visitLookup = await getVisitForOwner(data.visit_id);
  if (!visitLookup.ok) {
    return { ok: false as const, error: visitLookup.error };
  }

  return {
    ok: true as const,
    ctx: auth.ctx,
    recommendation: data as VisitRecommendation,
    visit: visitLookup.visit,
  };
}

async function validateProductForBusiness(
  supabase: Awaited<
    ReturnType<typeof import("@/lib/supabase/server").createClient>
  >,
  productId: string | null,
  businessId: string,
) {
  if (!productId) {
    return { ok: true as const };
  }

  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: mapVisitError(error.message) };
  }

  if (!data) {
    return { ok: false as const, error: "Product not found in your catalog." };
  }

  return { ok: true as const };
}

export async function createRecommendationAction(
  _prevState: RecommendationActionState,
  formData: FormData,
): Promise<RecommendationActionState> {
  const parsed = createRecommendationSchema.safeParse({
    visitId: formData.get("visitId"),
    category: formData.get("category"),
    title: formData.get("title"),
    instructions: formData.get("instructions") ?? "",
    productId: formData.get("productId") ?? "",
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const visitLookup = await getVisitForOwner(parsed.data.visitId);
  if (!visitLookup.ok) {
    return actionError(visitLookup.error);
  }

  const { supabase, business } = visitLookup.ctx;
  const productCheck = await validateProductForBusiness(
    supabase,
    parsed.data.productId,
    business.id,
  );
  if (!productCheck.ok) {
    return actionError(productCheck.error);
  }

  const recommendationId = crypto.randomUUID();
  const { error } = await supabase.from("visit_recommendations").insert({
    id: recommendationId,
    visit_id: visitLookup.visit.id,
    client_id: visitLookup.visit.client_id,
    category: parsed.data.category,
    title: parsed.data.title,
    instructions: parsed.data.instructions,
    product_id: parsed.data.productId,
  });

  if (error) {
    return actionError(mapVisitError(error.message));
  }

  revalidateVisitPaths(
    visitLookup.visit.id,
    visitLookup.visit.appointments?.id,
  );
  revalidatePath("/visits");

  return actionSuccess({ message: "Recommendation added." });
}

export async function updateRecommendationAction(
  _prevState: RecommendationActionState,
  formData: FormData,
): Promise<RecommendationActionState> {
  const idResult = recommendationIdSchema.safeParse(
    formData.get("recommendationId"),
  );
  if (!idResult.success) {
    return actionError("Invalid recommendation.");
  }

  const parsed = updateRecommendationSchema.safeParse({
    recommendationId: idResult.data,
    category: formData.get("category"),
    title: formData.get("title"),
    instructions: formData.get("instructions") ?? "",
    productId: formData.get("productId") ?? "",
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const lookup = await getRecommendationForOwner(parsed.data.recommendationId);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  const { supabase, business } = lookup.ctx;
  const { visit } = lookup;
  const productCheck = await validateProductForBusiness(
    supabase,
    parsed.data.productId,
    business.id,
  );
  if (!productCheck.ok) {
    return actionError(productCheck.error);
  }

  const { error } = await supabase
    .from("visit_recommendations")
    .update({
      category: parsed.data.category,
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      product_id: parsed.data.productId,
    })
    .eq("id", parsed.data.recommendationId);

  if (error) {
    return actionError(mapVisitError(error.message));
  }

  revalidateVisitPaths(visit.id, visit.appointments?.id);
  revalidatePath("/visits");

  return actionSuccess({ message: "Recommendation updated." });
}

export async function deleteRecommendationAction(
  _prevState: RecommendationActionState,
  formData: FormData,
): Promise<RecommendationActionState> {
  const parsed = recommendationIdSchema.safeParse(
    formData.get("recommendationId"),
  );
  if (!parsed.success) {
    return actionError("Invalid recommendation.");
  }

  const lookup = await getRecommendationForOwner(parsed.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  const { supabase } = lookup.ctx;
  const { visit } = lookup;
  const { error } = await supabase
    .from("visit_recommendations")
    .delete()
    .eq("id", parsed.data);

  if (error) {
    return actionError(mapVisitError(error.message));
  }

  revalidateVisitPaths(visit.id, visit.appointments?.id);
  revalidatePath("/visits");

  return actionSuccess({ message: "Recommendation removed." });
}

"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import { mapVisitError } from "@/lib/visits/errors";
import { revalidateVisitPaths } from "@/lib/visits/revalidate";
import {
  publishVisitSchema,
  updateVisitPublicationScopeSchema,
  updateVisitSchema,
  visitIdSchema,
} from "@/lib/validation/visits";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";
import type {
  Appointment,
  Client,
  Product,
  Visit,
  VisitRecommendation,
} from "@/types/database";

type VisitActionState = ActionResult<{ message?: string }> | null;

export type VisitWithDetails = Visit & {
  appointments: Pick<
    Appointment,
    "id" | "start_time" | "end_time" | "status" | "business_id"
  > | null;
  clients: Pick<Client, "full_name" | "email"> | null;
};

export type VisitRecommendationWithProduct = VisitRecommendation & {
  products: Pick<Product, "id" | "name"> | null;
};

export async function getVisitForOwner(visitId: string) {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const { supabase } = auth.ctx;
  const { data, error } = await supabase
    .from("visits")
    .select(
      "*, appointments(id, start_time, end_time, status, business_id), clients(full_name, email)",
    )
    .eq("id", visitId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: mapVisitError(error.message) };
  }

  if (!data) {
    return { ok: false as const, error: "Visit not found." };
  }

  return {
    ok: true as const,
    ctx: auth.ctx,
    visit: data as VisitWithDetails,
  };
}

export async function updateVisitAction(
  _prevState: VisitActionState,
  formData: FormData,
): Promise<VisitActionState> {
  const parsed = updateVisitSchema.safeParse({
    visitId: formData.get("visitId"),
    summary: formData.get("summary") ?? "",
    followUp: formData.get("followUp") ?? "",
    professionalNotes: formData.get("professionalNotes") ?? "",
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const lookup = await getVisitForOwner(parsed.data.visitId);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  const { supabase } = lookup.ctx;
  const { error } = await supabase
    .from("visits")
    .update({
      summary: parsed.data.summary,
      follow_up: parsed.data.followUp,
      professional_notes: parsed.data.professionalNotes,
    })
    .eq("id", parsed.data.visitId);

  if (error) {
    return actionError(mapVisitError(error.message));
  }

  revalidateVisitPaths(
    parsed.data.visitId,
    lookup.visit.appointments?.id,
  );
  revalidatePath(`/clients/${lookup.visit.client_id}`);

  return actionSuccess({ message: "Visit record saved." });
}

export async function publishVisitAction(
  _prevState: VisitActionState,
  formData: FormData,
): Promise<VisitActionState> {
  const parsed = publishVisitSchema.safeParse({
    visitId: formData.get("visitId"),
    publicationScope: formData.get("publicationScope"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const lookup = await getVisitForOwner(parsed.data.visitId);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  const { supabase } = lookup.ctx;
  const { error } = await supabase
    .from("visits")
    .update({
      published_at: new Date().toISOString(),
      publication_scope: parsed.data.publicationScope,
    })
    .eq("id", parsed.data.visitId);

  if (error) {
    return actionError(mapVisitError(error.message));
  }

  revalidateVisitPaths(parsed.data.visitId, lookup.visit.appointments?.id);
  revalidatePath(`/clients/${lookup.visit.client_id}`);

  const message =
    parsed.data.publicationScope === "full"
      ? "Full visit shared with client."
      : "Recommendations shared with client.";

  return actionSuccess({ message });
}

export async function updateVisitPublicationScopeAction(
  _prevState: VisitActionState,
  formData: FormData,
): Promise<VisitActionState> {
  const parsed = updateVisitPublicationScopeSchema.safeParse({
    visitId: formData.get("visitId"),
    publicationScope: formData.get("publicationScope"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const lookup = await getVisitForOwner(parsed.data.visitId);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  if (!lookup.visit.published_at) {
    return actionError("Visit is not published.");
  }

  const { supabase } = lookup.ctx;
  const { error } = await supabase
    .from("visits")
    .update({ publication_scope: parsed.data.publicationScope })
    .eq("id", parsed.data.visitId);

  if (error) {
    return actionError(mapVisitError(error.message));
  }

  revalidateVisitPaths(parsed.data.visitId, lookup.visit.appointments?.id);
  revalidatePath(`/clients/${lookup.visit.client_id}`);

  const message =
    parsed.data.publicationScope === "full"
      ? "Sharing updated to full visit."
      : "Sharing updated to recommendations only.";

  return actionSuccess({ message });
}

export async function unpublishVisitAction(
  _prevState: VisitActionState,
  formData: FormData,
): Promise<VisitActionState> {
  const parsed = visitIdSchema.safeParse(formData.get("visitId"));
  if (!parsed.success) {
    return actionError("Invalid visit.");
  }

  const lookup = await getVisitForOwner(parsed.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  const { supabase } = lookup.ctx;
  const { error } = await supabase
    .from("visits")
    .update({ published_at: null })
    .eq("id", parsed.data);

  if (error) {
    return actionError(mapVisitError(error.message));
  }

  revalidateVisitPaths(parsed.data, lookup.visit.appointments?.id);
  revalidatePath(`/clients/${lookup.visit.client_id}`);

  return actionSuccess({ message: "Visit unpublished. Client can no longer see it." });
}

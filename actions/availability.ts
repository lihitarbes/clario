"use server";

import { revalidatePath } from "next/cache";
import { mapDatabaseError } from "@/lib/auth/errors";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import {
  availabilityRangesOverlap,
} from "@/lib/appointments/overlap";
import {
  availabilityFormSchema,
  availabilityIdSchema,
} from "@/lib/validation/availability";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";

type AvailabilityState = ActionResult<{ message?: string }> | null;

async function getAvailabilityForOwner(availabilityId: string) {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const { supabase, business } = auth.ctx;
  const { data, error } = await supabase
    .from("business_availability")
    .select("*")
    .eq("id", availabilityId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: mapDatabaseError(error.message) };
  }

  if (!data) {
    return { ok: false as const, error: "Availability slot not found." };
  }

  return { ok: true as const, ctx: auth.ctx, availability: data };
}

async function listAvailabilityForBusiness(businessId: string) {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const { data, error } = await auth.ctx.supabase
    .from("business_availability")
    .select("id, day_of_week, start_time, end_time")
    .eq("business_id", businessId);

  if (error) {
    return { ok: false as const, error: mapDatabaseError(error.message) };
  }

  return { ok: true as const, rows: data ?? [] };
}

export async function createAvailabilityAction(
  _prevState: AvailabilityState,
  formData: FormData,
): Promise<AvailabilityState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsed = availabilityFormSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { dayOfWeek, startTime, endTime } = parsed.data;
  const { supabase, business } = auth.ctx;

  const existing = await listAvailabilityForBusiness(business.id);
  if (!existing.ok) {
    return actionError(existing.error);
  }

  if (
    availabilityRangesOverlap(
      existing.rows,
      dayOfWeek,
      startTime,
      endTime,
    )
  ) {
    return actionError(
      "This availability overlaps an existing range for that day.",
    );
  }

  const slotId = crypto.randomUUID();
  const { error } = await supabase.from("business_availability").insert({
    id: slotId,
    business_id: business.id,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  });

  if (error) {
    return actionError(mapDatabaseError(error.message));
  }

  revalidatePath("/calendar");
  return actionSuccess({ message: "Availability added." });
}

export async function updateAvailabilityAction(
  _prevState: AvailabilityState,
  formData: FormData,
): Promise<AvailabilityState> {
  const idResult = availabilityIdSchema.safeParse(formData.get("availabilityId"));
  if (!idResult.success) {
    return actionError("Invalid availability slot.");
  }

  const lookup = await getAvailabilityForOwner(idResult.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  const parsed = availabilityFormSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { dayOfWeek, startTime, endTime } = parsed.data;
  const { supabase, business } = lookup.ctx;

  const existing = await listAvailabilityForBusiness(business.id);
  if (!existing.ok) {
    return actionError(existing.error);
  }

  if (
    availabilityRangesOverlap(
      existing.rows,
      dayOfWeek,
      startTime,
      endTime,
      lookup.availability.id,
    )
  ) {
    return actionError(
      "This availability overlaps an existing range for that day.",
    );
  }

  const { error } = await supabase
    .from("business_availability")
    .update({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    })
    .eq("id", lookup.availability.id)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapDatabaseError(error.message));
  }

  revalidatePath("/calendar");
  return actionSuccess({ message: "Availability updated." });
}

export async function deleteAvailabilityAction(
  _prevState: AvailabilityState,
  formData: FormData,
): Promise<AvailabilityState> {
  const idResult = availabilityIdSchema.safeParse(formData.get("availabilityId"));
  if (!idResult.success) {
    return actionError("Invalid availability slot.");
  }

  const lookup = await getAvailabilityForOwner(idResult.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  const { supabase, business } = lookup.ctx;
  const { error } = await supabase
    .from("business_availability")
    .delete()
    .eq("id", lookup.availability.id)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapDatabaseError(error.message));
  }

  revalidatePath("/calendar");
  return actionSuccess({ message: "Availability removed." });
}

"use server";

import { revalidatePath } from "next/cache";
import { mapDatabaseError } from "@/lib/auth/errors";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import {
  AVAILABILITY_APPOINTMENT_OVERLAP_MESSAGE,
  RECURRING_AVAILABILITY_APPOINTMENT_HORIZON_DAYS,
  hasBlockingAppointmentOverlap,
  listBlockingAppointmentsInHorizon,
  recurringAvailabilityOverlapsBlockingAppointments,
  recurringAvailabilityRangesOverlap,
  specificDateAvailabilityRangesOverlap,
  availabilityLocalRange,
} from "@/lib/appointments/overlap";
import {
  availabilityFormSchema,
  availabilityIdSchema,
  specificDateAvailabilityFormSchema,
} from "@/lib/validation/availability";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";

type AvailabilityState = ActionResult<{
  message?: string;
  weekDate?: string;
}> | null;

function appointmentHorizonBounds(from: Date = new Date()): {
  horizonStart: Date;
  horizonEnd: Date;
} {
  const horizonStart = new Date(from);
  horizonStart.setHours(0, 0, 0, 0);
  const horizonEnd = new Date(horizonStart);
  horizonEnd.setDate(
    horizonEnd.getDate() + RECURRING_AVAILABILITY_APPOINTMENT_HORIZON_DAYS,
  );
  return { horizonStart, horizonEnd };
}

async function rejectIfSpecificDateOverlapsAppointment(
  supabase: Parameters<typeof hasBlockingAppointmentOverlap>[0],
  businessId: string,
  specificDate: string,
  startTime: string,
  endTime: string,
): Promise<AvailabilityState | null> {
  const range = availabilityLocalRange(specificDate, startTime, endTime);
  if (!range) {
    return actionError("Invalid bookable slot times.");
  }

  try {
    const overlaps = await hasBlockingAppointmentOverlap(
      supabase,
      businessId,
      range.start.toISOString(),
      range.end.toISOString(),
    );
    if (overlaps) {
      return actionError(AVAILABILITY_APPOINTMENT_OVERLAP_MESSAGE);
    }
  } catch (error) {
    return actionError(
      mapDatabaseError(
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
  }

  return null;
}

async function rejectIfRecurringOverlapsAppointment(
  supabase: Parameters<typeof listBlockingAppointmentsInHorizon>[0],
  businessId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): Promise<AvailabilityState | null> {
  const { horizonStart, horizonEnd } = appointmentHorizonBounds();

  try {
    const appointments = await listBlockingAppointmentsInHorizon(
      supabase,
      businessId,
      horizonStart,
      horizonEnd,
    );
    if (
      recurringAvailabilityOverlapsBlockingAppointments(
        appointments,
        dayOfWeek,
        startTime,
        endTime,
      )
    ) {
      return actionError(AVAILABILITY_APPOINTMENT_OVERLAP_MESSAGE);
    }
  } catch (error) {
    return actionError(
      mapDatabaseError(
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
  }

  return null;
}

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
    return { ok: false as const, error: "Bookable slot not found." };
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
    .select("id, day_of_week, specific_date, start_time, end_time")
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
    recurringAvailabilityRangesOverlap(
      existing.rows,
      dayOfWeek,
      startTime,
      endTime,
    )
  ) {
    return actionError(
      "This slot overlaps another recurring bookable slot for that day.",
    );
  }

  const appointmentConflict = await rejectIfRecurringOverlapsAppointment(
    supabase,
    business.id,
    dayOfWeek,
    startTime,
    endTime,
  );
  if (appointmentConflict) {
    return appointmentConflict;
  }

  const slotId = crypto.randomUUID();
  const { error } = await supabase.from("business_availability").insert({
    id: slotId,
    business_id: business.id,
    day_of_week: dayOfWeek,
    specific_date: null,
    start_time: startTime,
    end_time: endTime,
  });

  if (error) {
    return actionError(mapDatabaseError(error.message));
  }

  revalidatePath("/calendar");
  return actionSuccess({ message: "Recurring bookable slot added." });
}

export async function createSpecificDateAvailabilityAction(
  _prevState: AvailabilityState,
  formData: FormData,
): Promise<AvailabilityState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsed = specificDateAvailabilityFormSchema.safeParse({
    specificDate: formData.get("specificDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { specificDate, startTime, endTime } = parsed.data;
  const { supabase, business } = auth.ctx;

  const existing = await listAvailabilityForBusiness(business.id);
  if (!existing.ok) {
    return actionError(existing.error);
  }

  if (
    specificDateAvailabilityRangesOverlap(
      existing.rows,
      specificDate,
      startTime,
      endTime,
    )
  ) {
    return actionError(
      "This slot overlaps another bookable slot for that date.",
    );
  }

  const appointmentConflict = await rejectIfSpecificDateOverlapsAppointment(
    supabase,
    business.id,
    specificDate,
    startTime,
    endTime,
  );
  if (appointmentConflict) {
    return appointmentConflict;
  }

  const slotId = crypto.randomUUID();
  const { error } = await supabase.from("business_availability").insert({
    id: slotId,
    business_id: business.id,
    day_of_week: null,
    specific_date: specificDate,
    start_time: startTime,
    end_time: endTime,
  });

  if (error) {
    return actionError(mapDatabaseError(error.message));
  }

  revalidatePath("/calendar");
  // Client navigates to this week so the new slot is visible immediately.
  // (Server redirect + useActionState is unreliable for ?week= updates.)
  return actionSuccess({
    message: "One-time bookable slot added.",
    weekDate: specificDate,
  });
}

export async function updateAvailabilityAction(
  _prevState: AvailabilityState,
  formData: FormData,
): Promise<AvailabilityState> {
  const idResult = availabilityIdSchema.safeParse(formData.get("availabilityId"));
  if (!idResult.success) {
    return actionError("Invalid bookable slot.");
  }

  const lookup = await getAvailabilityForOwner(idResult.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  const { supabase, business } = lookup.ctx;
  const existing = await listAvailabilityForBusiness(business.id);
  if (!existing.ok) {
    return actionError(existing.error);
  }

  const isSpecific = lookup.availability.specific_date !== null;

  if (isSpecific) {
    const parsed = specificDateAvailabilityFormSchema.safeParse({
      specificDate: formData.get("specificDate"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
    });

    if (!parsed.success) {
      return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const { specificDate, startTime, endTime } = parsed.data;

    if (
      specificDateAvailabilityRangesOverlap(
        existing.rows,
        specificDate,
        startTime,
        endTime,
        lookup.availability.id,
      )
    ) {
      return actionError(
        "This slot overlaps another bookable slot for that date.",
      );
    }

    const appointmentConflict = await rejectIfSpecificDateOverlapsAppointment(
      supabase,
      business.id,
      specificDate,
      startTime,
      endTime,
    );
    if (appointmentConflict) {
      return appointmentConflict;
    }

    const { error } = await supabase
      .from("business_availability")
      .update({
        day_of_week: null,
        specific_date: specificDate,
        start_time: startTime,
        end_time: endTime,
      })
      .eq("id", lookup.availability.id)
      .eq("business_id", business.id);

    if (error) {
      return actionError(mapDatabaseError(error.message));
    }

    revalidatePath("/calendar");
    return actionSuccess({ message: "One-time bookable slot updated." });
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

  if (
    recurringAvailabilityRangesOverlap(
      existing.rows,
      dayOfWeek,
      startTime,
      endTime,
      lookup.availability.id,
    )
  ) {
    return actionError(
      "This slot overlaps another recurring bookable slot for that day.",
    );
  }

  const appointmentConflict = await rejectIfRecurringOverlapsAppointment(
    supabase,
    business.id,
    dayOfWeek,
    startTime,
    endTime,
  );
  if (appointmentConflict) {
    return appointmentConflict;
  }

  const { error } = await supabase
    .from("business_availability")
    .update({
      day_of_week: dayOfWeek,
      specific_date: null,
      start_time: startTime,
      end_time: endTime,
    })
    .eq("id", lookup.availability.id)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapDatabaseError(error.message));
  }

  revalidatePath("/calendar");
  return actionSuccess({ message: "Recurring bookable slot updated." });
}

export async function deleteAvailabilityAction(
  _prevState: AvailabilityState,
  formData: FormData,
): Promise<AvailabilityState> {
  const idResult = availabilityIdSchema.safeParse(formData.get("availabilityId"));
  if (!idResult.success) {
    return actionError("Invalid bookable slot.");
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
  return actionSuccess({ message: "Bookable slot removed." });
}

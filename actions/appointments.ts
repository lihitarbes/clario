"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mapAppointmentError } from "@/lib/auth/appointment-errors";
import { mapCompleteAppointmentRpcError } from "@/lib/appointments/complete-rpc-errors";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import { requireClientContext } from "@/lib/auth/require-client";
import {
  BLOCKING_APPOINTMENT_STATUSES,
  hasBlockingAppointmentOverlap,
} from "@/lib/appointments/overlap";
import {
  availabilityAppliesToDate,
  listBookableSlots,
} from "@/lib/appointments/slots";
import { parseDateTimeLocal } from "@/lib/appointments/time";
import {
  appointmentFormSchema,
  appointmentIdSchema,
  clientBookAppointmentSchema,
} from "@/lib/validation/appointments";
import { revalidateVisitPaths } from "@/lib/visits/revalidate";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";
import type { Appointment, Business, Client } from "@/types/database";

type AppointmentFormState =
  | ActionResult<{ message?: string; visitId?: string }>
  | null;

export type AppointmentWithClient = Appointment & {
  clients: Pick<Client, "full_name" | "email"> | null;
};

export type AppointmentWithBusiness = Appointment & {
  businesses: Pick<Business, "id" | "name"> | null;
};

async function getActiveClientForOwner(clientId: string) {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const { supabase, business } = auth.ctx;
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: mapAppointmentError(error.message) };
  }

  if (!data) {
    return { ok: false as const, error: "Client not found." };
  }

  if (data.archived_at) {
    return {
      ok: false as const,
      error: "Archived clients cannot receive appointments.",
    };
  }

  return { ok: true as const, ctx: auth.ctx, client: data };
}

async function getAppointmentForOwner(appointmentId: string) {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const { supabase, business } = auth.ctx;
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: mapAppointmentError(error.message) };
  }

  if (!data) {
    return { ok: false as const, error: "Appointment not found." };
  }

  return { ok: true as const, ctx: auth.ctx, appointment: data };
}

function computeEndTimeIso(startTimeIso: string, durationMinutes: number) {
  const start = new Date(startTimeIso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return end.toISOString();
}

function parseStartTimeFromForm(startTimeLocal: string) {
  const start = new Date(startTimeLocal);
  return start.toISOString();
}

const OVERLAP_MESSAGE =
  "This time overlaps another appointment on your calendar.";

export async function createAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsed = appointmentFormSchema.safeParse({
    clientId: formData.get("clientId"),
    startTimeLocal: formData.get("startTimeLocal"),
    durationMinutes: formData.get("durationMinutes"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const clientLookup = await getActiveClientForOwner(parsed.data.clientId);
  if (!clientLookup.ok) {
    return actionError(clientLookup.error);
  }

  const startTimeIso = parseStartTimeFromForm(parsed.data.startTimeLocal);
  const endTimeIso = computeEndTimeIso(
    startTimeIso,
    parsed.data.durationMinutes,
  );

  const { supabase, business } = clientLookup.ctx;

  try {
    const overlaps = await hasBlockingAppointmentOverlap(
      supabase,
      business.id,
      startTimeIso,
      endTimeIso,
    );
    if (overlaps) {
      return actionError(OVERLAP_MESSAGE);
    }
  } catch (error) {
    return actionError(
      mapAppointmentError(
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
  }

  const appointmentId = crypto.randomUUID();
  const { error } = await supabase.from("appointments").insert({
    id: appointmentId,
    business_id: business.id,
    client_id: parsed.data.clientId,
    start_time: startTimeIso,
    end_time: endTimeIso,
    status: "scheduled",
    notes: parsed.data.notes ?? null,
  });

  if (error) {
    return actionError(mapAppointmentError(error.message));
  }

  revalidatePath("/calendar");
  revalidatePath("/appointments");
  redirect(`/calendar/${appointmentId}`);
}

export async function updateAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const idResult = appointmentIdSchema.safeParse(formData.get("appointmentId"));
  if (!idResult.success) {
    return actionError("Invalid appointment.");
  }

  const lookup = await getAppointmentForOwner(idResult.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  if (lookup.appointment.status !== "scheduled") {
    return actionError("Only scheduled appointments can be edited.");
  }

  const parsed = appointmentFormSchema.safeParse({
    clientId: formData.get("clientId"),
    startTimeLocal: formData.get("startTimeLocal"),
    durationMinutes: formData.get("durationMinutes"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const clientLookup = await getActiveClientForOwner(parsed.data.clientId);
  if (!clientLookup.ok) {
    return actionError(clientLookup.error);
  }

  const startTimeIso = parseStartTimeFromForm(parsed.data.startTimeLocal);
  const endTimeIso = computeEndTimeIso(
    startTimeIso,
    parsed.data.durationMinutes,
  );

  const { supabase, business } = lookup.ctx;

  try {
    const overlaps = await hasBlockingAppointmentOverlap(
      supabase,
      business.id,
      startTimeIso,
      endTimeIso,
      lookup.appointment.id,
    );
    if (overlaps) {
      return actionError(OVERLAP_MESSAGE);
    }
  } catch (error) {
    return actionError(
      mapAppointmentError(
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      client_id: parsed.data.clientId,
      start_time: startTimeIso,
      end_time: endTimeIso,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", lookup.appointment.id)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapAppointmentError(error.message));
  }

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${lookup.appointment.id}`);
  revalidatePath("/appointments");

  return { success: true, data: { message: "Appointment updated." } };
}

export async function cancelAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const idResult = appointmentIdSchema.safeParse(formData.get("appointmentId"));
  if (!idResult.success) {
    return actionError("Invalid appointment.");
  }

  const lookup = await getAppointmentForOwner(idResult.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  if (lookup.appointment.status !== "scheduled") {
    return actionError("Only scheduled appointments can be cancelled.");
  }

  const { supabase, business } = lookup.ctx;
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", lookup.appointment.id)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapAppointmentError(error.message));
  }

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${lookup.appointment.id}`);
  revalidatePath("/appointments");
  redirect("/calendar");
}

export async function completeAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const idResult = appointmentIdSchema.safeParse(formData.get("appointmentId"));
  if (!idResult.success) {
    return actionError("Invalid appointment.");
  }

  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const { supabase } = auth.ctx;
  const { data: visitIdRaw, error } = await supabase.rpc(
    "complete_appointment_with_visit",
    { p_appointment_id: idResult.data } as never,
  );
  const visitId = visitIdRaw as string | null;

  if (error) {
    return actionError(mapCompleteAppointmentRpcError(error));
  }

  if (!visitId || typeof visitId !== "string") {
    return actionError("Unable to complete appointment.");
  }

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${idResult.data}`);
  revalidatePath("/appointments");
  revalidateVisitPaths(visitId, idResult.data);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("client_id")
    .eq("id", idResult.data)
    .maybeSingle();

  if (appointment?.client_id) {
    revalidatePath(`/clients/${appointment.client_id}`);
  }

  return actionSuccess({
    visitId,
    message: "Appointment completed.",
  });
}

export async function approveAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const idResult = appointmentIdSchema.safeParse(formData.get("appointmentId"));
  if (!idResult.success) {
    return actionError("Invalid appointment.");
  }

  const lookup = await getAppointmentForOwner(idResult.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  if (lookup.appointment.status !== "pending") {
    return actionError("Only pending requests can be approved.");
  }

  const { supabase, business } = lookup.ctx;
  const { appointment } = lookup;

  try {
    const overlaps = await hasBlockingAppointmentOverlap(
      supabase,
      business.id,
      appointment.start_time,
      appointment.end_time,
      appointment.id,
    );
    if (overlaps) {
      return actionError(OVERLAP_MESSAGE);
    }
  } catch (error) {
    return actionError(
      mapAppointmentError(
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "scheduled" })
    .eq("id", appointment.id)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapAppointmentError(error.message));
  }

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${appointment.id}`);
  revalidatePath("/appointments");

  return { success: true, data: { message: "Appointment approved." } };
}

export async function rejectAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const idResult = appointmentIdSchema.safeParse(formData.get("appointmentId"));
  if (!idResult.success) {
    return actionError("Invalid appointment.");
  }

  const lookup = await getAppointmentForOwner(idResult.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  if (lookup.appointment.status !== "pending") {
    return actionError("Only pending requests can be rejected.");
  }

  const { supabase, business } = lookup.ctx;
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", lookup.appointment.id)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapAppointmentError(error.message));
  }

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${lookup.appointment.id}`);
  revalidatePath("/appointments");

  return { success: true, data: { message: "Appointment request declined." } };
}

export async function bookAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const auth = await requireClientContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsed = clientBookAppointmentSchema.safeParse({
    clientId: formData.get("clientId"),
    availabilityId: formData.get("availabilityId"),
    dateKey: formData.get("dateKey"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const unavailableMessage =
    "That time is no longer available. Please choose another slot.";

  const dateLocal = new Date(`${parsed.data.dateKey}T00:00:00`);
  if (Number.isNaN(dateLocal.getTime())) {
    return actionError("Select a valid available time slot.");
  }
  dateLocal.setHours(0, 0, 0, 0);

  const { supabase, profile } = auth.ctx;

  const { data: clientRow, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", parsed.data.clientId)
    .eq("user_id", profile.id)
    .is("archived_at", null)
    .maybeSingle();

  if (clientError) {
    return actionError(mapAppointmentError(clientError.message));
  }

  if (!clientRow) {
    return actionError("You are not linked to that business.");
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", clientRow.business_id)
    .maybeSingle();

  if (businessError) {
    return actionError(mapAppointmentError(businessError.message));
  }

  if (!business) {
    return actionError("Business not found.");
  }

  const { data: availabilityRows, error: availabilityError } = await supabase
    .from("business_availability")
    .select("id, day_of_week, specific_date, start_time, end_time")
    .eq("business_id", business.id);

  if (availabilityError) {
    return actionError(mapAppointmentError(availabilityError.message));
  }

  const availabilityRow = (availabilityRows ?? []).find(
    (row) => row.id === parsed.data.availabilityId,
  );
  if (!availabilityRow) {
    return actionError(unavailableMessage);
  }

  if (!availabilityAppliesToDate(dateLocal, availabilityRow)) {
    return actionError(unavailableMessage);
  }

  const { data: blocking, error: blockingError } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("business_id", business.id)
    .in("status", [...BLOCKING_APPOINTMENT_STATUSES])
    .lt("start_time", new Date(dateLocal.getTime() + 86_400_000).toISOString())
    .gt("end_time", dateLocal.toISOString());

  if (blockingError) {
    return actionError(mapAppointmentError(blockingError.message));
  }

  const offered = listBookableSlots({
    dateLocal,
    availability: availabilityRows ?? [],
    blocking: blocking ?? [],
  });

  const selected = offered.find(
    (slot) => slot.availabilityId === parsed.data.availabilityId,
  );
  if (!selected) {
    return actionError(unavailableMessage);
  }

  const start = parseDateTimeLocal(selected.startLocal);
  const end = parseDateTimeLocal(selected.endLocal);
  if (!start || !end) {
    return actionError("Select a valid available time slot.");
  }

  const startTimeIso = start.toISOString();
  const endTimeIso = end.toISOString();

  try {
    const overlaps = await hasBlockingAppointmentOverlap(
      supabase,
      business.id,
      startTimeIso,
      endTimeIso,
    );
    if (overlaps) {
      return actionError(unavailableMessage);
    }
  } catch (error) {
    return actionError(
      mapAppointmentError(
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
  }

  const appointmentId = crypto.randomUUID();
  const { error } = await supabase.from("appointments").insert({
    id: appointmentId,
    business_id: business.id,
    client_id: clientRow.id,
    start_time: startTimeIso,
    end_time: endTimeIso,
    status: "pending",
    notes: null,
  });

  if (error) {
    return actionError(mapAppointmentError(error.message));
  }

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  redirect("/appointments");
}

export async function cancelClientAppointmentAction(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const auth = await requireClientContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const idResult = appointmentIdSchema.safeParse(formData.get("appointmentId"));
  if (!idResult.success) {
    return actionError("Invalid appointment.");
  }

  const { supabase } = auth.ctx;

  const { data: appointment, error: loadError } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", idResult.data)
    .maybeSingle();

  if (loadError) {
    return actionError(mapAppointmentError(loadError.message));
  }

  if (!appointment) {
    return actionError("Appointment not found.");
  }

  if (
    appointment.status !== "pending" &&
    appointment.status !== "scheduled"
  ) {
    return actionError("This appointment can no longer be cancelled.");
  }

  if (new Date(appointment.start_time).getTime() <= Date.now()) {
    return actionError("Past appointments cannot be cancelled.");
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointment.id);

  if (error) {
    return actionError(mapAppointmentError(error.message));
  }

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath(`/calendar/${appointment.id}`);

  return { success: true, data: { message: "Appointment cancelled." } };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mapAppointmentError } from "@/lib/auth/appointment-errors";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import { hasScheduledAppointmentOverlap } from "@/lib/appointments/overlap";
import {
  appointmentFormSchema,
  appointmentIdSchema,
} from "@/lib/validation/appointments";
import { actionError, type ActionResult } from "@/types/actions";
import type { Appointment, Client } from "@/types/database";

type AppointmentFormState = ActionResult<{ message?: string }> | null;

export type AppointmentWithClient = Appointment & {
  clients: Pick<Client, "full_name" | "email"> | null;
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
    const overlaps = await hasScheduledAppointmentOverlap(
      supabase,
      business.id,
      startTimeIso,
      endTimeIso,
    );
    if (overlaps) {
      return actionError(
        "This time overlaps another scheduled appointment.",
      );
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
    const overlaps = await hasScheduledAppointmentOverlap(
      supabase,
      business.id,
      startTimeIso,
      endTimeIso,
      lookup.appointment.id,
    );
    if (overlaps) {
      return actionError(
        "This time overlaps another scheduled appointment.",
      );
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

  const lookup = await getAppointmentForOwner(idResult.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  if (lookup.appointment.status !== "scheduled") {
    return actionError("Only scheduled appointments can be completed.");
  }

  const { supabase, business } = lookup.ctx;
  const { error } = await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", lookup.appointment.id)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapAppointmentError(error.message));
  }

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${lookup.appointment.id}`);

  return { success: true, data: { message: "Appointment marked completed." } };
}

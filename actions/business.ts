"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import { mapDatabaseError } from "@/lib/auth/errors";
import { businessSettingsSchema } from "@/lib/validation/business";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";

type BusinessSettingsState = ActionResult<{ message: string }> | null;

export async function updateBusinessSettingsAction(
  _prevState: BusinessSettingsState,
  formData: FormData,
): Promise<BusinessSettingsState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const { supabase, business } = auth.ctx;

  const parsed = businessSettingsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    defaultAppointmentDurationMinutes: formData.get(
      "defaultAppointmentDurationMinutes",
    ),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { name, description, phone, email, defaultAppointmentDurationMinutes } =
    parsed.data;

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      description: description ?? null,
      phone: phone ?? null,
      email: email ?? null,
      default_appointment_duration_minutes: defaultAppointmentDurationMinutes,
    })
    .eq("id", business.id)
    .eq("owner_id", business.owner_id);

  if (error) {
    return actionError(mapDatabaseError(error.message));
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return actionSuccess({ message: "Business settings saved." });
}

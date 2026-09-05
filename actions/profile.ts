"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, getLinkedClients } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { clientProfileFormSchema } from "@/lib/validation/profile";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";

type ProfileActionState = ActionResult<{ message?: string }> | null;

export async function updateClientProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return actionError("You must be signed in.");
  }

  if (profile.role !== "client") {
    return actionError("Only clients can update this profile.");
  }

  const parsed = clientProfileFormSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const supabase = await createClient();
  const emailChanged = parsed.data.email !== profile.email.toLowerCase();

  if (emailChanged) {
    const { error: authError } = await supabase.auth.updateUser({
      email: parsed.data.email,
    });
    if (authError) {
      return actionError(
        authError.message || "Could not update account email. Please try again.",
      );
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
    })
    .eq("id", profile.id);

  if (profileError) {
    return actionError(profileError.message);
  }

  const linkedClients = await getLinkedClients();
  if (linkedClients.length > 0) {
    const linkedIds = linkedClients.map((client) => client.id);
    const { error: clientsError } = await supabase
      .from("clients")
      .update({
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
      })
      .in("id", linkedIds)
      .eq("user_id", profile.id);

    if (clientsError) {
      return actionError(clientsError.message);
    }
  }

  revalidatePath("/profile");
  revalidatePath("/shop");
  revalidatePath("/products");

  return actionSuccess({
    message: emailChanged
      ? "Profile saved. If email confirmation is required, check your inbox."
      : "Profile saved.",
  });
}

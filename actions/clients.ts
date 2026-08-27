"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mapClientError } from "@/lib/auth/client-errors";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import { clientFormSchema, clientIdSchema } from "@/lib/validation/clients";
import { actionError, type ActionResult } from "@/types/actions";

type ClientFormState = ActionResult<{ message?: string }> | null;

async function getClientForOwner(clientId: string) {
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
    return { ok: false as const, error: mapClientError(error.message) };
  }

  if (!data) {
    return { ok: false as const, error: "Client not found." };
  }

  return { ok: true as const, ctx: auth.ctx, client: data };
}

export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsed = clientFormSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { fullName, email, phone, notes } = parsed.data;
  const { supabase, business } = auth.ctx;

  // Avoid `.select()` after insert: RETURNING re-checks SELECT RLS and can fail
  // even when INSERT WITH CHECK succeeds. Pre-generate id for the redirect.
  const clientId = crypto.randomUUID();

  const { error } = await supabase.from("clients").insert({
    id: clientId,
    business_id: business.id,
    full_name: fullName,
    email,
    phone: phone ?? null,
    notes: notes ?? null,
  });

  if (error) {
    console.error("[createClientAction]", error.message, error.code);
    return actionError(mapClientError(error.message));
  }

  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
}

export async function updateClientAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const clientIdResult = clientIdSchema.safeParse(formData.get("clientId"));
  if (!clientIdResult.success) {
    return actionError("Invalid client.");
  }

  const lookup = await getClientForOwner(clientIdResult.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  if (lookup.client.archived_at) {
    return actionError("Archived clients cannot be edited.");
  }

  const parsed = clientFormSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { fullName, email, phone, notes } = parsed.data;
  const { supabase, business } = lookup.ctx;

  const { error } = await supabase
    .from("clients")
    .update({
      full_name: fullName,
      email,
      phone: phone ?? null,
      notes: notes ?? null,
    })
    .eq("id", lookup.client.id)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapClientError(error.message));
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${lookup.client.id}`);

  return { success: true, data: { message: "Client updated." } };
}

export async function archiveClientAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const clientIdResult = clientIdSchema.safeParse(formData.get("clientId"));
  if (!clientIdResult.success) {
    return actionError("Invalid client.");
  }

  const lookup = await getClientForOwner(clientIdResult.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  if (lookup.client.archived_at) {
    return actionError("Client is already archived.");
  }

  const { supabase, business } = lookup.ctx;

  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", lookup.client.id)
    .eq("business_id", business.id);

  if (error) {
    return actionError(mapClientError(error.message));
  }

  revalidatePath("/clients");
  redirect("/clients");
}

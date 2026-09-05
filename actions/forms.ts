"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile, getLinkedClients } from "@/lib/auth/permissions";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import { normalizeFormFields } from "@/lib/forms/fields";
import { mapFormError } from "@/lib/forms/errors";
import {
  revalidateClientFormPaths,
  revalidateFormPaths,
} from "@/lib/forms/revalidate";
import { mapAssignFormError, mapSubmitFormRpcError } from "@/lib/forms/submit-rpc-errors";
import { revalidateNotificationLayouts } from "@/lib/notifications/revalidate";
import { createClient } from "@/lib/supabase/server";
import {
  assignFormSchema,
  formAssignmentIdSchema,
  parseAnswersJson,
  validateFormAnswers,
} from "@/lib/validation/form-answers";
import {
  formBuilderSchema,
  formIdSchema,
  updateFormBuilderSchema,
} from "@/lib/validation/forms";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";
import type { Form, FormAssignment, FormAssignmentKind } from "@/types/database";

type FormActionState = ActionResult<{ message?: string }> | null;

const createUpdateAssignmentSchema = z.object({
  clientId: z.string().uuid("Invalid client."),
  formId: z.string().uuid("Invalid form."),
  fromSubmissionId: z.string().uuid("Invalid submission."),
});

async function getFormForOwner(formId: string) {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const { supabase, business } = auth.ctx;

  const { data, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: mapFormError(error.message) };
  }

  if (!data) {
    return { ok: false as const, error: "Form not found." };
  }

  const form = {
    ...data,
    fields: normalizeFormFields(data.fields),
  } as Form;

  return { ok: true as const, ctx: auth.ctx, form };
}

async function findLatestSubmissionForFormClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formId: string,
  clientId: string,
) {
  const { data, error } = await supabase
    .from("form_submissions")
    .select("id, form_id, client_id, submitted_at")
    .eq("form_id", formId)
    .eq("client_id", clientId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (!data) {
    return { ok: false as const, error: "No previous submission found." };
  }

  return { ok: true as const, submission: data };
}

async function hasPendingAssignmentForFormClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formId: string,
  clientId: string,
) {
  const { data, error } = await supabase
    .from("form_assignments")
    .select("id")
    .eq("form_id", formId)
    .eq("client_id", clientId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

async function insertUpdateAssignment(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  formId: string;
  clientId: string;
  fromSubmissionId: string;
  assignmentKind: Extract<
    FormAssignmentKind,
    "owner_update_request" | "client_update"
  >;
}) {
  if (
    await hasPendingAssignmentForFormClient(
      params.supabase,
      params.formId,
      params.clientId,
    )
  ) {
    return {
      ok: false as const,
      error: "There is already a pending form for this client.",
    };
  }

  const assignmentId = crypto.randomUUID();
  const { error } = await params.supabase.from("form_assignments").insert({
    id: assignmentId,
    form_id: params.formId,
    client_id: params.clientId,
    status: "pending",
    assignment_kind: params.assignmentKind,
    prefill_from_submission_id: params.fromSubmissionId,
  });

  if (error) {
    return { ok: false as const, error: mapAssignFormError(error.message) };
  }

  return { ok: true as const, assignmentId };
}

export async function createFormAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsed = formBuilderSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    renewalPreset: formData.get("renewalPreset"),
    customRenewalMonths: formData.get("customRenewalMonths") ?? "",
    fieldsJson: formData.get("fieldsJson"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { supabase, business } = auth.ctx;
  const formId = crypto.randomUUID();

  const { error } = await supabase.from("forms").insert({
    id: formId,
    business_id: business.id,
    title: parsed.data.title,
    description: parsed.data.description,
    fields: parsed.data.fields,
    renewal_interval_months: parsed.data.renewalIntervalMonths,
  });

  if (error) {
    return actionError(mapFormError(error.message));
  }

  revalidateFormPaths();
  redirect(`/forms/${formId}`);
}

export async function updateFormAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = updateFormBuilderSchema.safeParse({
    formId: formData.get("formId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    renewalPreset: formData.get("renewalPreset"),
    customRenewalMonths: formData.get("customRenewalMonths") ?? "",
    fieldsJson: formData.get("fieldsJson"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const lookup = await getFormForOwner(parsed.data.formId);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  if (lookup.form.archived_at) {
    return actionError("Archived forms cannot be edited.");
  }

  const { supabase } = lookup.ctx;

  const { error } = await supabase
    .from("forms")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      fields: parsed.data.fields,
      renewal_interval_months: parsed.data.renewalIntervalMonths,
    })
    .eq("id", parsed.data.formId)
    .is("archived_at", null);

  if (error) {
    return actionError(mapFormError(error.message));
  }

  revalidateFormPaths(parsed.data.formId);
  return actionSuccess({ message: "Form saved." });
}

export async function archiveFormAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = formIdSchema.safeParse(formData.get("formId"));
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid form.");
  }

  const lookup = await getFormForOwner(parsed.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  if (lookup.form.archived_at) {
    return actionError("This form is already archived.");
  }

  const { supabase } = lookup.ctx;
  const archivedAt = new Date().toISOString();

  const { error } = await supabase
    .from("forms")
    .update({ archived_at: archivedAt })
    .eq("id", parsed.data)
    .is("archived_at", null);

  if (error) {
    return actionError(mapFormError(error.message));
  }

  revalidateFormPaths(parsed.data);
  revalidatePath("/forms");
  return actionSuccess({ message: "Form archived." });
}

export async function assignFormToClientAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsed = assignFormSchema.safeParse({
    clientId: formData.get("clientId"),
    formId: formData.get("formId"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { supabase, business } = auth.ctx;

  const { data: client } = await supabase
    .from("clients")
    .select("id, archived_at")
    .eq("id", parsed.data.clientId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!client) {
    return actionError("Client not found.");
  }

  if (client.archived_at) {
    return actionError("Archived clients cannot receive new form assignments.");
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id, archived_at")
    .eq("id", parsed.data.formId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!form) {
    return actionError("Form not found.");
  }

  if (form.archived_at) {
    return actionError("Archived forms cannot be assigned.");
  }

  if (
    await hasPendingAssignmentForFormClient(
      supabase,
      parsed.data.formId,
      parsed.data.clientId,
    )
  ) {
    return actionError("This form is already waiting for this client.");
  }

  const assignmentId = crypto.randomUUID();

  const { error } = await supabase.from("form_assignments").insert({
    id: assignmentId,
    form_id: parsed.data.formId,
    client_id: parsed.data.clientId,
    status: "pending",
    assignment_kind: "owner_assign",
  });

  if (error) {
    return actionError(mapAssignFormError(error.message));
  }

  revalidateClientFormPaths(parsed.data.clientId);
  revalidateNotificationLayouts();
  return actionSuccess({ message: "Form assigned to client." });
}

export async function requestFormUpdateAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsed = createUpdateAssignmentSchema.safeParse({
    clientId: formData.get("clientId"),
    formId: formData.get("formId"),
    fromSubmissionId: formData.get("fromSubmissionId"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { supabase, business } = auth.ctx;

  const { data: client } = await supabase
    .from("clients")
    .select("id, archived_at")
    .eq("id", parsed.data.clientId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!client) {
    return actionError("Client not found.");
  }

  if (client.archived_at) {
    return actionError("Archived clients cannot receive update requests.");
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id, archived_at")
    .eq("id", parsed.data.formId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!form) {
    return actionError("Form not found.");
  }

  if (form.archived_at) {
    return actionError("Archived forms cannot receive update requests.");
  }

  const { data: submission } = await supabase
    .from("form_submissions")
    .select("id, form_id, client_id")
    .eq("id", parsed.data.fromSubmissionId)
    .eq("form_id", parsed.data.formId)
    .eq("client_id", parsed.data.clientId)
    .maybeSingle();

  if (!submission) {
    return actionError("Submission not found.");
  }

  const created = await insertUpdateAssignment({
    supabase,
    formId: parsed.data.formId,
    clientId: parsed.data.clientId,
    fromSubmissionId: parsed.data.fromSubmissionId,
    assignmentKind: "owner_update_request",
  });

  if (!created.ok) {
    return actionError(created.error);
  }

  revalidateClientFormPaths(parsed.data.clientId);
  revalidateNotificationLayouts();
  return actionSuccess({ message: "Update requested from client." });
}

export async function startClientFormUpdateAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return actionError("You must be signed in.");
  }

  const parsed = createUpdateAssignmentSchema.safeParse({
    clientId: formData.get("clientId"),
    formId: formData.get("formId"),
    fromSubmissionId: formData.get("fromSubmissionId"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const linkedClients = await getLinkedClients();
  const linked = linkedClients.find((client) => client.id === parsed.data.clientId);
  if (!linked) {
    return actionError("You are not linked to this client record.");
  }

  const supabase = await createClient();

  const { data: form } = await supabase
    .from("forms")
    .select("id, archived_at")
    .eq("id", parsed.data.formId)
    .maybeSingle();

  if (!form) {
    return actionError("Form not found.");
  }

  if (form.archived_at) {
    return actionError("This form template is no longer available.");
  }

  const { data: submission } = await supabase
    .from("form_submissions")
    .select("id, form_id, client_id")
    .eq("id", parsed.data.fromSubmissionId)
    .eq("form_id", parsed.data.formId)
    .eq("client_id", parsed.data.clientId)
    .maybeSingle();

  if (!submission) {
    return actionError("Submission not found.");
  }

  const latest = await findLatestSubmissionForFormClient(
    supabase,
    parsed.data.formId,
    parsed.data.clientId,
  );
  if (!latest.ok) {
    return actionError(latest.error);
  }

  if (latest.submission.id !== parsed.data.fromSubmissionId) {
    return actionError(
      "A newer submission exists. Open the latest completed form to update.",
    );
  }

  const created = await insertUpdateAssignment({
    supabase,
    formId: parsed.data.formId,
    clientId: parsed.data.clientId,
    fromSubmissionId: parsed.data.fromSubmissionId,
    assignmentKind: "client_update",
  });

  if (!created.ok) {
    return actionError(created.error);
  }

  revalidateClientFormPaths(parsed.data.clientId);
  redirect(`/my-forms/${created.assignmentId}`);
}

async function getPendingAssignmentForLinkedClient(assignmentId: string) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const linkedClients = await getLinkedClients();
  const linkedIds = linkedClients.map((client) => client.id);

  if (linkedIds.length === 0) {
    return { ok: false as const, error: "No linked client record found." };
  }

  const supabase = await createClient();
  const { data: assignment, error } = await supabase
    .from("form_assignments")
    .select("*, forms(*)")
    .eq("id", assignmentId)
    .in("client_id", linkedIds)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (!assignment) {
    return { ok: false as const, error: "Form assignment not found." };
  }

  const typedAssignment = assignment as FormAssignment & { forms: Form | null };

  if (typedAssignment.status !== "pending") {
    return { ok: false as const, error: "This form has already been submitted." };
  }

  if (!typedAssignment.forms) {
    return { ok: false as const, error: "Form template not found." };
  }

  if (typedAssignment.forms.archived_at) {
    return { ok: false as const, error: "This form template is no longer available." };
  }

  return {
    ok: true as const,
    supabase,
    assignment: typedAssignment,
    form: {
      ...typedAssignment.forms,
      fields: normalizeFormFields(typedAssignment.forms.fields),
    } as Form,
  };
}

export async function submitFormAssignmentAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsedId = formAssignmentIdSchema.safeParse(
    formData.get("assignmentId"),
  );

  if (!parsedId.success) {
    return actionError(parsedId.error.issues[0]?.message ?? "Invalid assignment.");
  }

  const answersRaw = formData.get("answersJson");
  if (typeof answersRaw !== "string") {
    return actionError("Invalid form answers.");
  }

  const parsedAnswers = parseAnswersJson(answersRaw);
  if (!parsedAnswers) {
    return actionError("Invalid form answers.");
  }

  const lookup = await getPendingAssignmentForLinkedClient(parsedId.data);
  if (!lookup.ok) {
    return actionError(lookup.error);
  }

  const validation = validateFormAnswers(lookup.form.fields, parsedAnswers);
  if (!validation.ok) {
    const firstError = Object.values(validation.errors)[0];
    return actionError(firstError ?? "Please check your answers.");
  }

  const { error } = await lookup.supabase.rpc(
    "submit_form_assignment",
    {
      p_form_assignment_id: parsedId.data,
      p_answers: validation.answers,
    } as never,
  );

  if (error) {
    return actionError(mapSubmitFormRpcError(error));
  }

  revalidatePath("/my-forms");
  revalidateClientFormPaths(lookup.assignment.client_id);
  revalidateNotificationLayouts();
  redirect("/my-forms?submitted=1");
}
